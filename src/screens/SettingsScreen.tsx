import { HeaderBar } from "../ui/HeaderBar";
import { ThemeToggle } from "../ui/theme";

export function SettingsScreen() {
  return (
    <div className="pb-24">
      <HeaderBar title="Cài đặt" />
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between rounded-ui border border-border bg-surface p-3">
          <span className="text-sm text-fg">Giao diện</span>
          <ThemeToggle />
        </div>
        <a
          href="/logout"
          className="block rounded-ui border border-border bg-surface p-3 text-center text-sm font-medium text-danger"
        >
          Đăng xuất
        </a>
      </div>
    </div>
  );
}
