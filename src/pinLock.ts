/**
 * Khoá app bằng mã PIN cục bộ — CHỈ chắn người cầm điện thoại/máy đã đăng
 * nhập SSO sẵn (session cookie còn hạn), KHÔNG phải lớp bảo mật thật (không
 * chống được ai chiếm được cookie/token). Hash lưu localStorage bằng
 * SubtleCrypto SHA-256, không lưu PIN dạng thô. Mở khoá tính theo phiên
 * (sessionStorage) — đóng tab/trình duyệt lại phải nhập lại.
 */
const HASH_KEY = "pin-lock-hash";
const UNLOCKED_KEY = "pin-lock-unlocked";
const IDLE_MINUTES_KEY = "pin-idle-minutes";
const HIDDEN_AT_KEY = "pin-hidden-at";

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isPinSet(): boolean {
  return localStorage.getItem(HASH_KEY) !== null;
}

export function isUnlockedThisSession(): boolean {
  return !isPinSet() || sessionStorage.getItem(UNLOCKED_KEY) === "1";
}

export function markUnlocked(): void {
  sessionStorage.setItem(UNLOCKED_KEY, "1");
}

export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(HASH_KEY, await sha256Hex(pin));
  markUnlocked();
}

/** Xoá PIN đồng thời bỏ khoá riêng MỌI note — không thì note đã khoá riêng
 * đứng im ở trạng thái "đã khoá" mãi mãi, và `verifyPin` (không còn hash để
 * so) sẽ mở được bằng bất kỳ giá trị nào, kể cả rỗng — coi như hết khoá thật
 * sự dù UI vẫn hiện blur, dễ hiểu lầm là còn an toàn. */
export function clearPin(): void {
  localStorage.removeItem(HASH_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
  localStorage.removeItem("locked-note-ids");
}

/** Chưa từng đặt PIN thì KHÔNG có gì để xác thực — trả `false` (không phải
 * `true`) để mọi chỗ gọi verifyPin (mở khoá app, xem note đã khoá riêng) đều
 * an toàn mặc định, không vô tình mở khoá bằng PIN rỗng/bất kỳ. */
export async function verifyPin(pin: string): Promise<boolean> {
  const hash = localStorage.getItem(HASH_KEY);
  if (!hash) return false;
  return (await sha256Hex(pin)) === hash;
}

/** 0 = không bao giờ tự khoá (mặc định — chỉ khoá lại khi đóng hẳn tab). */
export function getIdleLockMinutes(): number {
  const raw = localStorage.getItem(IDLE_MINUTES_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function setIdleLockMinutes(minutes: number): void {
  localStorage.setItem(IDLE_MINUTES_KEY, String(minutes));
}

/** Gọi lúc tab bị ẩn (rời app/tắt màn hình) — ghi lại mốc thời gian để lúc
 * quay lại so sánh đã rời bao lâu. */
export function markHidden(): void {
  sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
}

/** Gọi lúc tab hiện lại — nếu rời quá ngưỡng đã đặt thì khoá lại (xoá cờ đã
 * mở khoá), trả `true` nếu vừa khoá lại để App.tsx cập nhật state hiển thị
 * màn nhập PIN. Ngưỡng = 0 (mặc định) thì không bao giờ tự khoá theo cách
 * này — vẫn có thể bị khoá khi đóng hẳn tab (sessionStorage mất theo tab). */
export function lockIfIdleTooLong(): boolean {
  const minutes = getIdleLockMinutes();
  const hiddenAt = sessionStorage.getItem(HIDDEN_AT_KEY);
  sessionStorage.removeItem(HIDDEN_AT_KEY);
  if (minutes <= 0 || !hiddenAt || !isPinSet()) return false;
  const elapsedMs = Date.now() - Number(hiddenAt);
  if (elapsedMs < minutes * 60_000) return false;
  sessionStorage.removeItem(UNLOCKED_KEY);
  return true;
}
