import { useEffect, useRef, useState } from "react";

/**
 * Đọc để gõ chữ (Web Speech API) — khác transcribe audio đã ghi sẵn
 * (`worker/src/index.ts` dùng Whisper): cái này nhận diện SỐNG lúc đang gõ,
 * chỉ Chrome/Edge hỗ trợ (`webkitSpeechRecognition`), Firefox/Safari chưa —
 * `supported` báo `false` thì ẩn nút, không báo lỗi phiền.
 */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export function useDictation(lang: "vi" | "en", onChunk: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const Ctor = getRecognitionCtor();

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  function toggle() {
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang === "vi" ? "vi-VN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (last?.[0]) onChunk(last[0].transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  return { supported: Ctor !== null, listening, toggle };
}
