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

-- Thứ tự note trong ngày (kéo lên/xuống), mặc định 0 = giữ nguyên thứ tự
-- created_at cũ cho note có sẵn. Chỉ ORDER BY khi có ít nhất 1 note đã đổi
-- vị trí, ngày mới toanh vẫn theo created_at ASC vì mọi note đều = 0.
ALTER TABLE notes_entries ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Ghim note lên đầu ngày (không phụ thuộc sort_order kéo tay).
ALTER TABLE notes_entries ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;

-- Nhãn tự do, lưu dạng "tag1,tag2" (không chứa dấu phẩy trong từng tag).
-- Đơn giản hoá: không tách bảng riêng vì số tag/note rất ít (tối đa 5).
ALTER TABLE notes_entries ADD COLUMN tags TEXT;

-- Token chia sẻ note ra ngoài (xem-only, không cần đăng nhập). NULL = chưa
-- bật chia sẻ. Route public /share/:token và /share/:token/media (worker/src/
-- index.ts) đọc theo token này, KHÔNG đi qua middleware xác thực /api/*.
ALTER TABLE notes_entries ADD COLUMN share_token TEXT;
CREATE INDEX IF NOT EXISTS idx_notes_entries_share_token ON notes_entries(share_token);

-- Xoá mềm: NULL = còn sống. Mọi query liệt kê note (days/notes/search/export/
-- on-this-day/year) PHẢI thêm "AND deleted_at IS NULL", không thì note đã
-- "xoá" vẫn hiện lại. Dọn vĩnh viễn qua /api/notes/:id/purge (Thùng rác).
ALTER TABLE notes_entries ADD COLUMN deleted_at TEXT;

-- Ảnh phụ cho note photo dạng gallery (slot 1..n) — media_key vẫn là ảnh
-- chính (slot 0). Lưu dạng "key1,key2" như tags/extra_media khác trong bảng.
ALTER TABLE notes_entries ADD COLUMN extra_media TEXT;

-- Địa điểm tự do (text người dùng tự gõ, không phải toạ độ GPS).
ALTER TABLE notes_entries ADD COLUMN location TEXT;

-- Thêm loại note "video". SQLite KHÔNG cho sửa CHECK constraint bằng ALTER
-- TABLE (chỉ thêm/xoá/đổi tên cột) — phải build lại bảng theo đúng quy trình
-- SQLite khuyến nghị: tạo bảng mới cùng schema (CHECK mới) + INDEX, copy dữ
-- liệu qua, xoá bảng cũ, đổi tên bảng mới. Không có FK nào trỏ VÀO
-- notes_entries nên an toàn đổi tên. CHỈ chạy khối này MỘT LẦN.
CREATE TABLE notes_entries_new (
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
INSERT INTO notes_entries_new SELECT
    id, user_id, date, type, text, media_key, mime, created_at, updated_at,
    mood, sort_order, pinned, tags, share_token, deleted_at, extra_media, location
FROM notes_entries;
DROP TABLE notes_entries;
ALTER TABLE notes_entries_new RENAME TO notes_entries;
CREATE INDEX IF NOT EXISTS idx_notes_entries_user_date ON notes_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notes_entries_share_token ON notes_entries(share_token);
