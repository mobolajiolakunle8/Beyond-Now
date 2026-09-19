import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebase } from "@/lib/firebase";
import {
  fetchProfile,
  isAdminUser,
  subscribeNotifications,
  subscribeProfile,
  subscribeSaved,
  sendWelcome,
  type NotificationItem,
  type SavedItem,
  type UserProfile,
} from "@/lib/users";
import { getOrCreateUserThread, subscribeUserThread, type Message, type Thread } from "@/lib/chat";

type UserStoreValue = {
  authReady: boolean;
  authedUser: User | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  isAdmin: boolean;
  saved: SavedItem[];
  notifications: NotificationItem[];
  thread: Thread | null;
  messages: Message[];
  unreadNotifications: number;
  unreadMessages: number;
  refreshProfile: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const Ctx = createContext<UserStoreValue | null>(null);

export function UserStoreProvider({ children }: { children: ReactNode }) {
  let fb: ReturnType<typeof getFirebase> = null;
  try {
    fb = getFirebase();
  } catch {
    fb = null;
  }

  const [authReady, setAuthReady] = useState(!fb);
  const [authedUser, setAuthedUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const welcomed = useRef<Set<string>>(new Set());

  /* ---------- Auth listener ----------
   * Bounded by a watchdog: if Firebase never resolves (offline, bad key,
   * blocked proxy) we stop waiting instead of hanging on a splash screen. */
  useEffect(() => {
    if (!fb) {
      setAuthReady(true);
      return;
    }
    let settled = false;
    const unsub = onAuthStateChanged(fb.auth, (user) => {
      settled = true;
      setAuthedUser(user);
      setAuthReady(true);
    });
    const watchdog = window.setTimeout(() => {
      if (!settled) setAuthReady(true);
    }, 4000);
    return () => {
      unsub();
      window.clearTimeout(watchdog);
    };
  }, [fb]);

  /* ---------- Profile + role ---------- */
  const refreshProfile = useCallback(async () => {
    if (!authedUser) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    setProfileLoading(true);
    try {
      const [p, claim] = await Promise.all([fetchProfile(authedUser.uid), isAdminUser(authedUser)]);
      setProfile(p);
      setIsAdmin(Boolean(p?.role === "admin" || claim));
    } finally {
      setProfileLoading(false);
    }
  }, [authedUser]);

  useEffect(() => {
    if (!authedUser) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    // Initial load
    void refreshProfile();
    // Live updates
    const unsub = subscribeProfile(authedUser.uid, (p) => {
      setProfile(p);
    });
    return unsub;
  }, [authedUser, refreshProfile]);

  /* ---------- Saved + notifications ---------- */
  useEffect(() => {
    if (!authedUser) {
      setSaved([]);
      setNotifications([]);
      return;
    }
    const unsubSaved = subscribeSaved(authedUser.uid, (items) => setSaved(items));
    const unsubNotif = subscribeNotifications(authedUser.uid, (items) => {
      setNotifications(items);
      // Welcome notification for first sign-in.
      if (items.length === 0 && !welcomed.current.has(authedUser.uid)) {
        welcomed.current.add(authedUser.uid);
        void sendWelcome(authedUser.uid, authedUser.displayName || authedUser.email?.split("@")[0] || "");
      }
    });
    return () => {
      unsubSaved();
      unsubNotif();
    };
  }, [authedUser]);

  /* ---------- Thread + messages ---------- */
  useEffect(() => {
    if (!authedUser) {
      setThread(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchProfile(authedUser.uid);
        if (!profile || cancelled) return;
        await getOrCreateUserThread(profile);
      } catch (err) {
        console.error("thread bootstrap", err);
      }
    })();
    const unsub = subscribeUserThread(authedUser.uid, (t, msgs) => {
      if (t) setThread(t);
      if (msgs.length) setMessages(msgs);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [authedUser]);

  const signOutUser = useCallback(async () => {
    if (!fb) return;
    await signOut(fb.auth);
  }, [fb]);

  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const unreadMessages = useMemo(() => {
    if (!thread) return 0;
    return thread.unreadByUser;
  }, [thread]);

  const value = useMemo<UserStoreValue>(
    () => ({
      authReady,
      authedUser,
      profile,
      profileLoading,
      isAdmin,
      saved,
      notifications,
      thread,
      messages,
      unreadNotifications,
      unreadMessages,
      refreshProfile,
      signOutUser,
    }),
    [
      authReady,
      authedUser,
      profile,
      profileLoading,
      isAdmin,
      saved,
      notifications,
      thread,
      messages,
      unreadNotifications,
      unreadMessages,
      refreshProfile,
      signOutUser,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserStore(): UserStoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUserStore must be used inside UserStoreProvider");
  return v;
}
