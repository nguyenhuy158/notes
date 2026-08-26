import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

export type ModalProps = {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
  /** "sheet" truot tu duoi (mobile), "full" chiem toan man (year view). */
  variant?: "sheet" | "full";
};

/**
 * Hop thoai dung chung. Truoc day Calendar tu ve `fixed inset-0` roi chi dong
 * bang click backdrop: khong co role/aria-modal, khong dong bang Esc, focus
 * van o duoi nen. Gom lai mot cho de moi modal sau nay duoc thua huong.
 *
 * Chua bay focus-trap day du (Tab van co the ra ngoai) — dat initial focus +
 * tra focus ve nut mo la du cho app 1 nguoi dung nay.
 * ponytail: neu them modal nhieu buoc thi hay dung thu vien focus-trap.
 */
export function Modal({ title, onClose, closeLabel, children, variant = "sheet" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        variant === "sheet"
          ? "flex items-end justify-center bg-black/40 sm:items-center"
          : "overflow-y-auto bg-bg",
      )}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={variant === "sheet" ? { animation: "ui-slide-up 200ms ease-out" } : undefined}
        className={cn(
          "w-full max-w-md outline-none",
          variant === "sheet"
            ? "safe-bottom rounded-t-2xl bg-surface p-4 sm:rounded-2xl"
            : "safe-top mx-auto px-4 py-4",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
