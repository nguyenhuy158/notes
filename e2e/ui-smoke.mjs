// E2E đầy đủ (CÓ GHI DỮ LIỆU) cho app chạy local: đăng nhập bằng cookie SSO giả,
// tạo note chữ + ảnh, chia sẻ, tìm, xoá mềm rồi xoá vĩnh viễn qua UI thật.
// Chỉ chạy qua `pnpm e2e` (e2e/run.mjs cấp server local + E2E_SSO_TOKEN);
// từ chối mọi base URL không phải localhost để không bao giờ ghi vào prod.
//
// Biến môi trường:
// - E2E_BASE_URL: server local (run.mjs đặt sẵn)
// - E2E_SSO_TOKEN: cookie huyab_sso do startSsoMock() của @huyab/e2e ký
// - PLAYWRIGHT_CHROMIUM_PATH: xem findChromium() của @huyab/e2e
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertLocalOnly, findChromium } from "@huyab/e2e";
import { chromium } from "playwright-core";

const BASE = (process.env.E2E_BASE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.E2E_SSO_TOKEN;
const WAIT = { timeout: 15000 };
const MOBILE = { viewport: { width: 390, height: 844 } };

assertLocalOnly(BASE);
if (!TOKEN) throw new Error("thiếu E2E_SSO_TOKEN — dùng `pnpm e2e`");

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}

const browser = await chromium.launch({ executablePath: findChromium() });
const context = await browser.newContext(MOBILE);
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
await context.addCookies([{ name: "huyab_sso", value: TOKEN, url: BASE }]);
const page = await context.newPage();
page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));

/** Ảnh JPEG thật (vẽ bằng canvas trong trang) để đi qua luồng nén + upload R2. */
async function createJpegFixture() {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const context2d = canvas.getContext("2d");
    context2d.fillStyle = "#b45309";
    context2d.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  });
  const path = join(tmpdir(), `notes-e2e-${process.pid}.jpg`);
  writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
  return path;
}

/** Thẻ note (NoteCard) trên màn ngày chứa `text`. */
function noteCard(text) {
  return page.locator("div.rounded-ui.border.bg-surface").filter({ hasText: text });
}

async function openToday(today) {
  await page.locator(`button[aria-label^="${today},"]`).click();
  await page.getByRole("button", { name: "Thêm ghi chú" }).waitFor(WAIT);
}

try {
  const stamp = `e2e${Date.now()}`;
  const noteText = `Ghi chú ${stamp}`;

  // 1. Cookie SSO hợp lệ -> vào thẳng Lịch (không còn màn đăng nhập).
  await page.goto(`${BASE}/`);
  await page.getByRole("tab", { name: "Lịch" }).waitFor(WAIT);
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  ok("SSO cookie lands on the calendar");

  // 2. Mở ngày hôm nay -> Compose -> note chữ tự lưu.
  await openToday(today);
  await page.getByText("Chưa có ghi chú").waitFor(WAIT);
  await page.getByRole("button", { name: "Thêm ghi chú" }).click();
  await page.locator("#compose-tab-text").click();
  await page.getByPlaceholder("Hôm nay bạn thế nào?").fill(noteText);
  await page.getByText(/Đã lưu lúc/).waitFor(WAIT);
  ok("text note autosaves from compose");

  await page.getByRole("button", { name: "Quay lại" }).click();
  await noteCard(noteText).waitFor(WAIT);
  ok("saved note shows on the day screen");

  // 3. Chia sẻ -> mở link ở phiên KHÔNG đăng nhập.
  await noteCard(noteText).getByRole("button", { name: "Thêm", exact: true }).click();
  await page.locator('[role="menu"] button', { hasText: "Chia sẻ" }).click();
  const shareLink = page.locator("span", { hasText: `${BASE}/s/` });
  await shareLink.waitFor(WAIT);
  const shareUrl = (await shareLink.textContent()).trim();
  const anonymous = await browser.newContext(MOBILE);
  const sharePage = await anonymous.newPage();
  await sharePage.goto(shareUrl);
  await sharePage.getByText(noteText).waitFor(WAIT);
  await sharePage.getByText("Chia sẻ từ Notes").waitFor(WAIT);
  await anonymous.close();
  ok("share link renders the note without login");

  // 4. Note ảnh: nén canvas + upload R2 local; AI caption tắt nên phải tự bỏ qua.
  const jpegPath = await createJpegFixture();
  await page.getByRole("button", { name: "Thêm ghi chú" }).click();
  await page.locator("#compose-tab-photo").click();
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles(jpegPath);
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await page.getByRole("tab", { name: "Lịch" }).waitFor(WAIT);
  await openToday(today);
  const photo = page.locator('img[alt^="Ảnh ngày"]').first();
  await photo.waitFor(WAIT);
  await page.waitForFunction((img) => img.complete && img.naturalWidth > 0, await photo.elementHandle(), WAIT);
  ok("photo note uploads and renders from R2");

  // 5. Tìm ở Dòng thời gian -> bấm kết quả mở lại đúng ngày.
  await page.getByRole("button", { name: "Quay lại" }).click();
  await page.getByRole("tab", { name: "Dòng TG" }).click();
  await page.getByPlaceholder("Tìm trong ghi chú...").fill(stamp);
  await page.locator("li button", { hasText: noteText }).click();
  await noteCard(noteText).waitFor(WAIT);
  ok("timeline search finds the note and opens its day");

  // 6. Xoá mềm -> Thùng rác -> xoá vĩnh viễn.
  await noteCard(noteText).getByRole("button", { name: "Thêm", exact: true }).click();
  await page.locator('[role="menu"] button', { hasText: "Xoá" }).click();
  await page.getByText("Đã xoá ghi chú").waitFor(WAIT);
  await noteCard(noteText).waitFor({ state: "detached", timeout: WAIT.timeout });
  await page.getByRole("button", { name: "Quay lại" }).click();
  await page.getByRole("tab", { name: "Cài đặt" }).click();
  await page.getByRole("button", { name: "Thùng rác" }).click();
  await page.getByText(noteText).waitFor(WAIT);
  await page.getByRole("button", { name: "Xoá vĩnh viễn" }).click();
  await page.locator('[role="dialog"]').getByRole("button", { name: "Xoá vĩnh viễn" }).click();
  await page.getByText("Thùng rác trống").waitFor(WAIT);
  ok("delete moves to trash and purge empties it");

  // 7. Đối chiếu dữ liệu qua API: chỉ còn note ảnh của hôm nay.
  const remaining = await page.evaluate(async (date) => {
    const response = await fetch(`/api/notes?date=${date}`);
    return (await response.json()).notes.map((note) => note.type);
  }, today);
  if (remaining.join() !== "photo") throw new Error(`notes hôm nay sau khi xoá: ${remaining.join()}`);
  ok("API agrees: only the photo note remains");
} catch (error) {
  failed += 1;
  console.log("FAIL:", error.message);
  await page.screenshot({ path: "e2e-failure.png" }).catch(() => {});
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
