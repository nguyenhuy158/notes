// Smoke CHỈ ĐỌC, không cookie đăng nhập: chỉ GET trang/API công khai và kiểm
// trang render. Không tạo/sửa/xoá gì, không vượt qua xác thực — an toàn để chạy
// vào production: `pnpm e2e:prod` (notes.huyab.click). `pnpm e2e` chạy nó
// trước ui-smoke.mjs để dev và prod dùng chung một bộ kiểm tra.
//
// Request duy nhất gửi đi (đều là GET):
//   /api/version, /api/me (mong 401), /share/<token ngẫu nhiên> (mong 404),
//   /login (không theo redirect), /manifest.webmanifest, trang `/` và
//   `/s/<token ngẫu nhiên>` trong Chromium (kèm asset + GET /api/me, /share/... của SPA).
//
// Biến môi trường:
// - E2E_BASE_URL: mặc định http://127.0.0.1:8787
// - PLAYWRIGHT_CHROMIUM_PATH: xem findChromium() của @huyab/e2e
import { randomUUID } from "node:crypto";
import { BASE, findChromium } from "@huyab/e2e";
import { chromium } from "playwright-core";

const WAIT = { timeout: 15000 };
const MISSING_TOKEN = randomUUID();

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}

/** GET một đường dẫn (không theo redirect), ném nếu status/content-type không khớp. */
async function get(path, status, type) {
  const response = await fetch(BASE + path, { redirect: "manual" });
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status !== status || !contentType.includes(type)) {
    throw new Error(`GET ${path}: ${response.status} ${contentType} (cần ${status} ${type})`);
  }
  return response;
}

console.log(`Read-only smoke tại ${BASE}\n`);

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(`${page.url()}: ${error.message}`));

try {
  const version = await (await get("/api/version", 200, "application/json")).json();
  if (typeof version.commit !== "string") throw new Error(`/api/version: ${JSON.stringify(version)}`);
  ok(`GET /api/version (${version.shortCommit}, ${version.builtBy})`);

  await get("/api/me", 401, "application/json");
  ok("GET /api/me is 401 without SSO cookie");

  await get(`/share/${MISSING_TOKEN}`, 404, "application/json");
  ok("GET /share/:token is 404 for an unknown token");

  const login = await fetch(`${BASE}/login`, { redirect: "manual" });
  const location = login.headers.get("location") ?? "";
  if (login.status !== 302 || !location.includes("/login?redirect_uri=")) {
    throw new Error(`/login: ${login.status} -> ${location}`);
  }
  ok(`GET /login redirects to SSO (${new URL(location).origin})`);

  const manifest = await (await get("/manifest.webmanifest", 200, "manifest")).json();
  if (manifest.name !== "Notes") throw new Error(`manifest: ${JSON.stringify(manifest)}`);
  ok("GET /manifest.webmanifest (PWA)");

  await page.goto(`${BASE}/`);
  await page.locator('a[href="/login"]').waitFor(WAIT);
  await page.getByRole("heading", { name: "Notes" }).waitFor(WAIT);
  ok("logged-out home renders the SSO login screen");

  await page.goto(`${BASE}/s/${MISSING_TOKEN}`);
  await page.getByText(/Không tìm thấy|Not found/).waitFor(WAIT);
  ok("public share page renders not-found for an unknown token");

  if (pageErrors.length > 0) throw new Error(`lỗi JS trên trang: ${pageErrors.join(" | ")}`);
  ok("no uncaught page errors");
} catch (error) {
  failed += 1;
  console.log("FAIL:", error.message);
  await page.screenshot({ path: "e2e-failure.png" }).catch(() => {});
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
