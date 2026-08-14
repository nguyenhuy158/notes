import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./ui/theme";
import { ToastProvider } from "./ui/Toast";
import { startReminderLoop } from "./reminder";
import "./styles.css";

// Chỉ tồn tại ở bản build (devOptions tắt ở vite.config.ts) — no-op an toàn lúc dev.
registerSW({ immediate: true });

// Khởi động lại lịch nhắc nếu user đã bật trước đó — chỉ chạy trong khi tab
// này mở, không phải push server nên phải tự schedule lại mỗi lần load app.
startReminderLoop(localStorage.getItem("ui-lang") === "en" ? "Time to write your note!" : "Đến giờ ghi note rồi!");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
);
