import { Hono } from "hono";
import { getClaimsFromRequest, resolveUserId, ssoUrl } from "./session.js";
import { BUILD_INFO } from "../../shared/build-info";

type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SSO_ISSUER: string;
  AI: Ai;
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
  deleted_at: string | null;
  extra_media: string | null;
  location: string | null;
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

function parseExtraMedia(raw: string | null): string[] {
  return raw ? raw.split(",").filter(Boolean) : [];
}

function toNoteJson(row: NoteRow, mediaBase = `/api/media/${row.id}`) {
  const v = encodeURIComponent(row.updated_at);
  const extraCount = parseExtraMedia(row.extra_media).length;
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
    location: row.location,
    mediaUrl: row.media_key ? `${mediaBase}?v=${v}` : null,
    // Ảnh phụ (gallery nhiều ảnh/note) — slot 0 luôn là media_key chính,
    // slot 1..n ứng với extra_media theo thứ tự lưu.
    mediaUrls: row.media_key
      ? [`${mediaBase}?v=${v}`, ...Array.from({ length: extraCount }, (_, i) => `${mediaBase}?slot=${i + 1}&v=${v}`)]
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
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
    `SELECT date, type, mood, tags FROM notes_entries
     WHERE user_id = ? AND date LIKE ? AND deleted_at IS NULL`
  )
    .bind(userId, `${month}-%`)
    .all<{ date: string; type: NoteType; mood: string | null; tags: string | null }>();
  const days: Record<string, NoteType[]> = {};
  const moods: Record<string, string> = {};
  const tagsByDate: Record<string, string[]> = {};
  for (const row of results) {
    (days[row.date] ??= []).push(row.type);
    // Chỉ giữ 1 mood đại diện/ngày (cái xuất hiện trước trong kết quả là đủ).
    if (row.mood && !moods[row.date]) moods[row.date] = row.mood;
    const set = new Set(tagsByDate[row.date] ?? []);
    for (const tag of parseTags(row.tags)) set.add(tag);
    tagsByDate[row.date] = [...set];
  }
  return c.json({ days, moods, tags: tagsByDate });
});

const YEAR_RE = /^\d{4}$/;

// Số note + mood theo từng ngày trong CẢ NĂM, 1 query duy nhất — dùng cho
// heatmap năm và trang tổng kết năm (Calendar), rẻ hơn nhiều so với gọi
// /api/days 12 lần.
app.get("/api/year", async (c) => {
  const year = c.req.query("year") ?? "";
  if (!YEAR_RE.test(year)) return c.json({ error: "invalid year" }, 400);
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    `SELECT date, mood, COUNT(*) as count FROM notes_entries
     WHERE user_id = ? AND date LIKE ? AND deleted_at IS NULL GROUP BY date, mood`
  )
    .bind(userId, `${year}-%`)
    .all<{ date: string; mood: string | null; count: number }>();
  const counts: Record<string, number> = {};
  const moods: Record<string, string> = {};
  for (const row of results) {
    counts[row.date] = (counts[row.date] ?? 0) + row.count;
    if (row.mood && !moods[row.date]) moods[row.date] = row.mood;
  }
  return c.json({ counts, moods });
});

// Từ hay dùng trong note văn bản của cả năm — thống kê vui, không phải tìm
// kiếm. Tokenize đơn giản theo khoảng trắng/dấu câu, bỏ từ quá ngắn và một ít
// hư từ tiếng Việt phổ biến (không đầy đủ, chỉ để đỡ rác kết quả).
const STOPWORDS = new Set([
  "và", "là", "của", "có", "không", "cho", "được", "một", "này", "thì",
  "để", "với", "các", "đã", "khi", "như", "vì", "nên", "nữa", "cũng",
  "the", "and", "for", "was", "were", "that", "this", "with", "have",
]);

app.get("/api/words", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT text FROM notes_entries WHERE user_id = ? AND type = 'text' AND deleted_at IS NULL"
  )
    .bind(userId)
    .all<{ text: string }>();

  const counts = new Map<string, number>();
  for (const { text } of results) {
    const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    for (const word of words) {
      if (word.length < 3 || STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([word, count]) => ({ word, count }));

  return c.json({ words: top });
});

