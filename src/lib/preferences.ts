import { useSyncExternalStore } from "react";

/**
 * Client-side accessibility and low-bandwidth preferences.
 *
 * These are presentation-only and are stored locally per device. They never
 * change what data is stored, and they default to the user's OS settings so
 * the site respects the platform they are on.
 */

export type DisplayPreferences = {
  /** Reduce animation and decorative motion. Defaults to OS setting. */
  reducedMotion: boolean;
  /** Text-first layout, lighter images and no decorative effects. */
  lowData: boolean;
  /** Larger base text scale for readability. */
  largerText: boolean;
  /** Higher-contrast surfaces and stronger borders. */
  highContrast: boolean;
};

const STORAGE_KEY = "bn.display.v1";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function detectLowData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as unknown as {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (conn?.saveData) return true;
  // 2g / slow-2g are treated as low-data automatically.
  return conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g";
}

const defaults: DisplayPreferences = {
  reducedMotion: prefersReducedMotion(),
  lowData: detectLowData(),
  largerText: false,
  highContrast: false,
};

function readStored(): DisplayPreferences {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<DisplayPreferences>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

let current: DisplayPreferences = readStored();
const listeners = new Set<() => void>();

function emit() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.lowData = current.lowData ? "true" : "false";
  root.dataset.largerText = current.largerText ? "true" : "false";
  root.dataset.highContrast = current.highContrast ? "true" : "false";
  root.dataset.reducedMotion = current.reducedMotion ? "true" : "false";
  listeners.forEach((listener) => listener());
}

export function getDisplayPreferences(): DisplayPreferences {
  return current;
}

export function setDisplayPreference<K extends keyof DisplayPreferences>(
  key: K,
  value: DisplayPreferences[K],
): void {
  current = { ...current, [key]: value };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* preferences are non-critical */
  }
  emit();
}

export function resetDisplayPreferences(): void {
  current = { ...defaults };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* non-critical */
  }
  emit();
}

export function subscribeDisplayPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook for the current preferences. */
export function useDisplayPreferences(): [DisplayPreferences, typeof setDisplayPreference] {
  const value = useSyncExternalStore(subscribeDisplayPreferences, getDisplayPreferences, getDisplayPreferences);
  return [value, setDisplayPreference];
}

// Apply stored preferences as early as possible.
if (typeof document !== "undefined") emit();
