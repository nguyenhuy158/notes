-- Baseline: the notes_* schema as it runs in production on 2026-10-18.
-- IF NOT EXISTS makes it a no-op there; on a fresh local D1 it creates the schema.

CREATE TABLE IF NOT EXISTS "notes_entries" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES notes_users(id),
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'audio', 'photo', 'video')),
    text TEXT NOT NULL DEFAULT '',
    media_key TEXT,
    mime TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    mood TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    pinned INTEGER NOT NULL DEFAULT 0,
    tags TEXT,
    share_token TEXT,
    deleted_at TEXT,
    extra_media TEXT,
    location TEXT
);

CREATE TABLE IF NOT EXISTS notes_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    picture TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_entries_share_token ON notes_entries(share_token);

CREATE INDEX IF NOT EXISTS idx_notes_entries_user_date ON notes_entries(user_id, date);
