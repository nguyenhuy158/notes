import { Hono } from "hono";
import { getClaimsFromRequest, resolveUserId, ssoUrl } from "./session.js";
import { BUILD_INFO } from "../../shared/build-info";

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
  mood: string | null;
  sort_order: number;
  pinned: number;
  tags: string | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
};

// Chỉ nhận đúng bộ emoji cố định — chặn user nhét text tuỳ ý vào cột mood.
const MOODS = new Set(["😄", "🙂", "😐", "😔", "😡", "😴", "🥳", "😰"]);

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
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 24;

function parseTags(raw: string | null): string[] {
  return raw ? raw.split(",").filter(Boolean) : [];
}

// Cho phép chữ/số/khoảng trắng unicode (tên tag tiếng Việt có dấu), chặn dấu
// phẩy (ký tự phân tách khi lưu) và ký tự điều khiển.
function sanitizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().replace(/,/g, "").slice(0, MAX_TAG_LENGTH);
    if (tag) seen.add(tag);
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen];
}

function toNoteJson(row: NoteRow) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    text: row.text,
    mime: row.mime,
    mood: row.mood,
    pinned: row.pinned === 1,
    tags: parseTags(row.tags),
    shareToken: row.share_token,
    mediaUrl: row.media_key ? `/api/media/${row.id}?v=${encodeURIComponent(row.updated_at)}` : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.get("/api/version", (c) => c.json(BUILD_INFO));

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
    "SELECT date, type, mood FROM notes_entries WHERE user_id = ? AND date LIKE ? GROUP BY date, type, mood"
  )
    .bind(userId, `${month}-%`)
    .all<{ date: string; type: NoteType; mood: string | null }>();
  const days: Record<string, NoteType[]> = {};
  const moods: Record<string, string> = {};
  for (const row of results) {
    (days[row.date] ??= []).push(row.type);
    // Chỉ giữ 1 mood đại diện/ngày (cái xuất hiện trước trong kết quả là đủ).
    if (row.mood && !moods[row.date]) moods[row.date] = row.mood;
  }
  return c.json({ days, moods });
});

// "Kỷ niệm": note trùng ngày/tháng ở các năm trước, để nhắc lại chuyện cũ
// trên trang chủ (giống tính năng "On this day" ở Google Photos/Facebook).
app.get("/api/on-this-day", async (c) => {
  const date = c.req.query("date") ?? "";
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");
  const monthDay = date.slice(5); // "MM-DD"
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE user_id = ? AND date != ? AND substr(date, 6) = ? ORDER BY date DESC"
  )
    .bind(userId, date, monthDay)
    .all<NoteRow>();
  return c.json({ notes: results.map(toNoteJson) });
});

// Tìm trong nội dung note văn bản hoặc trong tags (mọi loại note đều có thể
// gắn tag, kể cả audio/photo — tìm theo tag giúp lọc được cả note không có
// text).
app.get("/api/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json({ notes: [] });
  const userId = c.get("userId");
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM notes_entries
     WHERE user_id = ? AND ((type = 'text' AND text LIKE ? ESCAPE '\\') OR tags LIKE ? ESCAPE '\\')
     ORDER BY date DESC LIMIT 50`
  )
    .bind(userId, like, like)
    .all<NoteRow>();
  return c.json({ notes: results.map(toNoteJson) });
});

app.get("/api/notes", async (c) => {
  const date = c.req.query("date") ?? "";
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE user_id = ? AND date = ? ORDER BY pinned DESC, sort_order ASC, created_at ASC"
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
  const moodRaw = typeof form.mood === "string" ? form.mood : "";
  const mood = MOODS.has(moodRaw) ? moodRaw : null;

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
    `INSERT INTO notes_entries (id, user_id, date, type, text, media_key, mime, mood)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, userId, date, type, text, mediaKey, mime, mood)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) }, 201);
});

// Sắp lại thứ tự note trong 1 ngày (kéo lên/xuống ở UI). Nhận nguyên danh
// sách id theo thứ tự mới, gán sort_order = index — chỉ áp dụng cho note của
// chính user, id lạ/của user khác bị bỏ qua thầm lặng (không lỗi cả request).
// Đăng ký TRƯỚC "/api/notes/:id" — không thì ":id" nuốt mất path "reorder".
app.put("/api/notes/reorder", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ ids: string[] }>();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : [];

  await c.env.DB.batch(
    ids.map((id, index) =>
      c.env.DB.prepare("UPDATE notes_entries SET sort_order = ? WHERE id = ? AND user_id = ?").bind(
        index,
        id,
        userId
      )
    )
  );

  return c.json({ ok: true });
});

// Sửa nội dung chữ của note. Với type "text" đây là nội dung chính (không
// được rỗng); với "audio"/"photo" đây là caption đi kèm (được phép rỗng —
// caption là tuỳ chọn).
app.put("/api/notes/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json<{ text: string }>();
  const text = typeof body.text === "string" ? body.text : "";

  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);
  if (existing.type === "text" && !text.trim()) return c.json({ error: "empty text" }, 400);

  await c.env.DB.prepare(
    "UPDATE notes_entries SET text = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(text, id)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) });
});

// Ghim note lên đầu ngày, không phụ thuộc sort_order.
app.put("/api/notes/:id/pin", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json<{ pinned: boolean }>();

  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE notes_entries SET pinned = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(body.pinned ? 1 : 0, id)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) });
});

// Gắn nhãn tự do cho note (tối đa 5, mỗi nhãn tối đa 24 ký tự) — dùng lọc/tìm
// ở Timeline (xem /api/search) và giúp phân loại note không có text.
app.put("/api/notes/:id/tags", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json<{ tags: unknown }>();
  const tags = sanitizeTags(body.tags);

  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE notes_entries SET tags = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(tags.length ? tags.join(",") : null, id)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) });
});

