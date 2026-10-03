// Hợp đồng dữ liệu note dùng chung cho frontend (src/) và worker — sửa một chỗ
// là cả client lẫn whitelist phía server cùng đổi theo.

export const NOTE_TYPES = ["text", "audio", "photo", "video"] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

/** Bộ mood cố định, lưu DB dạng ký tự unicode (hiển thị qua `MoodEmoji`). */
export const MOODS = ["😄", "🙂", "😐", "😔", "😡", "😴", "🥳", "😰"] as const;
export type Mood = (typeof MOODS)[number];

/** 30MB — video quay điện thoại vài chục giây, đủ rộng nhưng vẫn giới hạn để tránh tốn R2 vô tội vạ. */
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

/** Số nhãn tối đa mỗi note. */
export const MAX_TAGS = 5;
