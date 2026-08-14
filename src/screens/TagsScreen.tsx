import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import { HeaderBar } from "../ui/HeaderBar";
import { EmptyState, LoadingState } from "../ui/states";
import { ArrowLeft, Tag } from "lucide-react";

export function TagsScreen({
  onBack,
  onOpenTag,
}: {
  onBack: () => void;
  onOpenTag: (tag: string) => void;
}) {
  const { t } = useI18n();
  const [tags, setTags] = useState<{ tag: string; count: number }[] | null>(null);

  useEffect(() => {
    api.tags().then((r) => setTags(r.tags));
  }, []);

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
          tags.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              onClick={() => onOpenTag(tag)}
              className="flex w-full items-center justify-between rounded-ui border border-border bg-surface p-3 text-left transition hover:bg-surface-muted"
            >
              <span className="text-sm font-medium text-fg">#{tag}</span>
              <span className="text-xs text-fg-muted">{t.tags_screen_count(count)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
