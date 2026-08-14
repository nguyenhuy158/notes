import { useEffect, useRef, useState } from "react";
import { api, MOODS, type Mood, type Note } from "../api";
import { useI18n } from "../i18n";
import { MoodEmoji } from "../moodEmojis";
import { formatTime, formatVi, parseDate, todayString, toDateString } from "../date";
import { Button } from "../ui/Button";
import { HeaderBar } from "../ui/HeaderBar";
import { Textarea } from "../ui/Input";
import { EmptyState, LoadingState } from "../ui/states";
import { StickerGhost } from "../stickers";
import { useToast } from "../ui/Toast";
import { Fab } from "../ui/BottomNav";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, RefreshCw, Trash2 } from "lucide-react";

const AUTOSAVE_DELAY_MS = 1500;

function NoteCard({
  note,
  canMoveUp,
  canMoveDown,
  onMove,
  onDeleted,
  onSaved,
}: {
  note: Note;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  onDeleted: (id: string) => void;
  onSaved: (note: Note) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
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
    if (!draftRef.current.trim() || draftRef.current === noteRef.current.text) return;
    setBusy(true);
    try {
      const r = await api.updateText(noteRef.current.id, draftRef.current);
      onSaved(r.note);
      setDirty(false);
      setSavedAt(r.note.updatedAt);
    } catch {
      toast.error(t.day_save_failed);
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

  async function remove() {
    if (!window.confirm(t.day_delete_confirm)) return;
    try {
      await api.deleteNote(note.id);
      onDeleted(note.id);
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

  return (
    <div className="rounded-ui border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <button
            type="button"
            onClick={() => setMoodPickerOpen((v) => !v)}
            aria-label={t.day_mood}
            className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-surface-muted"
          >
            {note.mood ? <MoodEmoji mood={note.mood} size={18} /> : <span className="text-fg-muted">+</span>}
          </button>
          {formatTime(note.createdAt)}
        </span>
        <div className="flex items-center gap-0.5">
          {canMoveUp && (
            <button
              type="button"
              onClick={() => onMove(note.id, -1)}
              aria-label={t.day_move_up}
              className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
            >
              <ChevronUp size={16} />
            </button>
          )}
          {canMoveDown && (
            <button
              type="button"
              onClick={() => onMove(note.id, 1)}
              aria-label={t.day_move_down}
              className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
            >
              <ChevronDown size={16} />
            </button>
          )}
          {note.type !== "text" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={note.type === "audio" ? "audio/*" : "image/*"}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) replaceMedia(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={replacing}
                aria-label={t.day_replace_media}
                className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted disabled:opacity-50"
              >
                <RefreshCw size={15} className={replacing ? "animate-spin" : ""} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={remove}
            aria-label={t.day_delete}
            className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted hover:text-danger"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {moodPickerOpen && (
        <div className="mt-2 flex flex-wrap gap-1">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeMood(m)}
              className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-surface-muted"
            >
              <MoodEmoji mood={m} size={20} />
            </button>
          ))}
          {note.mood && (
            <button
              type="button"
              onClick={() => changeMood(null)}
              aria-label={t.day_mood_clear}
              className="grid h-10 w-10 place-items-center rounded-full text-fg-muted transition hover:bg-surface-muted"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {note.type === "text" &&
        (editing ? (
          <div className="mt-2 space-y-2">
            <Textarea autoFocus value={draft} onChange={(e) => onDraftChange(e.target.value)} rows={4} />
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
          <p onClick={() => setEditing(true)} className="mt-1 whitespace-pre-wrap text-sm text-fg">
            {note.text}
          </p>
        ))}

      {note.type === "audio" && note.mediaUrl && (
        <audio controls src={note.mediaUrl} className="mt-2 w-full" />
      )}

      {note.type === "photo" && note.mediaUrl && (
        <img src={note.mediaUrl} alt="" className="mt-2 max-h-80 w-full rounded-ui object-cover" />
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
}: {
  date: string;
  onBack: () => void;
  onCompose: (date: string) => void;
  onNavigate: (date: string) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const isToday = date === todayString();

  useEffect(() => {
    setNotes(null);
    api
      .notes(date)
      .then((r) => setNotes(r.notes))
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
            className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
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
              className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(shiftDate(date, 1))}
              disabled={isToday}
              aria-label={t.day_next}
              className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />

      <div className="space-y-3 px-4 py-4">
        {notes === null ? (
          <LoadingState />
        ) : notes.length === 0 ? (
          <EmptyState title={t.day_empty_title} description={t.day_empty_desc} />
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
