import { useEffect, useState } from "react";
import { api, type Note } from "../api";
import { useI18n } from "../i18n";
import { formatTime, formatVi } from "../date";
import { Button } from "../ui/Button";
import { HeaderBar } from "../ui/HeaderBar";
import { Textarea } from "../ui/Input";
import { EmptyState, LoadingState } from "../ui/states";
import { useToast } from "../ui/Toast";
import { Fab } from "../ui/BottomNav";
import { IconArrowLeft, IconPlus, IconTrash } from "../icons";

function NoteCard({ note, onDeleted, onSaved }: { note: Note; onDeleted: (id: string) => void; onSaved: (note: Note) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const r = await api.updateText(note.id, draft);
      onSaved(r.note);
      setEditing(false);
    } catch {
      toast.error(t.day_save_failed);
    } finally {
      setBusy(false);
    }
  }

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
        <span className="text-xs text-fg-muted">{formatTime(note.createdAt)}</span>
        <button
          type="button"
          onClick={remove}
          aria-label={t.day_delete}
          className="grid h-8 w-8 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted hover:text-danger"
        >
          <IconTrash size={16} />
        </button>
      </div>

      {note.type === "text" &&
        (editing ? (
          <div className="mt-2 space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} loading={busy}>
                {t.day_save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                {t.day_cancel}
              </Button>
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

export function DayScreen({
  date,
  onBack,
  onCompose,
}: {
  date: string;
  onBack: () => void;
  onCompose: (date: string) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);

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
            <IconArrowLeft size={18} />
          </button>
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

      <Fab label={t.day_add} icon={<IconPlus size={22} />} aboveNav={false} onClick={() => onCompose(date)} />
    </div>
  );
}
