// Nhắc ghi note hàng ngày bằng Notification API, hoàn toàn phía client — không
// service worker/push server. Chỉ bắn được khi tab đang mở (hoặc PWA chạy
// nền ngắn hạn), không đảm bảo nhận khi app đã đóng hẳn.
import { api } from "./api";
import { todayString } from "./date";

const ENABLED_KEY = "reminder-enabled";
const TIME_KEY = "reminder-time"; // "HH:MM"

export function isReminderEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function getReminderTime(): string {
  return localStorage.getItem(TIME_KEY) ?? "20:00";
}

export function setReminderEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

export function setReminderTime(time: string): void {
  localStorage.setItem(TIME_KEY, time);
}

let timer: ReturnType<typeof setTimeout> | null = null;

function msUntilNext(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleNext(time: string, onFire: () => void) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    onFire();
    scheduleNext(time, onFire);
  }, msUntilNext(time));
}

// `onThisDayBody`: dòng phụ đính kèm nếu hôm nay có "kỷ niệm" (note trùng
// ngày/tháng năm trước) — kéo người dùng quay lại app thay vì chỉ nhắc chung
// chung. Lấy dữ liệu ngay lúc bắn thông báo (không cache) vì có thể đã đổi
// ngày từ lúc bật nhắc tới lúc thông báo thật sự chạy.
async function onThisDayBody(): Promise<string | undefined> {
  try {
    const { notes } = await api.onThisDay(todayString());
    if (notes.length === 0) return undefined;
    const first = notes[0];
    return first.type === "text" ? first.text.slice(0, 100) : undefined;
  } catch {
    return undefined;
  }
}

export function startReminderLoop(message: string) {
  if (!isReminderEnabled() || Notification.permission !== "granted") return;
  scheduleNext(getReminderTime(), async () => {
    const body = await onThisDayBody();
    new Notification(message, body ? { body } : undefined);
  });
}

export function stopReminderLoop() {
  if (timer) clearTimeout(timer);
  timer = null;
}
