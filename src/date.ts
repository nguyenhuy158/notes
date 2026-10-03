/** Ngày luôn là chuỗi "YYYY-MM-DD" — không dùng Date làm giá trị lưu trữ. */
export function todayString(): string {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month: month - 1, day };
}

export function monthString(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function formatVi(value: string): string {
  const { year, month, day } = parseDate(value);
  return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
}

export function toJsDate(value: string): Date {
  const { year, month, day } = parseDate(value);
  return new Date(year, month, day);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function shiftDateString(value: string, deltaDays: number): string {
  const { year, month, day } = parseDate(value);
  const d = new Date(year, month, day + deltaDays);
  return toDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Số ngày liên tiếp có ghi note, tính lùi từ hôm nay. Cho phép hôm nay chưa
 * ghi (chuỗi vẫn tính từ hôm qua) để không mất chuỗi giữa ngày lúc chưa viết.
 */
export function computeStreak(datesWithNotes: Set<string>): number {
  let cursor = todayString();
  if (!datesWithNotes.has(cursor)) cursor = shiftDateString(cursor, -1);

  let streak = 0;
  while (datesWithNotes.has(cursor)) {
    streak += 1;
    cursor = shiftDateString(cursor, -1);
  }
  return streak;
}

/** Chuỗi ngày liên tiếp DÀI NHẤT trong tập ngày đã cho (không nhất thiết kết
 * thúc ở hôm nay) — dùng cho tổng kết năm, khác `computeStreak` (chỉ tính
 * chuỗi hiện tại). */
export function computeLongestStreak(datesWithNotes: Set<string>): number {
  let longest = 0;
  let current = 0;
  const sorted = [...datesWithNotes].sort();
  let prev: string | null = null;
  for (const date of sorted) {
    current = prev && shiftDateString(prev, 1) === date ? current + 1 : 1;
    longest = Math.max(longest, current);
    prev = date;
  }
  return longest;
}
