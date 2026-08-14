/**
 * Đổi màu chủ đạo (accent) — chỉ đổi HUE trong oklch, giữ nguyên
 * lightness/chroma của theme "warm journal" gốc (`tokens.css`) để mọi màu
 * đều hài hoà độ sáng như nhau, không có màu nào chói/nhạt hơn màu khác.
 */
const KEY = "accent-hue";
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
  const root = document.documentElement.style;
  root.setProperty("--ui-primary", `oklch(45% 0.13 ${hue})`);
  root.setProperty("--ui-primary-hover", `oklch(38% 0.12 ${hue})`);
  root.setProperty("--ui-primary-soft", `oklch(94% 0.05 ${hue})`);
  root.setProperty("--ui-ring", `oklch(45% 0.13 ${hue} / 35%)`);
}

export function setAccentHue(hue: number): void {
  localStorage.setItem(KEY, String(hue));
  applyAccentHue(hue);
}
