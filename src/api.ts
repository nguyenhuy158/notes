export type NoteType = "text" | "audio" | "photo";

export type Note = {
  id: string;
  date: string;
  type: NoteType;
  text: string;
  mime: string | null;
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
  days: (month: string) => request<{ days: Record<string, NoteType[]> }>(`/api/days?month=${month}`),

  notes: (date: string) => request<{ notes: Note[] }>(`/api/notes?date=${date}`),

  onThisDay: (date: string) => request<{ notes: Note[] }>(`/api/on-this-day?date=${date}`),

  search: (q: string) => request<{ notes: Note[] }>(`/api/search?q=${encodeURIComponent(q)}`),

  createTextNote: (date: string, text: string) => {
    const form = new FormData();
    form.set("date", date);
    form.set("type", "text");
    form.set("text", text);
    return request<{ note: Note }>("/api/notes", { method: "POST", body: form });
  },

  createMediaNote: (date: string, type: "audio" | "photo", file: Blob, filename: string) => {
    const form = new FormData();
    form.set("date", date);
    form.set("type", type);
    form.set("file", file, filename);
    return request<{ note: Note }>("/api/notes", { method: "POST", body: form });
  },

  updateText: (id: string, text: string) =>
    request<{ note: Note }>(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),

  deleteNote: (id: string) => request<{ ok: true }>(`/api/notes/${id}`, { method: "DELETE" }),

  stats: () => request<{ noteCount: number; mediaBytes: number }>("/api/stats"),

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
