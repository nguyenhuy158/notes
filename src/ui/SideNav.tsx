import { cn } from "./cn";
import type { BottomNavItem } from "./BottomNav";

export type SideNavProps<TId extends string = string> = {
  items: BottomNavItem<TId>[];
  active: TId;
  onChange: (id: TId) => void;
  /** Nhan hien o dau thanh (ten app). */
  title?: string;
  className?: string;
};

/**
 * Nua desktop cua `BottomNav` (component do tu an bang `lg:hidden`).
 *
 * Cung dung role="tablist" chu khong phai <nav>: cac muc doi noi dung tai cho,
 * app khong co URL router.
 */
export function SideNav<TId extends string = string>({
  items,
  active,
  onChange,
  title,
  className,
}: SideNavProps<TId>) {
  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      className={cn(
        "hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1",
        "border-r border-border bg-surface/60 px-3 py-4",
        className,
      )}
    >
      {title && (
        <p className="mb-2 px-2 text-sm font-semibold tracking-tight text-fg">{title}</p>
      )}

      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative flex min-h-11 cursor-pointer items-center gap-3 rounded-ui px-3 text-sm outline-none transition",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              isActive
                ? "bg-primary/10 font-semibold text-primary"
                : "text-fg-muted hover:bg-surface-muted hover:text-fg",
            )}
          >
            {/* Gach chi muc ben trai: khong de active chi phu thuoc mau. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 h-5 w-0.5 rounded-full transition",
                isActive ? "bg-primary" : "bg-transparent",
              )}
            />
            <span className="relative">
              <Icon size={18} />
              {Boolean(item.badge) && (
                <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">
                  {item.badge! > 99 ? "99+" : item.badge}
                </span>
              )}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
