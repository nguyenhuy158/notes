import { type ReactNode, useEffect, useState } from "react";
import { useI18n, type Lang } from "../i18n";
import { api } from "../api";
import { useToast } from "../ui/Toast";
import { HeaderBar } from "../ui/HeaderBar";
import { ThemeToggle } from "../ui/theme";
import { Switch } from "../ui/Switch";
import { Card, CardHeader } from "../ui/Card";
import { Listbox } from "../ui/Listbox";
import { Tabs } from "../ui/Tabs";
import { Avatar } from "../ui/Avatar";
import {
  Images,
  Languages,
  BarChart3,
  Camera,
  FileJson,
  FileText,
  LogOut,
  Mic,
  Tag as TagIcon,
  Trash2,
  Type,
  Video,
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
import { getDefaultNoteType, setDefaultNoteType } from "../composePref";
import type { NoteType } from "../../../shared/notes";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/states";
import { cn } from "../ui/cn";

const NOTE_TYPES: { id: NoteType; icon: typeof Type }[] = [
  { id: "text", icon: Type },
  { id: "audio", icon: Mic },
  { id: "photo", icon: Camera },
  { id: "video", icon: Video },
];

const LOGOUT_PATH = "/logout";
const IDLE_LOCK_OFF = 0;
const IDLE_LOCK_MINUTES = [1, 5, 15, 30];
const MAX_WORDS_SHOWN = 8;
const WORD_REM_MIN = 0.75;
const WORD_REM_RANGE = 0.25;
const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

type SettingsTab = "general" | "options" | "data";

function SettingRow({
  icon,
  label,
  children,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 text-sm text-fg">
        {icon}
        <span className="min-w-0">{label}</span>
      </span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

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
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState<SettingsTab>("general");
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
  const [defaultType, setDefaultTypeState] = useState(getDefaultNoteType);

  function pickDefaultType(type: NoteType) {
    setDefaultNoteType(type);
    setDefaultTypeState(type);
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

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "general", label: t.settings_tab_general },
    { id: "options", label: t.settings_tab_options },
    { id: "data", label: t.settings_tab_data },
  ];
  const navRows = [
    { label: t.tags_screen_title, icon: TagIcon, onOpen: onOpenTags },
    { label: t.settings_trash, icon: Trash2, onOpen: onOpenTrash },
    { label: t.settings_album, icon: Images, onOpen: onOpenAlbum },
  ];

  return (
    <div>
      <HeaderBar title={t.settings_title} />
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-3">
        <Tabs items={tabs} active={tab} onChange={setTab} label={t.settings_title} />

        {tab === "general" && (
          <>
            <Card className="space-y-2">
              {me && (
                <div className="flex items-center gap-3">
                  <Avatar name={me.name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{me.name}</p>
                    <p className="truncate text-xs text-fg-muted">{me.email}</p>
                  </div>
                </div>
              )}
              <SettingRow
                label={t.settings_stats}
                icon={<BarChart3 className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />}
              >
                {stats ? (
                  <span className="text-sm text-fg-muted">
                    {`${formatBytes(stats.mediaBytes)} · ${t.settings_stats_notes(stats.noteCount)}`}
                  </span>
                ) : (
                  <Skeleton className="h-4 w-32" />
                )}
              </SettingRow>
            </Card>
            <Card className="space-y-2">
              <CardHeader title={t.settings_group_look} />
              <SettingRow label={t.settings_theme}>
                <ThemeToggle />
              </SettingRow>
              <SettingRow label={t.settings_accent}>
                <Listbox
                  aria-label={t.settings_accent}
                  className="w-40"
                  value={String(accentHue)}
                  onChange={(value) => pickAccent(Number(value))}
                  options={ACCENT_PRESETS.map(({ id, hue }) => ({
                    value: String(hue),
                    label: t[`accent_${id}`],
                    icon: (
                      <span
                        aria-hidden="true"
                        style={{ background: `oklch(45% 0.13 ${hue})` }}
                        className="h-4 w-4 shrink-0 rounded-full"
                      />
                    ),
                  }))}
                />
              </SettingRow>
              <SettingRow
                label={t.settings_language}
                icon={<Languages className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />}
              >
                <Listbox
                  aria-label={t.settings_language}
                  className="w-40"
                  value={lang}
                  onChange={(value) => setLang(value as Lang)}
                  options={LANGUAGES}
                />
              </SettingRow>
            </Card>
          </>
        )}

        {tab === "options" && (
          <Card className="space-y-2">
            <CardHeader title={t.settings_tab_options} />
            <SettingRow label={t.settings_default_note}>
              <Listbox
                aria-label={t.settings_default_note}
                className="w-44"
                value={defaultType}
                onChange={(value) => pickDefaultType(value as NoteType)}
                options={NOTE_TYPES.map(({ id, icon: Icon }) => ({
                  value: id,
                  label: t[`compose_tab_${id}`],
                  icon: <Icon size={16} aria-hidden="true" className="shrink-0 text-fg-muted" />,
                }))}
              />
            </SettingRow>
            <Switch
              checked={reminderOn}
              onChange={toggleReminder}
              label={t.settings_reminder}
              description={t.settings_reminder_desc}
            />
            {reminderOn && (
              <Input
                type="time"
                aria-label={t.settings_reminder}
                value={reminderTime}
                onChange={(e) => changeReminderTime(e.target.value)}
              />
            )}
            <Switch
              checked={pinOn}
              onChange={togglePinLock}
              label={t.settings_pin_lock}
              description={t.settings_pin_lock_desc}
            />
            {pinStep !== "idle" && (
              <div className="space-y-2">
                <Input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={t.pin_length_hint}
                  aria-label={pinStep === "setting" ? t.pin_set_title : t.pin_confirm_title}
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
              <SettingRow label={t.settings_idle_lock}>
                <Listbox
                  aria-label={t.settings_idle_lock}
                  className="w-40"
                  value={String(idleMinutes)}
                  onChange={(value) => {
                    const n = Number(value);
                    setIdleLockMinutes(n);
                    setIdleMinutesState(n);
                  }}
                  options={[
                    { value: String(IDLE_LOCK_OFF), label: t.idle_lock_never },
                    ...IDLE_LOCK_MINUTES.map((n) => ({
                      value: String(n),
                      label: t.idle_lock_minutes(n),
                    })),
                  ]}
                />
              </SettingRow>
            )}
          </Card>
        )}

        {tab === "data" && (
          <>
            <Card className="space-y-2">
              <CardHeader title={t.settings_tab_data} />
              <div className="grid grid-cols-2 gap-2">
                {navRows.map(({ label, icon: Icon, onOpen }, index) => (
                  <Button
                    key={label}
                    variant="outline"
                    className={cn("justify-start", index === navRows.length - 1 && "col-span-2")}
                    onClick={onOpen}
                    leftIcon={<Icon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />}
                  >
                    <span className="min-w-0 flex-1 truncate text-left text-sm">{label}</span>
                  </Button>
                ))}
              </div>
              <p className="pt-1 text-sm text-fg">{t.settings_export}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => exportNotes("json")}
                  loading={exporting === "json"}
                  disabled={exporting !== null}
                  leftIcon={<FileJson className="h-4 w-4" aria-hidden="true" />}
                >
                  {exporting === "json" ? t.settings_exporting : "JSON"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => exportNotes("markdown")}
                  loading={exporting === "markdown"}
                  disabled={exporting !== null}
                  leftIcon={<FileText className="h-4 w-4" aria-hidden="true" />}
                >
                  {exporting === "markdown" ? t.settings_exporting : "Markdown"}
                </Button>
              </div>
            </Card>
            {words.length > 0 && (
              <Card className="space-y-2">
                <CardHeader title={t.settings_words} />
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {words.slice(0, MAX_WORDS_SHOWN).map(({ word, count }) => (
                    <span
                      key={word}
                      style={{
                        fontSize: `${WORD_REM_MIN + (count / words[0].count) * WORD_REM_RANGE}rem`,
                      }}
                      className="font-medium text-fg-muted"
                      title={String(count)}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </Card>
            )}
            <Button
              variant="danger"
              block
              onClick={() => window.location.assign(LOGOUT_PATH)}
              leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            >
              {t.settings_logout}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
