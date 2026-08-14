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
- **Sticker trang trí** (`src/stickers.tsx`, 31 icon: coffee/book/heart/star...
  đặt tên riêng, registry `STICKERS`) — khác `moodEmojis.tsx` (mặt cảm xúc) và
  `lucide-react` (icon chức năng như back/save/delete). Dùng cho empty state,
  banner, huy hiệu — chỗ cần trang trí kiểu kawaii, không phải hành động.
- **Tông màu riêng cho notes**: `src/styles/tokens.css` là bản copy từ ui-kit
  đã chỉnh `--ui-primary`/`--ui-bg` sang nâu ấm (warm journal), KHÔNG đồng bộ
  ngược lại ui-kit gốc (vẫn tím) — mỗi project copy tokens.css riêng nên đổi
  tại đây an toàn, không ảnh hưởng chia-keo/sso/app khác.
- **Nút icon-only tối thiểu 40×40px** (`h-10 w-10`), không dùng `h-8 w-8`
  nhỏ hơn — chuẩn touch target mobile, tránh bấm nhầm trên màn cảm ứng.
- **Ghim/nhãn/chia sẻ note** (`pinned`, `tags`, `share_token` trong
  `notes_entries`): ghim sort trước ở SQL (`ORDER BY pinned DESC, ...`), tags
  lưu dạng chuỗi `"tag1,tag2"` (không tách bảng vì tối đa 5 tag/note). Chia sẻ
  qua route `/share/:token` + `/share/:token/media` — cố tình đặt NGOÀI
  `/api/*` để không dính middleware xác thực (route public, không cần login).
  Trang xem chia sẻ ở client là `/s/:token` (khác `/share/` phía server), đọc
  thẳng `window.location.pathname` trong `App.tsx` — app không có URL router
  thật, đây là route đặc biệt duy nhất được xử lý trước mọi hook khác (an
  toàn vì pathname không đổi giữa các lần render cùng 1 mount).
- **Sửa caption cho audio/photo**: `PUT /api/notes/:id` giờ áp dụng mọi loại
  note, không chỉ `text` — audio/photo cho phép caption rỗng (tuỳ chọn), chỉ
  note gốc `type = 'text'` mới bắt buộc không rỗng.
- **Xoá mềm** (`deleted_at`): `DELETE /api/notes/:id` chỉ đánh dấu, không xoá
  thật, giữ nguyên media R2 để có thể hoàn tác từ Thùng rác
  (`GET /api/trash`, `POST .../restore`). Xoá vĩnh viễn qua
  `DELETE /api/notes/:id/purge`. MỌI query liệt kê note (days/year/notes/
  search/export/on-this-day) phải thêm `AND deleted_at IS NULL`, thêm route
  mới nhớ check lại danh sách này.
- **Speech-to-text ghi âm**: `POST /api/notes` tự chạy Workers AI
  (`@cf/openai/whisper`, binding `AI` trong `wrangler.jsonc`) khi tạo note
  audio mà không kèm caption — lỗi ở bước này không chặn lưu note (transcribe
  là tiện ích thêm, không phải yêu cầu).
- **Khoá PIN cục bộ** (`src/pinLock.ts`): CHỈ chắn người cầm máy đã đăng nhập
  sẵn, không phải bảo mật thật — hash SHA-256 lưu `localStorage`, không có
  cách khôi phục nếu quên (không đồng bộ server). Mở khoá tính theo phiên
  (`sessionStorage`), không cần nhập lại khi chuyển tab trong cùng 1 lần mở
  trình duyệt.
- **Year heatmap**: endpoint riêng `GET /api/year` (1 query cho cả năm) thay
  vì gọi `/api/days` 12 lần — rẻ hơn nhiều, xem `worker/src/index.ts`.

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
