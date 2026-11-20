import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "./cn";

export type ToastTone = "info" | "success" | "warning" | "error";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  description?: string;
  action?: ToastAction;
};

/** Nut hanh dong trong toast — dung cho "Hoan tac" sau khi xoa. */
export type ToastAction = { label: string; onClick: () => void };

type ToastOptions = { description?: string; duration?: number; action?: ToastAction };

type ToastApi = {
  show: (tone: ToastTone, message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast phai nam trong ToastProvider");
  return api;
}

/* Chu luon dung text-fg: text-success/text-warning tren nen *-soft chi dat
   ~2-3:1, khong du 4.5:1. Mau chi con o vien + icon. */
const TONE: Record<ToastTone, string> = {
  info: "border-border bg-surface",
  success: "border-success/40 bg-success-soft",
  warning: "border-warning/40 bg-warning-soft",
  error: "border-danger/40 bg-danger-soft",
};

/* Icon rieng cho tung tone: khong truyen dat y nghia bang mau don thuan. */
const TONE_ICON: Record<ToastTone, { Icon: typeof Info; className: string }> = {
  info: { Icon: Info, className: "text-fg-muted" },
  success: { Icon: CheckCircle2, className: "text-success" },
  warning: { Icon: AlertTriangle, className: "text-warning" },
  error: { Icon: AlertCircle, className: "text-danger" },
};

/** Boc quanh app mot lan. Khong dung thu vien ngoai de copy sang project khac la chay. */
export function ToastProvider({
  children,
  duration = 4000,
  dismissLabel = "Dismiss",
}: {
  children: ReactNode;
  duration?: number;
  /** Nhan cho screen reader tren nut dong toast. */
  dismissLabel?: string;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string, options?: ToastOptions) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((list) => [
        ...list,
        { id, tone, message, description: options?.description, action: options?.action },
      ]);
      // Loi thuong can doc ky hon nen de lau gap doi.
      const ms = options?.duration ?? (tone === "error" ? duration * 2 : duration);
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss, duration],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      info: (message, options) => show("info", message, options),
      success: (message, options) => show("success", message, options),
      warning: (message, options) => show("warning", message, options),
      error: (message, options) => show("error", message, options),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        // aria-live polite: screen reader doc khi ranh, khong cat ngang thao tac.
        <div
          role="status"
          aria-live="polite"
          className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
        >
          {toasts.map((toast) => {
            const { Icon, className: iconClass } = TONE_ICON[toast.tone];
            return (
              <div
                key={toast.id}
                style={{ animation: "ui-slide-up 200ms ease-out" }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-ui border px-3 py-3 text-fg shadow-lg",
                  TONE[toast.tone],
                )}
              >
                <Icon size={16} aria-hidden="true" className={cn("mt-0.5 shrink-0", iconClass)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{toast.message}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs text-fg-muted">{toast.description}</p>
                  )}
                </div>
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      dismiss(toast.id);
                      toast.action!.onClick();
                    }}
                    className="min-h-8 shrink-0 cursor-pointer rounded-ui px-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label={dismissLabel}
                  className="-m-1 shrink-0 cursor-pointer p-1 text-fg-muted transition hover:text-fg"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
