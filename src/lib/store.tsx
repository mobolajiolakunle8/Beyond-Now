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
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { DEFAULT_CONTENT, cloneContent, mergeContent, type MediaItem, type SiteContent } from "@/lib/content";
import { ADMIN_EMAIL, ADMIN_NAME, authErrorMessage, getFirebase, isFirebaseConfigured } from "@/lib/firebase";
import { processImageFile } from "@/lib/media";
import {
  deleteMediaFromCloud,
  pullMediaLibrary,
  pullSiteDocument,
  pushSiteDocument,
  renameMediaInCloud,
  replaceMediaInCloud,
  subscribeMediaLibrary,
  subscribeSiteDocument,
  uploadMediaToCloud,
  type SyncStatus,
} from "@/lib/sync";
import { resolveIsAdmin } from "@/lib/users";

export type { SyncStatus };
export type Account = { email: string; name: string; uid?: string };
export type Toast = { id: string; tone: "success" | "error" | "info"; message: string };

/* -------------------------------------------------------------------------- */
/*                     Local cache (fast paint + offline)                     */
/* -------------------------------------------------------------------------- */

const K = {
  content: "bn.content.v2",
  media: "bn.media.v2",
  updatedAt: "bn.updatedAt.v2",
  account: "bn.account.v2",
  session: "bn.session.v2",
};