// Bật/tắt chia sẻ công khai (xem-only, không cần đăng nhập) qua /share/:token.
// POST tạo token mới nếu chưa có (giữ nguyên token cũ nếu đã bật — tránh phá
// link đã gửi cho người khác); DELETE thu hồi.
app.post("/api/notes/:id/share", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  const token = existing.share_token ?? crypto.randomUUID();
  if (!existing.share_token) {
    await c.env.DB.prepare("UPDATE notes_entries SET share_token = ? WHERE id = ?").bind(token, id).run();
  }

  return c.json({ shareToken: token });
});

app.delete("/api/notes/:id/share", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare("UPDATE notes_entries SET share_token = NULL WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// Sửa cảm xúc sau khi tạo — áp dụng mọi loại note (text/audio/photo), khác
// PUT /api/notes/:id chỉ dành riêng cho sửa nội dung note text.
app.put("/api/notes/:id/mood", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json<{ mood: string | null }>();
  const mood = body.mood && MOODS.has(body.mood) ? body.mood : null;

  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE notes_entries SET mood = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(mood, id)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) });
});

// Thay file audio/photo của note đã tạo (giữ nguyên id/media_key, chỉ ghi đè
// object R2 + mime). Không cho đổi loại note (audio -> photo) vì id ảnh/âm
// thanh dùng chung route /api/media/:id, đổi type dễ gây nhầm ở nơi khác.
app.put("/api/notes/:id/media", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");

  const existing = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE id = ? AND user_id = ? AND type IN ('audio', 'photo')"
  )
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  const form = await c.req.parseBody();
  const file = form.file instanceof File ? form.file : null;
  if (!file) return c.json({ error: "missing file" }, 400);
  if (!ALLOWED_MIME.has(file.type)) return c.json({ error: "invalid file type" }, 400);

  const mediaKey = existing.media_key ?? `${userId}/${id}`;
  await c.env.MEDIA.put(mediaKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  await c.env.DB.prepare(
    "UPDATE notes_entries SET media_key = ?, mime = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(mediaKey, file.type, id)
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

// Backup toàn bộ note của user hiện tại. Ảnh/âm thanh chỉ export dạng link
// tới /api/media/:id (cần đăng nhập mới xem được), không export nguyên file —
// nếu cần full offline backup thì tải R2 riêng.
app.get("/api/export", async (c) => {
  const userId = c.get("userId");
  const format = c.req.query("format") === "markdown" ? "markdown" : "json";
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE user_id = ? ORDER BY date ASC, created_at ASC"
  )
    .bind(userId)
    .all<NoteRow>();

  if (format === "json") {
    const body = JSON.stringify(
      { exportedAt: new Date().toISOString(), notes: results.map(toNoteJson) },
      null,
      2
    );
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="notes-export.json"',
      },
    });
  }

  const origin = new URL(c.req.url).origin;
  const byDate = new Map<string, NoteRow[]>();
  for (const row of results) {
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }

  let md = "# Notes export\n\n";
  for (const [date, notes] of byDate) {
    md += `## ${date}\n\n`;
    for (const note of notes) {
      const time = note.created_at.slice(11, 16);
      if (note.type === "text") {
        md += `- **${time}** ${note.text}\n`;
      } else if (note.type === "audio") {
        md += `- **${time}** [audio](${origin}/api/media/${note.id})\n`;
      } else {
        md += `- **${time}** ![photo](${origin}/api/media/${note.id})\n`;
      }
    }
    md += "\n";
  }

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="notes-export.md"',
    },
  });
});

// Dung lượng media (ảnh/âm thanh) của user trên R2. Không lưu size trong D1
// nên tính trực tiếp từ R2.list theo prefix ${userId}/, phân trang bằng cursor.
app.get("/api/me", async (c) => {
  const userId = c.get("userId");
  const row = await c.env.DB.prepare("SELECT email, name FROM notes_users WHERE id = ?")
    .bind(userId)
    .first<{ email: string; name: string }>();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ email: row.email, name: row.name });
});

app.get("/api/stats", async (c) => {
  const userId = c.get("userId");
  const countRow = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM notes_entries WHERE user_id = ?"
  )
    .bind(userId)
    .first<{ count: number }>();

  let totalBytes = 0;
  let cursor: string | undefined;
  do {
    const listed = await c.env.MEDIA.list({ prefix: `${userId}/`, cursor });
    for (const obj of listed.objects) totalBytes += obj.size;
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return c.json({ noteCount: countRow?.count ?? 0, mediaBytes: totalBytes });
});

// Xem note đã chia sẻ — công khai, KHÔNG qua middleware xác thực /api/* (path
// này không bắt đầu bằng /api/). Chỉ lộ đúng 1 note khớp token, không phải
// toàn bộ dữ liệu user.
app.get("/share/:token", async (c) => {
  const token = c.req.param("token");
  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE share_token = ?")
    .bind(token)
    .first<NoteRow>();
  if (!row) return c.json({ error: "not found" }, 404);

  const note = toNoteJson(row);
  return c.json({
    note: {
      ...note,
      mediaUrl: row.media_key ? `/share/${token}/media` : null,
    },
  });
});

app.get("/share/:token/media", async (c) => {
  const token = c.req.param("token");
  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE share_token = ?")
    .bind(token)
    .first<NoteRow>();
  if (!row?.media_key) return c.json({ error: "not found" }, 404);

  const object = await c.env.MEDIA.get(row.media_key);
  if (!object) return c.json({ error: "not found" }, 404);

  const safeType = row.mime && ALLOWED_MIME.has(row.mime) ? row.mime : "application/octet-stream";
  return new Response(object.body, {
    headers: {
      "Content-Type": safeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
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
