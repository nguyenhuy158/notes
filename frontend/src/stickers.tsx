/**
 * Bộ sticker kawaii tự vẽ (khác `moodEmojis.tsx` — đó là mặt cảm xúc, đây là
 * vật/biểu tượng trang trí: cà phê, sách, tim, sao...). Style chung: outline
 * đen 2px, 1-2 mảng màu pastel, nét hơi lệch tay vẽ (không đối xứng hoàn hảo)
 * — cố tình khác flat-icon chuẩn để có chất riêng. Dùng cho chỗ cần trang trí
 * (empty state, banner, huy hiệu...), không thay `lucide-react` (icon chức
 * năng như back/save/delete vẫn dùng lucide).
 */
import type { ComponentType } from "react";

type StickerProps = { size?: number; className?: string };

function base(paths: React.ReactNode) {
  return function Sticker({ size = 32, className }: StickerProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {paths}
      </svg>
    );
  };
}

const ink = "#1a1a1a";

export const StickerCoffee = base(
  <>
    <path d="M10 20h22v10a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z" fill="#c98a5b" stroke={ink} strokeWidth="2" />
    <path d="M32 23h3a5 5 0 0 1 0 10h-3" fill="#fff" stroke={ink} strokeWidth="2" />
    <path d="M15 20c-1-3 2-3 1-6M22 20c-1-3 2-3 1-6" stroke={ink} strokeWidth="2" strokeLinecap="round" fill="none" />
  </>
);

export const StickerBook = base(
  <>
    <path d="M24 12c-4-2-10-2-14 0v24c4-2 10-2 14 0z" fill="#ffb4c6" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 12c4-2 10-2 14 0v24c-4-2-10-2-14 0z" fill="#ffe08a" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 12v24" stroke={ink} strokeWidth="2" />
  </>
);

