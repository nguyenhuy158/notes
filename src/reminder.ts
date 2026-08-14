// Nhắc ghi note hàng ngày bằng Notification API, hoàn toàn phía client — không
// service worker/push server. Chỉ bắn được khi tab đang mở (hoặc PWA chạy
// nền ngắn hạn), không đảm bảo nhận khi app đã đóng hẳn.
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

export function startReminderLoop(message: string) {
  if (!isReminderEnabled() || Notification.permission !== "granted") return;
  scheduleNext(getReminderTime(), () => new Notification(message));
}

export function stopReminderLoop() {
  if (timer) clearTimeout(timer);
  timer = null;
}
