import { useEffect, useState } from "react";
import { api, type Note } from "../api";
import { useI18n } from "../i18n";
import { formatVi } from "../date";
import { HeaderBar } from "../ui/HeaderBar";
import { EmptyState, LoadingState } from "../ui/states";
import { StickerGhost } from "../stickers";
import { ArrowLeft, FileJson, FileText } from "lucide-react";
import { downloadBlob } from "../lib/download";

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

  function exportJson() {
    if (!notes) return;
    const json = JSON.stringify({ tag, exportedAt: new Date().toISOString(), notes }, null, 2);
    downloadBlob(new Blob([json], { type: "application/json" }), `tag-${tag}.json`);
  }

  function exportMarkdown() {
    if (!notes) return;
    const origin = window.location.origin;
    let md = `# #${tag}\n\n`;
    for (const note of notes) {
      md += `## ${formatVi(note.date)}\n\n`;
      if (note.type === "text") md += `${note.text}\n\n`;
      else if (note.type === "audio") md += `[audio](${origin}${note.mediaUrl})\n\n`;
      else for (const url of note.mediaUrls) md += `![photo](${origin}${url})\n\n`;
    }
    downloadBlob(new Blob([md], { type: "text/markdown" }), `tag-${tag}.md`);
  }

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
        actions={
          notes && notes.length > 0 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={exportJson}
                aria-label={t.tag_export_json}
                className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
              >
                <FileJson size={18} />
              </button>
              <button
                type="button"
                onClick={exportMarkdown}
                aria-label={t.tag_export_markdown}
                className="grid h-10 w-10 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
              >
                <FileText size={18} />
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-3xl space-y-2 px-4 py-4">
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
