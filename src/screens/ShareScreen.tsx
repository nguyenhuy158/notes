import { useEffect, useState } from "react";
import { api, type Note } from "../api";
import { useI18n } from "../i18n";
import { formatVi } from "../date";
import { MoodEmoji } from "../moodEmojis";
import { StickerGhost } from "../stickers";
import { LoadingState } from "../ui/states";
import { MapPin } from "lucide-react";
import { cn } from "../ui/cn";
import { AudioPlayer } from "../ui/AudioPlayer";

/** Trang xem note đã chia sẻ — public, không cần đăng nhập. Route `/s/:token`
 * được đọc thẳng từ `location.pathname` (app không dùng URL router thật) và
 * render riêng, tách khỏi luồng auth trong `App.tsx`. */
export function ShareScreen({ token }: { token: string }) {
  const { t } = useI18n();
  const [note, setNote] = useState<Note | null | undefined>(undefined);

  useEffect(() => {
    api.getSharedNote(token).then(setNote);
  }, [token]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <div className="flex-1">
        {note === undefined && <LoadingState label={t.share_loading} />}

        {note === null && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <StickerGhost size={48} />
            <p className="text-sm font-semibold text-fg">{t.share_not_found_title}</p>
            <p className="text-xs text-fg-muted">{t.share_not_found_desc}</p>
          </div>
        )}

        {note && (
          <div className="rounded-ui border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-xs text-fg-muted">
              {note.mood && <MoodEmoji mood={note.mood} size={20} />}
              <span>{formatVi(note.date)}</span>
            </div>

            {note.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
                <MapPin size={12} />
                {note.location}
              </p>
            )}

            {note.type === "text" && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-fg">{note.text}</p>
            )}

            {note.type === "audio" && note.mediaUrl && (
              <AudioPlayer src={note.mediaUrl} className="mt-3" />
            )}

            {note.type === "photo" && note.mediaUrls.length > 0 && (
              <div className={cn("mt-3 flex gap-2", note.mediaUrls.length > 1 ? "overflow-x-auto" : "")}>
                {note.mediaUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className={cn(
                      "rounded-ui object-cover",
                      note.mediaUrls.length > 1 ? "h-64 w-64 shrink-0" : "max-h-96 w-full",
                    )}
                  />
                ))}
              </div>
            )}

            {note.type === "video" && note.mediaUrl && (
              <video src={note.mediaUrl} controls className="mt-3 max-h-96 w-full rounded-ui bg-black" />
            )}

            {note.type !== "text" && note.text && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{note.text}</p>
            )}

            {note.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="pt-6 text-center text-xs text-fg-muted">{t.share_footer}</p>
    </div>
  );
}
