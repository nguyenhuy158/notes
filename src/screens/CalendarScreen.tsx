import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Note, NoteType } from "../api";
import { useI18n } from "../i18n";
import { computeLongestStreak, monthString, parseDate, toDateString, todayString } from "../date";
import { cn } from "../ui/cn";
import { Camera, CalendarDays, ChevronLeft, ChevronRight, Grid3x3, Mic, PenLine, Video } from "lucide-react";
import { Modal } from "../ui/Modal";
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
  const [moods, setMoods] = useState<Record<string, string>>({});
  const [lastYearCount, setLastYearCount] = useState<number | null>(null);
  const today = todayString();

  useEffect(() => {
    api.year(String(year)).then((r) => {
      setCounts(r.counts);
      setMoods(r.moods);
    });
    api.year(String(year - 1)).then((r) => {
      setLastYearCount(Object.values(r.counts).reduce((a, b) => a + b, 0));
    });
  }, [year]);

  const totalNotes = Object.values(counts).reduce((a, b) => a + b, 0);
  const longestStreak = computeLongestStreak(new Set(Object.keys(counts)));
  const topMood = Object.entries(
    Object.values(moods).reduce<Record<string, number>>((acc, m) => {
      acc[m] = (acc[m] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0]?.[0];

  function levelClass(count: number): string {
    if (count === 0) return "bg-surface-muted";
    if (count === 1) return "bg-primary/30";
    if (count === 2) return "bg-primary/60";
    return "bg-primary";
  }

  return (
    <Modal title={t.year_title(year)} onClose={onClose} closeLabel={t.calendar_close} variant="full">
      <>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-ui border border-border bg-surface p-3 text-sm">
          <div>
            <p className="text-xs text-fg-muted">{t.year_stats_notes(totalNotes)}</p>
            {lastYearCount !== null && (
              <p className="text-xs text-fg-muted">
                {t.year_stats_vs_last_year(year - 1)}: {lastYearCount}
              </p>
            )}
          </div>
          <div>
            {topMood && (
              <p className="flex items-center gap-1 text-xs text-fg-muted">
                {t.year_stats_top_mood}: <MoodEmoji mood={topMood} size={16} />
              </p>
            )}
            <p className="text-xs text-fg-muted">{t.year_stats_longest_streak(longestStreak)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
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
                        aria-label={t.heatmap_day_label(date, counts[date] ?? 0)}
                        className={cn(
                          "aspect-square cursor-pointer rounded-[2px] transition hover:ring-1 hover:ring-primary",
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

        {/* Chu giai: o dam/nhat chi khac nhau ve mau, khong co legend thi khong doc duoc. */}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-fg-muted">
          <span>{t.heatmap_legend_less}</span>
          {[0, 1, 2, 3].map((level) => (
            <span
              key={level}
              aria-hidden="true"
              className={cn("h-3 w-3 rounded-[2px]", levelClass(level))}
            />
          ))}
          <span>{t.heatmap_legend_more}</span>
        </div>
      </>
    </Modal>
  );
}

const TYPE_ICON: Record<NoteType, typeof PenLine> = {
  text: PenLine,
  audio: Mic,
  photo: Camera,
  video: Video,
};

/** Icon + chu cho note khong phai text (truoc day dung emoji 🎙️/🎬/📷). */
function TypeBadge({ type }: { type: NoteType }) {
  const { t } = useI18n();
  const Icon = TYPE_ICON[type];
  const label =
    type === "audio" ? t.compose_tab_audio : type === "video" ? t.compose_tab_video : t.compose_tab_photo;
  return (
    <span className="flex items-center gap-1.5 text-fg-muted">
      <Icon size={16} aria-hidden="true" />
      {label}
    </span>
  );
}

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
            className="w-40 shrink-0 cursor-pointer rounded-2xl border border-border bg-surface p-3 text-left outline-none transition hover:bg-surface-muted active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block text-xs font-medium text-primary">{t.on_this_day_title(yearsAgo)}</span>
            <span className="mt-1 block line-clamp-3 text-sm text-fg">
              {note.type === "text" ? (
                note.text
              ) : (
                <TypeBadge type={note.type} />
              )}
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
    <Modal title={t.calendar_pick_month_year} onClose={onClose} closeLabel={t.calendar_close}>
      <>
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPickYear((y) => y - 1)}
            aria-label={String(pickYear - 1)}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="text-base font-semibold tabular text-fg">{pickYear}</span>
          <button
            type="button"
            onClick={() => setPickYear((y) => y + 1)}
            aria-label={String(pickYear + 1)}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <ChevronRight size={18} aria-hidden="true" />
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
                aria-pressed={isSelected}
                className={cn(
                  "min-h-11 cursor-pointer rounded-ui text-sm font-medium tabular transition active:scale-[0.98]",
                  isSelected ? "bg-primary text-primary-fg" : "hover:bg-surface-muted text-fg",
                )}
              >
                {t.calendar_month_short(m + 1)}
              </button>
            );
          })}
        </div>
      </>
    </Modal>
  );
}

export function CalendarScreen({
  onOpenDay,
  onOpenTag,
}: {
  onOpenDay: (date: string) => void;
  onOpenTag: (tag: string) => void;
}) {
  const { t } = useI18n();
  const today = todayString();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [days, setDays] = useState<Record<string, NoteType[]>>({});
  const [moods, setMoods] = useState<Record<string, string>>({});
  const [tagsByDate, setTagsByDate] = useState<Record<string, string[]>>({});
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
        setTagsByDate(r.tags);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [month]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tags of Object.values(tagsByDate)) {
      for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [tagsByDate]);

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
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted active:scale-95"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label={t.calendar_pick_month_year}
            className="min-h-10 cursor-pointer rounded-ui px-2 text-lg font-semibold tracking-tight text-fg transition hover:bg-surface-muted"
          >
            {t.calendar_month(view.month + 1, view.year)}
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              aria-label={t.calendar_go_today}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-primary transition hover:bg-surface-muted active:scale-95"
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
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted active:scale-95"
          >
            <Grid3x3 size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label={t.calendar_next_month}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted active:scale-95"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {t.calendar_weekdays().map((weekday) => (
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
              aria-label={t.calendar_day_label(date, (days[date] ?? []).length)}
              className={cn(
                "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-base tabular outline-none transition",
                "focus-visible:ring-2 focus-visible:ring-ring active:scale-95 active:bg-surface-muted",
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

      {tagCounts.length > 0 && (
        <div className="mt-3 rounded-ui border border-border bg-surface p-3">
          <p className="mb-2 text-xs font-medium text-fg-muted">{t.calendar_tag_stats_title}</p>
          <div className="flex flex-wrap gap-2">
            {tagCounts.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => onOpenTag(tag)}
                className="min-h-8 cursor-pointer rounded-full bg-surface-muted px-2.5 text-xs font-medium text-fg-muted transition hover:bg-primary/15 hover:text-primary active:scale-[0.98]"
              >
                #{tag} · {count}
              </button>
            ))}
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
