import { type KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
import { cn } from "./cn";

export type TabItem<TId extends string = string> = {
  id: TId;
  label: string;
  count?: number;
};

export type TabsProps<TId extends string = string> = {
  items: TabItem<TId>[];
  active: TId;
  onChange: (id: TId) => void;
  /** "line": gach chan, hop trang noi dung. "pill": nen bo tron, hop bo loc. */
  variant?: "line" | "pill";
  label?: string;
  className?: string;
};

const TAB_KEY_STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

function targetTabIndex(key: string, current: number, count: number) {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const step = TAB_KEY_STEP[key];
  return step === undefined ? undefined : (current + step + count) % count;
}

export function Tabs<TId extends string = string>({
  items,
  active,
  onChange,
  variant = "line",
  label,
  className,
}: TabsProps<TId>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: do lai vi tri khi tab dang chon, nhan hoac kieu thay doi
  useLayoutEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    if (node) setBar({ left: node.offsetLeft, width: node.offsetWidth });
  }, [active, items, variant]);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex((item) => item.id === active);
    const next = targetTabIndex(event.key, current, items.length);
    if (next === undefined) return;
    const target = items[next];
    if (!target) return;
    event.preventDefault();
    onChange(target.id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={moveFocus}
      className={cn(
        // overflow-x-auto: nhieu tab thi cuon ngang thay vi xuong dong roi vo layout.
        "relative flex gap-1 overflow-x-auto",
        variant === "line" && "border-b border-border",
        variant === "pill" && "rounded-ui bg-surface-muted p-1",
        className,
      )}
    >
      {bar && (
        <span
          aria-hidden="true"
          style={{
            width: bar.width,
            transform: `translateX(${bar.left}px)`,
          }}
          className={cn(
            "pointer-events-none absolute left-0 transition-[transform,width] duration-200",
            variant === "line" && "bottom-0 h-0.5 bg-primary",
            variant === "pill" &&
              "inset-y-1 rounded-[calc(var(--ui-radius)-0.25rem)] bg-surface shadow-sm",
          )}
        />
      )}
      {items.map((item) => {
        const isActive = item.id === active;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative z-10 shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium outline-none transition",
              "focus-visible:ring-2 focus-visible:ring-ring",
              variant === "line" &&
                (isActive ? "text-primary" : "text-fg-muted hover:text-fg"),
              variant === "pill" &&
                cn(
                  "rounded-[calc(var(--ui-radius)-0.25rem)]",
                  isActive ? "text-fg" : "text-fg-muted hover:text-fg",
                ),
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ms-1.5 text-xs text-fg-muted tabular">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