// Gợi ý địa điểm khi gõ — proxy qua Nominatim (OpenStreetMap), không cần API
// key/billing. Chạy ở server (không phải fetch thẳng từ browser) để tự đặt
// User-Agent đúng theo yêu cầu chính sách dùng của Nominatim (không phải để
// giấu key, service này miễn phí không cần key) và né CORS. Chỉ trả tên hiển
// thị — location của note vẫn là text tự do, không lưu toạ độ.
app.get("/api/places", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) return c.json({ places: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "notes.huyab.click (personal journal app)" },
    });
    if (!res.ok) return c.json({ places: [] });
    const results = await res.json<{ display_name: string }[]>();
    return c.json({ places: results.map((r) => r.display_name) });
  } catch {
    return c.json({ places: [] });
  }
});

// Toàn bộ nhãn user đã dùng + số note mỗi nhãn — cho gợi ý tự động khi gõ
// nhãn mới (đỡ gõ lại/gõ sai chính tả nhãn cũ) và màn "Quản lý nhãn" ở Cài
// đặt. Tags lưu dạng "tag1,tag2" trong 1 cột nên phải tự đếm ở code, không
// GROUP BY được thẳng bằng SQL.
app.get("/api/tags", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT tags FROM notes_entries WHERE user_id = ? AND deleted_at IS NULL AND tags IS NOT NULL"
  )
    .bind(userId)
    .all<{ tags: string }>();

  const counts = new Map<string, number>();
  for (const { tags } of results) {
    for (const tag of parseTags(tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  const list = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  return c.json({ tags: list });
});

// Đổi tên 1 nhãn cho MỌI note đang dùng — gõ sai chính tả trước đó khỏi phải
// sửa tay từng note. `to` trùng 1 nhãn khác đã có trên cùng note = gộp 2
// nhãn làm 1 (Set khử trùng), không tách bảng riêng nên phải tự làm ở code.
app.put("/api/tags/rename", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ from: string; to: string }>();
  const from = (body.from ?? "").trim();
  const to = (body.to ?? "").trim().replace(/,/g, "").slice(0, MAX_TAG_LENGTH);
  if (!from || !to) return c.json({ error: "invalid tag" }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT id, tags FROM notes_entries
     WHERE user_id = ? AND deleted_at IS NULL AND (',' || tags || ',') LIKE ? ESCAPE '\\'`
  )
    .bind(userId, `%,${from.replace(/[%_\\]/g, "\\$&")},%`)
    .all<{ id: string; tags: string | null }>();

  if (results.length === 0) return c.json({ ok: true, updated: 0 });

  await c.env.DB.batch(
    results.map((row) => {
      const next = [...new Set(parseTags(row.tags).map((t) => (t === from ? to : t)))];
      return c.env.DB.prepare("UPDATE notes_entries SET tags = ? WHERE id = ?").bind(
        next.join(",") || null,
        row.id
      );
    })
  );

  return c.json({ ok: true, updated: results.length });
});

// Mọi note gắn đúng 1 nhãn cụ thể (khớp nguyên cụm, không phải LIKE mờ như
// /api/search) — dùng khi bấm vào 1 nhãn để xem lại hết note liên quan.
app.get("/api/notes/by-tag", async (c) => {
  const tag = (c.req.query("tag") ?? "").trim();
  if (!tag) return c.json({ notes: [] });
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM notes_entries
     WHERE user_id = ? AND deleted_at IS NULL
       AND (',' || tags || ',') LIKE ? ESCAPE '\\'
     ORDER BY date DESC`
  )
    .bind(userId, `%,${tag.replace(/[%_\\]/g, "\\$&")},%`)
    .all<NoteRow>();
  return c.json({ notes: results.map((row) => toNoteJson(row)) });
});

// "Kỷ niệm": note trùng ngày/tháng ở các năm trước, để nhắc lại chuyện cũ
// trên trang chủ (giống tính năng "On this day" ở Google Photos/Facebook).
app.get("/api/on-this-day", async (c) => {
  const date = c.req.query("date") ?? "";
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");
  const monthDay = date.slice(5); // "MM-DD"
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM notes_entries
     WHERE user_id = ? AND date != ? AND substr(date, 6) = ? AND deleted_at IS NULL
     ORDER BY date DESC`
  )
    .bind(userId, date, monthDay)
    .all<NoteRow>();
  return c.json({ notes: results.map((row) => toNoteJson(row)) });
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
     WHERE user_id = ? AND deleted_at IS NULL
       AND ((type = 'text' AND text LIKE ? ESCAPE '\\') OR tags LIKE ? ESCAPE '\\')
     ORDER BY date DESC LIMIT 50`
  )
    .bind(userId, like, like)
    .all<NoteRow>();
  return c.json({ notes: results.map((row) => toNoteJson(row)) });
});

