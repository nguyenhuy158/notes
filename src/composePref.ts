import { NOTE_TYPES, type NoteType } from "../shared/notes";

/**
 * Loại note mở sẵn khi vào Compose. Chỉ lưu client (localStorage) như
 * accentColor/reminder — không đồng bộ thiết bị khác, đây là thói quen dùng
 * máy chứ không phải dữ liệu.
 *
 * Mặc định "audio": nói nhanh hơn gõ, đa số note tạo bằng giọng nói.
 */
const KEY = "compose-default-type";
const DEFAULT: NoteType = "audio";

export function getDefaultNoteType(): NoteType {
  const raw = localStorage.getItem(KEY) as NoteType | null;
  return raw && NOTE_TYPES.includes(raw) ? raw : DEFAULT;
}

export function setDefaultNoteType(type: NoteType) {
  localStorage.setItem(KEY, type);
}
