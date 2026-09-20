import type { Unsubscribe } from "firebase/database";

/**
 * Re-attaches a Realtime Database listener after a fatal error with exponential backoff.
 *
 * Firebase realtime subscriptions are permanently terminated when security rules are
 * redeployed, denied, or the network drops. Rather than leaving the UI
 * dead until a page refresh, this re-opens the listener every few seconds —
 * so the moment rules deploy or connectivity returns, the app syncs on its own.
 *
 * @param open Creates the subscription. `confirm` must be called when a healthy
 *             snapshot arrives (resets the backoff); `fatal` forwards errors.
 */
export function listenLoop(
  open: (confirm: () => void, fatal: (message: string) => void) => Unsubscribe,
  callbacks: { onError?: (message: string) => void; onRecover?: () => void } = {},
): Unsubscribe {
  let unsub: Unsubscribe = () => undefined;
  let stopped = false;
  let attempts = 0;
  let timer = 0;

  const fail = (message: string) => {
    if (stopped) return;
    attempts += 1;
    callbacks.onError?.(message);
    // Ramp from 3s up to a steady 15s and retry indefinitely, so the listener
    // recovers the moment rules are published or the network returns — no refresh.
    const delay = Math.min(15_000, 3_000 * attempts);
    timer = window.setTimeout(start, delay);
  };

  const start = () => {
    if (stopped) return;
    try {
      unsub = open(() => {
        if (attempts > 0) {
          attempts = 0;
          callbacks.onRecover?.();
        }
      }, fail);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Realtime listener failed to start.");
    }
  };

  start();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    try {
      unsub();
    } catch {
      /* already removed */
    }
  };
}
