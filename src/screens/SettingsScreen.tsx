import { useI18n, LanguageToggle } from "../i18n";
import { HeaderBar } from "../ui/HeaderBar";
import { ThemeToggle } from "../ui/theme";

export function SettingsScreen() {
  const { t } = useI18n();
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
