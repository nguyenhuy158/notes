-- Dùng chung D1 với sso và các app khác, nên mọi bảng có tiền tố notes_.

CREATE TABLE IF NOT EXISTS notes_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    picture TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notes_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES notes_users(id),
    date TEXT NOT NULL, -- "YYYY-MM-DD"
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_notes_entries_user_date ON notes_entries(user_id, date DESC);
