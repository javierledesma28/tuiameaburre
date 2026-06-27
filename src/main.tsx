import React from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n";
import { GameProvider } from "./game";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>
  </React.StrictMode>
);
