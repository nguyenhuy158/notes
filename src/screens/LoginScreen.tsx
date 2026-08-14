import { useI18n } from "../i18n";

/** Logo Google chuẩn 4 màu — không dùng icon lib vì đây là brand mark, không phải icon chung. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.27-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

/** Chưa đăng nhập -> app dừng ở đây, không tự bounce mù sang /login. Người dùng
 * chủ động bấm mới rời SPA — link thật (<a href>), không phải điều hướng bằng
 * JS, để chắc chắn không bị service worker chặn (xem vite.config.ts). */
export function LoginScreen() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center safe-top safe-bottom">
      <img src="/logo.svg" alt="" width={96} height={96} className="rounded-[28px] shadow-lg" />

      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-fg">{t.auth_title}</h1>
        <p className="max-w-xs text-sm text-fg-muted">{t.auth_tagline}</p>
      </div>

      <a
        href="/login"
        className="inline-flex h-12 min-w-[220px] items-center justify-center gap-3 rounded-full border border-border bg-surface px-6 text-sm font-medium text-fg shadow-sm transition hover:bg-surface-muted active:scale-[0.98]"
      >
        <GoogleG />
        {t.auth_cta}
      </a>
    </div>
  );
}
