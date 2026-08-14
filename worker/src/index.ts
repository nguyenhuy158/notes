import { Hono } from "hono";
import { getClaimsFromRequest, resolveUserId, ssoUrl } from "./session.js";

type Bindings = {
  DB: D1Database;
  SSO_ISSUER: string;
};

type Variables = {
  userId: string;
};

type Entry = {
  id: number;
  date: string;
  content: string;
  updated_at: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

app.use("/api/*", async (c, next) => {
  const claims = await getClaimsFromRequest(c.req.raw, c.env.SSO_ISSUER);
  if (!claims) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", await resolveUserId(c.env.DB, claims));
  await next();
});

app.get("/api/entries", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT date, substr(content, 1, 120) AS content, updated_at FROM notes_entries WHERE user_id = ? ORDER BY date DESC"
  )
    .bind(userId)
    .all<Entry>();
  return c.json({ entries: results });
});

app.get("/api/entries/:date", async (c) => {
  const date = c.req.param("date");
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");
  const row = await c.env.DB.prepare(
    "SELECT date, content, updated_at FROM notes_entries WHERE user_id = ? AND date = ?"
  )
    .bind(userId, date)
    .first<Entry>();
  return c.json({ entry: row ?? { date, content: "", updated_at: null } });
});

app.put("/api/entries/:date", async (c) => {
  const date = c.req.param("date");
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");
  const body = await c.req.json<{ content: string }>();
  const content = typeof body.content === "string" ? body.content : "";

  await c.env.DB.prepare(
    `INSERT INTO notes_entries (user_id, date, content, updated_at)
     VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
     ON CONFLICT(user_id, date)
     DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
  )
    .bind(userId, date, content)
    .run();

  return c.json({ ok: true });
});

app.delete("/api/entries/:date", async (c) => {
  const date = c.req.param("date");
  if (!DATE_RE.test(date)) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");
  await c.env.DB.prepare("DELETE FROM notes_entries WHERE user_id = ? AND date = ?").bind(userId, date).run();
  return c.json({ ok: true });
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
