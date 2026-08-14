export type NoteType = "text" | "audio" | "photo";

export const MOODS = ["😄", "🙂", "😐", "😔", "😡", "😴", "🥳", "😰"] as const;
export type Mood = (typeof MOODS)[number];

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
  mediaUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  days: (month: string) =>
    request<{ days: Record<string, NoteType[]>; moods: Record<string, string> }>(`/api/days?month=${month}`),

  notes: (date: string) => request<{ notes: Note[] }>(`/api/notes?date=${date}`),

  onThisDay: (date: string) => request<{ notes: Note[] }>(`/api/on-this-day?date=${date}`),

  search: (q: string) => request<{ notes: Note[] }>(`/api/search?q=${encodeURIComponent(q)}`),

  createTextNote: (date: string, text: string, mood: Mood | null) => {
    const form = new FormData();
    form.set("date", date);
    form.set("type", "text");
    form.set("text", text);
    if (mood) form.set("mood", mood);
    return request<{ note: Note }>("/api/notes", { method: "POST", body: form });
  },

  createMediaNote: (date: string, type: "audio" | "photo", file: Blob, filename: string, mood: Mood | null) => {
    const form = new FormData();
    form.set("date", date);
    form.set("type", type);
    form.set("file", file, filename);
    if (mood) form.set("mood", mood);
    return request<{ note: Note }>("/api/notes", { method: "POST", body: form });
  },

  updateText: (id: string, text: string) =>
    request<{ note: Note }>(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),

  updateMood: (id: string, mood: Mood | null) =>
    request<{ note: Note }>(`/api/notes/${id}/mood`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood }),
    }),

  deleteNote: (id: string) => request<{ ok: true }>(`/api/notes/${id}`, { method: "DELETE" }),

  reorderNotes: (ids: string[]) =>
    request<{ ok: true }>("/api/notes/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }),

  replaceMedia: (id: string, file: Blob, filename: string) => {
    const form = new FormData();
    form.set("file", file, filename);
    return request<{ note: Note }>(`/api/notes/${id}/media`, { method: "PUT", body: form });
  },

  togglePin: (id: string, pinned: boolean) =>
    request<{ note: Note }>(`/api/notes/${id}/pin`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    }),

  updateTags: (id: string, tags: string[]) =>
    request<{ note: Note }>(`/api/notes/${id}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    }),

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

  exportNotes: async (format: "json" | "markdown") => {
    const res = await fetch(`/api/export?format=${format}`);
    if (res.status === 401) {
      window.location.href = "/login";
      throw new Error("unauthorized");
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "json" ? "notes-export.json" : "notes-export.md";
    a.click();
    URL.revokeObjectURL(url);
  },
};
