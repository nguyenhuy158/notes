import { useState } from "react";
import { useI18n } from "../i18n";
import { verifyPin } from "../pinLock";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Lock } from "lucide-react";

export function PinLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(false);
    const ok = await verifyPin(pin);
    setBusy(false);
    if (ok) onUnlock();
    else {
      setError(true);
      setPin("");
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-xs text-center">
        <Lock size={28} className="mx-auto text-fg-muted" aria-hidden="true" />
        <h1 className="mt-3 text-base font-semibold text-fg">{t.pin_enter_title}</h1>

        <Input
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && pin && submit()}
          className="mt-4 text-center text-lg tracking-[0.5em]"
        />

        {error && <p className="mt-2 text-xs text-danger">{t.pin_wrong}</p>}

        <Button block className="mt-4" disabled={!pin || busy} loading={busy} onClick={submit}>
          {t.pin_unlock}
        </Button>
      </div>
    </div>
  );
}