app.get("/api/notes", async (c) => {
  const date = c.req.query("date") ?? "";
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM notes_entries WHERE user_id = ? AND date = ? AND deleted_at IS NULL
     ORDER BY pinned DESC, sort_order ASC, created_at ASC`
  )
    .bind(userId, date)
    .all<NoteRow>();
  return c.json({ notes: results.map((row) => toNoteJson(row)) });
});

const MAX_EXTRA_PHOTOS = 9; // 1 chính + tối đa 9 phụ = gallery 10 ảnh/note
const MAX_LOCATION_LENGTH = 80;

app.post("/api/notes", async (c) => {
  const userId = c.get("userId");
  // { all: true } để lấy đủ mọi file khi client gửi nhiều field "file" cùng
  // tên (chọn nhiều ảnh cho 1 note) — mặc định Hono chỉ trả file cuối cùng.
  const form = await c.req.parseBody({ all: true });

  const date = String(form.date ?? "");
  const type = String(form.type ?? "") as NoteType;
  const text = typeof form.text === "string" ? form.text : "";
  const location = typeof form.location === "string" ? form.location.trim().slice(0, MAX_LOCATION_LENGTH) : "";
  const filesRaw = form.file;
  const files = (Array.isArray(filesRaw) ? filesRaw : filesRaw ? [filesRaw] : []).filter(
    (f): f is File => f instanceof File
  );
  const moodRaw = typeof form.mood === "string" ? form.mood : "";
  const mood = MOODS.has(moodRaw) ? moodRaw : null;
  const tags = sanitizeTags(typeof form.tags === "string" ? form.tags.split(",") : []);

  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  if (!NOTE_TYPES.includes(type)) return c.json({ error: "invalid type" }, 400);
  if (type === "text" && !text.trim()) return c.json({ error: "empty text" }, 400);
  if ((type === "audio" || type === "photo") && files.length === 0)
    return c.json({ error: "missing file" }, 400);
  if (type === "audio" && files.length > 1) return c.json({ error: "audio note takes 1 file" }, 400);
  if (files.length > 1 + MAX_EXTRA_PHOTOS) return c.json({ error: "too many photos" }, 400);
  // Chặn mime giả mạo (vd "text/html") lọt vào R2 rồi bị trình duyệt render như
  // trang gốc khi GET /api/media trả lại — chỉ nhận đúng loại file cho từng type.
  if ((type === "audio" || type === "photo") && files.some((f) => !ALLOWED_MIME.has(f.type)))
    return c.json({ error: "invalid file type" }, 400);

  const id = crypto.randomUUID();
  let mediaKey: string | null = null;
  let mime: string | null = null;
  let finalText = text;
  const extraKeys: string[] = [];

  if (files.length > 0) {
    const [primary, ...extra] = files;
    mediaKey = `${userId}/${id}`;
    mime = primary.type;
    const bytes = await primary.arrayBuffer();
    await c.env.MEDIA.put(mediaKey, bytes, { httpMetadata: { contentType: mime } });

    for (const [i, file] of extra.entries()) {
      const key = `${userId}/${id}-${i + 1}`;
      await c.env.MEDIA.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });
      extraKeys.push(key);
    }

    // Tự chuyển ghi âm thành chữ (Workers AI Whisper) khi user không tự gõ
    // caption — tiện tìm kiếm/đọc lại sau. Lỗi ở bước này KHÔNG chặn lưu note
    // (transcribe là tiện ích thêm, không phải yêu cầu bắt buộc).
    if (type === "audio" && !text.trim()) {
      try {
        const result = await c.env.AI.run("@cf/openai/whisper", {
          audio: [...new Uint8Array(bytes)],
        });
        if (result.text?.trim()) finalText = result.text.trim();
      } catch (err) {
        console.error("Whisper transcribe failed", err);
      }
    }
  }

  await c.env.DB.prepare(
    `INSERT INTO notes_entries (id, user_id, date, type, text, media_key, mime, mood, extra_media, location, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      userId,
      date,
      type,
      finalText,
      mediaKey,
      mime,
      mood,
      extraKeys.join(",") || null,
      location || null,
      tags.join(",") || null
    )
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

// Gắn/sửa địa điểm tự do (text, không phải toạ độ — không xin quyền định vị
// trình duyệt, đơn giản và không lộ vị trí thật nếu không muốn).
app.put("/api/notes/:id/location", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json<{ location: string | null }>();
  const location =
    typeof body.location === "string" ? body.location.trim().slice(0, MAX_LOCATION_LENGTH) : "";

  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE notes_entries SET location = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(location || null, id)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) });
});

