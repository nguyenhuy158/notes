/**
 * Hàng đợi ghi offline — CHỈ cho note văn bản (tạo mới/sửa). Audio/photo cần
 * upload file lớn, để offline-queue cho ảnh/âm thanh phức tạp hơn nhiều
 * (lưu blob vào IndexedDB, giới hạn dung lượng...) nên cố tình bỏ ngoài scope
 * này — audio/photo vẫn báo lỗi bình thường khi mất mạng.
 *
 * Lưu trong localStorage (đủ nhẹ cho text), tự đồng bộ khi có mạng lại qua
 * sự kiện `online` hoặc lúc app mở lại.
 */
import { api } from "./api";
import type { Mood } from "../shared/notes";

const KEY = "offline-queue";

type QueuedCreate = {
  kind: "create";
  localId: string;
  date: string;
  text: string;
  mood: Mood | null;
  location: string;
  tags: string[];
};
type QueuedUpdate = { kind: "update"; noteId: string; text: string };
type QueuedOp = QueuedCreate | QueuedUpdate;

function readQueue(): QueuedOp[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedOp[]): void {
  localStorage.setItem(KEY, JSON.stringify(queue));
}

/** Lỗi mạng thật (offline/DNS/timeout) ném `TypeError` ở `fetch` — khác lỗi
 * HTTP (4xx/5xx) app ném dạng `Error` thường trong `api.ts`. Chỉ queue lỗi
 * mạng; lỗi HTTP (vd 400 do text rỗng) vẫn báo user sửa ngay, không queue. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

// Note mới tự lưu debounce mỗi 1.5s — offline thì mỗi lần debounce đều fail,
// nên dùng CÙNG 1 localId thay thế (không append) op cũ đã queue cho note đó,
// tránh tạo nhiều bản trùng khi mạng có lại.
export function queueCreate(op: Omit<QueuedCreate, "kind">): void {
  const queue = readQueue().filter((q) => !(q.kind === "create" && q.localId === op.localId));
  writeQueue([...queue, { kind: "create", ...op }]);
}

export function queueUpdate(op: Omit<QueuedUpdate, "kind">): void {
  const queue = readQueue().filter((q) => !(q.kind === "update" && q.noteId === op.noteId));
  writeQueue([...queue, { kind: "update", ...op }]);
}

function removeOp(queue: QueuedOp[], op: QueuedOp): QueuedOp[] {
  const idx = queue.findIndex((q) =>
    q.kind === "create" && op.kind === "create"
      ? q.localId === op.localId
      : q.kind === "update" && op.kind === "update"
        ? q.noteId === op.noteId
        : false,
  );
  if (idx === -1) return queue;
  return [...queue.slice(0, idx), ...queue.slice(idx + 1)];
}

let flushing = false;

/** Gọi lúc app mở lại và mỗi khi có sự kiện `online`. An toàn gọi nhiều lần —
 * tự bỏ qua nếu đang chạy dở, và dừng ngay khi gặp lỗi mạng khác (đỡ báo lỗi
 * dồn dập, quay lại thử ở lần flush kế). Đọc lại queue từ localStorage ở MỖI
 * vòng lặp (không giữ snapshot) — user có thể gõ tiếp và enqueue thêm trong
 * lúc đang flush, giữ snapshot cũ sẽ ghi đè mất phần vừa thêm đó. */
export async function flushOfflineQueue(onSynced?: () => void): Promise<void> {
  if (flushing) return;
  flushing = true;

  try {
    while (true) {
      const queue = readQueue();
      if (queue.length === 0) break;
      const op = queue[0];
      try {
        if (op.kind === "create") {
          await api.createTextNote(op.date, op.text, op.mood, op.location, op.tags);
        } else {
          await api.updateText(op.noteId, op.text);
        }
        writeQueue(removeOp(readQueue(), op));
        onSynced?.();
      } catch (err) {
        if (isNetworkError(err)) break; // vẫn mất mạng, dừng thử phần còn lại
        writeQueue(removeOp(readQueue(), op)); // lỗi khác (vd note đã bị xoá) — bỏ qua, không kẹt hàng đợi mãi
      }
    }
  } finally {
    flushing = false;
  }
}
