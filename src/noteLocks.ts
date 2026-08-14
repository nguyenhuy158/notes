/**
 * Khoá riêng từng note — CHỈ lưu client (danh sách id trong localStorage),
 * không đồng bộ server/thiết bị khác. Đây là lớp che tạm (blur tới khi bấm
 * xem + xác nhận PIN đã đặt sẵn ở `pinLock.ts`), KHÔNG mã hoá nội dung — note
 * vẫn nằm nguyên trong response API, chỉ ẩn ở UI.
 */
const KEY = "locked-note-ids";

function readSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function isNoteLocked(id: string): boolean {
  return readSet().has(id);
}

export function setNoteLocked(id: string, locked: boolean): void {
  const set = readSet();
  if (locked) set.add(id);
  else set.delete(id);
  localStorage.setItem(KEY, JSON.stringify([...set]));
}
