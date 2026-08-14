import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { Camera, Mic, PenLine, Search } from "lucide-react";
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

const MONTHS_PAGE = 6;

const TYPE_ICON: Record<NoteType, typeof PenLine> = {
  text: PenLine,
  audio: Mic,
  photo: Camera,
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
        setEntries(list);
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
  ];

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
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FILTERS.map(({ id, label, icon: Icon }) => {
              const active = id === typeFilter;
              return (
                <button
                  key={id ?? "all"}
                  type="button"
                  onClick={() => setTypeFilter(id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    active
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border text-fg-muted hover:bg-surface-muted",
                  )}
                >
                  {Icon && <Icon size={13} />}
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMoodFilter((prev) => (prev === m ? null : m))}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border transition",
                  moodFilter === m
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <MoodEmoji mood={m} size={18} />
              </button>
            ))}
            {knownTags.length > 0 && (
              <select
                value={tagFilter ?? ""}
                onChange={(e) => setTagFilter(e.target.value || null)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted outline-none"
              >
                <option value="">#{t.timeline_filter_all}</option>
                {knownTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading && (
            <p className="mt-4 text-sm text-fg-muted">{t.timeline_loading}</p>
          )}
          {!loading && filteredEntries.length === 0 && (
            <p className="mt-4 text-sm text-fg-muted">{t.timeline_empty}</p>
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
                          className="relative flex w-full items-center gap-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span
                            className={cn(
                              "absolute -left-5 h-3 w-3 rounded-full border-2 border-surface",
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

          {!loading && (
            <button
              type="button"
              onClick={() => setMonthsBack((m) => m + MONTHS_PAGE)}
              disabled={loadingMore}
              className="mt-5 w-full rounded-ui border border-dashed border-border py-2.5 text-center text-sm font-medium text-fg-muted transition hover:bg-surface-muted disabled:opacity-60"
            >
              {loadingMore ? t.timeline_loading_more : t.timeline_load_more}
            </button>
          )}
        </>
      )}
    </div>
  );
}
