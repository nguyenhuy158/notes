import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { Search } from "lucide-react";
import { api } from "../api";
import type { Note } from "../api";
import { useI18n } from "../i18n";
import {
  computeStreak,
  formatVi,
  monthString,
  toJsDate,
  todayString,
} from "../date";
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

export function TimelineScreen({
  onOpenDay,
}: {
  onOpenDay: (date: string) => void;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "vi" ? vi : enUS;
  const today = todayString();
  const [entries, setEntries] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [searching, setSearching] = useState(false);

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
        setStreak(computeStreak(new Set(Object.keys(merged))));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timeout = setTimeout(() => {
      api
        .search(q)
        .then((r) => !cancelled && setSearchResults(r.notes))
        .catch(() => !cancelled && setSearchResults([]))
        .finally(() => !cancelled && setSearching(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-fg">{t.timeline_title}</h1>
        {streak > 0 && (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg">
            {t.timeline_streak(streak)}
          </span>
        )}
      </div>

      <div className="relative mt-3">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.timeline_search_placeholder}
          className="w-full rounded-ui border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {query.trim() ? (
        <div className="mt-4">
          {!searching && searchResults.length === 0 && (
            <p className="text-sm text-fg-muted">{t.timeline_search_empty}</p>
          )}
          <ul className="space-y-2">
            {searchResults.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onOpenDay(note.date)}
                  className="block w-full rounded-ui border border-border bg-surface p-3 text-left outline-none transition hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block text-xs font-medium text-fg-muted">
                    {formatVi(note.date)}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-sm text-fg">
                    {note.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          {loading && (
            <p className="mt-4 text-sm text-fg-muted">{t.timeline_loading}</p>
          )}
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
                  <span className="flex flex-col">
                    <span
                      className={cn(
                        "text-sm",
                        isToday ? "font-semibold text-primary" : "text-fg",
                      )}
                    >
                      {formatVi(date)}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {formatDistanceToNow(toJsDate(date), {
                        addSuffix: true,
                        locale,
                      })}
                    </span>
                  </span>
                  <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted tabular">
                    {t.timeline_note_count(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
