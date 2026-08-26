import { useEffect, useState } from "react";
import { useI18n, LanguageToggle } from "../i18n";
import { api } from "../api";
import { useToast } from "../ui/Toast";
import { HeaderBar } from "../ui/HeaderBar";
import { ThemeToggle } from "../ui/theme";
import { Switch } from "../ui/Switch";
import { Avatar } from "../ui/Avatar";
import {
  Images,
  Languages,
  BarChart3,
  ChevronRight,
  FileJson,
  FileText,
  LogOut,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import {
  getReminderTime,
  isReminderEnabled,
  setReminderEnabled,
  setReminderTime,
  startReminderLoop,
  stopReminderLoop,
} from "../reminder";
import { clearPin, getIdleLockMinutes, isPinSet, setIdleLockMinutes, setPin } from "../pinLock";
import { ACCENT_PRESETS, getAccentHue, setAccentHue } from "../accentColor";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/states";
import { cn } from "../ui/cn";

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

export function SettingsScreen({
  onOpenTrash,
  onOpenAlbum,
  onOpenTags,
}: {
  onOpenTrash: () => void;
  onOpenAlbum: () => void;
  onOpenTags: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [exporting, setExporting] = useState<"json" | "markdown" | null>(null);
  const [stats, setStats] = useState<{ noteCount: number; mediaBytes: number } | null>(null);
  const [me, setMe] = useState<{ email: string; name: string } | null>(null);
  const [words, setWords] = useState<{ word: string; count: number }[]>([]);
  const [accentHue, setAccentHueState] = useState(getAccentHue);

  function pickAccent(hue: number) {
    setAccentHue(hue);
    setAccentHueState(hue);
  }
  const [reminderOn, setReminderOn] = useState(isReminderEnabled);
  const [reminderTime, setReminderTimeState] = useState(getReminderTime);
  const [pinOn, setPinOn] = useState(isPinSet);
  const [pinStep, setPinStep] = useState<"idle" | "setting" | "confirming">("idle");
  const [pinDraft, setPinDraft] = useState("");
  const [pinFirst, setPinFirst] = useState("");
  const [idleMinutes, setIdleMinutesState] = useState(getIdleLockMinutes);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.me().then(setMe).catch(() => {});
    api.words().then((r) => setWords(r.words)).catch(() => {});
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

  function togglePinLock(next: boolean) {
    if (!next) {
      clearPin();
      setPinOn(false);
      return;
    }
    setPinFirst("");
    setPinDraft("");
    setPinStep("setting");
  }

  function submitPinStep() {
    if (pinStep === "setting") {
      setPinFirst(pinDraft);
      setPinDraft("");
      setPinStep("confirming");
      return;
    }
    if (pinDraft !== pinFirst) {
      toast.error(t.pin_mismatch);
      setPinDraft("");
      setPinStep("setting");
      return;
    }
    setPin(pinFirst).then(() => {
      setPinOn(true);
      setPinStep("idle");
    });
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

        <div className="rounded-ui border border-border bg-surface p-3">
          <p className="mb-2 text-sm text-fg">{t.settings_accent}</p>
          <div role="group" aria-label={t.settings_accent} className="flex gap-1">
            {ACCENT_PRESETS.map(({ id, hue }) => (
              <button
                key={id}
                type="button"
                onClick={() => pickAccent(hue)}
                aria-label={t.settings_accent_label(t[`accent_${id}` as keyof typeof t] as string)}
                aria-pressed={accentHue === hue}
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full transition active:scale-95"
              >
                <span
                  aria-hidden="true"
                  style={{ background: `oklch(45% 0.13 ${hue})` }}
                  className={cn(
                    "h-8 w-8 rounded-full transition",
                    accentHue === hue && "ring-2 ring-offset-2 ring-offset-surface ring-fg",
                  )}
                />
              </button>
            ))}
          </div>
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
          {stats ? (
            <span className="text-sm text-fg-muted">
              {`${formatBytes(stats.mediaBytes)} · ${t.settings_stats_notes(stats.noteCount)}`}
            </span>
          ) : (
            <Skeleton className="h-4 w-32" />
          )}
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
          <Switch
            checked={pinOn}
            onChange={togglePinLock}
            label={t.settings_pin_lock}
            description={t.settings_pin_lock_desc}
          />
          {pinStep !== "idle" && (
            <div className="mt-2 space-y-2">
              <Input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder={t.pin_length_hint}
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && pinDraft.length >= 4 && submitPinStep()}
                className="text-center tracking-[0.4em]"
              />
              <p className="text-xs text-fg-muted">
                {pinStep === "setting" ? t.pin_set_title : t.pin_confirm_title}
              </p>
              <Button size="sm" block disabled={pinDraft.length < 4} onClick={submitPinStep}>
                {t.day_cancel}
              </Button>
            </div>
          )}
          {pinOn && pinStep === "idle" && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t.settings_idle_lock}</span>
              <select
                value={idleMinutes}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setIdleLockMinutes(n);
                  setIdleMinutesState(n);
                }}
                className="rounded-ui border border-border bg-surface px-2 py-1 text-xs text-fg"
              >
                <option value={0}>{t.idle_lock_never}</option>
                {[1, 5, 15, 30].map((n) => (
                  <option key={n} value={n}>
                    {t.idle_lock_minutes(n)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {words.length > 0 && (
          <div className="rounded-ui border border-border bg-surface p-3">
            <p className="mb-2 text-sm text-fg">{t.settings_words}</p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {words.map(({ word, count }) => {
                const max = words[0].count;
                const size = 0.75 + (count / max) * 0.75;
                return (
                  <span
                    key={word}
                    style={{ fontSize: `${size}rem` }}
                    className="font-medium text-fg-muted"
                    title={String(count)}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenTags}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-ui border border-border bg-surface p-3 text-left transition hover:bg-surface-muted"
        >
          <span className="flex items-center gap-2 text-sm text-fg">
            <TagIcon className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            {t.settings_manage_tags}
          </span>
          <ChevronRight size={16} aria-hidden="true" className="text-fg-muted" />
        </button>

        <button
          type="button"
          onClick={onOpenTrash}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-ui border border-border bg-surface p-3 text-left transition hover:bg-surface-muted"
        >
          <span className="flex items-center gap-2 text-sm text-fg">
            <Trash2 className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            {t.settings_trash}
          </span>
          <ChevronRight size={16} aria-hidden="true" className="text-fg-muted" />
        </button>

        <button
          type="button"
          onClick={onOpenAlbum}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-ui border border-border bg-surface p-3 text-left transition hover:bg-surface-muted"
        >
          <span className="flex items-center gap-2 text-sm text-fg">
            <Images className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            {t.settings_album}
          </span>
          <ChevronRight size={16} aria-hidden="true" className="text-fg-muted" />
        </button>

        <div className="rounded-ui border border-border bg-surface p-3">
          <span className="text-sm text-fg">{t.settings_export}</span>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => exportNotes("json")}
              loading={exporting === "json"}
              disabled={exporting !== null}
            >
              <FileJson className="h-4 w-4" aria-hidden="true" />
              {exporting === "json" ? t.settings_exporting : "JSON"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => exportNotes("markdown")}
              loading={exporting === "markdown"}
              disabled={exporting !== null}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              {exporting === "markdown" ? t.settings_exporting : "Markdown"}
            </Button>
          </div>
        </div>

        <a
          href="/logout"
          className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-ui border border-danger/40 bg-danger-soft p-3 text-center text-sm font-medium text-danger transition hover:bg-danger/15"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t.settings_logout}
        </a>
      </div>
    </div>
  );
}
