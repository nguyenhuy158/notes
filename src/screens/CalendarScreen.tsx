import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { NoteType } from "../api";
import { useI18n } from "../i18n";
import { monthString, todayString } from "../date";
import { cn } from "../ui/cn";
import { IconCamera, IconMic, IconType } from "../icons";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const TYPE_ICON: Record<NoteType, typeof IconType> = {
  text: IconType,
  audio: IconMic,
  photo: IconCamera,
};

function firstWeekdayOffset(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function CalendarScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { t } = useI18n();
  const today = todayString();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [days, setDays] = useState<Record<string, NoteType[]>>({});

  const month = monthString(view.year, view.month);

  useEffect(() => {
    let cancelled = false;
    api
      .days(month)
      .then((r) => !cancelled && setDays(r.days))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [month]);

  const shiftMonth = (delta: number) => {
    setView((current) => {
      const m = current.month + delta;
      return { year: current.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const offset = firstWeekdayOffset(view.year, view.month);
  const total = daysInMonth(view.year, view.month);

  const cells = useMemo(() => {
    const list: { date: string; day: number }[] = [];
    for (let day = 1; day <= total; day += 1) {
      list.push({ day, date: `${month}-${String(day).padStart(2, "0")}` });
    }
    return list;
  }, [month, total]);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label={t.calendar_prev_month}
          className="grid h-9 w-9 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
        >
          ‹
        </button>
        <span className="text-base font-semibold text-fg">
          {t.calendar_month(view.month + 1, view.year)}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label={t.calendar_next_month}
          className="grid h-9 w-9 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-1 text-center text-xs font-medium text-fg-muted">
            {weekday}
          </div>
        ))}

        {Array.from({ length: offset }, (_, index) => (
          <div key={`pad-${index}`} />
        ))}

        {cells.map(({ day, date }) => {
          const isToday = date === today;
          const types = Array.from(new Set(days[date] ?? []));

          return (
            <button
              key={date}
              type="button"
              onClick={() => onOpenDay(date)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl text-base tabular outline-none transition",
                "focus-visible:ring-2 focus-visible:ring-ring active:bg-surface-muted",
                isToday ? "bg-primary/10 font-semibold text-primary" : "text-fg",
              )}
            >
              <span>{day}</span>
              <span className="flex h-3 items-center gap-0.5">
                {types.map((type) => {
                  const Icon = TYPE_ICON[type];
                  return <Icon key={type} size={11} className="text-fg-muted" />;
                })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
