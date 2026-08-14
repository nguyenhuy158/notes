import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { monthString, todayString } from "../date";
import { cn } from "../ui/cn";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function firstWeekdayOffset(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function CalendarScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const today = todayString();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [days, setDays] = useState<Record<string, number>>({});

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
          aria-label="Tháng trước"
          className="grid h-9 w-9 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
        >
          ‹
        </button>
        <span className="text-base font-semibold text-fg">
          Tháng {view.month + 1} / {view.year}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Tháng sau"
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
          const count = days[date] ?? 0;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onOpenDay(date)}
              className={cn(
                "relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-ui text-sm tabular outline-none transition",
                "focus-visible:ring-2 focus-visible:ring-ring active:bg-surface-muted",
                isToday ? "font-semibold text-primary" : "text-fg",
              )}
            >
              <span>{day}</span>
              {count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
