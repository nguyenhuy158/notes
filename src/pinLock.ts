/**
 * Khoá app bằng mã PIN cục bộ — CHỈ chắn người cầm điện thoại/máy đã đăng
 * nhập SSO sẵn (session cookie còn hạn), KHÔNG phải lớp bảo mật thật (không
 * chống được ai chiếm được cookie/token). Hash lưu localStorage bằng
 * SubtleCrypto SHA-256, không lưu PIN dạng thô. Mở khoá tính theo phiên
 * (sessionStorage) — đóng tab/trình duyệt lại phải nhập lại.
 */
const HASH_KEY = "pin-lock-hash";
const UNLOCKED_KEY = "pin-lock-unlocked";

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

export function clearPin(): void {
  localStorage.removeItem(HASH_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = localStorage.getItem(HASH_KEY);
  if (!hash) return true;
  return (await sha256Hex(pin)) === hash;
}
