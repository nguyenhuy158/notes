/**
 * Bộ mặt kawaii tự vẽ thay cho emoji unicode — key giữ nguyên ký tự unicode cũ
 * (`Mood` trong api.ts) để không đụng schema/whitelist ở worker, chỉ đổi phần
 * hiển thị. Style: outline đen dày, nền màu pastel, blush 2 má, mắt to lệch
 * kiểu chibi — cố tình không theo bộ mặt cười chuẩn (tránh giống hệt emoji có
 * sẵn).
 */
import type { ComponentType } from "react";
import type { Mood } from "./api";

type FaceProps = { size?: number; className?: string };

function Face({
  bg,
  cheeks = true,
  children,
}: {
  bg: string;
  cheeks?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <circle cx="24" cy="24" r="21" fill={bg} stroke="#1a1a1a" strokeWidth="2" />
      {cheeks && (
        <>
          <ellipse cx="13" cy="27" rx="4" ry="2.6" fill="#ff9db3" opacity="0.7" />
          <ellipse cx="35" cy="27" rx="4" ry="2.6" fill="#ff9db3" opacity="0.7" />
        </>
      )}
      {children}
    </>
  );
}

function base(render: (props: FaceProps) => React.ReactNode) {
  return function MoodIcon({ size = 24, className }: FaceProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {render({ size, className })}
      </svg>
    );
  };
}

/** 😄 cười to híp mắt, tia sáng bung quanh đầu */
const MoodBeaming = base(() => (
  <Face bg="#ffe082">
    <path d="M9 8l2 4-4-1z" fill="#ffe082" stroke="#1a1a1a" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M39 6l2 4-4-1z" fill="#ffe082" stroke="#1a1a1a" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M15 20q3-4 6 0" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M27 20q3-4 6 0" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M14 29q10 9 20 0" stroke="#1a1a1a" strokeWidth="2.6" strokeLinecap="round" fill="#ffffff" />
  </Face>
));

/** 🙂 cười mỉm, mắt chấm nhỏ lệch */
const MoodSmiling = base(() => (
  <Face bg="#c8f2d4">
    <circle cx="17" cy="21" r="1.8" fill="#1a1a1a" />
    <circle cx="30" cy="20" r="2.4" fill="#1a1a1a" />
    <path d="M15 28q9 6 18 -1" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </Face>
));

/** 😐 mặt phẳng, mắt gạch ngang không đều */
const MoodNeutral = base(() => (
  <Face bg="#e4e4e4" cheeks={false}>
    <path d="M13 21h7" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M28 22h8" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M16 31h16" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" />
  </Face>
));

/** 😔 buồn, mắt cong xuống, 1 giọt lệ */
const MoodSad = base(() => (
  <Face bg="#bcd6f5" cheeks={false}>
    <path d="M13 23q4-5 8 0" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M27 23q4-5 8 0" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M32 25c2 3 2 6-1 6s-3-3-1-6" fill="#7ab8f0" stroke="#1a1a1a" strokeWidth="1.6" />
    <path d="M17 33q7-5 14 0" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </Face>
));

/** 😡 giận, chân mày nhíu, miệng zigzag, khói bốc 2 bên */
const MoodAngry = base(() => (
  <Face bg="#ffc2b8">
    <path d="M4 18l6 4M44 18l-6 4" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 17l8 4M36 17l-8 4" stroke="#1a1a1a" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="17" cy="24" r="2.2" fill="#1a1a1a" />
    <circle cx="31" cy="24" r="2.2" fill="#1a1a1a" />
    <path d="M15 33l4-2 4 2 4-2 4 2" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </Face>
));

/** 😴 ngủ, mắt cong kiểu ~, chữ Z bay lên, bong bóng nước miếng nhỏ */
const MoodSleepy = base(() => (
  <Face bg="#d9c9f0">
    <path d="M13 21q4 3 8 0" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M27 21q4 3 8 0" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <ellipse cx="20" cy="31" rx="3.5" ry="2.4" fill="#1a1a1a" opacity="0.85" />
    <text x="33" y="12" fontSize="9" fontWeight="700" fill="#1a1a1a" fontFamily="sans-serif">
      z
    </text>
    <text x="39" y="7" fontSize="6" fontWeight="700" fill="#1a1a1a" fontFamily="sans-serif">
      z
    </text>
  </Face>
));

/** 🥳 tiệc tùng, nón chóp lệch, sao lấp lánh, mắt sao */
const MoodParty = base(() => (
  <Face bg="#ffd6ec">
    <path d="M20 8l7-9 3 10z" fill="#ffe082" stroke="#1a1a1a" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="27" cy="-1" r="1.6" fill="#ff6f91" stroke="#1a1a1a" strokeWidth="1" />
    <path
      d="M15 19l1.2 2.6 2.6 1.2-2.6 1.2L15 27l-1.2-2.6-2.6-1.2 2.6-1.2z"
      fill="#1a1a1a"
    />
    <path
      d="M32 18l1.2 2.6 2.6 1.2-2.6 1.2L32 26l-1.2-2.6-2.6-1.2 2.6-1.2z"
      fill="#1a1a1a"
    />
    <path d="M14 29q10 9 20 0" stroke="#1a1a1a" strokeWidth="2.6" strokeLinecap="round" fill="#ffffff" />
  </Face>
));

/** 😰 lo lắng, mắt to run, giọt mồ hôi, miệng sóng */
const MoodAnxious = base(() => (
  <Face bg="#cdeaf0">
    <circle cx="17" cy="22" r="4" fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.8" />
    <circle cx="18.5" cy="23" r="1.8" fill="#1a1a1a" />
    <circle cx="31" cy="22" r="3.4" fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.8" />
    <circle cx="32" cy="23" r="1.5" fill="#1a1a1a" />
    <path d="M36 12c2 3 2 6-1 6s-3-3-1-6" fill="#7ab8f0" stroke="#1a1a1a" strokeWidth="1.4" />
    <path d="M16 32q3-3 6 0t6 0 6 0" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
  </Face>
));

export const MOOD_EMOJI: Record<Mood, ComponentType<FaceProps>> = {
  "😄": MoodBeaming,
  "🙂": MoodSmiling,
  "😐": MoodNeutral,
  "😔": MoodSad,
  "😡": MoodAngry,
  "😴": MoodSleepy,
  "🥳": MoodParty,
  "😰": MoodAnxious,
};

export function MoodEmoji({ mood, size = 24, className }: { mood: Mood; size?: number; className?: string }) {
  const Icon = MOOD_EMOJI[mood];
  return <Icon size={size} className={className} />;
}
