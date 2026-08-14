import { useEffect, useState } from "react";
import { api } from "./api";
import { CalendarScreen } from "./screens/CalendarScreen";
import { ComposeScreen } from "./screens/ComposeScreen";
import { DayScreen } from "./screens/DayScreen";
import { AlbumScreen } from "./screens/AlbumScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PinLockScreen } from "./screens/PinLockScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ShareScreen } from "./screens/ShareScreen";
import { TimelineScreen } from "./screens/TimelineScreen";
import { TrashScreen } from "./screens/TrashScreen";
import { BottomNav, type BottomNavItem } from "./ui/BottomNav";
import { Calendar, Settings, History } from "lucide-react";
import { useI18n } from "./i18n";
import { isUnlockedThisSession, markUnlocked } from "./pinLock";
import { todayString } from "./date";

type Tab = "calendar" | "timeline" | "settings";
type Screen =
  | { name: "root" }
  | { name: "day"; date: string }
  | { name: "compose"; date: string }
  | { name: "trash" }
  | { name: "album" };
type Auth = { status: "checking" } | { status: "anon" } | { status: "authed" };

const SHARE_PATH_RE = /^\/s\/([^/]+)/;

export function App() {
  // Route /s/:token phải xử lý TRƯỚC mọi hook khác — không đăng nhập vẫn xem
  // được, và app không dùng URL router thật nên đọc thẳng location.pathname.
  // An toàn về thứ tự hook vì pathname không đổi giữa các lần render của
  // cùng 1 lần mount (chỉ đổi khi load lại trang).
  const shareMatch = SHARE_PATH_RE.exec(window.location.pathname);
  if (shareMatch) return <ShareScreen token={shareMatch[1]} />;

  const { t } = useI18n();
  const [auth, setAuth] = useState<Auth>({ status: "checking" });
  const [tab, setTab] = useState<Tab>("calendar");
  const [screen, setScreen] = useState<Screen>({ name: "root" });
  const [locked, setLocked] = useState(() => !isUnlockedThisSession());

  useEffect(() => {
    let cancelled = false;
    api
      .checkAuth()
      .then((user) => !cancelled && setAuth({ status: user ? "authed" : "anon" }))
      .catch(() => !cancelled && setAuth({ status: "anon" }));
    return () => {
      cancelled = true;
    };
  }, []);

  // PWA shortcut "Ghi chú mới" (manifest, vite.config.ts) mở app kèm
  // "?new=1" — mở thẳng Compose cho hôm nay, dọn query string ngay sau đó để
  // back/reload không mở lại Compose lần nữa.
  useEffect(() => {
    if (auth.status !== "authed") return;
    if (new URLSearchParams(window.location.search).get("new") !== "1") return;
    setScreen({ name: "compose", date: todayString() });
    window.history.replaceState(null, "", "/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  if (auth.status === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-fg-muted">{t.auth_checking}</div>
    );
  }

  if (auth.status === "anon") {
    return <LoginScreen />;
  }

  if (locked) {
    return (
      <PinLockScreen
        onUnlock={() => {
          markUnlocked();
          setLocked(false);
        }}
      />
    );
  }

  const NAV_ITEMS: BottomNavItem<Tab>[] = [
    { id: "calendar", label: t.nav_calendar, icon: Calendar },
    { id: "timeline", label: t.nav_timeline, icon: History },
    { id: "settings", label: t.nav_settings, icon: Settings },
  ];

  if (screen.name === "day") {
    return (
      <DayScreen
        date={screen.date}
        onBack={() => setScreen({ name: "root" })}
        onCompose={(date) => setScreen({ name: "compose", date })}
        onNavigate={(date) => setScreen({ name: "day", date })}
      />
    );
  }

  if (screen.name === "compose") {
    return (
      <ComposeScreen
        date={screen.date}
        onBack={() => setScreen({ name: "day", date: screen.date })}
        onSaved={() => setScreen({ name: "root" })}
      />
    );
  }

  if (screen.name === "trash") {
    return <TrashScreen onBack={() => setScreen({ name: "root" })} />;
  }

  if (screen.name === "album") {
    return <AlbumScreen onBack={() => setScreen({ name: "root" })} />;
  }

  return (
    <div className="mx-auto max-w-md pb-20">
      {tab === "calendar" && (
        <CalendarScreen onOpenDay={(date) => setScreen({ name: "day", date })} />
      )}
      {tab === "timeline" && (
        <TimelineScreen onOpenDay={(date) => setScreen({ name: "day", date })} />
      )}
      {tab === "settings" && (
        <SettingsScreen
          onOpenTrash={() => setScreen({ name: "trash" })}
          onOpenAlbum={() => setScreen({ name: "album" })}
        />
      )}

      <BottomNav items={NAV_ITEMS} active={tab} onChange={setTab} />
    </div>
  );
}
