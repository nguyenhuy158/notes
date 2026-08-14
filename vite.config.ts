import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const API_DEV_SERVER = "http://127.0.0.1:8787";
const THEME_COLOR = "#FDF3FF";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Tắt ở `pnpm dev`: service worker cache gây khó chịu khi đang sửa code.
      devOptions: { enabled: false },
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: {
        name: "Notes",
        short_name: "Notes",
        description: "Nhật ký hàng ngày cá nhân.",
        lang: "vi",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: THEME_COLOR,
        theme_color: THEME_COLOR,
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/app-icon.png", sizes: "512x512", type: "image/png" },
          { src: "/app-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        // /api/* là fetch không phải navigation nên vốn không khớp SW route
        // này, nhưng khai rõ cho chắc. /login và /logout PHẢI loại trừ: đây
        // là điều hướng doc thật sang route xử lý ở Worker (redirect SSO,
        // xoá cookie) — nếu để SW bắt, nó trả thẳng index.html cache sẵn,
        // request không bao giờ chạm server, đăng xuất trông như chạy nhưng
        // cookie không hề bị xoá.
        navigateFallbackDenylist: [/^\/api\//, /^\/login/, /^\/logout/],
        // Không cache /api/*: note mới nhất quan trọng hơn shell offline cho
        // phần dữ liệu, mất mạng thì UI vẫn lên, chỉ phần fetch báo lỗi bình
        // thường (đã có EmptyState/LoadingState sẵn).
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": { target: API_DEV_SERVER, changeOrigin: false },
    },
  },
});
