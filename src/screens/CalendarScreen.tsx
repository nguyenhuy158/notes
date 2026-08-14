import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Note, NoteType } from "../api";
import { useI18n } from "../i18n";
import { monthString, parseDate, toDateString, todayString } from "../date";
import { cn } from "../ui/cn";
import { Camera, CalendarDays, ChevronLeft, ChevronRight, Grid3x3, Mic, PenLine, X } from "lucide-react";
import { MoodEmoji } from "../moodEmojis";
import { MOODS } from "../api";

const SAD_MOODS = new Set(["😔", "😡", "😰"]);

function recentDates(date: string, n: number): string[] {
  const { year, month, day } = parseDate(date);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(year, month, day - i);
    return toDateString(d.getFullYear(), d.getMonth(), d.getDate());
  });
}

function MoodNudge({ moods }: { moods: Record<string, string> }) {
  const { t } = useI18n();
  const shouldNudge = recentDates(todayString(), 3).every((date) => SAD_MOODS.has(moods[date]));
  if (!shouldNudge) return null;

  return (
    <div className="mb-3 rounded-ui border border-border bg-surface-muted p-3 text-sm text-fg">
      {t.mood_nudge_text}
    </div>
  );
}

function YearHeatmap({
  year,
  onOpenDay,
  onClose,
}: {
  year: number;
  onOpenDay: (date: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const today = todayString();

  useEffect(() => {
    api.year(String(year)).then((r) => setCounts(r.counts));
  }, [year]);

  function levelClass(count: number): string {
    if (count === 0) return "bg-surface-muted";
    if (count === 1) return "bg-primary/30";
    if (count === 2) return "bg-primary/60";
    return "bg-primary";
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg" onClick={onClose}>
      <div className="mx-auto max-w-md px-4 py-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-fg">{t.year_title(year)}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.calendar_done}
            className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }, (_, month) => {
            const offset = firstWeekdayOffset(year, month);
            const total = daysInMonth(year, month);
            const monthStr = monthString(year, month);

            return (
              <div key={month}>
                <p className="mb-1 text-center text-xs font-medium text-fg-muted">
                  {t.calendar_month_short(month + 1)}
                </p>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: offset }, (_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {Array.from({ length: total }, (_, i) => {
                    const day = i + 1;
                    const date = `${monthStr}-${String(day).padStart(2, "0")}`;
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => onOpenDay(date)}
                        className={cn(
                          "aspect-square rounded-[2px] transition hover:ring-1 hover:ring-primary",
                          levelClass(counts[date] ?? 0),
                          date === today && "ring-1 ring-primary",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

function MonthYearPicker({
  year,
  month,
  onPick,
  onClose,
}: {
  year: number;
  month: number;
  onPick: (year: number, month: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [pickYear, setPickYear] = useState(year);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-surface p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-fg">{t.calendar_pick_month_year}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.calendar_done}
            className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPickYear((y) => y - 1)}
            aria-label={t.calendar_prev_month}
            className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold tabular text-fg">{pickYear}</span>
          <button
            type="button"
            onClick={() => setPickYear((y) => y + 1)}
            aria-label={t.calendar_next_month}
            className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => i).map((m) => {
            const isSelected = pickYear === year && m === month;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onPick(pickYear, m)}
                className={cn(
                  "rounded-ui py-2 text-sm font-medium tabular transition",
                  isSelected ? "bg-primary text-primary-fg" : "hover:bg-surface-muted text-fg",
                )}
              >
                {t.calendar_month_short(m + 1)}
              </button>
            );
          })}
        </div>
      </div>
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [yearViewOpen, setYearViewOpen] = useState(false);

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
    // Lưới lịch trước đây dính sát mép trên, phần trống còn lại dồn hết
    // xuống dưới — nhìn lệch trên di động. Căn cả khối (kỷ niệm + header +
    // lưới) vào giữa khoảng trống còn lại sau BottomNav, thay vì ép riêng
    // lưới ngày (để "Kỷ niệm" vẫn đứng ngay trên header lịch, không tách rời).
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col justify-center px-4 py-4">
      <OnThisDay onOpenDay={onOpenDay} />
      <MoodNudge moods={moods} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label={t.calendar_prev_month}
          className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
        >
          ‹
        </button>
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label={t.calendar_pick_month_year}
            className="rounded-ui px-1.5 py-0.5 text-base font-semibold text-fg transition hover:bg-surface-muted"
          >
            {t.calendar_month(view.month + 1, view.year)}
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              aria-label={t.calendar_go_today}
              className="grid h-9 w-9 place-items-center rounded-ui text-primary transition hover:bg-surface-muted"
            >
              <CalendarDays size={16} />
            </button>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setYearViewOpen(true)}
            aria-label={t.calendar_year_view}
            className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <Grid3x3 size={16} />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label={t.calendar_next_month}
            className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            ›
          </button>
        </div>
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

      {Object.keys(moods).length > 0 && (
        <div className="mt-4 rounded-ui border border-border bg-surface p-3">
          <p className="mb-2 text-xs font-medium text-fg-muted">{t.calendar_mood_stats_title}</p>
          <div className="flex flex-wrap gap-3">
            {MOODS.map((m) => {
              const count = Object.values(moods).filter((mood) => mood === m).length;
              if (count === 0) return null;
              return (
                <span key={m} className="flex items-center gap-1">
                  <MoodEmoji mood={m} size={20} />
                  <span className="text-xs font-medium tabular text-fg-muted">{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {yearViewOpen && (
        <YearHeatmap
          year={view.year}
          onOpenDay={(date) => {
            setYearViewOpen(false);
            onOpenDay(date);
          }}
          onClose={() => setYearViewOpen(false)}
        />
      )}

      {pickerOpen && (
        <MonthYearPicker
          year={view.year}
          month={view.month}
          onPick={(year, month) => {
            setView({ year, month });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
