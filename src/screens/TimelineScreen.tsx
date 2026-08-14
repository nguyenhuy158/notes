import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import { formatVi, monthString, todayString } from "../date";
import { cn } from "../ui/cn";

const MONTHS_BACK = 6;

function pastMonths(count: number): string[] {
  const now = new Date();
  const list: string[] = [];
  for (let i = 0; i < count; i += 1) {
    list.push(monthString(now.getFullYear(), now.getMonth() - i));
  }
  return list;
}

export function TimelineScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { t } = useI18n();
  const today = todayString();
  const [entries, setEntries] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(pastMonths(MONTHS_BACK).map((m) => api.days(m)))
      .then((results) => {
        if (cancelled) return;
        const merged: Record<string, string[]> = {};
        for (const r of results) Object.assign(merged, r.days);
        const list = Object.entries(merged)
          .map(([date, types]) => ({ date, count: types.length }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setEntries(list);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 py-4">
      <h1 className="text-base font-semibold text-fg">{t.timeline_title}</h1>

      {loading && <p className="mt-4 text-sm text-fg-muted">{t.timeline_loading}</p>}
      {!loading && entries.length === 0 && (
        <p className="mt-4 text-sm text-fg-muted">{t.timeline_empty}</p>
      )}

      <div className="relative mt-4 pl-5">
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />

        {entries.map(({ date, count }) => {
          const isToday = date === today;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onOpenDay(date)}
              className="relative flex w-full items-center gap-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "absolute -left-5 h-3 w-3 rounded-full border-2 border-surface",
                  isToday ? "bg-primary" : "bg-fg-muted",
                )}
              />
              <span className={cn("text-sm", isToday ? "font-semibold text-primary" : "text-fg")}>
                {formatVi(date)}
              </span>
              <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted tabular">
                {t.timeline_note_count(count)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
