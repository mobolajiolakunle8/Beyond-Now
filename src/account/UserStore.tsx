import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ensureThread, subscribeMessages, subscribeThread, type Message, type Thread } from "@/lib/chat";
import { listenLoop } from "@/lib/listen";
import { getFirebase } from "@/lib/firebase";
import {
  buildProfile,
  ensureUserRecords,
  resolveIsAdmin,
  sendWelcome,
  signOutCurrent,
  subscribeNotifications,
  subscribeProfile,
  subscribeSaved,
  type NotificationItem,
  type SavedItem,
  type UserProfile,
} from "@/lib/users";

type UserStoreValue = {
  authReady: boolean;
  authedUser: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  saved: SavedItem[];
  notifications: NotificationItem[];
  thread: Thread | null;
  messages: Message[];
  unreadNotifications: number;
  unreadMessages: number;
  /** Non-null when a realtime listener was rejected (e.g. rules not deployed). */
  syncError: string | null;
  retrySync: () => void;
  signOutUser: () => Promise<void>;
};

const Ctx = createContext<UserStoreValue | null>(null);
const AUTH_TIMEOUT_MS = 4000;

export function UserStoreProvider({ children }: { children: ReactNode }) {
  const fb = getFirebase();

  const [authReady, setAuthReady] = useState(!fb);
  const [authedUser, setAuthedUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const welcomed = useRef<Set<string>>(new Set());
  const [epoch, setEpoch] = useState(0);
  const lastSyncError = useRef<string>("");

  const setSyncErrorOnce = useCallback((message: string | null) => {
    const clean = message ?? "";
    if (clean === lastSyncError.current) return;
    lastSyncError.current = clean;
    setSyncError(message);
  }, []);

  /** Clear the error and re-open every realtime subscription immediately. */
  const retrySync = useCallback(() => {
    lastSyncError.current = "";
    setSyncError(null);
    setEpoch((e) => e + 1);
  }, []);

  /* ---------- auth (bounded so a hung SDK never blanks the page) ---------- */
  useEffect(() => {
    if (!fb) return;
    let settled = false;
    const unsub = onAuthStateChanged(fb.auth, (user) => {
      settled = true;
      setAuthedUser(user);
      if (!user) {
        setProfile(null);
        setIsAdmin(false);
        setAuthReady(true);
      }
    });
    const watchdog = window.setTimeout(() => {
      if (!settled) setAuthReady(true);
    }, AUTH_TIMEOUT_MS);
    return () => {
      unsub();
      window.clearTimeout(watchdog);
    };
  }, [fb]);

  /* ---------- profile, role, thread bootstrap ---------- */
  useEffect(() => {
    if (!authedUser) return;
    let cancelled = false;

    // Immediately seed local profile fallback from authenticated session
    setProfile((prev) => prev || buildProfile(
      authedUser.uid,
      authedUser.email || "",
      authedUser.displayName || authedUser.email?.split("@")[0] || "Member"
    ));

    (async () => {
      try {
        const admin = await resolveIsAdmin(authedUser);
        if (cancelled) return;
        setIsAdmin(admin);
        const p = await ensureUserRecords(authedUser, admin);
        if (cancelled) return;
        setProfile(p);
        // Every member gets a private thread the moment they sign in, so the
        // team can reach out first and the user never hits a "no thread" state.
        if (!admin) await ensureThread(p);
        setSyncErrorOnce(null);
      } catch (err) {
        if (!cancelled) setSyncErrorOnce(err instanceof Error ? err.message : "Could not load your account.");
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    const uid = authedUser.uid;
    const unsub = listenLoop(
      (confirm, fatal) =>
        subscribeProfile(
          uid,
          (p) => {
            confirm();
            if (p) setProfile(p);
          },
          fatal,
        ),
      {
        onError: () => setSyncErrorOnce("Your account data could not sync. We keep retrying automatically."),
        onRecover: () => setSyncErrorOnce(null),
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [authedUser, epoch, setSyncErrorOnce]);

  /* ---------- saved + notifications ---------- */
  useEffect(() => {
    if (!authedUser) {
      setSaved([]);
      setNotifications([]);
      return;
    }
    const uid = authedUser.uid;
    const unsubSaved = listenLoop(
      (confirm, fatal) => subscribeSaved(uid, (items) => { confirm(); setSaved(items); }, fatal),
      { onError: setSyncErrorOnce, onRecover: () => setSyncErrorOnce(null) },
    );
    const unsubNotif = listenLoop(
      (confirm, fatal) =>
        subscribeNotifications(
          uid,
          (items) => {
            confirm();
            setNotifications(items);
            if (items.length === 0 && !welcomed.current.has(uid)) {
              welcomed.current.add(uid);
              void sendWelcome(uid, authedUser.displayName ?? "").catch(() => undefined);
            }
          },
          fatal,
        ),
      { onError: setSyncErrorOnce, onRecover: () => setSyncErrorOnce(null) },
    );
    return () => {
      unsubSaved();
      unsubNotif();
    };
  }, [authedUser, epoch, setSyncErrorOnce]);

  /* ---------- realtime thread + messages ---------- */
  useEffect(() => {
    if (!authedUser) {
      setThread(null);
      setMessages([]);
      return;
    }
    const uid = authedUser.uid;
    const unsubThread = listenLoop(
      (confirm, fatal) => subscribeThread(uid, (t) => { confirm(); setThread(t); }, fatal),
      { onError: setSyncErrorOnce, onRecover: () => setSyncErrorOnce(null) },
    );
    const unsubMessages = listenLoop(
      (confirm, fatal) => subscribeMessages(uid, (m) => { confirm(); setMessages(m); }, fatal),
      { onError: setSyncErrorOnce, onRecover: () => setSyncErrorOnce(null) },
    );
    return () => {
      unsubThread();
      unsubMessages();
    };
  }, [authedUser, epoch, setSyncErrorOnce]);

  const signOutUser = useCallback(() => signOutCurrent(), []);

  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const unreadMessages = thread?.unreadByUser ?? 0;

  const value = useMemo<UserStoreValue>(
    () => ({
      authReady,
      authedUser,
      profile,
      isAdmin,
      saved,
      notifications,
      thread,
      messages,
      unreadNotifications,
      unreadMessages,
      syncError,
      retrySync,
      signOutUser,
    }),
    [authReady, authedUser, profile, isAdmin, saved, notifications, thread, messages, unreadNotifications, unreadMessages, syncError, retrySync, signOutUser],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserStore(): UserStoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUserStore must be used inside UserStoreProvider");
  return v;
}
