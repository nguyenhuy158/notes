import { useState } from "react";
import { useI18n, LanguageToggle } from "../i18n";
import { api } from "../api";
import { useToast } from "../ui/Toast";
import { HeaderBar } from "../ui/HeaderBar";
import { ThemeToggle } from "../ui/theme";

export function SettingsScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const [exporting, setExporting] = useState<"json" | "markdown" | null>(null);

  async function exportNotes(format: "json" | "markdown") {
    setExporting(format);
    try {
      await api.exportNotes(format);
    } catch {
      toast.error(t.settings_export_failed);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="pb-24">
      <HeaderBar title={t.settings_title} />
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between rounded-ui border border-border bg-surface p-3">
          <span className="text-sm text-fg">{t.settings_theme}</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between rounded-ui border border-border bg-surface p-3">
          <span className="text-sm text-fg">{t.settings_language}</span>
          <LanguageToggle />
        </div>

        <div className="rounded-ui border border-border bg-surface p-3">
          <span className="text-sm text-fg">{t.settings_export}</span>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => exportNotes("json")}
              disabled={exporting !== null}
              className="flex-1 rounded-ui border border-border py-2 text-sm font-medium text-fg transition hover:bg-surface-muted disabled:opacity-60"
            >
              {exporting === "json" ? t.settings_exporting : "JSON"}
            </button>
            <button
              type="button"
              onClick={() => exportNotes("markdown")}
              disabled={exporting !== null}
              className="flex-1 rounded-ui border border-border py-2 text-sm font-medium text-fg transition hover:bg-surface-muted disabled:opacity-60"
            >
              {exporting === "markdown" ? t.settings_exporting : "Markdown"}
            </button>
          </div>
        </div>

        <a
          href="/logout"
          className="block rounded-ui border border-border bg-surface p-3 text-center text-sm font-medium text-danger"
        >
          {t.settings_logout}
        </a>
      </div>
    </div>
  );
}
