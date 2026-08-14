import { useEffect, useRef, useState } from "react";
import { api, type Note } from "../api";
import { useI18n } from "../i18n";
import { formatTime, formatVi, parseDate, todayString, toDateString } from "../date";
import { Button } from "../ui/Button";
import { HeaderBar } from "../ui/HeaderBar";
import { Textarea } from "../ui/Input";
import { EmptyState, LoadingState } from "../ui/states";
import { useToast } from "../ui/Toast";
import { Fab } from "../ui/BottomNav";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

const AUTOSAVE_DELAY_MS = 1500;

function NoteCard({ note, onDeleted, onSaved }: { note: Note; onDeleted: (id: string) => void; onSaved: (note: Note) => void }) {
  const { t } = useI18n();
  const toast = useToast();
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

  return (
    <div className="rounded-ui border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          {note.mood && <span className="text-base leading-none">{note.mood}</span>}
          {formatTime(note.createdAt)}
        </span>
        <button
          type="button"
          onClick={remove}
          aria-label={t.day_delete}
          className="grid h-8 w-8 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>

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
            className="grid h-9 w-9 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
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
              className="grid h-9 w-9 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(shiftDate(date, 1))}
              disabled={isToday}
              aria-label={t.day_next}
              className="grid h-9 w-9 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted disabled:opacity-30"
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
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
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
