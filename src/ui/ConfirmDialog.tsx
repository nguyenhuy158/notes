import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";

export type DialogRequest = {
  title: string;
  description?: string;
  /** Nhan nut xac nhan; mac dinh la "Dong y" theo ngon ngu dang chon. */
  confirmLabel?: string;
  tone?: "default" | "danger";
  /** Co field nay thi hop thoai co o nhap, resolve ra chuoi thay vi boolean. */
  input?: {
    label: string;
    type?: "text" | "password";
    inputMode?: "text" | "numeric";
    maxLength?: number;
  };
};

type DialogApi = {
  /** Resolve true khi nguoi dung xac nhan, false khi huy/Esc/bam ra ngoai. */
  confirm: (request: DialogRequest) => Promise<boolean>;
  /** Resolve gia tri da nhap, hoac null khi huy. */
  prompt: (request: DialogRequest & { input: NonNullable<DialogRequest["input"]> }) => Promise<string | null>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error("useDialog phai nam trong DialogProvider");
  return api;
}

/**
 * Thay `window.confirm`/`window.prompt`: hop thoai gốc của trình duyệt không
 * theo được theme sáng/tối, không đổi được nhãn theo ngôn ngữ, và trên iOS
 * hiện tên domain nhìn như cảnh báo lừa đảo. Dùng lại `Modal` nên được cả
 * Esc + trả focus + `aria-modal` miễn phí.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState("");
  // Giữ resolve của promise đang treo — đóng hộp thoại kiểu nào cũng phải gọi,
  // nếu không await ở chỗ gọi sẽ treo mãi.
  const resolveRef = useRef<((result: boolean | string | null) => void) | null>(null);

  const open = useCallback((next: DialogRequest) => {
    setValue("");
    setRequest(next);
    return new Promise<boolean | string | null>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean | string | null) => {
    setRequest(null);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(result);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (next) => open(next).then((r) => r === true),
      prompt: (next) => open(next).then((r) => (typeof r === "string" ? r : null)),
    }),
    [open],
  );

  const canSubmit = !request?.input || value.length > 0;

  function submit() {
    if (!canSubmit) return;
    settle(request?.input ? value : true);
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request && (
        <Modal
          title={request.title}
          onClose={() => settle(request.input ? null : false)}
          closeLabel={t.dialog_cancel}
        >
          {request.description && <p className="mt-2 text-sm text-fg-muted">{request.description}</p>}

          {request.input && (
            <Input
              autoFocus
              type={request.input.type ?? "text"}
              inputMode={request.input.inputMode}
              maxLength={request.input.maxLength}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              aria-label={request.input.label}
              className="mt-3"
            />
          )}

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => settle(request.input ? null : false)}
            >
              {t.dialog_cancel}
            </Button>
            <Button
              variant={request.tone === "danger" ? "danger" : "primary"}
              className="flex-1"
              disabled={!canSubmit}
              onClick={submit}
            >
              {request.confirmLabel ?? t.dialog_confirm}
            </Button>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}
