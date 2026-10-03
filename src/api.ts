import type { Mood, NoteType } from "../shared/notes";
import { downloadBlob } from "./lib/download";

export type Note = {
  id: string;
  date: string;
  type: NoteType;
  text: string;
  mime: string | null;
  mood: string | null;
  pinned: boolean;
  tags: string[];
  shareToken: string | null;
  location: string | null;
  mediaUrl: string | null;
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** fetch + xử lý chung: 401 -> về /login, status lỗi -> throw. */
async function fetchOk(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, init);
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return (await fetchOk(path, init)).json() as Promise<T>;
}

function putJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const api = {
  days: (month: string) =>
    request<{
      days: Record<string, NoteType[]>;
      moods: Record<string, string>;
      tags: Record<string, string[]>;
    }>(`/api/days?month=${month}`),

  notes: (date: string) => request<{ notes: Note[] }>(`/api/notes?date=${date}`),

  summary: (date: string) => request<{ summary: string | null }>(`/api/summary?date=${date}`),

  onThisDay: (date: string) => request<{ notes: Note[] }>(`/api/on-this-day?date=${date}`),

  search: (q: string) => request<{ notes: Note[] }>(`/api/search?q=${encodeURIComponent(q)}`),

  createTextNote: (date: string, text: string, mood: Mood | null, location: string, tags: string[] = []) => {
    const form = new FormData();
    form.set("date", date);
    form.set("type", "text");
    form.set("text", text);
    if (mood) form.set("mood", mood);
    if (location) form.set("location", location);
    if (tags.length) form.set("tags", tags.join(","));
    return request<{ note: Note }>("/api/notes", { method: "POST", body: form });
  },

  // `files`: 1 file cho audio/video, 1-10 file cho photo (gallery nhiều
  // ảnh/note). `poster` (chỉ video): 1 khung hình JPEG trích từ video ở
  // client, dùng để AI tạo caption — KHÔNG được lưu, chỉ đọc rồi bỏ ở worker.
  createMediaNote: (
    date: string,
    type: "audio" | "photo" | "video",
    files: { blob: Blob; filename: string }[],
    mood: Mood | null,
    location: string,
    tags: string[] = [],
    poster?: Blob,
  ) => {
    const form = new FormData();
    form.set("date", date);
    form.set("type", type);
    for (const f of files) form.append("file", f.blob, f.filename);
    if (poster) form.set("poster", poster, "poster.jpg");
    if (mood) form.set("mood", mood);
    if (location) form.set("location", location);
    if (tags.length) form.set("tags", tags.join(","));
    return request<{ note: Note }>("/api/notes", { method: "POST", body: form });
  },

  updateText: (id: string, text: string) => putJson<{ note: Note }>(`/api/notes/${id}`, { text }),

  updateMood: (id: string, mood: Mood | null) => putJson<{ note: Note }>(`/api/notes/${id}/mood`, { mood }),

  deleteNote: (id: string) => request<{ ok: true }>(`/api/notes/${id}`, { method: "DELETE" }),

  trash: () => request<{ notes: Note[] }>("/api/trash"),

  restoreNote: (id: string) => request<{ note: Note }>(`/api/notes/${id}/restore`, { method: "POST" }),

  purgeNote: (id: string) => request<{ ok: true }>(`/api/notes/${id}/purge`, { method: "DELETE" }),

  year: (year: string) =>
    request<{ counts: Record<string, number>; moods: Record<string, string> }>(`/api/year?year=${year}`),

  words: () => request<{ words: { word: string; count: number }[] }>("/api/words"),

  searchPlaces: (q: string) => request<{ places: string[] }>(`/api/places?q=${encodeURIComponent(q)}`),

  tags: () => request<{ tags: { tag: string; count: number }[] }>("/api/tags"),

  notesByTag: (tag: string) => request<{ notes: Note[] }>(`/api/notes/by-tag?tag=${encodeURIComponent(tag)}`),

  renameTag: (from: string, to: string) =>
    putJson<{ ok: true; updated: number }>("/api/tags/rename", { from, to }),

  updateLocation: (id: string, location: string) =>
    putJson<{ note: Note }>(`/api/notes/${id}/location`, { location }),

  moveNoteDate: (id: string, date: string) => putJson<{ note: Note }>(`/api/notes/${id}/date`, { date }),

  reorderNotes: (ids: string[]) => putJson<{ ok: true }>("/api/notes/reorder", { ids }),

  replaceMedia: (id: string, file: Blob, filename: string) => {
    const form = new FormData();
    form.set("file", file, filename);
    return request<{ note: Note }>(`/api/notes/${id}/media`, { method: "PUT", body: form });
  },

  togglePin: (id: string, pinned: boolean) => putJson<{ note: Note }>(`/api/notes/${id}/pin`, { pinned }),

  updateTags: (id: string, tags: string[]) => putJson<{ note: Note }>(`/api/notes/${id}/tags`, { tags }),

  enableShare: (id: string) => request<{ shareToken: string }>(`/api/notes/${id}/share`, { method: "POST" }),

  disableShare: (id: string) => request<{ ok: true }>(`/api/notes/${id}/share`, { method: "DELETE" }),

  // Public, không cần đăng nhập — dùng cho trang xem note đã chia sẻ.
  getSharedNote: async (token: string): Promise<Note | null> => {
    const res = await fetch(`/share/${token}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { note: Note };
    return body.note;
  },

  stats: () => request<{ noteCount: number; mediaBytes: number }>("/api/stats"),

  me: () => request<{ email: string; name: string }>("/api/me"),

  // Kiểm tra đăng nhập lúc app khởi động — KHÔNG dùng request(), vì request()
  // tự redirect sang /login khi 401. Ở đây 401 là kết quả hợp lệ (chưa đăng
  // nhập), cần trả về để App hiện LoginScreen thay vì bounce mù không rõ lý do.
  checkAuth: async (): Promise<{ email: string; name: string } | null> => {
    const res = await fetch("/api/me");
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },

  // Dùng nội bộ cho Album ảnh (không trigger tải file như exportNotes).
  exportJson: async (): Promise<Note[]> =>
    (await request<{ notes: Note[] }>("/api/export?format=json")).notes,

  exportNotes: async (format: "json" | "markdown") => {
    const res = await fetchOk(`/api/export?format=${format}`);
    downloadBlob(await res.blob(), format === "json" ? "notes-export.json" : "notes-export.md");
  },
};
