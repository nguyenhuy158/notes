import { useEffect, useState } from "react";
import { api, type Note } from "../api";
import { useI18n } from "../i18n";
import { formatVi } from "../date";
import { HeaderBar } from "../ui/HeaderBar";
import { EmptyState, LoadingState } from "../ui/states";
import { StickerGhost } from "../stickers";
import { ArrowLeft } from "lucide-react";

/** Danh sách note khớp đúng 1 nhãn — mở từ chip nhãn trên note (DayScreen)
 * hoặc từ màn "Quản lý nhãn" (Settings). Chỉ xem/nhảy tới ngày, không sửa
 * trực tiếp ở đây — sửa thì mở note đó trong DayScreen như bình thường. */
export function TagNotesScreen({
  tag,
  onBack,
  onOpenDay,
}: {
  tag: string;
  onBack: () => void;
  onOpenDay: (date: string) => void;
}) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    api.notesByTag(tag).then((r) => setNotes(r.notes));
  }, [tag]);

  return (
    <div className="pb-24">
      <HeaderBar
        title={`#${tag}`}
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

      <div className="space-y-2 px-4 py-4">
        {notes === null ? (
          <LoadingState />
        ) : notes.length === 0 ? (
          <EmptyState icon={<StickerGhost size={40} />} title={t.tag_notes_empty} />
        ) : (
          notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onOpenDay(note.date)}
              className="block w-full rounded-ui border border-border bg-surface p-3 text-left transition hover:bg-surface-muted"
            >
              <span className="block text-xs font-medium text-fg-muted">{formatVi(note.date)}</span>
              {note.text && (
                <span className="mt-0.5 block line-clamp-2 text-sm text-fg">{note.text}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
