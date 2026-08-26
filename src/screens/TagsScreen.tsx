import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import { useToast } from "../ui/Toast";
import { HeaderBar } from "../ui/HeaderBar";
import { EmptyState, LoadingState } from "../ui/states";
import { ArrowLeft, Pencil, Tag } from "lucide-react";

export function TagsScreen({
  onBack,
  onOpenTag,
}: {
  onBack: () => void;
  onOpenTag: (tag: string) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [tags, setTags] = useState<{ tag: string; count: number }[] | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  useEffect(() => {
    api.tags().then((r) => setTags(r.tags));
  }, []);

  function startRename(tag: string) {
    setRenaming(tag);
    setRenameDraft(tag);
  }

  async function submitRename() {
    if (!renaming) return;
    const to = renameDraft.trim();
    if (!to || to === renaming) {
      setRenaming(null);
      return;
    }
    try {
      await api.renameTag(renaming, to);
      const r = await api.tags();
      setTags(r.tags);
    } catch {
      toast.error(t.tag_rename_failed);
    } finally {
      setRenaming(null);
    }
  }

  return (
    <div className="pb-24">
      <HeaderBar
        title={t.tags_screen_title}
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
        {tags === null ? (
          <LoadingState />
        ) : tags.length === 0 ? (
          <EmptyState icon={<Tag size={32} className="text-fg-muted" />} title={t.tags_screen_empty} />
        ) : (
          tags.map(({ tag, count }) =>
            renaming === tag ? (
              <div key={tag} className="flex items-center gap-2 rounded-ui border border-border bg-surface p-3">
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitRename()}
                  onBlur={submitRename}
                  aria-label={t.tag_rename}
                  className="min-h-11 min-w-0 flex-1 rounded-ui border border-border bg-surface px-2 py-1 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : (
              <div
                key={tag}
                className="flex w-full items-center justify-between rounded-ui border border-border bg-surface p-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenTag(tag)}
                  className="min-h-11 min-w-0 flex-1 cursor-pointer text-left"
                >
                  <span className="text-sm font-medium text-fg">#{tag}</span>
                  <span className="ml-2 text-xs text-fg-muted">{t.tags_screen_count(count)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => startRename(tag)}
                  aria-label={t.tag_rename}
                  className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted active:scale-95"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
