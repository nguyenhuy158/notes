import { useEffect, useState } from "react";
import { api, type Note } from "../api";
import { useI18n } from "../i18n";
import { formatVi, formatTime } from "../date";
import { HeaderBar } from "../ui/HeaderBar";
import { EmptyState, LoadingState } from "../ui/states";
import { useToast } from "../ui/Toast";
import { StickerGhost } from "../stickers";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "../ui/cn";
import { AudioPlayer } from "../ui/AudioPlayer";

export function TrashScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    api.trash().then((r) => setNotes(r.notes));
  }, []);

  async function restore(id: string) {
    try {
      await api.restoreNote(id);
      setNotes((prev) => (prev ?? []).filter((n) => n.id !== id));
    } catch {
      toast.error(t.trash_restore_failed);
    }
  }

  async function purge(id: string) {
    if (!window.confirm(t.trash_purge_confirm)) return;
    try {
      await api.purgeNote(id);
      setNotes((prev) => (prev ?? []).filter((n) => n.id !== id));
    } catch {
      toast.error(t.trash_purge_failed);
    }
  }

  return (
    <div className="pb-24">
      <HeaderBar
        title={t.trash_title}
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
      />

      <div className="space-y-3 px-4 py-4">
        {notes === null ? (
          <LoadingState />
        ) : notes.length === 0 ? (
          <EmptyState icon={<StickerGhost size={40} />} title={t.trash_empty} />
        ) : (
          notes.map((note) => (
            <div key={note.id} className="rounded-ui border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">
                  {formatVi(note.date)} · {formatTime(note.createdAt)}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => restore(note.id)}
                    aria-label={t.trash_restore}
                    className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted hover:text-primary"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => purge(note.id)}
                    aria-label={t.trash_purge}
                    className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {note.type === "text" && (
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-fg">{note.text}</p>
              )}
              {note.type === "audio" && note.mediaUrl && (
                <AudioPlayer src={note.mediaUrl} className="mt-2" />
              )}
              {note.type === "photo" && note.mediaUrls.length > 0 && (
                <div className={cn("mt-2 flex gap-2", note.mediaUrls.length > 1 ? "overflow-x-auto" : "")}>
                  {note.mediaUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className={cn(
                        "rounded-ui object-cover",
                        note.mediaUrls.length > 1 ? "h-40 w-40 shrink-0" : "max-h-60 w-full",
                      )}
                    />
                  ))}
                </div>
              )}
              {note.type === "video" && note.mediaUrl && (
                <video src={note.mediaUrl} controls className="mt-2 max-h-60 w-full rounded-ui bg-black" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
