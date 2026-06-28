import { App } from "@ui/App.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app mount node");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
