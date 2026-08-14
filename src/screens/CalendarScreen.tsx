import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Note, NoteType } from "../api";
import { useI18n } from "../i18n";
import { monthString, parseDate, todayString } from "../date";
import { cn } from "../ui/cn";
import { Camera, CalendarDays, Mic, PenLine } from "lucide-react";
import { MoodEmoji } from "../moodEmojis";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const TYPE_ICON: Record<NoteType, typeof PenLine> = {
  text: PenLine,
  audio: Mic,
  photo: Camera,
};

function firstWeekdayOffset(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function OnThisDay({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .onThisDay(todayString())
      .then((r) => !cancelled && setNotes(r.notes))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (notes.length === 0) return null;

  const thisYear = parseDate(todayString()).year;

  return (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
      {notes.map((note) => {
        const yearsAgo = thisYear - parseDate(note.date).year;
        return (
          <button
            key={note.id}
            type="button"
            onClick={() => onOpenDay(note.date)}
            className="w-40 shrink-0 rounded-2xl border border-border bg-surface p-3 text-left outline-none transition hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block text-xs font-medium text-primary">{t.on_this_day_title(yearsAgo)}</span>
            <span className="mt-1 block line-clamp-3 text-sm text-fg">
              {note.type === "text" ? note.text : note.type === "audio" ? "🎙️" : "📷"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CalendarScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { t } = useI18n();
  const today = todayString();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [days, setDays] = useState<Record<string, NoteType[]>>({});
  const [moods, setMoods] = useState<Record<string, string>>({});

  const month = monthString(view.year, view.month);

  useEffect(() => {
    let cancelled = false;
    api
      .days(month)
      .then((r) => {
        if (cancelled) return;
        setDays(r.days);
        setMoods(r.moods);
      })
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

  const currentMonth = parseDate(today);
  const isCurrentMonth = view.year === currentMonth.year && view.month === currentMonth.month;
  const goToday = () => setView({ year: currentMonth.year, month: currentMonth.month });

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
      <OnThisDay onOpenDay={onOpenDay} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label={t.calendar_prev_month}
          className="grid h-9 w-9 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
        >
          ‹
        </button>
        <span className="flex items-center gap-1.5">
          <span className="text-base font-semibold text-fg">{t.calendar_month(view.month + 1, view.year)}</span>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              aria-label={t.calendar_go_today}
              className="grid h-7 w-7 place-items-center rounded-ui text-primary transition hover:bg-surface-muted"
            >
              <CalendarDays size={16} />
            </button>
          )}
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
          const mood = moods[date];

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
              {mood ? (
                <MoodEmoji mood={mood} size={16} />
              ) : (
                <span className="flex h-3 items-center gap-0.5">
                  {types.map((type) => {
                    const Icon = TYPE_ICON[type];
                    return <Icon key={type} size={11} className="text-fg-muted" />;
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
