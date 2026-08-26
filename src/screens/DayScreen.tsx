import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, MOODS, type Mood, type Note } from "../api";
import { useI18n } from "../i18n";
import { MoodEmoji } from "../moodEmojis";
import { formatTime, formatVi, parseDate, todayString, toDateString } from "../date";
import { Button } from "../ui/Button";
import { HeaderBar } from "../ui/HeaderBar";
import { Textarea } from "../ui/Input";
import { EmptyState, LoadingState, Skeleton } from "../ui/states";
import { StickerGhost } from "../stickers";
import { useToast } from "../ui/Toast";
import { useDialog } from "../ui/ConfirmDialog";
import { Fab } from "../ui/BottomNav";
import { cn } from "../ui/cn";
import { isNetworkError, queueUpdate } from "../offlineQueue";
import { isNoteLocked, setNoteLocked } from "../noteLocks";
import { isPinSet, verifyPin } from "../pinLock";
import { renderLite } from "../markdownLite";
import { PlaceAutocomplete } from "../ui/PlaceAutocomplete";
import { TagChipInput } from "../ui/TagChipInput";
import { AudioPlayer } from "../ui/AudioPlayer";
import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Lock,
  MapPin,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";

const AUTOSAVE_DELAY_MS = 1500;

/** Mot dong trong menu "thêm": min-h-11 cho du tam bam tren mobile. */
function MenuItem({
  icon,
  onClick,
  danger,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-3 text-left text-sm transition",
        danger ? "text-danger hover:bg-danger-soft" : "text-fg hover:bg-surface-muted",
      )}
    >
      <span className={cn("shrink-0", danger ? "" : "text-fg-muted")} aria-hidden="true">
        {icon}
      </span>
      {children}
    </button>
  );
}

