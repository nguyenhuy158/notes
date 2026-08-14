/**
 * Hàng đợi ghi offline — CHỈ cho note văn bản (tạo mới/sửa). Audio/photo cần
 * upload file lớn, để offline-queue cho ảnh/âm thanh phức tạp hơn nhiều
 * (lưu blob vào IndexedDB, giới hạn dung lượng...) nên cố tình bỏ ngoài scope
 * này — audio/photo vẫn báo lỗi bình thường khi mất mạng.
 *
 * Lưu trong localStorage (đủ nhẹ cho text), tự đồng bộ khi có mạng lại qua
 * sự kiện `online` hoặc lúc app mở lại.
 */
import { api, type Mood } from "./api";

const KEY = "offline-queue";

type QueuedCreate = { kind: "create"; localId: string; date: string; text: string; mood: Mood | null };
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

export function queueCreate(op: Omit<QueuedCreate, "kind">): void {
  writeQueue([...readQueue(), { kind: "create", ...op }]);
}

export function queueUpdate(op: Omit<QueuedUpdate, "kind">): void {
  writeQueue([...readQueue(), { kind: "update", ...op }]);
}

export function hasQueuedOpsFor(localId: string): boolean {
  return readQueue().some((op) => op.kind === "create" && op.localId === localId);
}

let flushing = false;

/** Gọi lúc app mở lại và mỗi khi có sự kiện `online`. An toàn gọi nhiều lần —
 * tự bỏ qua nếu đang chạy dở, và dừng ngay khi gặp lỗi mạng khác (đỡ báo lỗi
 * dồn dập, quay lại thử ở lần flush kế). */
export async function flushOfflineQueue(onSynced?: () => void): Promise<void> {
  if (flushing) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  flushing = true;

  try {
    const remaining = [...queue];
    while (remaining.length > 0) {
      const op = remaining[0];
      try {
        if (op.kind === "create") {
          await api.createTextNote(op.date, op.text, op.mood, "");
        } else {
          await api.updateText(op.noteId, op.text);
        }
        remaining.shift();
        writeQueue(remaining);
        onSynced?.();
      } catch (err) {
        if (isNetworkError(err)) break; // vẫn mất mạng, dừng thử phần còn lại
        remaining.shift(); // lỗi khác (vd note đã bị xoá) — bỏ qua, không kẹt hàng đợi mãi
        writeQueue(remaining);
      }
    }
  } finally {
    flushing = false;
  }
}