export const StickerHeart = base(
  <path
    d="M24 40C10 30 6 22 8 15c1.6-5.4 8.5-7 12.5-2.6L24 16l3.5-3.6C31.5 8 38.4 9.6 40 15c2 7-2 15-16 25z"
    fill="#ff8fa3"
    stroke={ink}
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

export const StickerStar = base(
  <path
    d="M24 6l4.6 11.4L41 19l-9 8.2L34.8 40 24 33 13.2 40 16 27.2 7 19l12.4-1.6z"
    fill="#ffe08a"
    stroke={ink}
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

export const StickerMoon = base(
  <>
    <path
      d="M30 8a17 17 0 1 0 10 22c-8 2-18-4-18-14 0-4 2-8 8-8z"
      fill="#d9c9f0"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="18" cy="16" r="1.4" fill={ink} />
    <circle cx="14" cy="24" r="1" fill={ink} />
  </>
);

export const StickerSun = base(
  <>
    <path
      d="M24 5l2 6M24 43l-2-6M43 24l-6 2M5 24l6-2M37 11l-4 5M11 37l4-5M37 37l-4-5M11 11l4 5"
      stroke={ink}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <circle cx="24" cy="24" r="10" fill="#ffdd6b" stroke={ink} strokeWidth="2" />
    <path d="M20 22q2-2 4 0" stroke={ink} strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </>
);

export const StickerCloud = base(
  <path
    d="M14 32a8 8 0 0 1-1-16 10 10 0 0 1 19-4 8 8 0 0 1 3 15.6 6 6 0 0 1-1 .4z"
    fill="#dfeeff"
    stroke={ink}
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

export const StickerRain = base(
  <>
    <path
      d="M12 26a7 7 0 0 1-1-13.9A9 9 0 0 1 28 9a7 7 0 0 1 2.5 13.6z"
      fill="#c7d9ee"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M15 32l-2 5M23 32l-2 5M31 32l-2 5" stroke="#5a92d6" strokeWidth="2.4" strokeLinecap="round" />
  </>
);

export const StickerFlower = base(
  <>
    <g fill="#ffb4c6" stroke={ink} strokeWidth="1.8">
      <ellipse cx="24" cy="12" rx="6" ry="8" />
      <ellipse cx="24" cy="36" rx="6" ry="8" />
      <ellipse cx="12" cy="24" rx="8" ry="6" />
      <ellipse cx="36" cy="24" rx="8" ry="6" />
    </g>
    <circle cx="24" cy="24" r="6" fill="#ffe08a" stroke={ink} strokeWidth="1.8" />
  </>
);

export const StickerLeaf = base(
  <>
    <path
      d="M10 38C8 20 22 8 40 8c2 18-10 32-28 30z"
      fill="#bfe3b0"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M12 36c8-10 16-16 26-26" stroke={ink} strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </>
);

export const StickerCake = base(
  <>
    <path d="M8 26h32v12H8z" fill="#ffd7e8" stroke={ink} strokeWidth="2" />
    <path d="M8 26c2-4 6-4 8 0s6 4 8 0 6-4 8 0 6 4 8 0" fill="#fff" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    <rect x="21" y="10" width="3" height="8" rx="1.4" fill="#ffdd6b" stroke={ink} strokeWidth="1.6" />
    <path d="M22.5 10c-2-2-1-4 1-6" stroke="#ff8f4d" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </>
);

export const StickerGift = base(
  <>
    <path d="M8 20h32v20H8z" fill="#c8f2d4" stroke={ink} strokeWidth="2" />
    <path d="M20 20v20M28 20v20" stroke={ink} strokeWidth="2.4" />
    <path
      d="M24 20c-4-8-14-8-14-2 0 2 2 2 14 2zM24 20c4-8 14-8 14-2 0 2-2 2-14 2z"
      fill="#ffb4c6"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </>
);

export const StickerMusicNote = base(
  <>
    <circle cx="14" cy="36" r="5" fill="#d9c9f0" stroke={ink} strokeWidth="2" />
    <circle cx="30" cy="32" r="5" fill="#d9c9f0" stroke={ink} strokeWidth="2" />
    <path d="M19 36V10l16-4v22" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </>
);

export const StickerPencil = base(
  <>
    <path
      d="M9 39l2-9 20-20 7 7-20 20z"
      fill="#ffe08a"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M11 30l7 7" stroke={ink} strokeWidth="2" />
    <path d="M31 10l7 7" stroke="#ff8fa3" strokeWidth="2.4" strokeLinecap="round" />
  </>
);

export const StickerSparkle = base(
  <>
    <path
      d="M22 6c1 8 3 10 11 11-8 1-10 3-11 11-1-8-3-10-11-11 8-1 10-3 11-11z"
      fill="#ffe08a"
      stroke={ink}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M36 26c.6 4 1.5 5 5.5 5.5-4 .5-4.9 1.5-5.5 5.5-.6-4-1.5-5-5.5-5.5 4-.5 4.9-1.5 5.5-5.5z"
      fill="#ffb4c6"
      stroke={ink}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </>
);

export const StickerFire = base(
  <path
    d="M24 44c-8 0-13-5-13-12 0-6 4-9 3-15 6 2 7 7 7 7 1-6-1-10 3-16 2 8 9 10 9 19 0 4-2 6-2 6 3-1 5-3 5-6 3 4 2 12-3 15-3 2-6 2-9 2z"
    fill="#ff9d5c"
    stroke={ink}
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

export const StickerRocket = base(
  <>
    <path
      d="M24 6c8 4 10 14 8 24l-16 0c-2-10 0-20 8-24z"
      fill="#dfeeff"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="18" r="3.4" fill="#7ab8f0" stroke={ink} strokeWidth="1.6" />
    <path d="M16 26l-6 8 8-3M32 26l6 8-8-3" fill="#ffb4c6" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M20 30l1 10 3-4 3 4 1-10" fill="#ff9d5c" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
  </>
);

export const StickerUmbrella = base(
  <>
    <path
      d="M6 24a18 18 0 0 1 36 0c-4-3-8-3-9 0-1-3-5-3-9 0s-8 3-9 0-5-3-9 0z"
      fill="#ffb4c6"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M24 24v16a4 4 0 0 1-6 3.5" stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
  </>
);

export const StickerIceCream = base(
  <>
    <path d="M15 22h18l-9 22z" fill="#f2c9a0" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    <path
      d="M14 20a10 6 0 1 1 20 0c0 2-2 3-10 3s-10-1-10-3z"
      fill="#ffcbe1"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="8" r="2.4" fill="#ff8fa3" stroke={ink} strokeWidth="1.4" />
  </>
);

export const StickerPizza = base(
  <>
    <path d="M24 6l18 34H6z" fill="#ffe08a" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 34l15-24 15 24" stroke="#f2a35b" strokeWidth="2" fill="none" />
    <circle cx="24" cy="18" r="2" fill="#ff6f6f" />
    <circle cx="19" cy="26" r="2" fill="#ff6f6f" />
    <circle cx="29" cy="27" r="2" fill="#bfe3b0" />
  </>
);

export const StickerGhost = base(
  <>
    <path
      d="M12 40V22a12 12 0 0 1 24 0v18l-4-4-4 4-4-4-4 4-4-4z"
      fill="#eef0ff"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="18" cy="22" r="1.8" fill={ink} />
    <circle cx="30" cy="22" r="1.8" fill={ink} />
  </>
);

export const StickerCat = base(
  <>
    <path d="M13 12l4 8M35 12l-4 8" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    <circle cx="24" cy="24" r="14" fill="#f2c9a0" stroke={ink} strokeWidth="2" />
    <circle cx="19" cy="22" r="1.6" fill={ink} />
    <circle cx="29" cy="22" r="1.6" fill={ink} />
    <path d="M22 28q2 2 4 0" stroke={ink} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M12 26h-4M12 30h-5M36 26h4M36 30h5" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
  </>
);

export const StickerDog = base(
  <>
    <path d="M11 16c-3 2-3 10 2 12M37 16c3 2 3 10-2 12" fill="#c98a5b" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    <circle cx="24" cy="25" r="13" fill="#e8b98a" stroke={ink} strokeWidth="2" />
    <circle cx="20" cy="24" r="1.6" fill={ink} />
    <circle cx="28" cy="24" r="1.6" fill={ink} />
    <ellipse cx="24" cy="29" rx="2.4" ry="1.8" fill={ink} />
  </>
);

export const StickerBell = base(
  <>
    <path
      d="M24 8a12 12 0 0 1 12 12v6l3 6H9l3-6v-6A12 12 0 0 1 24 8z"
      fill="#ffe08a"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M19 36a5 5 0 0 0 10 0" stroke={ink} strokeWidth="2" fill="none" />
  </>
);

export const StickerBalloon = base(
  <>
    <path
      d="M24 6a12 13 0 0 1 6 24l-6 6-6-6a12 13 0 0 1 6-24z"
      fill="#ff8fa3"
      stroke={ink}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M24 36v8" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 3" />
    <path d="M18 16q4-3 6 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
  </>
);

export const StickerRainbow = base(
  <>
    <path d="M4 34a20 20 0 0 1 40 0" fill="none" stroke="#ff8fa3" strokeWidth="4" />
    <path d="M9 34a15 15 0 0 1 30 0" fill="none" stroke="#ffdd6b" strokeWidth="4" />
    <path d="M14 34a10 10 0 0 1 20 0" fill="none" stroke="#7ab8f0" strokeWidth="4" />
    <path d="M4 34a20 20 0 0 1 40 0" fill="none" stroke={ink} strokeWidth="2" />
  </>
);

export const StickerLightning = base(
  <path
    d="M26 4L10 28h9l-3 16 18-26h-9z"
    fill="#ffdd6b"
    stroke={ink}
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

export const StickerSnowflake = base(
  <g stroke="#7ab8f0" strokeWidth="2.4" strokeLinecap="round">
    <path d="M24 6v36M8 15l32 18M8 33l32-18" />
    <path d="M24 6l-4 4M24 6l4 4M24 42l-4-4M24 42l4-4" />
    <path d="M8 15l5 1M8 15l1-5M40 33l-5-1M40 33l-1 5" />
    <path d="M8 33l5-1M8 33l1 5M40 15l-5 1M40 15l-1-5" />
  </g>
);

export const StickerClover = base(
  <>
    <g fill="#bfe3b0" stroke={ink} strokeWidth="1.8">
      <circle cx="18" cy="18" r="7" />
      <circle cx="30" cy="18" r="7" />
      <circle cx="18" cy="30" r="7" />
      <circle cx="30" cy="30" r="7" />
    </g>
    <path d="M24 24v14" stroke={ink} strokeWidth="2" strokeLinecap="round" />
  </>
);

export const StickerCamera = base(
  <>
    <rect x="6" y="14" width="36" height="26" rx="4" fill="#eef0ff" stroke={ink} strokeWidth="2" />
    <path d="M16 14l3-5h10l3 5" fill="#eef0ff" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    <circle cx="24" cy="27" r="8" fill="#fff" stroke={ink} strokeWidth="2" />
    <circle cx="24" cy="27" r="3.2" fill="#7ab8f0" />
    <circle cx="35" cy="19" r="1.6" fill="#ff8fa3" />
  </>
);

export const StickerDiamond = base(
  <path
    d="M12 18h24l6 6-18 18-18-18z"
    fill="#c9e8ff"
    stroke={ink}
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

export const STICKERS = {
  coffee: StickerCoffee,
  book: StickerBook,
  heart: StickerHeart,
  star: StickerStar,
  moon: StickerMoon,
  sun: StickerSun,
  cloud: StickerCloud,
  rain: StickerRain,
  flower: StickerFlower,
  leaf: StickerLeaf,
  cake: StickerCake,
  gift: StickerGift,
  musicNote: StickerMusicNote,
  pencil: StickerPencil,
  sparkle: StickerSparkle,
  fire: StickerFire,
  rocket: StickerRocket,
  umbrella: StickerUmbrella,
  iceCream: StickerIceCream,
  pizza: StickerPizza,
  ghost: StickerGhost,
  cat: StickerCat,
  dog: StickerDog,
  bell: StickerBell,
  balloon: StickerBalloon,
  rainbow: StickerRainbow,
  lightning: StickerLightning,
  snowflake: StickerSnowflake,
  clover: StickerClover,
  camera: StickerCamera,
  diamond: StickerDiamond,
} satisfies Record<string, ComponentType<StickerProps>>;

export type StickerName = keyof typeof STICKERS;

export function Sticker({ name, size = 32, className }: { name: StickerName } & StickerProps) {
  const Icon = STICKERS[name];
  return <Icon size={size} className={className} />;
}
