import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { Camera, Flame, Mic, PenLine, Search, Video, X } from "lucide-react";
import { api, MOODS } from "../api";
import type { Note, NoteType } from "../api";
import { useI18n } from "../i18n";
import { MoodEmoji } from "../moodEmojis";
import {
  computeStreak,
  formatVi,
  monthString,
  parseDate,
  toJsDate,
  todayString,
} from "../date";
import { cn } from "../ui/cn";
import { EmptyState, Skeleton, SkeletonListRow } from "../ui/states";

const MONTHS_PAGE = 6;

const TYPE_ICON: Record<NoteType, typeof PenLine> = {
  text: PenLine,
  audio: Mic,
  photo: Camera,
  video: Video,
};

function pastMonths(count: number): string[] {
  const now = new Date();
  const list: string[] = [];
  for (let i = 0; i < count; i += 1) {
    list.push(monthString(now.getFullYear(), now.getMonth() - i));
  }
  return list;
}

type Entry = { date: string; types: NoteType[]; mood: string | null; tags: string[] };

export function TimelineScreen({
  onOpenDay,
}: {
  onOpenDay: (date: string) => void;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "vi" ? vi : enUS;
  const today = todayString();
  const [monthsBack, setMonthsBack] = useState(MONTHS_PAGE);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [typeFilter, setTypeFilter] = useState<NoteType | null>(null);
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api
      .tags()
      .then((r) => setKnownTags(r.tags.map((t) => t.tag)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (monthsBack === MONTHS_PAGE ? setLoading : setLoadingMore)(true);
    Promise.all(pastMonths(monthsBack).map((m) => api.days(m)))
      .then((results) => {
        if (cancelled) return;
        const days: Record<string, NoteType[]> = {};
        const moods: Record<string, string> = {};
        const tagsByDate: Record<string, string[]> = {};
        for (const r of results) {
          Object.assign(days, r.days);
          Object.assign(moods, r.moods);
          Object.assign(tagsByDate, r.tags);
        }
        const list = Object.entries(days)
          .map(([date, types]) => ({
            date,
            types,
            mood: moods[date] ?? null,
            tags: tagsByDate[date] ?? [],
          }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        // Khong co API tong so thang; tai them ma khong ra ngay moi = het du lieu.
        setEntries((prev) => {
          if (monthsBack > MONTHS_PAGE && list.length === prev.length) setExhausted(true);
          return list;
        });
        setStreak(computeStreak(new Set(Object.keys(days))));
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setLoadingMore(false);
      });
    return () => {
      cancelled = true;
    };
  }, [monthsBack]);

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

  const filteredEntries = useMemo(
    () =>
      entries
        .filter((e) => !typeFilter || e.types.includes(typeFilter))
        .filter((e) => !moodFilter || e.mood === moodFilter)
        .filter((e) => !tagFilter || e.tags.includes(tagFilter)),
    [entries, typeFilter, moodFilter, tagFilter],
  );

  const grouped = useMemo(() => {
    const groups: { month: string; entries: Entry[] }[] = [];
    for (const entry of filteredEntries) {
      const month = entry.date.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last?.month === month) last.entries.push(entry);
      else groups.push({ month, entries: [entry] });
    }
    return groups;
  }, [filteredEntries]);

  const FILTERS: { id: NoteType | null; label: string; icon: typeof PenLine | null }[] = [
    { id: null, label: t.timeline_filter_all, icon: null },
    { id: "text", label: t.compose_tab_text, icon: PenLine },
    { id: "audio", label: t.compose_tab_audio, icon: Mic },
    { id: "photo", label: t.compose_tab_photo, icon: Camera },
    { id: "video", label: t.compose_tab_video, icon: Video },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{t.timeline_title}</h1>
        {streak > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg">
            <Flame size={13} aria-hidden="true" className="text-primary" />
            {t.timeline_streak(streak)}
          </span>
        )}
      </div>

      {/* Sticky: cuon dai van doi duoc bo loc/tim kiem ma khong phai keo len dau. */}
      <div className="sticky top-0 z-10 -mx-4 mt-3 bg-bg/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.timeline_search_placeholder}
            placeholder={t.timeline_search_placeholder}
            className="h-11 w-full rounded-ui border border-border bg-surface pl-9 pr-11 text-base text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pointer-fine:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t.timeline_search_clear}
              className="absolute right-0.5 top-1/2 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:text-fg"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {!query.trim() && (
          <>
            <div
              role="group"
              aria-label={t.timeline_filter_type}
              className="mt-2 flex flex-wrap gap-1.5"
            >
              {FILTERS.map(({ id, label, icon: Icon }) => {
                const active = id === typeFilter;
                return (
                  <button
                    key={id ?? "all"}
                    type="button"
                    onClick={() => setTypeFilter(id)}
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition active:scale-[0.98]",
                      active
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-border text-fg-muted hover:bg-surface-muted",
                    )}
                  >
                    {Icon && <Icon size={13} aria-hidden="true" />}
                    {label}
                  </button>
                );
              })}
            </div>

            <div
              role="group"
              aria-label={t.timeline_filter_mood}
              className="mt-1.5 flex flex-wrap items-center gap-1"
            >
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoodFilter((prev) => (prev === m ? null : m))}
                  aria-pressed={moodFilter === m}
                  aria-label={t.timeline_filter_mood_name(m)}
                  className={cn(
                    "grid h-10 w-10 cursor-pointer place-items-center rounded-full border transition active:scale-95",
                    moodFilter === m
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-surface-muted",
                  )}
                >
                  <MoodEmoji mood={m} size={20} />
                </button>
              ))}
            </div>

            {knownTags.length > 0 && (
              <div
                role="group"
                aria-label={t.timeline_filter_tag}
                className="mt-1.5 flex flex-wrap gap-1.5"
              >
                {knownTags.map((tag) => {
                  const active = tagFilter === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagFilter(active ? null : tag)}
                      aria-pressed={active}
                      className={cn(
                        "min-h-8 cursor-pointer rounded-full border px-3 text-xs font-medium transition active:scale-[0.98]",
                        active
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border text-fg-muted hover:bg-surface-muted",
                      )}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {query.trim() ? (
        <div className="mt-2">
          {searching && (
            <div className="space-y-2" aria-hidden="true">
              <Skeleton className="h-16 w-full rounded-ui" />
              <Skeleton className="h-16 w-full rounded-ui" />
            </div>
          )}
          <p aria-live="polite" className="sr-only">
            {searching ? t.timeline_searching : t.timeline_note_count(searchResults.length)}
          </p>
          {!searching && searchResults.length === 0 && (
            <EmptyState title={t.timeline_search_empty} icon={<Search size={22} />} />
          )}
          <ul className="space-y-2">
            {searchResults.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onOpenDay(note.date)}
                  className="block w-full cursor-pointer rounded-ui border border-border bg-surface p-3 text-left outline-none transition hover:bg-surface-muted active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring"
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
            <div className="mt-2">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonListRow key={i} avatar />
              ))}
            </div>
          )}
          {!loading && filteredEntries.length === 0 && (
            <EmptyState
              className="mt-4"
              title={t.timeline_empty}
              description={t.day_empty_desc}
              icon={<PenLine size={22} />}
            />
          )}

          {!loading &&
            grouped.map((group) => {
              const { year, month } = parseDate(`${group.month}-01`);

              return (
                <div key={group.month} className="mt-5">
                  <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    {t.calendar_month(month + 1, year)}
                  </h2>

                  <div className="relative pl-5">
                    <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />

                    {group.entries.map(({ date, types, mood }) => {
                      const isToday = date === today;
                      const uniqueTypes = Array.from(new Set(types));

                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => onOpenDay(date)}
                          className="relative -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-ui px-2 py-2.5 text-left outline-none transition hover:bg-surface-muted active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span
                            className={cn(
                              "absolute -left-3 h-3 w-3 rounded-full border-2 border-bg",
                              isToday ? "bg-primary" : "bg-fg-muted",
                            )}
                          />
                          {mood ? (
                            <MoodEmoji mood={mood} size={22} />
                          ) : (
                            <span className="flex w-[22px] shrink-0 items-center justify-center gap-0.5">
                              {uniqueTypes.map((type) => {
                                const Icon = TYPE_ICON[type];
                                return <Icon key={type} size={13} className="text-fg-muted" />;
                              })}
                            </span>
                          )}
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
                            {t.timeline_note_count(types.length)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {!loading && filteredEntries.length > 0 && !exhausted && (
            <button
              type="button"
              onClick={() => setMonthsBack((m) => m + MONTHS_PAGE)}
              disabled={loadingMore}
              className="mt-5 min-h-11 w-full cursor-pointer rounded-ui border border-dashed border-border text-center text-sm font-medium text-fg-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? t.timeline_loading_more : t.timeline_load_more}
            </button>
          )}
          {exhausted && filteredEntries.length > 0 && (
            <p className="mt-5 text-center text-xs text-fg-muted">{t.timeline_all_loaded}</p>
          )}
        </>
      )}
    </div>
  );
}
