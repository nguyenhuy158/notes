# notes

Nhật ký hàng ngày cá nhân, tại `notes.huyab.click`. React 19 + Vite + Tailwind v4
(component copy từ [ui-kit](../ui-kit)) + Cloudflare Worker (Hono) + D1. Đăng
nhập qua [SSO chung](../sso) (`auth.huyab.click`), tự build/deploy khi push
(Workers Builds).

## Kiến trúc

- Dùng chung D1 `db` với `sso` và các app khác — bảng có tiền tố `notes_`
  (`notes_users`, `notes_entries`, unique theo `user_id + date`).
- `/api/*` yêu cầu cookie `huyab_sso` hợp lệ (kiểm bằng JWKS của
  `auth.huyab.click` qua `@huyab/sso`, xem `worker/src/session.ts`).
- Chưa đăng nhập gọi API -> 401, front-end tự chuyển `/login`.
- Static assets phục vụ qua Workers Assets (`assets.directory: ./dist`),
  SPA fallback về `index.html`.

## Setup lần đầu

```sh
pnpm install
pnpm db:migrate:remote     # tạo notes_users/notes_entries trên D1 chung (db)
cp .dev.vars.example .dev.vars
```

`wrangler.jsonc` đã trỏ sẵn vào D1 chung (`database_id` của `db`, giống
`sso`), không cần tạo database riêng. Cũng không cần đụng Google Console —
SSO dùng chung một OAuth client.

## Domain + build tự động

1. Cloudflare dashboard -> Workers & Pages -> Create -> kết nối repo Git này.
2. Build command: `pnpm build`, output: đã cấu hình trong `wrangler.jsonc`
   (`assets.directory`, `main`). Workers Builds tự deploy mỗi lần push.
3. Custom domain: gắn `notes.huyab.click` (Worker Routes, đã khai trong
   `wrangler.jsonc`).

## Local dev

```sh
pnpm dev        # Vite, http://127.0.0.1:5173, proxy /api sang wrangler dev
pnpm dev:api    # wrangler dev, http://127.0.0.1:8787
```

Cookie SSO là `Secure` + `Domain=.huyab.click`, không tới được `localhost`.
Test đăng nhập thật phải deploy lên `notes.huyab.click`.

## Scripts

- `pnpm build` — tsc + vite build
- `pnpm deploy` — build rồi `wrangler deploy`
- `pnpm db:migrate:remote` / `db:migrate:local` — chạy các migration chưa áp trong `migrations/` lên D1
