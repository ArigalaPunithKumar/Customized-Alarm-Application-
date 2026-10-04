import React from "react";
import { createRoot } from "react-dom/client";
import { AlarmProvider } from "./store.jsx";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AlarmProvider>
      <App />
    </AlarmProvider>
  </React.StrictMode>
);