import { useState } from "react";
import { CalendarScreen } from "./screens/CalendarScreen";
import { ComposeScreen } from "./screens/ComposeScreen";
import { DayScreen } from "./screens/DayScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TimelineScreen } from "./screens/TimelineScreen";
import { BottomNav, type BottomNavItem } from "./ui/BottomNav";
import { Calendar, Settings, History } from "lucide-react";
import { useI18n } from "./i18n";

type Tab = "calendar" | "timeline" | "settings";
type Screen = { name: "root" } | { name: "day"; date: string } | { name: "compose"; date: string };

export function App() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("calendar");

  const NAV_ITEMS: BottomNavItem<Tab>[] = [
    { id: "calendar", label: t.nav_calendar, icon: Calendar },
    { id: "timeline", label: t.nav_timeline, icon: History },
    { id: "settings", label: t.nav_settings, icon: Settings },
  ];
  const [screen, setScreen] = useState<Screen>({ name: "root" });

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

  return (
    <div className="mx-auto max-w-md pb-20">
      {tab === "calendar" && (
        <CalendarScreen onOpenDay={(date) => setScreen({ name: "day", date })} />
      )}
      {tab === "timeline" && (
        <TimelineScreen onOpenDay={(date) => setScreen({ name: "day", date })} />
      )}
      {tab === "settings" && <SettingsScreen />}

      <BottomNav items={NAV_ITEMS} active={tab} onChange={setTab} />
    </div>
  );
}
