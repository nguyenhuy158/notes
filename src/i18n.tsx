import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "vi" | "en";

const STORAGE_KEY = "ui-lang";

const dict = {
  vi: {
    nav_calendar: "Lịch",
    nav_timeline: "Dòng TG",
    nav_settings: "Cài đặt",
    calendar_prev_month: "Tháng trước",
    calendar_next_month: "Tháng sau",
    calendar_month: (m: number, y: number) => `Tháng ${m} / ${y}`,
    timeline_title: "Dòng thời gian",
    timeline_loading: "Đang tải...",
    timeline_empty: "Chưa có ghi chú nào.",
    timeline_note_count: (n: number) => `${n} ghi chú`,
    day_back: "Quay lại",
    day_empty_title: "Chưa có ghi chú",
    day_empty_desc: "Bấm nút + để thêm ghi chú cho ngày này.",
    day_add: "Thêm ghi chú",
    day_delete_confirm: "Xoá ghi chú này?",
    day_delete: "Xoá",
    day_cancel: "Xong",
    day_saving: "Đang lưu...",
    day_unsaved: "Chưa lưu",
    day_saved: "Đã lưu",
    day_save_failed: "Lưu thất bại",
    day_delete_failed: "Xoá thất bại",
    day_load_failed: "Không tải được ghi chú ngày này",
    compose_title: "Ghi chú mới",
    compose_tab_text: "Văn bản",
    compose_tab_audio: "Âm thanh",
    compose_tab_photo: "Ảnh",
    compose_text_placeholder: "Hôm nay bạn thế nào?",
    compose_save: "Lưu",
    compose_saved: "Đã lưu",
    compose_save_failed: "Lưu thất bại, thử lại",
    compose_mic_start: "Bắt đầu ghi âm",
    compose_mic_stop: "Dừng ghi âm",
    compose_mic_error: "Không mở được micro. Kiểm tra quyền truy cập.",
    compose_retake: "Ghi lại",
    compose_photo_pick: "Chụp ảnh hoặc chọn ảnh",
    compose_photo_compressing: "Đang nén ảnh...",
    compose_photo_compress_failed: "Không nén được ảnh, dùng ảnh gốc",
    compose_photo_retake: "Chọn lại",
    settings_title: "Cài đặt",
    settings_theme: "Giao diện",
    settings_language: "Ngôn ngữ",
    settings_export: "Xuất dữ liệu (backup)",
    settings_exporting: "Đang xuất...",
    settings_export_failed: "Xuất dữ liệu thất bại",
    settings_logout: "Đăng xuất",
    theme_system: "Theo hệ thống",
    theme_light: "Sáng",
    theme_dark: "Tối",
  },
  en: {
    nav_calendar: "Calendar",
    nav_timeline: "Timeline",
    nav_settings: "Settings",
    calendar_prev_month: "Previous month",
    calendar_next_month: "Next month",
    calendar_month: (m: number, y: number) => `Month ${m} / ${y}`,
    timeline_title: "Timeline",
    timeline_loading: "Loading...",
    timeline_empty: "No notes yet.",
    timeline_note_count: (n: number) => `${n} note${n === 1 ? "" : "s"}`,
    day_back: "Back",
    day_empty_title: "No notes yet",
    day_empty_desc: "Tap + to add a note for this day.",
    day_add: "Add note",
    day_delete_confirm: "Delete this note?",
    day_delete: "Delete",
    day_cancel: "Done",
    day_saving: "Saving...",
    day_unsaved: "Unsaved",
    day_saved: "Saved",
    day_save_failed: "Failed to save",
    day_delete_failed: "Failed to delete",
    day_load_failed: "Couldn't load notes for this day",
    compose_title: "New note",
    compose_tab_text: "Text",
    compose_tab_audio: "Audio",
    compose_tab_photo: "Photo",
    compose_text_placeholder: "How was your day?",
    compose_save: "Save",
    compose_saved: "Saved",
    compose_save_failed: "Failed to save, try again",
    compose_mic_start: "Start recording",
    compose_mic_stop: "Stop recording",
    compose_mic_error: "Couldn't access microphone. Check permissions.",
    compose_retake: "Retake",
    compose_photo_pick: "Take or choose a photo",
    compose_photo_compressing: "Compressing photo...",
    compose_photo_compress_failed: "Couldn't compress, using original",
    compose_photo_retake: "Choose again",
    settings_title: "Settings",
    settings_theme: "Theme",
    settings_language: "Language",
    settings_export: "Export data (backup)",
    settings_exporting: "Exporting...",
    settings_export_failed: "Export failed",
    settings_logout: "Log out",
    theme_system: "System",
    theme_light: "Light",
    theme_dark: "Dark",
  },
} as const;

type Dict = {
  [K in keyof typeof dict.vi]: (typeof dict.vi)[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : string;
};

function readStored(): Lang {
  if (typeof localStorage === "undefined") return "vi";
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "en" || value === "vi" ? value : "vi";
}

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n phai nam trong I18nProvider");
  return value;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored);

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: dict[lang] }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "vi" ? "en" : "vi")}
      aria-label={`Language: ${lang === "vi" ? "Tiếng Việt" : "English"}. Tap to switch`}
      title={lang === "vi" ? "Tiếng Việt" : "English"}
      className={className ?? "rounded-ui border border-border px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-surface-muted"}
    >
      {lang === "vi" ? "VI" : "EN"}
    </button>
  );
}
