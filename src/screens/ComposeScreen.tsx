import { useRef, useState } from "react";
import { api, type NoteType } from "../api";
import { useI18n } from "../i18n";
import { formatVi } from "../date";
import { Button } from "../ui/Button";
import { HeaderBar } from "../ui/HeaderBar";
import { Textarea } from "../ui/Input";
import { useToast } from "../ui/Toast";
import { cn } from "../ui/cn";
import { ArrowLeft, Camera, Mic, Square, Type } from "lucide-react";

function TextComposer({ onSave, saving }: { onSave: (text: string) => void; saving: boolean }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={t.compose_text_placeholder}
      />
      <Button block onClick={() => onSave(text)} loading={saving} disabled={!text.trim()}>
        {t.compose_save}
      </Button>
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
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {!file && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex h-56 w-full flex-col items-center justify-center gap-2 rounded-ui border-2 border-dashed border-border text-fg-muted transition hover:bg-surface-muted"
          )}
        >
          <Camera size={28} />
          <span className="text-sm">{t.compose_photo_pick}</span>
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

  const TABS: { id: NoteType; label: string; icon: typeof Type }[] = [
    { id: "text", label: t.compose_tab_text, icon: Type },
    { id: "audio", label: t.compose_tab_audio, icon: Mic },
    { id: "photo", label: t.compose_tab_photo, icon: Camera },
  ];

  async function saveText(text: string) {
    setSaving(true);
    try {
      await api.createTextNote(date, text);
      toast.success(t.compose_saved);
      onSaved();
    } catch {
      toast.error(t.compose_save_failed);
    } finally {
      setSaving(false);
    }
  }

  async function saveMedia(type: "audio" | "photo", file: Blob, filename: string) {
    setSaving(true);
    try {
      await api.createMediaNote(date, type, file, filename);
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
          {tab === "text" && <TextComposer onSave={saveText} saving={saving} />}
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
