import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "./ui/theme";
import { ToastProvider } from "./ui/Toast";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
