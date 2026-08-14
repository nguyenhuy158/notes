import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./ui/theme";
import { ToastProvider } from "./ui/Toast";
import "./styles.css";

// Chỉ tồn tại ở bản build (devOptions tắt ở vite.config.ts) — no-op an toàn lúc dev.
registerSW({ immediate: true });

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
