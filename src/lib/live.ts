import type { Unsubscribe } from "firebase/firestore";

/**
 * Opens a Firestore listener that survives its own death.
 *
 * A Firestore `onSnapshot` listener that fails (permission-denied before the
 * rules are deployed, a dropped websocket, a cold start race) never calls its
 * data callback again — the UI silently freezes on stale data. This wrapper
 * re-subscribes with exponential backoff until the stream is healthy, so every
 * screen self-heals within seconds without a page refresh.
 */
export function resilientSubscribe(
  open: (ctx: { failed: (msg: string) => void; alive: () => void }) => Unsubscribe,
): Unsubscribe {
  let closed = false;
  let unsub: Unsubscribe = () => undefined;
  let timer = 0;
  let delay = 1500;

  const start = () => {
    if (closed) return;
    unsub = open({
      alive: () => {
        delay = 1500; // healthy again — reset the backoff
      },
      failed: () => {
        if (closed) return;
        unsub();
        timer = window.setTimeout(() => {
          delay = Math.min(delay * 2, 30_000);
          start();
        }, delay);
        // Retries are quiet by design; callers surface the first error.
      },
    });
  };

  start();

  return () => {
    closed = true;
    window.clearTimeout(timer);
    unsub();
  };
}

/**
 * Fires when the page becomes interesting again (focused, visible, back
 * online) — at most once every two seconds. Used to force a fresh pull so a
 * tab left open for hours never serves yesterday's content.
 */
export function onReconnect(cb: () => void): () => void {
  let last = 0;
  const fire = () => {
    const now = Date.now();
    if (now - last < 2000) return;
    last = now;
    cb();
  };
  const onVis = () => {
    if (document.visibilityState === "visible") fire();
  };
  window.addEventListener("focus", fire);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("online", fire);
  return () => {
    window.removeEventListener("focus", fire);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("online", fire);
  };
}
