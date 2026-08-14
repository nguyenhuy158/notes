import { useState } from "react";
import { CalendarScreen } from "./screens/CalendarScreen";
import { ComposeScreen } from "./screens/ComposeScreen";
import { DayScreen } from "./screens/DayScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TimelineScreen } from "./screens/TimelineScreen";
import { BottomNav, type BottomNavItem } from "./ui/BottomNav";
import { IconCalendar, IconSettings, IconTimeline } from "./icons";

type Tab = "calendar" | "timeline" | "settings";
type Screen = { name: "root" } | { name: "day"; date: string } | { name: "compose"; date: string };

const NAV_ITEMS: BottomNavItem<Tab>[] = [
  { id: "calendar", label: "Lịch", icon: IconCalendar },
  { id: "timeline", label: "Dòng TG", icon: IconTimeline },
  { id: "settings", label: "Cài đặt", icon: IconSettings },
];

export function App() {
  const [tab, setTab] = useState<Tab>("calendar");
  const [screen, setScreen] = useState<Screen>({ name: "root" });

  if (screen.name === "day") {
    return (
      <DayScreen
        date={screen.date}
        onBack={() => setScreen({ name: "root" })}
        onCompose={(date) => setScreen({ name: "compose", date })}
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
