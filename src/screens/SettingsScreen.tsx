import { useEffect, useState } from "react";
import { useI18n, LanguageToggle } from "../i18n";
import { api } from "../api";
import { useToast } from "../ui/Toast";
import { HeaderBar } from "../ui/HeaderBar";
import { ThemeToggle } from "../ui/theme";
import { Switch } from "../ui/Switch";
import { Avatar } from "../ui/Avatar";
import { Languages, BarChart3, FileJson, FileText, LogOut } from "lucide-react";
import {
  getReminderTime,
  isReminderEnabled,
  setReminderEnabled,
  setReminderTime,
  startReminderLoop,
  stopReminderLoop,
} from "../reminder";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

export function SettingsScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const [exporting, setExporting] = useState<"json" | "markdown" | null>(null);
  const [stats, setStats] = useState<{ noteCount: number; mediaBytes: number } | null>(null);
  const [me, setMe] = useState<{ email: string; name: string } | null>(null);
  const [reminderOn, setReminderOn] = useState(isReminderEnabled);
  const [reminderTime, setReminderTimeState] = useState(getReminderTime);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.me().then(setMe).catch(() => {});
  }, []);

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

  async function toggleReminder(next: boolean) {
    if (next) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error(t.settings_reminder_denied);
        return;
      }
    }
    setReminderEnabled(next);
    setReminderOn(next);
    stopReminderLoop();
    if (next) startReminderLoop(t.settings_reminder);
  }

  function changeReminderTime(time: string) {
    setReminderTimeState(time);
    setReminderTime(time);
    stopReminderLoop();
    if (reminderOn) startReminderLoop(t.settings_reminder);
  }

  return (
    <div className="pb-24">
      <HeaderBar title={t.settings_title} />
      <div className="space-y-4 px-4 py-4">
        {me && (
          <div className="flex items-center gap-3 rounded-ui border border-border bg-surface p-3">
            <Avatar name={me.name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{me.name}</p>
              <p className="truncate text-xs text-fg-muted">{me.email}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-ui border border-border bg-surface p-3">
          <span className="text-sm text-fg">{t.settings_theme}</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between rounded-ui border border-border bg-surface p-3">
          <span className="flex items-center gap-2 text-sm text-fg">
            <Languages className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            {t.settings_language}
          </span>
          <LanguageToggle />
        </div>

        <div className="flex items-center justify-between rounded-ui border border-border bg-surface p-3">
          <span className="flex items-center gap-2 text-sm text-fg">
            <BarChart3 className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            {t.settings_stats}
          </span>
          <span className="text-sm text-fg-muted">
            {stats ? `${formatBytes(stats.mediaBytes)} · ${t.settings_stats_notes(stats.noteCount)}` : "…"}
          </span>
        </div>

        <div className="rounded-ui border border-border bg-surface p-3">
          <Switch
            checked={reminderOn}
            onChange={toggleReminder}
            label={t.settings_reminder}
            description={t.settings_reminder_desc}
          />
          {reminderOn && (
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => changeReminderTime(e.target.value)}
              className="mt-2 w-full rounded-ui border border-border bg-surface px-3 py-2 text-sm text-fg"
            />
          )}
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
