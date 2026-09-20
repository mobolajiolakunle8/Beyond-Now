import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initAppCheck } from "@/lib/appCheck";
import { registerServiceWorker } from "@/lib/pwa";
import "./index.css";
import App from "./App";

/**
 * Removes the pre-hydration placeholder once React has actually painted.
 *
 * This deliberately happens here rather than on `DOMContentLoaded`: module
 * scripts execute *after* that event, so removing it there would expose a
 * blank white frame before the first render.
 */
function dismissBootPlaceholder() {
  const boot = document.getElementById("boot");
  if (!boot) return;
  boot.style.transition = "opacity 200ms ease";
  boot.style.opacity = "0";
  window.setTimeout(() => boot.remove(), 220);
}

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Double rAF lands after the browser commits the first paint.
  requestAnimationFrame(() => requestAnimationFrame(dismissBootPlaceholder));
} else {
  // Hard fallback: never leave the placeholder covering the page.
  dismissBootPlaceholder();
}

// Safety net in case React never mounts (e.g. an early throw).
window.setTimeout(dismissBootPlaceholder, 6000);

// Security and platform integrations. Both are fire-and-forget: neither may
// delay or block the first paint, and neither may break rendering on failure.
void initAppCheck();
registerServiceWorker();
