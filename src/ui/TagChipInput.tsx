import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { X } from "lucide-react";
import { useI18n } from "../i18n";
import { cn } from "./cn";

const MAX_TAGS = 5;

/** Editor nhãn dạng chip (khác ô text thô cũ) — gõ rồi Enter/dấu phẩy để
 * thêm, bấm x để bỏ. Gợi ý nhãn user đã dùng trước đó (fetch 1 lần, lọc ở
 * client — số nhãn của 1 user thực tế rất ít, không cần debounce server như
 * `PlaceAutocomplete`). */
export function TagChipInput({
  tags,
  onChange,
  autoFocus,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [known, setKnown] = useState<string[]>([]);

  useEffect(() => {
    api
      .tags()
      .then((r) => setKnown(r.tags.map((t) => t.tag)))
      .catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return known.filter((tag) => tag.toLowerCase().includes(q) && !tags.includes(tag)).slice(0, 5);
  }, [draft, known, tags]);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) {
      setDraft("");
      return;
    }
    onChange([...tags, tag]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-ui border border-border bg-surface p-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-fg"
          >
            #{tag}
            {/* -m-1 p-1: vung cham rong hon icon 12px, khong lam chip cao them. */}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={t.tag_remove(tag)}
              className="-m-1 cursor-pointer p-1 text-fg-muted transition hover:text-danger"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            autoFocus={autoFocus}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(draft);
              } else if (e.key === "Backspace" && !draft && tags.length > 0) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            aria-label={t.day_tags}
            placeholder={tags.length === 0 ? t.tags_input_placeholder : ""}
            className="min-w-[80px] flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
          />
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className={cn(
                "min-h-8 cursor-pointer rounded-full border border-border px-2.5 text-xs text-fg-muted transition hover:bg-surface-muted",
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
