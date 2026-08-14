import { useEffect, useMemo, useState } from "react";
import { api, type Entry, type EntrySummary } from "./api";
import { Button } from "./ui/Button";
import { DatePicker, formatDate } from "./ui/DatePicker";
import { Textarea } from "./ui/Input";
import { HeaderBar } from "./ui/HeaderBar";
import { EmptyState, LoadingState } from "./ui/states";
import { ThemeToggle } from "./ui/theme";
import { useToast } from "./ui/Toast";

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function App() {
  const toast = useToast();
  const [date, setDate] = useState(todayString());
  const [entries, setEntries] = useState<EntrySummary[] | null>(null);
  const [current, setCurrent] = useState<Entry | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(true);

  const dirty = current !== null && draft !== current.content;

  useEffect(() => {
    api
      .listEntries()
      .then((r) => setEntries(r.entries))
      .catch(() => toast.error("Không tải được danh sách ghi chú"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoadingEntry(true);
    api
      .getEntry(date)
      .then((r) => {
        setCurrent(r.entry);
        setDraft(r.entry.content);
      })
      .catch(() => toast.error("Không tải được ghi chú ngày này"))
      .finally(() => setLoadingEntry(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function save() {
    setSaving(true);
    try {
      await api.saveEntry(date, draft);
      setCurrent({ date, content: draft, updated_at: new Date().toISOString() });
      setEntries((prev) => {
        const rest = (prev ?? []).filter((e) => e.date !== date);
        return [{ date, content: draft.slice(0, 120), updated_at: new Date().toISOString() }, ...rest].sort(
          (a, b) => (a.date < b.date ? 1 : -1)
        );
      });
      toast.success("Đã lưu");
    } catch {
      toast.error("Lưu thất bại, thử lại");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Xoá ghi chú ngày ${formatDate(date)}?`)) return;
    try {
      await api.deleteEntry(date);
      setCurrent({ date, content: "", updated_at: null });
      setDraft("");
      setEntries((prev) => (prev ?? []).filter((e) => e.date !== date));
      toast.success("Đã xoá");
    } catch {
      toast.error("Xoá thất bại");
    }
  }

  const sortedDates = useMemo(() => entries?.map((e) => e.date) ?? [], [entries]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <HeaderBar
        title="Notes"
        subtitle={formatDate(date)}
        actions={
          <>
            <ThemeToggle />
            <a href="/logout" className="text-xs text-fg-muted hover:text-fg">
              Đăng xuất
            </a>
          </>
        }
      />

      <main className="flex-1 space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker value={date} onChange={setDate} max={todayString()} />
          <Button variant="ghost" size="sm" onClick={() => setDate(todayString())} disabled={date === todayString()}>
            Hôm nay
          </Button>
        </div>

        {loadingEntry ? (
          <LoadingState />
        ) : (
          <>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={14}
              placeholder="Hôm nay bạn thế nào?"
            />
            <div className="flex items-center gap-2">
              <Button onClick={save} loading={saving} disabled={!dirty}>
                Lưu
              </Button>
              {current?.updated_at && (
                <Button variant="danger" size="sm" onClick={remove}>
                  Xoá
                </Button>
              )}
            </div>
          </>
        )}

        <section className="space-y-2 pt-4">
          <h2 className="text-sm font-semibold text-fg-muted">Ghi chú gần đây</h2>
          {entries === null ? (
            <LoadingState />
          ) : sortedDates.length === 0 ? (
            <EmptyState title="Chưa có ghi chú nào" description="Viết ghi chú đầu tiên ở trên." />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-ui border border-border">
              {entries.map((e) => (
                <li key={e.date}>
                  <button
                    onClick={() => setDate(e.date)}
                    className="block w-full px-3 py-2 text-left hover:bg-surface-muted"
                  >
                    <div className="text-sm font-medium text-fg">{formatDate(e.date)}</div>
                    <div className="truncate text-xs text-fg-muted">{e.content || "(trống)"}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