// Chuyển note sang ngày khác — sửa nhầm ngày lúc tạo khỏi phải xoá tạo lại.
app.put("/api/notes/:id/date", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json<{ date: string }>();
  const date = body.date ?? "";
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);

  const existing = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE notes_entries SET date = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(date, id)
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
  const existing = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
  )
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

// Xoá mềm: đánh dấu deleted_at thay vì xoá hẳn, giữ nguyên media ở R2 — cho
// phép "Hoàn tác" từ Thùng rác. Dọn hẳn (xoá thật + media) ở /api/notes/:id/purge.
app.delete("/api/notes/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const existing = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
  )
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE notes_entries SET deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  )
    .bind(id)
    .run();
  return c.json({ ok: true });
});

app.get("/api/trash", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM notes_entries WHERE user_id = ? AND deleted_at IS NOT NULL
     ORDER BY deleted_at DESC LIMIT 200`
  )
    .bind(userId)
    .all<NoteRow>();
  return c.json({ notes: results.map((row) => toNoteJson(row)) });
});

app.post("/api/notes/:id/restore", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const existing = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL"
  )
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  await c.env.DB.prepare("UPDATE notes_entries SET deleted_at = NULL WHERE id = ?").bind(id).run();
  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ?").bind(id).first<NoteRow>();
  return c.json({ note: toNoteJson(row!) });
});

// Xoá vĩnh viễn (từ Thùng rác) — xoá hẳn media R2 + hàng trong D1.
app.delete("/api/notes/:id/purge", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const existing = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL"
  )
    .bind(id, userId)
    .first<NoteRow>();
  if (!existing) return c.json({ error: "not found" }, 404);

  const keys = [existing.media_key, ...parseExtraMedia(existing.extra_media)].filter(
    (k): k is string => Boolean(k)
  );
  await Promise.all(keys.map((k) => c.env.MEDIA.delete(k)));
  await c.env.DB.prepare("DELETE FROM notes_entries WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// slot=0 (mặc định) là ảnh/âm thanh chính (media_key); slot=1.. là ảnh phụ
// trong gallery nhiều ảnh (extra_media, thứ tự lưu theo mảng đó).
app.get("/api/media/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const slot = Number(c.req.query("slot") ?? "0");
  const row = await c.env.DB.prepare("SELECT * FROM notes_entries WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<NoteRow>();
  if (!row?.media_key) return c.json({ error: "not found" }, 404);

  const key = slot === 0 ? row.media_key : parseExtraMedia(row.extra_media)[slot - 1];
  if (!key) return c.json({ error: "not found" }, 404);

  const object = await c.env.MEDIA.get(key);
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
    "SELECT * FROM notes_entries WHERE user_id = ? AND deleted_at IS NULL ORDER BY date ASC, created_at ASC"
  )
    .bind(userId)
    .all<NoteRow>();

  if (format === "json") {
    const body = JSON.stringify(
      { exportedAt: new Date().toISOString(), notes: results.map((row) => toNoteJson(row)) },
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
        const extraCount = parseExtraMedia(note.extra_media).length;
        const photos = [
          `${origin}/api/media/${note.id}`,
          ...Array.from({ length: extraCount }, (_, i) => `${origin}/api/media/${note.id}?slot=${i + 1}`),
        ];
        md += `- **${time}** ${photos.map((url) => `![photo](${url})`).join(" ")}\n`;
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
    "SELECT COUNT(*) as count FROM notes_entries WHERE user_id = ? AND deleted_at IS NULL"
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
  const row = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE share_token = ? AND deleted_at IS NULL"
  )
    .bind(token)
    .first<NoteRow>();
  if (!row) return c.json({ error: "not found" }, 404);

  return c.json({ note: toNoteJson(row, `/share/${token}/media`) });
});

app.get("/share/:token/media", async (c) => {
  const token = c.req.param("token");
  const slot = Number(c.req.query("slot") ?? "0");
  const row = await c.env.DB.prepare(
    "SELECT * FROM notes_entries WHERE share_token = ? AND deleted_at IS NULL"
  )
    .bind(token)
    .first<NoteRow>();
  if (!row?.media_key) return c.json({ error: "not found" }, 404);

  const key = slot === 0 ? row.media_key : parseExtraMedia(row.extra_media)[slot - 1];
  if (!key) return c.json({ error: "not found" }, 404);

  const object = await c.env.MEDIA.get(key);
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
