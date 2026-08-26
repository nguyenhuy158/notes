import { useEffect, useState } from "react";
import { api, type Note } from "../api";
import { useI18n } from "../i18n";
import { formatVi, monthString } from "../date";
import { HeaderBar } from "../ui/HeaderBar";
import { Button } from "../ui/Button";
import { ArrowLeft, Printer } from "lucide-react";
import { EmptyState } from "../ui/states";
import { StickerGhost } from "../stickers";

/** Không dùng thư viện PDF — in qua `window.print()` (Lưu dưới dạng PDF là
 * lựa chọn có sẵn trong hộp thoại in của mọi trình duyệt), đỡ thêm dependency
 * chỉ cho 1 tính năng ít dùng. `@media print` ẩn hết UI ngoài phần album. */
export function AlbumScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const now = new Date();
  const [month, setMonth] = useState(monthString(now.getFullYear(), now.getMonth()));
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    api.exportJson().then(setNotes);
  }, []);

  const photos = (notes ?? []).filter(
    (n) => n.type === "photo" && n.date.startsWith(month) && n.mediaUrls.length > 0
  );

  return (
    <div className="pb-24 print:pb-0">
      <div className="print:hidden">
        <HeaderBar
          title={t.album_title}
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
        />

        <div className="flex items-center gap-2 px-4 py-4">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label={t.album_title}
            className="min-h-11 flex-1 rounded-ui border border-border bg-surface px-3 py-2 text-sm text-fg"
          />
          <Button onClick={() => window.print()} disabled={photos.length === 0}>
            <Printer size={16} className="mr-1.5" />
            {t.album_print}
          </Button>
        </div>
      </div>

      <div className="px-4 print:px-0">
        {notes !== null && photos.length === 0 && (
          <EmptyState icon={<StickerGhost size={40} />} title={t.album_empty} />
        )}

        <div className="grid grid-cols-2 gap-3 print:grid-cols-3">
          {photos.flatMap((note) =>
            note.mediaUrls.map((url, i) => (
              <figure key={`${note.id}-${i}`} className="break-inside-avoid">
                <img
                  src={url}
                  alt={note.text || t.photo_alt(note.date)}
                  loading="lazy"
                  className="w-full rounded-ui object-cover print:rounded-none"
                />
                <figcaption className="mt-1 text-xs text-fg-muted">
                  {formatVi(note.date)}
                  {note.text ? ` — ${note.text}` : ""}
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
