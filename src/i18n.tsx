import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "vi" | "en";

const STORAGE_KEY = "ui-lang";

const dict = {
  vi: {
    auth_title: "Notes",
    auth_tagline: "Nhật ký hằng ngày của riêng bạn.",
    auth_cta: "Đăng nhập với Google",
    auth_checking: "Đang kiểm tra đăng nhập...",
    nav_calendar: "Lịch",
    nav_timeline: "Dòng TG",
    nav_settings: "Cài đặt",
    calendar_prev_month: "Tháng trước",
    calendar_next_month: "Tháng sau",
    calendar_month: (m: number, y: number) => `Tháng ${m} / ${y}`,
    on_this_day_title: (y: number) => `Kỷ niệm ${y} năm trước`,
    calendar_go_today: "Về hôm nay",
    calendar_pick_month_year: "Chọn tháng/năm",
    calendar_month_short: (m: number) => `Th ${m}`,
    calendar_done: "Xong",
    timeline_title: "Dòng thời gian",
    timeline_loading: "Đang tải...",
    timeline_empty: "Chưa có ghi chú nào.",
    timeline_note_count: (n: number) => `${n} ghi chú`,
    timeline_streak: (n: number) => `🔥 Chuỗi ${n} ngày`,
    timeline_search_placeholder: "Tìm trong ghi chú...",
    timeline_search_empty: "Không tìm thấy ghi chú nào",
    timeline_filter_all: "Tất cả",
    timeline_load_more: "Xem thêm tháng cũ",
    timeline_loading_more: "Đang tải...",
    day_back: "Quay lại",
    day_prev: "Ngày trước",
    day_next: "Ngày sau",
    day_mood: "Cảm xúc",
    day_mood_clear: "Bỏ cảm xúc",
    day_empty_title: "Chưa có ghi chú",
    day_empty_desc: "Bấm nút + để thêm ghi chú cho ngày này.",
    day_add: "Thêm ghi chú",
    day_delete_confirm: "Xoá ghi chú này?",
    day_delete: "Xoá",
    day_cancel: "Xong",
    day_saving: "Đang lưu...",
    day_unsaved: "Chưa lưu",
    day_saved: "Đã lưu",
    day_saved_at: (time: string) => `Đã lưu lúc ${time}`,
    day_save_failed: "Lưu thất bại",
    day_delete_failed: "Xoá thất bại",
    day_move_up: "Đưa lên",
    day_move_down: "Đưa xuống",
    day_replace_media: "Đổi file",
    day_replace_failed: "Đổi file thất bại",
    day_pin: "Ghim",
    day_unpin: "Bỏ ghim",
    day_tags: "Nhãn",
    day_tags_placeholder: "Nhãn, cách nhau bằng dấu phẩy",
    day_tags_save_failed: "Lưu nhãn thất bại",
    day_share: "Chia sẻ",
    day_share_on: "Đã copy link chia sẻ",
    day_share_off: "Đã tắt chia sẻ",
    day_share_failed: "Chia sẻ thất bại",
    day_add_caption: "+ Thêm chú thích",
    calendar_mood_stats_title: "Cảm xúc tháng này",
    share_not_found_title: "Không tìm thấy",
    share_not_found_desc: "Link chia sẻ không tồn tại hoặc đã bị tắt.",
    share_loading: "Đang tải...",
    share_footer: "Chia sẻ từ Notes",
    settings_trash: "Thùng rác",
    trash_title: "Thùng rác",
    trash_empty: "Thùng rác trống",
    trash_restore: "Hoàn tác",
    trash_purge: "Xoá vĩnh viễn",
    trash_purge_confirm: "Xoá vĩnh viễn note này? Không thể hoàn tác.",
    trash_restore_failed: "Hoàn tác thất bại",
    trash_purge_failed: "Xoá thất bại",
    settings_pin_lock: "Khoá bằng mã PIN",
    settings_pin_lock_desc: "Yêu cầu nhập PIN mỗi khi mở lại app trên thiết bị này",
    pin_set_title: "Đặt mã PIN",
    pin_enter_title: "Nhập mã PIN",
    pin_confirm_title: "Nhập lại mã PIN",
    pin_mismatch: "Hai mã PIN không khớp, thử lại",
    pin_wrong: "Sai mã PIN",
    pin_length_hint: "4-6 chữ số",
    pin_unlock: "Mở khoá",
    calendar_year_view: "Xem theo năm",
    year_title: (y: number) => `Năm ${y}`,
    mood_nudge_text: "Mấy hôm nay có vẻ mệt — viết gì đó cho nhẹ lòng không?",
    day_location: "Địa điểm",
    day_location_placeholder: "Ở đâu vậy?",
    day_location_save_failed: "Lưu địa điểm thất bại",
    day_move_date: "Chuyển ngày",
    day_move_date_failed: "Chuyển ngày thất bại",
    settings_words: "Từ hay dùng",
    settings_words_empty: "Chưa đủ dữ liệu",
    year_stats_notes: (n: number) => `${n} ghi chú`,
    year_stats_top_mood: "Cảm xúc nhiều nhất",
    year_stats_longest_streak: (n: number) => `Chuỗi dài nhất: ${n} ngày`,
    year_stats_vs_last_year: (y: number) => `So với ${y}`,
    settings_album: "Xuất album ảnh (in/PDF)",
    album_title: "Album ảnh",
    album_pick_month: "Chọn tháng",
    album_print: "In / Lưu PDF",
    album_empty: "Tháng này chưa có ảnh nào",
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
    settings_stats: "Dung lượng đã dùng",
    settings_stats_notes: (n: number) => `${n} ghi chú`,
    settings_reminder: "Nhắc ghi note hàng ngày",
    settings_reminder_desc: "Chỉ nhắc khi mở web trên trình duyệt/thiết bị này",
    settings_reminder_denied: "Trình duyệt chặn thông báo. Vào cài đặt trình duyệt để bật lại.",
    settings_logout: "Đăng xuất",
    theme_system: "Theo hệ thống",
    theme_light: "Sáng",
    theme_dark: "Tối",
  },
  en: {
    auth_title: "Notes",
    auth_tagline: "Your own daily journal.",
    auth_cta: "Sign in with Google",
    auth_checking: "Checking sign-in...",
    nav_calendar: "Calendar",
    nav_timeline: "Timeline",
    nav_settings: "Settings",
    calendar_prev_month: "Previous month",
    calendar_next_month: "Next month",
    calendar_month: (m: number, y: number) => `Month ${m} / ${y}`,
    on_this_day_title: (y: number) => `${y} year${y === 1 ? "" : "s"} ago today`,
    calendar_go_today: "Today",
    calendar_pick_month_year: "Pick month/year",
    calendar_month_short: (m: number) => `M${m}`,
    calendar_done: "Done",
    timeline_title: "Timeline",
    timeline_loading: "Loading...",
    timeline_empty: "No notes yet.",
    timeline_note_count: (n: number) => `${n} note${n === 1 ? "" : "s"}`,
    timeline_streak: (n: number) => `🔥 ${n} day streak`,
    timeline_search_placeholder: "Search notes...",
    timeline_search_empty: "No notes found",
    timeline_filter_all: "All",
    timeline_load_more: "Load older months",
    timeline_loading_more: "Loading...",
    day_back: "Back",
    day_prev: "Previous day",
    day_next: "Next day",
    day_mood: "Mood",
    day_mood_clear: "Clear mood",
    day_empty_title: "No notes yet",
    day_empty_desc: "Tap + to add a note for this day.",
    day_add: "Add note",
    day_delete_confirm: "Delete this note?",
    day_delete: "Delete",
    day_cancel: "Done",
    day_saving: "Saving...",
    day_unsaved: "Unsaved",
    day_saved: "Saved",
    day_saved_at: (time: string) => `Saved at ${time}`,
    day_save_failed: "Failed to save",
    day_delete_failed: "Failed to delete",
    day_move_up: "Move up",
    day_move_down: "Move down",
    day_replace_media: "Replace file",
    day_replace_failed: "Failed to replace file",
    day_pin: "Pin",
    day_unpin: "Unpin",
    day_tags: "Tags",
    day_tags_placeholder: "Tags, comma-separated",
    day_tags_save_failed: "Failed to save tags",
    day_share: "Share",
    day_share_on: "Share link copied",
    day_share_off: "Sharing turned off",
    day_share_failed: "Share failed",
    day_add_caption: "+ Add caption",
    calendar_mood_stats_title: "This month's moods",
    share_not_found_title: "Not found",
    share_not_found_desc: "This share link doesn't exist or was turned off.",
    share_loading: "Loading...",
    share_footer: "Shared from Notes",
    settings_trash: "Trash",
    trash_title: "Trash",
    trash_empty: "Trash is empty",
    trash_restore: "Restore",
    trash_purge: "Delete forever",
    trash_purge_confirm: "Permanently delete this note? Can't be undone.",
    trash_restore_failed: "Failed to restore",
    trash_purge_failed: "Failed to delete",
    settings_pin_lock: "PIN lock",
    settings_pin_lock_desc: "Require a PIN every time the app reopens on this device",
    pin_set_title: "Set a PIN",
    pin_enter_title: "Enter PIN",
    pin_confirm_title: "Confirm PIN",
    pin_mismatch: "PINs don't match, try again",
    pin_wrong: "Wrong PIN",
    pin_length_hint: "4-6 digits",
    pin_unlock: "Unlock",
    calendar_year_view: "Year view",
    year_title: (y: number) => `${y}`,
    mood_nudge_text: "Rough few days — want to write something out?",
    day_location: "Location",
    day_location_placeholder: "Where are you?",
    day_location_save_failed: "Failed to save location",
    day_move_date: "Move date",
    day_move_date_failed: "Failed to move date",
    settings_words: "Frequent words",
    settings_words_empty: "Not enough data yet",
    year_stats_notes: (n: number) => `${n} notes`,
    year_stats_top_mood: "Most common mood",
    year_stats_longest_streak: (n: number) => `Longest streak: ${n} days`,
    year_stats_vs_last_year: (y: number) => `vs ${y}`,
    settings_album: "Export photo album (print/PDF)",
    album_title: "Photo album",
    album_pick_month: "Pick a month",
    album_print: "Print / Save PDF",
    album_empty: "No photos this month",
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
    settings_stats: "Storage used",
    settings_stats_notes: (n: number) => `${n} note${n === 1 ? "" : "s"}`,
    settings_reminder: "Daily note reminder",
    settings_reminder_desc: "Only fires while the app is open in this browser/device",
    settings_reminder_denied: "Browser blocked notifications. Enable them in browser settings.",
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
