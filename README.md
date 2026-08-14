# notes

Nhật ký hàng ngày cá nhân, tại `notes.huyab.click`. React 19 + Vite + Tailwind v4
(component copy từ [ui-kit](../ui-kit)) + Cloudflare Worker (Hono) + D1. Đăng
nhập qua [SSO chung](../sso) (`auth.huyab.click`), tự build/deploy khi push
(Workers Builds).

## Kiến trúc

- Mỗi ngày một ghi chú (`entries`, unique theo `user_id + date`).
- `/api/*` yêu cầu cookie `huyab_sso` hợp lệ (kiểm bằng JWKS của
  `auth.huyab.click`, xem `worker/src/sso-verifier.js` + `session.js`).
- Chưa đăng nhập gọi API -> 401, front-end tự chuyển `/login`.
- Static assets phục vụ qua Workers Assets (`assets.directory: ./dist`),
  SPA fallback về `index.html`.

## Setup lần đầu

```sh
pnpm install
npx wrangler d1 create notes-db     # copy database_id vào wrangler.jsonc
pnpm db:migrate:remote               # tạo bảng users/entries trên D1 thật
cp .dev.vars.example .dev.vars
```

Thêm authorized redirect: KHÔNG cần — SSO dùng chung một Google OAuth client,
app mới không phải đụng Google Console.

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
- `pnpm db:migrate:remote` / `db:migrate:local` — chạy `schema.sql` lên D1
