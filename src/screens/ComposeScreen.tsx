import { useEffect, useRef, useState } from "react";
import { api, MOODS, type Mood, type NoteType } from "../api";
import { MoodEmoji } from "../moodEmojis";
import { useI18n } from "../i18n";
import { formatTime, formatVi } from "../date";
import { Button } from "../ui/Button";
import { HeaderBar } from "../ui/HeaderBar";
import { Textarea } from "../ui/Input";
import { useToast } from "../ui/Toast";
import { cn } from "../ui/cn";
import { ArrowLeft, Camera, Mic, Square, Type } from "lucide-react";
import { compressImage } from "../lib/compressImage";

const AUTOSAVE_DELAY_MS = 1500;

// Note text mới tự lưu ngay lúc gõ (POST lần đầu, PUT các lần sau) — không
// còn nút "Lưu" tay, đóng màn hình (nút back) là xong, note đã nằm trong DB.
function TextComposer({ date, mood }: { date: string; mood: Mood | null }) {
  const { t } = useI18n();
  const toast = useToast();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const noteIdRef = useRef<string | null>(null);

  async function save() {
    const value = textRef.current;
    if (!value.trim()) return;
    setStatus("saving");
    try {
      const r = noteIdRef.current
        ? await api.updateText(noteIdRef.current, value)
        : await api.createTextNote(date, value, mood);
      noteIdRef.current = r.note.id;
      setSavedAt(r.note.updatedAt);
      setStatus("saved");
    } catch {
      toast.error(t.compose_save_failed);
      setStatus("idle");
    }
  }

  function onChange(value: string) {
    setText(value);
    setStatus("idle");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(save, AUTOSAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (timerRef.current) window.clearTimeout(timerRef.current);
          save();
        }}
        rows={10}
        placeholder={t.compose_text_placeholder}
      />
      <p className="text-xs text-fg-muted">
        {status === "saving" && t.day_saving}
        {status === "saved" && savedAt && t.day_saved_at(formatTime(savedAt))}
      </p>
    </div>
  );
}

function AudioComposer({ onSave, saving }: { onSave: (blob: Blob) => void; saving: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        setBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error(t.compose_mic_error);
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  }

  function retake() {
    setBlob(null);
    setSeconds(0);
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {!blob && !recording && (
        <button
          type="button"
          onClick={start}
          aria-label={t.compose_mic_start}
          className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-fg shadow-lg transition active:scale-95"
        >
          <Mic size={28} />
        </button>
      )}

      {recording && (
        <>
          <span className="tabular text-2xl font-semibold text-fg">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={stop}
            aria-label={t.compose_mic_stop}
            className="grid h-20 w-20 place-items-center rounded-full bg-danger text-white shadow-lg transition active:scale-95"
          >
            <Square size={24} />
          </button>
        </>
      )}

      {blob && (
        <div className="w-full space-y-3">
          <audio controls src={URL.createObjectURL(blob)} className="w-full" />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={retake}>
              {t.compose_retake}
            </Button>
            <Button className="flex-1" onClick={() => onSave(blob)} loading={saving}>
              {t.compose_save}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoComposer({ onSave, saving }: { onSave: (file: File) => void; saving: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(picked: File | undefined) {
    if (!picked) return;
    setCompressing(true);
    try {
      setFile(await compressImage(picked));
    } catch {
      toast.error(t.compose_photo_compress_failed);
      setFile(picked);
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      {!file && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={compressing}
          className={cn(
            "flex h-56 w-full flex-col items-center justify-center gap-2 rounded-ui border-2 border-dashed border-border text-fg-muted transition hover:bg-surface-muted",
            "disabled:opacity-60"
          )}
        >
          <Camera size={28} />
          <span className="text-sm">{compressing ? t.compose_photo_compressing : t.compose_photo_pick}</span>
        </button>
      )}

      {file && (
        <div className="space-y-3">
          <img src={URL.createObjectURL(file)} alt="" className="max-h-80 w-full rounded-ui object-cover" />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setFile(null)}>
              {t.compose_photo_retake}
            </Button>
            <Button className="flex-1" onClick={() => onSave(file)} loading={saving}>
              {t.compose_save}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MoodPicker({ mood, onChange }: { mood: Mood | null; onChange: (mood: Mood | null) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {MOODS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(mood === m ? null : m)}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full transition",
            mood === m ? "ring-2 ring-primary" : "hover:bg-surface-muted",
          )}
        >
          <MoodEmoji mood={m} size={28} />
        </button>
      ))}
    </div>
  );
}

export function ComposeScreen({
  date,
  onBack,
  onSaved,
}: {
  date: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [tab, setTab] = useState<NoteType>("text");
  const [saving, setSaving] = useState(false);
  const [mood, setMood] = useState<Mood | null>(null);

  const TABS: { id: NoteType; label: string; icon: typeof Type }[] = [
    { id: "text", label: t.compose_tab_text, icon: Type },
    { id: "audio", label: t.compose_tab_audio, icon: Mic },
    { id: "photo", label: t.compose_tab_photo, icon: Camera },
  ];

  async function saveMedia(type: "audio" | "photo", file: Blob, filename: string) {
    setSaving(true);
    try {
      await api.createMediaNote(date, type, file, filename, mood);
      toast.success(t.compose_saved);
      onSaved();
    } catch {
      toast.error(t.compose_save_failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <HeaderBar
        title={t.compose_title}
        subtitle={formatVi(date)}
        leading={
          <button
            type="button"
            onClick={onBack}
            aria-label={t.day_back}
            className="grid h-9 w-9 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <ArrowLeft size={18} />
          </button>
        }
      />

      <div className="px-4 py-4">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-ui border border-border p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-ui py-2 text-xs font-medium transition",
                tab === id ? "bg-primary text-primary-fg" : "text-fg-muted hover:bg-surface-muted"
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <MoodPicker mood={mood} onChange={setMood} />
          {tab === "text" && <TextComposer date={date} mood={mood} />}
          {tab === "audio" && (
            <AudioComposer onSave={(blob) => saveMedia("audio", blob, "note.webm")} saving={saving} />
          )}
          {tab === "photo" && (
            <PhotoComposer onSave={(file) => saveMedia("photo", file, file.name)} saving={saving} />
          )}
        </div>
      </div>
    </div>
  );
}
