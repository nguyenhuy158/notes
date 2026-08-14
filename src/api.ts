export type EntrySummary = { date: string; content: string; updated_at: string };
export type Entry = { date: string; content: string; updated_at: string | null };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  listEntries: () => request<{ entries: EntrySummary[] }>("/api/entries"),
  getEntry: (date: string) => request<{ entry: Entry }>(`/api/entries/${date}`),
  saveEntry: (date: string, content: string) =>
    request<{ ok: true }>(`/api/entries/${date}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  deleteEntry: (date: string) =>
    request<{ ok: true }>(`/api/entries/${date}`, { method: "DELETE" }),
};
