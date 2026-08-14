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
