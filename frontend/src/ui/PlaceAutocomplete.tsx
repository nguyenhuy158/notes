import { useEffect, useRef, useState } from "react";
import { api } from "../api";

/** Ô nhập địa điểm có gợi ý — gọi `/api/places` (proxy Nominatim/OpenStreetMap
 * ở worker, xem `worker/src/index.ts`), debounce 350ms. Vẫn lưu dạng text tự
 * do (không lưu toạ độ) — gợi ý chỉ để gõ nhanh + đỡ gõ sai tên. */
export function PlaceAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    timerRef.current = window.setTimeout(() => {
      api
        .searchPlaces(q)
        .then((r) => {
          if (requestId === requestIdRef.current) setSuggestions(r.places);
        })
        .catch(() => {});
    }, 350);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [value]);

  function pick(place: string) {
    onChange(place);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
        placeholder={placeholder}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-ui border border-border bg-surface py-1 shadow-lg">
          {suggestions.map((place) => (
            <li key={place}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(place)}
                className="block w-full truncate px-3 py-2 text-left text-sm text-fg hover:bg-surface-muted"
              >
                {place}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