/** How long the dashboards may wait for Firebase before falling back to cache. */
const BOOT_TIMEOUT_MS = 4000;
/** Keystrokes are batched into one cloud write. */
const CLOUD_WRITE_DEBOUNCE_MS = 900;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): string | null {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return null;
  } catch (err) {
    const quota = err instanceof DOMException && err.name === "QuotaExceededError";
    return quota ? "Browser storage is full. Delete some media library images and try again." : "Could not save to this browser's storage.";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/* -------------------------------------------------------------------------- */
/*                                   Store                                    */
/* -------------------------------------------------------------------------- */

type StoreValue = {
  /** The live website content. Edits are published automatically. */
  content: SiteContent;
  media: MediaItem[];
  /** ISO timestamp of the last successful save. */
  updatedAt: string;
  /** True while an edit is waiting to be written to the cloud. */
  saving: boolean;
  account: Account | null;
  isAuthed: boolean;
  isAdmin: boolean;
  cloudEnabled: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  ready: boolean;
  updateContent: (recipe: (content: SiteContent) => SiteContent) => void;
  resetContent: () => Promise<void>;
  uploadMedia: (files: FileList | File[]) => Promise<MediaItem[]>;
  deleteMedia: (id: string) => Promise<void>;
  replaceMedia: (id: string, file: File) => Promise<void>;
  renameMedia: (id: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateAccount: (patch: { name?: string }) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<boolean>;
  toasts: Toast[];
  notify: (tone: Toast["tone"], message: string) => void;
  dismissToast: (id: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const cloudEnabled = isFirebaseConfigured();

  const [content, setContent] = useState<SiteContent>(() => mergeContent(DEFAULT_CONTENT, readLocal<unknown>(K.content, null)));
  const [media, setMedia] = useState<MediaItem[]>(() => readLocal<MediaItem[]>(K.media, []));
  const [updatedAt, setUpdatedAt] = useState<string>(() => readLocal<string>(K.updatedAt, ""));
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<Account | null>(() =>
    readLocal<Account | null>(K.account, cloudEnabled ? null : { email: ADMIN_EMAIL, name: ADMIN_NAME }),
  );
  const [isAuthed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [contentReady, setContentReady] = useState(!cloudEnabled);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudEnabled ? "connecting" : "local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toastTimers = useRef<Record<string, number>>({});
  const userRef = useRef<User | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;
  const isAdminRef = useRef(false);
  isAdminRef.current = isAdmin;
  const cloudWriteTimer = useRef<number>(0);
  /** Set while a cloud snapshot is being applied so it is not echoed back. */
  const applyingRemote = useRef(false);

  /* ---------- toasts ---------- */

  const notify = useCallback((tone: Toast["tone"], message: string) => {
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, tone, message }]);
    toastTimers.current[id] = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete toastTimers.current[id];
    }, 4600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    window.clearTimeout(toastTimers.current[id]);
  }, []);

  useEffect(() => () => Object.values(toastTimers.current).forEach(window.clearTimeout), []);

  /* ---------- boot watchdogs ---------- */

  useEffect(() => {
    if (!cloudEnabled) return;
    const t = window.setTimeout(() => {
      setAuthReady(true);
      setContentReady(true);
      setSyncStatus((s) => (s === "connecting" ? "offline" : s));
    }, BOOT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [cloudEnabled]);

  /* ---------- auth ---------- */

  useEffect(() => {
    if (!cloudEnabled) {
      try {
        const local = sessionStorage.getItem(K.session) === "active";
        setAuthed(local);
        setIsAdmin(local);
      } catch {
        setAuthed(false);
      }
      setAuthReady(true);
      return;
    }
    const fb = getFirebase();
    if (!fb) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(fb.auth, (user) => {
      userRef.current = user;
      if (!user) {
        setAuthed(false);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }
      const next: Account = { email: user.email ?? "", name: user.displayName || user.email?.split("@")[0] || "Administrator", uid: user.uid };
      setAccount(next);
      writeLocal(K.account, next);
      setAuthed(true);
      void resolveIsAdmin(user)
        .then((admin) => setIsAdmin(admin))
        .finally(() => setAuthReady(true));
    });
  }, [cloudEnabled]);

  /* ---------- content + media sync ---------- */

  const applyRemote = useCallback((published: unknown, stamp: string | undefined) => {
    applyingRemote.current = true;
    const next = mergeContent(DEFAULT_CONTENT, published);
    setContent(next);
    writeLocal(K.content, next);
    if (stamp) {
      setUpdatedAt(stamp);
      writeLocal(K.updatedAt, stamp);
    }
    window.setTimeout(() => {
      applyingRemote.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (!cloudEnabled) {
      setContentReady(true);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const [site, library] = await Promise.all([
          withTimeout(pullSiteDocument(), BOOT_TIMEOUT_MS),
          withTimeout(pullMediaLibrary(), BOOT_TIMEOUT_MS),
        ]);
        if (cancelled) return;
        if (site) applyRemote(site.published, site.updatedAt);
        if (library.length) {
          setMedia(library);
          writeLocal(K.media, library);
        }
        setSyncStatus("synced");
        setSyncError(null);
      } catch (err) {
        if (cancelled) return;
        setSyncStatus("offline");
        setSyncError(err instanceof Error && err.message === "timeout" ? "Firebase took too long. Showing cached content." : err instanceof Error ? err.message : "Could not reach Firebase.");
      } finally {
        if (!cancelled) setContentReady(true);
      }
    })();

    const unsubSite = subscribeSiteDocument(
      (remote) => {
        if (!remote) return;
        // Skip echoes of our own pending write; the debounced push will land shortly.
        if (cloudWriteTimer.current) return;
        applyRemote(remote.published, remote.updatedAt);
        setSyncStatus("synced");
        setSyncError(null);
      },
      (message) => {
        setSyncStatus("error");
        setSyncError(message);
      },
    );
    const unsubMedia = subscribeMediaLibrary(
      (items) => {
        setMedia(items);
        writeLocal(K.media, items);
      },
      (message) => {
        setSyncStatus("error");
        setSyncError(message);
      },
    );

    const goOnline = () => setSyncStatus((s) => (s === "offline" ? "synced" : s));
    const goOffline = () => setSyncStatus("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      cancelled = true;
      unsubSite();
      unsubMedia();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [cloudEnabled, applyRemote]);

  // Keep other tabs of the same browser in sync (local mode and cache).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === K.content) setContent(mergeContent(DEFAULT_CONTENT, readLocal<unknown>(K.content, null)));
      if (e.key === K.media) setMedia(readLocal<MediaItem[]>(K.media, []));
      if (e.key === K.updatedAt) setUpdatedAt(readLocal<string>(K.updatedAt, ""));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---------- auto-publish ---------- */

  const flushToCloud = useCallback(async () => {
    cloudWriteTimer.current = 0;
    const snapshot = contentRef.current;
    if (!cloudEnabled || !isAdminRef.current) {
      const stamp = new Date().toISOString();
      setUpdatedAt(stamp);
      writeLocal(K.updatedAt, stamp);
      setSaving(false);
      return;
    }
    try {
      const stamp = await pushSiteDocument(snapshot, userRef.current?.uid ?? "admin");
      setUpdatedAt(stamp);
      writeLocal(K.updatedAt, stamp);
      setSyncStatus("synced");
      setSyncError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cloud save failed.";
      setSyncStatus("error");
      setSyncError(msg);
      notify("error", msg);
    } finally {
      setSaving(false);
    }
  }, [cloudEnabled, notify]);

  const updateContent = useCallback(
    (recipe: (c: SiteContent) => SiteContent) => {
      setContent((prev) => {
        const next = recipe(prev);
        contentRef.current = next;
        const err = writeLocal(K.content, next);
        if (err) notify("error", err);
        return next;
      });
      setSaving(true);
      window.clearTimeout(cloudWriteTimer.current);
      cloudWriteTimer.current = window.setTimeout(() => void flushToCloud(), CLOUD_WRITE_DEBOUNCE_MS);
    },
    [flushToCloud, notify],
  );

  // Flush any pending edit if the admin closes the tab.
  useEffect(() => {
    const onHide = () => {
      if (cloudWriteTimer.current) {
        window.clearTimeout(cloudWriteTimer.current);
        void flushToCloud();
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flushToCloud]);

  const resetContent = useCallback(async () => {
    updateContent(() => cloneContent(DEFAULT_CONTENT));
    notify("info", "Website content restored to the original defaults.");
  }, [updateContent, notify]);

  /* ---------- media ---------- */

  const cloudMedia = cloudEnabled && isAdmin;

  const uploadMedia = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return [];
      const added: MediaItem[] = [];
      for (const file of list) {
        try {
          added.push(cloudMedia ? await uploadMediaToCloud(file) : await processImageFile(file));
        } catch (err) {
          notify("error", err instanceof Error ? err.message : "Upload failed.");
        }
      }
      if (!added.length) return [];
      if (!cloudMedia) {
        const next = [...added, ...media];
        const err = writeLocal(K.media, next);
        if (err) {
          notify("error", err);
          return [];
        }
        setMedia(next);
      }
      notify("success", `${added.length} image${added.length === 1 ? "" : "s"} uploaded.`);
      return added;
    },
    [cloudMedia, media, notify],
  );

  const deleteMedia = useCallback(
    async (id: string) => {
      const target = media.find((m) => m.id === id);
      if (!target) return;
      try {
        if (cloudMedia) await deleteMediaFromCloud(target);
        else {
          const next = media.filter((m) => m.id !== id);
          writeLocal(K.media, next);
          setMedia(next);
        }
        notify("info", `"${target.name}" deleted from the media library.`);
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Delete failed.");
      }
    },
    [cloudMedia, media, notify],
  );

  const replaceMedia = useCallback(
    async (id: string, file: File) => {
      try {
        if (cloudMedia) await replaceMediaInCloud(id, file);
        else {
          const fresh = await processImageFile(file);
          const next = media.map((m) => (m.id === id ? { ...fresh, id } : m));
          writeLocal(K.media, next);
          setMedia(next);
        }
        notify("success", "Image replaced everywhere it was used.");
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Replace failed.");
      }
    },
    [cloudMedia, media, notify],
  );

  const renameMedia = useCallback(
    async (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) return notify("error", "File name cannot be empty.");
      try {
        if (cloudMedia) await renameMediaInCloud(id, clean);
        else {
          const next = media.map((m) => (m.id === id ? { ...m, name: clean } : m));
          writeLocal(K.media, next);
          setMedia(next);
        }
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Rename failed.");
      }
    },
    [cloudMedia, media, notify],
  );

  /* ---------- admin account ---------- */

  const login = useCallback(
    async (email: string, password: string) => {
      if (!cloudEnabled) {
        const ok = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password.length >= 8;
        if (!ok) return { ok: false, error: "Those details do not match an administrator account." };
        setAuthed(true);
        setIsAdmin(true);
        setAccount({ email: ADMIN_EMAIL, name: ADMIN_NAME });
        try {
          sessionStorage.setItem(K.session, "active");
        } catch {
          /* ignore */
        }
        notify("success", "Signed in (local mode).");
        return { ok: true };
      }
      const fb = getFirebase();
      if (!fb) return { ok: false, error: "Firebase is not configured." };
      try {
        await signInWithEmailAndPassword(fb.auth, email.trim(), password);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: authErrorMessage(err) };
      }
    },
    [cloudEnabled, notify],
  );

  const logout = useCallback(async () => {
    const fb = getFirebase();
    if (fb) await signOut(fb.auth).catch(() => undefined);
    setAuthed(false);
    setIsAdmin(false);
    try {
      sessionStorage.removeItem(K.session);
    } catch {
      /* ignore */
    }
    window.location.hash = "#/admin";
    notify("info", "You have been signed out.");
  }, [notify]);

  const updateAccount = useCallback(
    async (patch: { name?: string }) => {
      if (!account) return;
      const next = { ...account, ...patch };
      setAccount(next);
      writeLocal(K.account, next);
      if (userRef.current && patch.name) {
        try {
          await updateProfile(userRef.current, { displayName: patch.name });
        } catch (err) {
          return notify("error", authErrorMessage(err));
        }
      }
      notify("success", "Administrator profile updated.");
    },
    [account, notify],
  );

  const changePassword = useCallback(
    async (current: string, next: string) => {
      const user = userRef.current;
      if (!cloudEnabled || !user?.email) {
        notify("info", "Password changes require Firebase Authentication.");
        return false;
      }
      try {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
        await updatePassword(user, next);
        notify("success", "Password changed successfully.");
        return true;
      } catch (err) {
        notify("error", authErrorMessage(err));
        return false;
      }
    },
    [cloudEnabled, notify],
  );

  const value = useMemo<StoreValue>(
    () => ({
      content,
      media,
      updatedAt,
      saving,
      account,
      isAuthed,
      isAdmin,
      cloudEnabled,
      syncStatus,
      syncError,
      ready: authReady && contentReady,
      updateContent,
      resetContent,
      uploadMedia,
      deleteMedia,
      replaceMedia,
      renameMedia,
      login,
      logout,
      updateAccount,
      changePassword,
      toasts,
      notify,
      dismissToast,
    }),
    [
      content, media, updatedAt, saving, account, isAuthed, isAdmin, cloudEnabled, syncStatus, syncError,
      authReady, contentReady, updateContent, resetContent, uploadMedia, deleteMedia, replaceMedia,
      renameMedia, login, logout, updateAccount, changePassword, toasts, notify, dismissToast,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ---------- content consumed by the public landing page ---------- */

const ContentContext = createContext<SiteContent>(DEFAULT_CONTENT);

export function ContentProvider({ value, children }: { value: SiteContent; children: ReactNode }) {
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): SiteContent {
  return useContext(ContentContext);
}

/** WhatsApp deep link built from the currently active settings. */
export function useWa() {
  const { settings } = useContent();
  return useCallback(
    (message?: string) => {
      const base = `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`;
      return message ? `${base}?text=${encodeURIComponent(message)}` : base;
    },
    [settings.whatsapp],
  );
}
