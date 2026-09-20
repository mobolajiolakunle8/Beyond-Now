/**
 * Service worker registration + PWA install prompt handling.
 *
 * Registration is deliberately conservative: it never runs during development
 * (Vite dev server) and failures are swallowed so the site keeps working.
 */

export type InstallPromptState = {
  available: boolean;
  installed: boolean;
  prompt: () => Promise<void>;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(state: InstallPromptState) => void>();

let currentState: InstallPromptState = {
  available: false,
  installed: false,
  prompt: async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    deferredPrompt = null;
    currentState = { ...currentState, available: false };
    listeners.forEach((listener) => listener(currentState));
  },
};

function emit() {
  listeners.forEach((listener) => listener(currentState));
}

/** Subscribes to install availability. Returns an unsubscribe function. */
export function onInstallPromptChange(listener: (state: InstallPromptState) => void): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => listeners.delete(listener);
}

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return true;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari exposes standalone on Navigator but TypeScript does not model it.
  const iosStandalone = "standalone" in window.navigator && Boolean((window.navigator as { standalone?: unknown }).standalone);
  return standalone || iosStandalone;
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;
  // Vite dev server already hot-reloads; a worker there only causes staleness.
  if (import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Registration failed — the site still works, just without offline support. */
    });
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    currentState = { ...currentState, available: true };
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    currentState = { available: false, installed: true, prompt: currentState.prompt };
    emit();
  });

  currentState = { ...currentState, installed: isAppInstalled() };
}