function NoteCard({
  note,
  canMoveUp,
  canMoveDown,
  onMove,
  onDeleted,
  onRestored,
  onSaved,
  onMovedToOtherDate,
  onOpenTag,
}: {
  note: Note;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  onDeleted: (id: string) => void;
  onRestored: (note: Note) => void;
  onSaved: (note: Note) => void;
  onMovedToOtherDate: (id: string) => void;
  onOpenTag: (tag: string) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const dialog = useDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const noteRef = useRef(note);
  noteRef.current = note;

  async function save() {
    if (draftRef.current === noteRef.current.text) return;
    if (note.type === "text" && !draftRef.current.trim()) return;
    setBusy(true);
    try {
      const r = await api.updateText(noteRef.current.id, draftRef.current);
      onSaved(r.note);
      setDirty(false);
      setSavedAt(r.note.updatedAt);
    } catch (err) {
      if (isNetworkError(err)) {
        queueUpdate({ noteId: noteRef.current.id, text: draftRef.current });
        toast.info(t.offline_queued);
        setDirty(false);
      } else {
        toast.error(t.day_save_failed);
      }
    } finally {
      setBusy(false);
    }
  }

  function onDraftChange(value: string) {
    setDraft(value);
    setDirty(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(save, AUTOSAVE_DELAY_MS);
  }

  function closeEditor() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    // Đóng ô sửa mà còn thay đổi chưa lưu (chưa hết debounce) -> lưu ngay,
    // đừng để mất nội dung vừa gõ.
    if (dirty) save();
    setEditing(false);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  /* Xoa mem + toast Hoan tac thay cho window.confirm: nhanh hon, va vi
     `deleted_at` la xoa mem nen restoreNote lay lai duoc nguyen ven. */
  async function remove() {
    try {
      await api.deleteNote(note.id);
      onDeleted(note.id);
      toast.info(t.day_deleted_undo, {
        action: {
          label: t.undo,
          onClick: () => {
            api
              .restoreNote(note.id)
              .then((r) => onRestored(r.note))
              .catch(() => toast.error(t.trash_restore_failed));
          },
        },
      });
    } catch {
      toast.error(t.day_delete_failed);
    }
  }

  async function replaceMedia(file: File) {
    setReplacing(true);
    try {
      const r = await api.replaceMedia(note.id, file, file.name);
      onSaved(r.note);
    } catch {
      toast.error(t.day_replace_failed);
    } finally {
      setReplacing(false);
    }
  }

  const [moodPickerOpen, setMoodPickerOpen] = useState(false);

  async function changeMood(mood: Mood | null) {
    setMoodPickerOpen(false);
    if (mood === note.mood) return;
    try {
      const r = await api.updateMood(note.id, mood);
      onSaved(r.note);
    } catch {
      toast.error(t.day_save_failed);
    }
  }

  async function togglePin() {
    try {
      const r = await api.togglePin(note.id, !note.pinned);
      onSaved(r.note);
    } catch {
      toast.error(t.day_save_failed);
    }
  }

  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagsDraft, setTagsDraft] = useState<string[]>(note.tags);

  async function saveTags(next: string[]) {
    setTagsDraft(next);
    try {
      const r = await api.updateTags(note.id, next);
      onSaved(r.note);
    } catch {
      toast.error(t.day_tags_save_failed);
    }
  }

  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function shareNote() {
    setSharePanelOpen(true);
    if (note.shareToken) return;
    setSharing(true);
    try {
      const r = await api.enableShare(note.id);
      onSaved({ ...note, shareToken: r.shareToken });
      await navigator.clipboard.writeText(`${window.location.origin}/s/${r.shareToken}`);
      toast.success(t.day_share_on);
    } catch {
      toast.error(t.day_share_failed);
    } finally {
      setSharing(false);
    }
  }

  async function copyShareLink() {
    if (!note.shareToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}/s/${note.shareToken}`);
    toast.success(t.day_share_on);
  }

  async function disableShare() {
    try {
      await api.disableShare(note.id);
      onSaved({ ...note, shareToken: null });
      toast.success(t.day_share_off);
    } catch {
      toast.error(t.day_share_failed);
    } finally {
      setSharePanelOpen(false);
    }
  }

  const [locationOpen, setLocationOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState(note.location ?? "");

  async function saveLocation() {
    try {
      const r = await api.updateLocation(note.id, locationDraft.trim());
      onSaved(r.note);
      setLocationOpen(false);
    } catch {
      toast.error(t.day_location_save_failed);
    }
  }

  const [moveDateOpen, setMoveDateOpen] = useState(false);

  async function moveDate(newDate: string) {
    if (!newDate || newDate === note.date) {
      setMoveDateOpen(false);
      return;
    }
    try {
      await api.moveNoteDate(note.id, newDate);
      onMovedToOtherDate(note.id);
    } catch {
      toast.error(t.day_move_date_failed);
    }
  }

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Esc + bam ra ngoai de dong: truoc day menu chi dong khi bam dung 1 item.
  useEffect(() => {
    if (!moreMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreMenuOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMoreMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [moreMenuOpen]);

  const [locked, setLocked] = useState(() => isNoteLocked(note.id));
  const [revealed, setRevealed] = useState(false);

  async function toggleLock() {
    if (!locked && !isPinSet()) {
      toast.error(t.day_lock_needs_pin);
      return;
    }
    if (!locked) {
      setNoteLocked(note.id, true);
      setLocked(true);
      setRevealed(false);
      return;
    }
    const pin = await askPin();
    if (pin === null) return;
    if (!(await verifyPin(pin))) {
      toast.error(t.pin_wrong);
      return;
    }
    setNoteLocked(note.id, false);
    setLocked(false);
  }

  function askPin() {
    return dialog.prompt({
      title: t.pin_enter_title,
      confirmLabel: t.pin_unlock,
      input: { label: t.pin_enter_title, type: "password", inputMode: "numeric", maxLength: 6 },
    });
  }

  async function reveal() {
    const pin = await askPin();
    if (pin === null) return;
    if (await verifyPin(pin)) setRevealed(true);
    else toast.error(t.pin_wrong);
  }

  if (locked && !revealed) {
    return (
      <button
        type="button"
        onClick={reveal}
        className="flex w-full items-center gap-2 rounded-ui border border-border bg-surface p-3 text-left text-sm text-fg-muted transition hover:bg-surface-muted"
      >
        <Lock size={16} />
        {t.day_locked_tap_to_view}
      </button>
    );
  }

  return (
    <div className="rounded-ui border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <button
            type="button"
            onClick={() => setMoodPickerOpen((v) => !v)}
            aria-label={t.day_mood}
            aria-expanded={moodPickerOpen}
            className="-ml-1 grid h-10 w-10 cursor-pointer place-items-center rounded-full transition hover:bg-surface-muted active:scale-95"
          >
            {note.mood ? <MoodEmoji mood={note.mood} size={20} /> : <Plus size={16} aria-hidden="true" />}
          </button>
          {formatTime(note.createdAt)}
        </span>
        {/* Chi 2 nut o ngoai (ghim + thêm): 6 nut 40px truoc day khong vua the
            card rong max-w-md tren dien thoai. Con lai gom vao menu. */}
        <div className="flex items-center gap-0.5">
          {note.type !== "text" && (
            <input
              ref={fileInputRef}
              type="file"
              accept={
                note.type === "audio" ? "audio/*" : note.type === "video" ? "video/*" : "image/*"
              }
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) replaceMedia(file);
                e.target.value = "";
              }}
            />
          )}
          <button
            type="button"
            onClick={togglePin}
            aria-label={note.pinned ? t.day_unpin : t.day_pin}
            aria-pressed={note.pinned}
            className={cn(
              "grid h-10 w-10 cursor-pointer place-items-center rounded-ui transition hover:bg-surface-muted active:scale-95",
              note.pinned ? "text-primary" : "text-fg-muted",
            )}
          >
            {note.pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMoreMenuOpen((v) => !v)}
              aria-label={t.day_more}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              className={cn(
                "grid h-10 w-10 cursor-pointer place-items-center rounded-ui transition hover:bg-surface-muted active:scale-95",
                note.location || locked ? "text-primary" : "text-fg-muted",
              )}
            >
              <MoreHorizontal size={16} />
            </button>
            {moreMenuOpen && (
              <div
                role="menu"
                aria-label={t.day_more}
                className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-ui border border-border bg-surface py-1 shadow-lg"
                onClick={() => setMoreMenuOpen(false)}
              >
                <MenuItem icon={<Tag size={15} />} onClick={() => setTagsOpen((v) => !v)}>
                  {t.day_tags}
                </MenuItem>
                <MenuItem icon={<Share2 size={15} />} onClick={shareNote}>
                  {t.day_share}
                </MenuItem>
                <MenuItem
                  icon={<MapPin size={15} className={note.location ? "text-primary" : undefined} />}
                  onClick={() => setLocationOpen((v) => !v)}
                >
                  {t.day_location}
                </MenuItem>
                <MenuItem
                  icon={<CalendarClock size={15} />}
                  onClick={() => setMoveDateOpen((v) => !v)}
                >
                  {t.day_move_date}
                </MenuItem>
                <MenuItem
                  icon={<Lock size={15} className={locked ? "text-primary" : undefined} />}
                  onClick={toggleLock}
                >
                  {locked ? t.day_unlock : t.day_lock}
                </MenuItem>
                {canMoveUp && (
                  <MenuItem icon={<ChevronUp size={15} />} onClick={() => onMove(note.id, -1)}>
                    {t.day_move_up}
                  </MenuItem>
                )}
                {canMoveDown && (
                  <MenuItem icon={<ChevronDown size={15} />} onClick={() => onMove(note.id, 1)}>
                    {t.day_move_down}
                  </MenuItem>
                )}
                {note.type !== "text" && (
                  <MenuItem
                    icon={<RefreshCw size={15} className={replacing ? "animate-spin" : ""} />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t.day_replace_media}
                  </MenuItem>
                )}
                <MenuItem icon={<Trash2 size={15} />} onClick={remove} danger>
                  {t.day_delete}
                </MenuItem>
              </div>
            )}
          </div>
        </div>
      </div>

      {tagsOpen && (
        <div className="mt-2 space-y-2">
          <TagChipInput autoFocus tags={tagsDraft} onChange={saveTags} />
          <Button size="sm" variant="ghost" onClick={() => setTagsOpen(false)}>
            {t.day_cancel}
          </Button>
        </div>
      )}

      {!tagsOpen && note.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onOpenTag(tag)}
              className="min-h-8 cursor-pointer rounded-full bg-surface-muted px-2.5 text-xs font-medium text-fg-muted transition hover:bg-primary/15 hover:text-primary"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {locationOpen && (
        <div className="mt-2 flex items-center gap-2">
          <MapPin size={14} className="shrink-0 text-fg-muted" />
          <PlaceAutocomplete
            autoFocus
            value={locationDraft}
            onChange={setLocationDraft}
            onSubmit={saveLocation}
            placeholder={t.day_location_placeholder}
            className="min-w-0 flex-1 rounded-ui border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button size="sm" onClick={saveLocation}>
            {t.day_cancel}
          </Button>
        </div>
      )}

      {!locationOpen && note.location && (
        <p className="mt-2 flex items-center gap-1 text-xs text-fg-muted">
          <MapPin size={12} />
          {note.location}
        </p>
      )}

      {moveDateOpen && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            autoFocus
            defaultValue={note.date}
            onChange={(e) => moveDate(e.target.value)}
            className="min-w-0 flex-1 rounded-ui border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button size="sm" variant="ghost" onClick={() => setMoveDateOpen(false)}>
            {t.day_cancel}
          </Button>
        </div>
      )}

      {sharePanelOpen && (
        <div className="mt-2 flex items-center gap-2 rounded-ui bg-surface-muted p-2">
          <Share2 size={14} className="shrink-0 text-fg-muted" />
          <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">
            {sharing
              ? t.share_loading
              : note.shareToken
                ? `${window.location.origin}/s/${note.shareToken}`
                : ""}
          </span>
          {note.shareToken && !sharing && (
            <>
              <Button size="sm" variant="ghost" onClick={copyShareLink}>
                {t.day_share}
              </Button>
              <button
                type="button"
                onClick={disableShare}
                aria-label={t.day_share_off}
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface hover:text-danger"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      )}

      {moodPickerOpen && (
        <div className="mt-2 flex flex-wrap gap-1">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeMood(m)}
              aria-label={m}
              aria-pressed={note.mood === m}
              className={cn(
                "grid h-10 w-10 cursor-pointer place-items-center rounded-full transition active:scale-95 hover:bg-surface-muted",
                note.mood === m && "ring-2 ring-primary",
              )}
            >
              <MoodEmoji mood={m} size={20} />
            </button>
          ))}
          {note.mood && (
            <button
              type="button"
              onClick={() => changeMood(null)}
              aria-label={t.day_mood_clear}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-fg-muted transition hover:bg-surface-muted"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {note.type === "audio" && note.mediaUrl && (
        <AudioPlayer src={note.mediaUrl} className="mt-2" />
      )}

      {note.type === "photo" && note.mediaUrls.length > 0 && (
        <div
          className={cn(
            "mt-2 flex gap-2",
            note.mediaUrls.length > 1 ? "overflow-x-auto" : "",
          )}
        >
          {note.mediaUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt={t.photo_alt(note.date)}
              loading="lazy"
              className={cn(
                "rounded-ui object-cover",
                note.mediaUrls.length > 1
                  ? "h-56 w-56 shrink-0"
                  : "max-h-80 w-full",
              )}
            />
          ))}
        </div>
      )}

      {note.type === "video" && note.mediaUrl && (
        <video
          src={note.mediaUrl}
          controls
          preload="metadata"
          aria-label={t.video_label(note.date)}
          className="mt-2 max-h-80 w-full rounded-ui bg-black"
        />
      )}

      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={note.type === "text" ? 4 : 2}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={closeEditor}>
              {t.day_cancel}
            </Button>
            <span className="text-xs text-fg-muted">
              {busy
                ? t.day_saving
                : dirty
                  ? t.day_unsaved
                  : savedAt
                    ? t.day_saved_at(formatTime(savedAt))
                    : t.day_saved}
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={t.day_edit_text}
          className={cn(
            "mt-1 -mx-1 block w-[calc(100%+0.5rem)] cursor-pointer rounded-ui px-1 py-0.5 text-left text-sm outline-none transition hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring",
            note.text ? "text-fg" : "text-fg-muted",
          )}
        >
          {note.text ? renderLite(note.text) : note.type !== "text" ? t.day_add_caption : ""}
        </button>
      )}
    </div>
  );
}

function shiftDate(date: string, deltaDays: number): string {
  const { year, month, day } = parseDate(date);
  const d = new Date(year, month, day + deltaDays);
  return toDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

export function DayScreen({
  date,
  onBack,
  onCompose,
  onNavigate,
  onOpenTag,
}: {
  date: string;
  onBack: () => void;
  onCompose: (date: string) => void;
  onNavigate: (date: string) => void;
  onOpenTag: (tag: string) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const isToday = date === todayString();

  function fetchSummary() {
    setSummaryLoading(true);
    setSummary(null);
    api
      .summary(date)
      .then((r) => setSummary(r.summary))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }

  useEffect(() => {
    setNotes(null);
    setSummary(null);
    setSummaryLoading(false);
    api
      .notes(date)
      .then((r) => {
        setNotes(r.notes);
        // Chỉ fetch summary khi có ≥2 note text (server cũng check, nhưng skip
        // request luôn nếu biết trước không đủ — tiết kiệm 1 round-trip).
        if (r.notes.filter((n) => n.type === "text" && n.text.trim()).length >= 2) {
          fetchSummary();
        }
      })
      .catch(() => toast.error(t.day_load_failed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="pb-24">
      <HeaderBar
        title={formatVi(date)}
        leading={
          <button
            type="button"
            onClick={onBack}
            aria-label={t.day_back}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <ArrowLeft size={18} />
          </button>
        }
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigate(shiftDate(date, -1))}
              aria-label={t.day_prev}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(shiftDate(date, 1))}
              disabled={isToday}
              aria-label={t.day_next}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />

      <div className="space-y-3 px-4 py-4">
        {(summaryLoading || summary) && (
          <div className="rounded-ui border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                <Sparkles size={14} className="text-primary" />
                {t.day_summary_title}
              </span>
              {summary && (
                <button
                  type="button"
                  onClick={fetchSummary}
                  disabled={summaryLoading}
                  aria-label={t.day_summary_retry}
                  className="grid h-10 w-10 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={14} className={summaryLoading ? "animate-spin" : ""} />
                </button>
              )}
            </div>
            {summaryLoading ? (
              <div className="mt-1.5 space-y-1.5" role="status" aria-label={t.day_summary_loading}>
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-fg">{summary}</p>
            )}
          </div>
        )}

        {notes === null ? (
          <LoadingState />
        ) : notes.length === 0 ? (
          <EmptyState
            icon={<StickerGhost size={40} />}
            title={t.day_empty_title}
            description={t.day_empty_desc}
          />
        ) : (
          notes.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              canMoveUp={index > 0}
              canMoveDown={index < notes.length - 1}
              onMove={(id, direction) => {
                setNotes((prev) => {
                  if (!prev) return prev;
                  const from = prev.findIndex((n) => n.id === id);
                  const to = from + direction;
                  if (from < 0 || to < 0 || to >= prev.length) return prev;
                  const next = [...prev];
                  [next[from], next[to]] = [next[to], next[from]];
                  api.reorderNotes(next.map((n) => n.id)).catch(() => toast.error(t.day_save_failed));
                  return next;
                });
              }}
              onDeleted={(id) => setNotes((prev) => (prev ?? []).filter((n) => n.id !== id))}
              /* ponytail: hoan tac chi them lai vao cuoi danh sach, khong tra
                 dung vi tri cu — mo lai ngay la dung thu tu server. */
              onRestored={(restored) => setNotes((prev) => [...(prev ?? []), restored])}
              onMovedToOtherDate={(id) => setNotes((prev) => (prev ?? []).filter((n) => n.id !== id))}
              onOpenTag={onOpenTag}
              onSaved={(updated) =>
                setNotes((prev) => (prev ?? []).map((n) => (n.id === updated.id ? updated : n)))
              }
            />
          ))
        )}
      </div>

      <Fab label={t.day_add} icon={<Plus size={22} />} aboveNav={false} onClick={() => onCompose(date)} />
    </div>
  );
}
