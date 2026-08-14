-- Dùng chung D1 với sso và các app khác, nên mọi bảng có tiền tố notes_.

CREATE TABLE IF NOT EXISTS notes_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    picture TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Nhiều note/ngày, mỗi note một loại: text, audio (ghi âm) hoặc photo (ảnh).
-- audio/photo lưu file ở R2 (bucket notes-media), media_key trỏ tới object đó.
CREATE TABLE IF NOT EXISTS notes_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES notes_users(id),
    date TEXT NOT NULL, -- "YYYY-MM-DD"
    type TEXT NOT NULL CHECK (type IN ('text', 'audio', 'photo')),
    text TEXT NOT NULL DEFAULT '',
    media_key TEXT,
    mime TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_entries_user_date ON notes_entries(user_id, date);

-- Cảm xúc lúc ghi note (emoji), optional, áp dụng cho mọi loại note.
-- ALTER TABLE không hỗ trợ IF NOT EXISTS ở SQLite/D1 — chỉ chạy dòng này MỘT
-- LẦN khi migrate bảng đã tồn tại (báo lỗi "duplicate column" nếu chạy lại,
-- bỏ qua lỗi đó là an toàn).
ALTER TABLE notes_entries ADD COLUMN mood TEXT;
