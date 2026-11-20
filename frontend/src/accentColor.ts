/**
 * Đổi màu chủ đạo (accent) — chỉ đổi HUE trong oklch, giữ nguyên
 * lightness/chroma của theme "warm journal" gốc (`tokens.css`) để mọi màu
 * đều hài hoà độ sáng như nhau.
 *
 * KHÔNG dùng inline style trên :root (inline luôn thắng mọi selector CSS,
 * kể cả `.dark {...}` — nếu set thẳng style.setProperty thì dark mode sẽ
 * kẹt cứng ở giá trị sáng). Thay vào đó chèn 1 thẻ <style> với 2 rule
 * (`:root`, `.dark`) y hệt cặp lightness/chroma trong tokens.css, chỉ khác
 * hue — để `.dark` vẫn override đúng như bình thường.
 */
const KEY = "accent-hue";
const STYLE_ID = "accent-color-override";
export const DEFAULT_HUE = 55; // nâu ấm gốc, khớp tokens.css

export const ACCENT_PRESETS = [
  { id: "nau_am", hue: 55 },
  { id: "xanh_duong", hue: 250 },
  { id: "xanh_la", hue: 145 },
  { id: "hong", hue: 340 },
  { id: "tim", hue: 290 },
  { id: "xanh_ngoc", hue: 190 },
] as const;

export function getAccentHue(): number {
  const raw = localStorage.getItem(KEY);
  const hue = raw ? Number(raw) : DEFAULT_HUE;
  return Number.isFinite(hue) ? hue : DEFAULT_HUE;
}

export function applyAccentHue(hue: number): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
    :root {
      --ui-primary: oklch(45% 0.13 ${hue});
      --ui-primary-hover: oklch(38% 0.12 ${hue});
      --ui-primary-soft: oklch(94% 0.05 ${hue});
      --ui-ring: oklch(45% 0.13 ${hue} / 35%);
    }
    .dark {
      --ui-primary: oklch(68% 0.12 ${hue});
      --ui-primary-hover: oklch(74% 0.12 ${hue});
      --ui-primary-soft: oklch(30% 0.05 ${hue});
      --ui-ring: oklch(68% 0.12 ${hue} / 45%);
    }
  `;
}

export function setAccentHue(hue: number): void {
  localStorage.setItem(KEY, String(hue));
  applyAccentHue(hue);
}
