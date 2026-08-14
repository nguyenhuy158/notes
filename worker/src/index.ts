import { Hono } from "hono";
import { getClaimsFromRequest, resolveUserId, ssoUrl } from "./session.js";

type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SSO_ISSUER: string;
};

type Variables = {
  userId: string;
};

type NoteType = "text" | "audio" | "photo";

type NoteRow = {
  id: string;
  date: string;
  type: NoteType;
  text: string;
  media_key: string | null;
  mime: string | null;
  created_at: string;
  updated_at: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
]);
const NOTE_TYPES: NoteType[] = ["text", "audio", "photo"];

function toNoteJson(row: NoteRow) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    text: row.text,
    mime: row.mime,
    mediaUrl: row.media_key ? `/api/media/${row.id}` : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.use("/api/*", async (c, next) => {
  const claims = await getClaimsFromRequest(c.req.raw, c.env.SSO_ISSUER);
  if (!claims) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", await resolveUserId(c.env.DB, claims));
  await next();
});

// Số note theo từng ngày trong tháng, để chấm dấu chàm trên lịch.
app.get("/api/days", async (c) => {
  const month = c.req.query("month") ?? "";
  if (!MONTH_RE.test(month)) return c.json({ error: "invalid month" }, 400);
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT date, COUNT(*) AS count FROM notes_entries WHERE user_id = ? AND date LIKE ? GROUP BY date"
  )
    .bind(userId, `${month}-%`)
    .all<{ date: string; count: number }>();
  const days: Record<string, number> = {};
  for (const row of results) days[row.date] = row.count;
  return c.json({ days });
});

app.get("/api/notes", async (c) => {
  const date = c.req.query("date") ?? "";
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE user_id = ? AND date = ? ORDER BY created_at ASC"
  )
    .bind(userId, date)
    .all<NoteRow>();
  return c.json({ notes: results.map(toNoteJson) });
});

app.post("/api/notes", async (c) => {
  const userId = c.get("userId");
  const form = await c.req.parseBody();

  const date = String(form.date ?? "");
  const type = String(form.type ?? "") as NoteType;
  const text = typeof form.text === "string" ? form.text : "";
  const file = form.file instanceof File ? form.file : null;

  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  if (!NOTE_TYPES.includes(type)) return c.json({ error: "invalid type" }, 400);
  if (type === "text" && !text.trim()) return c.json({ error: "empty text" }, 400);
  if ((type === "audio" || type === "photo") && !file) return c.json({ error: "missing file" }, 400);
  // Chặn mime giả mạo (vd "text/html") lọt vào R2 rồi bị trình duyệt render như
  // trang gốc khi GET /api/media trả lại — chỉ nhận đúng loại file cho từng type.
  if ((type === "audio" || type === "photo") && !ALLOWED_MIME.has(file!.type))
    return c.json({ error: "invalid file type" }, 400);

  const id = crypto.randomUUID();
  let mediaKey: string | null = null;
  let mime: string | null = null;

  if (file) {
    mediaKey = `${userId}/${id}`;
    mime = file.type;
    await c.env.MEDIA.put(mediaKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: mime },
    });
  }

  await c.env.DB.prepare(
    `INSERT INTO notes_entries (id, user_id, date, type, text, media_key, mime)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, userId, date, type, text, mediaKey, mime)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) }, 201);
});

app.put("/api/notes/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json<{ text: string }>();
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return c.json({ error: "empty text" }, 400);

  const existing = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE id = ? AND user_id = ? AND type = 'text'"
  )
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE notes_entries SET text = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(text, id)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) });
});

app.delete("/api/notes/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  if (existing.media_key) await c.env.MEDIA.delete(existing.media_key);
  await c.env.DB.prepare("DELETE FROM notes_entries WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

app.get("/api/media/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!row?.media_key) return c.json({ error: "not found" }, 404);

  const object = await c.env.MEDIA.get(row.media_key);
  if (!object) return c.json({ error: "not found" }, 404);

  // Chỉ tin content-type nếu đúng dạng ảnh/âm thanh đã kiểm khi upload; mọi
  // giá trị khác (kể cả dữ liệu cũ lỡ lọt qua) rơi về octet-stream để trình
  // duyệt tải xuống thay vì render — chặn XSS qua content-type phản chiếu.
  const safeType = row.mime && ALLOWED_MIME.has(row.mime) ? row.mime : "application/octet-stream";

  return new Response(object.body, {
    headers: {
      "Content-Type": safeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});

app.get("/login", (c) => {
  const url = new URL(c.req.url);
  return c.redirect(ssoUrl(c.env.SSO_ISSUER, "/login", `${url.origin}/`));
});

app.get("/logout", (c) => {
  const url = new URL(c.req.url);
  return c.redirect(ssoUrl(c.env.SSO_ISSUER, "/logout", `${url.origin}/`));
});

export default app;
