/**
 * SSO session (verified by `@huyab/sso`) + resolution into this app's
 * `notes_users` row.
 */

import { getClaimsFromRequest, type SsoClaims } from "@huyab/sso";
import type { Context } from "hono";

/** Claims from the `huyab_sso` cookie, else `Authorization: Bearer` (CLIs with an SSO auth key token). */
export async function getSsoClaims<
  E extends { Bindings: { SSO_ISSUER: string } },
>(c: Context<E>): Promise<SsoClaims | null> {
  return getClaimsFromRequest(c.req.raw, c.env.SSO_ISSUER);
}

/**
 * Turn SSO claims into a row in `notes_users`; returns its id.
 *
 * Key on `email`, not `sub`: email is what the SSO issuer guarantees unique
 * (Google already verified it), and it survives the SSO service ever
 * changing how it generates `sub`.
 */
const USER_ID_CACHE_TTL_MS = 300_000;
const USER_ID_CACHE_MAX_ENTRIES = 1000;
const userIdCache = new Map<string, { id: string; expiresAt: number }>();

export async function resolveUserId(
  db: D1Database,
  claims: SsoClaims,
): Promise<string> {
  const cached = userIdCache.get(claims.email);
  if (cached && cached.expiresAt > Date.now()) return cached.id;
  const id = await lookupOrCreateUserId(db, claims);
  if (userIdCache.size >= USER_ID_CACHE_MAX_ENTRIES) userIdCache.clear();
  userIdCache.set(claims.email, {
    id,
    expiresAt: Date.now() + USER_ID_CACHE_TTL_MS,
  });
  return id;
}

async function lookupOrCreateUserId(
  db: D1Database,
  claims: SsoClaims,
): Promise<string> {
  const existing = await db
    .prepare("SELECT id FROM notes_users WHERE email = ?")
    .bind(claims.email)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO notes_users (id, email, name, picture)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    )
    .bind(id, claims.email, claims.name ?? claims.email, claims.picture ?? null)
    .run();

  // Two first-time requests from the same person can race; the loser reads
  // back the winner's row instead of creating a second user.
  const row = await db
    .prepare("SELECT id FROM notes_users WHERE email = ?")
    .bind(claims.email)
    .first<{ id: string }>();
  if (!row) throw new Error("Failed to create user for SSO session");
  return row.id;
}
