# notes

Nhật ký hàng ngày cá nhân, `notes.huyab.click`. React 19 + Vite + Tailwind v4
(component copy từ [ui-kit](../ui-kit)) + Cloudflare Worker (Hono) + D1 + R2.
Đăng nhập qua [SSO chung](../sso) (`auth.huyab.click`). Deploy tự động: repo
đã connect Cloudflare Workers Builds, push lên `main` là tự build + deploy.

## Quyết định kiến trúc

- **D1 dùng chung** với `sso` và các app khác — database `db`
  (`6eb9cfce-f6f3-4476-8e46-7c8e954d93c1`), không tạo D1 riêng. Bảng có tiền
  tố `notes_` (`notes_users`, `notes_entries`) để tránh đụng tên với app khác
  trong cùng DB.
- **R2 tách riêng**: bucket `notes-media`, không dùng chung như D1 — R2 không
  có convention chia sẻ như sso/D1, các app khác (`ai-english-vocab`...) đều
  bucket riêng. Key R2 dạng `${userId}/${noteId}`.
- **Nhiều note/ngày**, mỗi note một `type`: `text` | `audio` | `photo`. Không
  phải 1 note/ngày (bản đầu làm vậy, đổi lại theo yêu cầu — xem lịch sử
  commit "Rebuild UI mobile-first").
- **Mobile-first, không dùng URL router.** Điều hướng bằng state trong
  `App.tsx` (`Screen` union: `root` / `day` / `compose`), không phải
  react-router hay tanstack-router — app đủ nhỏ, không cần deep-link.
  BottomNav 3 tab (Lịch / Dòng thời gian / Cài đặt) chỉ hiện ở root, ẩn khi
  vào `day`/`compose` (dùng HeaderBar + nút back thay vào).
- **Icon dùng `lucide-react`** (đổi từ tự vẽ SVG trong `src/icons.tsx`, file
  này đã xoá) — số icon cần dùng tăng lên, tree-shake tốt nên không đáng tự
  vẽ nữa. Xem [dev-notes/icon-libs.md](../dev-notes/icon-libs.md) để biết vì
  sao chọn lucide thay vì tabler/heroicons/phosphor.
- **Ưu tiên icon hơn chữ** cho nút hành động/điều hướng (vd nút "về hôm nay"
  ở Calendar dùng icon `CalendarDays`, không phải label chữ) — app mobile,
  icon nhận diện nhanh hơn, đỡ tốn chỗ. Chỉ giữ chữ khi icon một mình gây mơ
  hồ (nút Lưu/Huỷ, tab bar có cả icon+label). Chi tiết + ví dụ:
  [dev-notes/icon-vs-text-ui.md](../dev-notes/icon-vs-text-ui.md).
- **Mood tự vẽ SVG** (`src/moodEmojis.tsx`), không phải emoji unicode thẳng
  dù giá trị lưu DB vẫn là ký tự unicode cũ (`😄🙂😐😔😡😴🥳😰` — xem `MOODS`
  trong `api.ts`/`index.ts`). `MoodEmoji` chỉ đổi phần hiển thị, map unicode
  → SVG mặt kawaii tự vẽ; không đụng schema/whitelist backend. Thêm mood mới
  phải sửa cả 3 chỗ: `MOODS` (api.ts + worker), whitelist worker, và
  `MOOD_EMOJI` trong `moodEmojis.tsx`.

## Bảo mật: mime allow-list cho media

`POST /api/notes` (audio/photo) và `GET /api/media/:id` PHẢI dùng chung một
whitelist mime cụ thể (`image/png|jpeg|webp|gif`, `audio/mpeg|mp4|webm|ogg`).
Lý do: client tự khai `file.type`, nếu chấp nhận tuỳ ý (vd `text/html`) rồi
phản chiếu lại y nguyên ở `Content-Type` khi serve từ R2 → XSS same-origin.
Khi sửa 2 chỗ này, luôn giữ đồng bộ whitelist + `X-Content-Type-Options:
nosniff` + ép `application/octet-stream` cho mime lạ.

## i18n

`src/i18n.tsx` — VI mặc định, có EN. `Dict` type cố tình KHÔNG dùng
`typeof dict.vi` trực tiếp (union `vi | en` với literal string khác nhau
không gán được cho nhau) — dùng mapped type ép mọi field về `string` hoặc
giữ nguyên signature hàm. Thêm string mới: thêm cả 2 ngôn ngữ trong `dict`,
không cần đụng `Dict` type.

## Ngày tháng

Theo convention chung của ui-kit: ngày luôn là chuỗi `"YYYY-MM-DD"`, không
dùng `Date` làm giá trị lưu trữ (lệch múi giờ). Timestamp đầy đủ
(`created_at`/`updated_at`, có giờ + `Z`) thì dùng `Date` bình thường được vì
đã có timezone rõ ràng.

## Setup / deploy

Xem [README.md](README.md) cho lệnh cụ thể (`pnpm db:migrate:remote`,
`pnpm deploy`, v.v). Không cần `wrangler d1 create` — DB đã trỏ sẵn vào D1
chung trong `wrangler.jsonc`.

Push lên `main` là Cloudflare Workers Builds tự build + deploy, không đợi
được ngay lập tức. Sau khi push, kiểm tra bản đã lên prod thật chưa bằng
`curl https://notes.huyab.click/api/version` — so `commit` trả về với
`git rev-parse HEAD` local; commit chưa khớp nghĩa là build chưa xong, đợi
rồi check lại.
