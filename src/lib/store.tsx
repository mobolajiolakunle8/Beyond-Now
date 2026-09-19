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
import {
  DEFAULT_CONTENT,
  cloneContent,
  mergeContent,
  type MediaItem,
  type SiteContent,
} from "@/lib/content";
import {
  ADMIN_EMAIL,
  ADMIN_NAME,
  authErrorMessage,
  getFirebase,
  isFirebaseConfigured,
} from "@/lib/firebase";
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
  type Meta,
  type SyncStatus,
} from "@/lib/sync";

/* -------------------------------------------------------------------------- */
/*                         Local cache (offline buffer)                        */
/* -------------------------------------------------------------------------- */

const K = {
  published: "bn.published.v1",
  draft: "bn.draft.v1",
  media: "bn.media.v1",
  meta: "bn.meta.v1",
  account: "bn.account.v1",
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    const quota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return {
      ok: false,
      error: quota
        ? "Browser storage is full. Delete some media library images and try again."
        : "Could not save to this browser's storage.",
    };
  }
}

export type Account = { email: string; name: string; uid?: string };
export type Toast = { id: string; tone: "success" | "error" | "info"; message: string };
export type { Meta, SyncStatus };

type StoreValue = {
  published: SiteContent;
  draft: SiteContent;
  media: MediaItem[];
  meta: Meta;
  account: Account | null;
  isAuthed: boolean;
  isDirty: boolean;
  /** Cloud readiness */
  cloudEnabled: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  ready: boolean;
  /** Mutate the working draft (local + debounced cloud). */
  updateDraft: (recipe: (draft: SiteContent) => SiteContent) => void;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  discardDraft: () => Promise<void>;
  resetEverything: () => Promise<void>;
  uploadMedia: (files: FileList | File[]) => Promise<MediaItem[]>;
  deleteMedia: (id: string) => Promise<void>;
  replaceMedia: (id: string, file: File) => Promise<void>;
  renameMedia: (id: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateAccount: (patch: { email?: string; name?: string }) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<boolean>;
  toasts: Toast[];
  notify: (tone: Toast["tone"], message: string) => void;
  dismissToast: (id: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY_META: Meta = { publishedAt: "", draftSavedAt: "" };

export function StoreProvider({ children }: { children: ReactNode }) {
  const cloudEnabled = isFirebaseConfigured();

  const [published, setPublished] = useState<SiteContent>(() =>
    mergeContent(DEFAULT_CONTENT, readLocal<unknown>(K.published, null)),
  );
  const [draft, setDraft] = useState<SiteContent>(() =>
    mergeContent(DEFAULT_CONTENT, readLocal<unknown>(K.draft, readLocal<unknown>(K.published, null))),
  );
  const [media, setMedia] = useState<MediaItem[]>(() => readLocal<MediaItem[]>(K.media, []));
  const [meta, setMeta] = useState<Meta>(() => readLocal<Meta>(K.meta, EMPTY_META));
  const [account, setAccount] = useState<Account | null>(() =>
    readLocal<Account | null>(K.account, cloudEnabled ? null : { email: ADMIN_EMAIL, name: ADMIN_NAME }),
  );
  const [isAuthed, setAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [contentReady, setContentReady] = useState(!cloudEnabled);
  /**
   * Hard ceiling on how long the UI may wait for Firebase before rendering
   * from the local cache. Without this a blocked/slow/hanging Firebase client
   * would leave the app on its splash screen forever.
   */
  const BOOT_TIMEOUT_MS = 4000;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudEnabled ? "connecting" : "local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, number>>({});
  const userRef = useRef<User | null>(null);
  const applyingRemote = useRef(false);
  const draftRef = useRef(draft);
  const publishedRef = useRef(published);
  const metaRef = useRef(meta);
  draftRef.current = draft;
  publishedRef.current = published;
  metaRef.current = meta;

  const notify = useCallback((tone: Toast["tone"], message: string) => {
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, tone, message }]);
    timers.current[id] = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, 4600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    window.clearTimeout(timers.current[id]);
  }, []);

  useEffect(() => () => Object.values(timers.current).forEach(window.clearTimeout), []);

  /* ---------- Boot watchdogs ----------
   * Firebase listeners resolve quickly on a healthy connection, but they can
   * hang indefinitely on a bad API key, an offline device or a corporate
   * proxy. We cap the wait so the interface always becomes usable. */
  useEffect(() => {
    if (!cloudEnabled) return;
    const t = window.setTimeout(() => {
      setAuthReady((prev) => {
        if (!prev) {
          setSyncStatus((s) => (s === "connecting" ? "offline" : s));
          setSyncError("Firebase did not respond in time. Showing cached content.");
        }
        return true;
      });
    }, BOOT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [cloudEnabled, BOOT_TIMEOUT_MS]);

  useEffect(() => {
    if (!cloudEnabled) return;
    const t = window.setTimeout(() => setContentReady(true), BOOT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [cloudEnabled, BOOT_TIMEOUT_MS]);

  /* ---------- Auth state (Firebase) ---------- */

  useEffect(() => {
    if (!cloudEnabled) {
      // Local-only mode keeps the previous session flag.
      try {
        setAuthed(sessionStorage.getItem("bn.session.v1") === "active");
      } catch {
        setAuthed(false);
      }
      setAuthReady(true);
      return;
    }

    let fb;
    try {
      fb = getFirebase();
    } catch {
      fb = null;
    }
    if (!fb) {
      setAuthReady(true);
      return;
    }

    const unsub = onAuthStateChanged(
      fb.auth,
      (user) => {
      userRef.current = user;
      if (user) {
        const next: Account = {
          email: user.email ?? ADMIN_EMAIL,
          name: user.displayName || ADMIN_NAME,
          uid: user.uid,
        };
        setAccount(next);
        writeLocal(K.account, next);
        setAuthed(true);
      } else {
        setAuthed(false);
      }
      setAuthReady(true);
    });
    return unsub;
  }, [cloudEnabled]);

  /* ---------- Real-time content + media sync ---------- */

  useEffect(() => {
    if (!cloudEnabled) {
      setContentReady(true);
      setSyncStatus("local");
      return;
    }

    let cancelled = false;
    setSyncStatus("connecting");

    // One-shot pull first so the public page paints quickly even before listeners attach.
    (async () => {
      try {
        // Never let a hung network request block the boot sequence.
        const withTimeout = <T,>(p: Promise<T>, ms: number) =>
          Promise.race([
            p,
            new Promise<T>((_, reject) =>
              window.setTimeout(() => reject(new Error("timeout")), ms),
            ),
          ]);
        const [site, library] = await Promise.all([
          withTimeout(pullSiteDocument(), BOOT_TIMEOUT_MS),
          withTimeout(pullMediaLibrary(), BOOT_TIMEOUT_MS),
        ]);
        if (cancelled) return;
        if (site) {
          applyingRemote.current = true;
          const pub = mergeContent(DEFAULT_CONTENT, site.published);
          const dr = mergeContent(DEFAULT_CONTENT, site.draft);
          setPublished(pub);
          setDraft(dr);
          setMeta(site.meta ?? EMPTY_META);
          writeLocal(K.published, pub);
          writeLocal(K.draft, dr);
          writeLocal(K.meta, site.meta ?? EMPTY_META);
          applyingRemote.current = false;
        }
        if (library.length) {
          setMedia(library);
          // Cache a lightweight index (URLs only — no base64) for offline boot.
          writeLocal(
            K.media,
            library.map(({ id, name, dataUrl, width, height, size, type, uploadedAt }) => ({
              id,
              name,
              dataUrl,
              width,
              height,
              size,
              type,
              uploadedAt,
            })),
          );
        }
        setSyncStatus("synced");
        setSyncError(null);
      } catch (err) {
        if (!cancelled) {
          setSyncStatus("offline");
          setSyncError(
            err instanceof Error && err.message === "timeout"
              ? "Firebase took too long. Showing cached content."
              : err instanceof Error
                ? err.message
                : "Could not reach Firebase.",
          );
        }
      } finally {
        if (!cancelled) setContentReady(true);
      }
    })();

    const unsubSite = subscribeSiteDocument(
      (remote) => {
        if (!remote) return;
        // Ignore echoes of our own writes by comparing timestamps lightly.
        applyingRemote.current = true;
        const pub = mergeContent(DEFAULT_CONTENT, remote.published);
        const dr = mergeContent(DEFAULT_CONTENT, remote.draft);
        setPublished(pub);
        setDraft(dr);
        setMeta(remote.meta ?? EMPTY_META);
        writeLocal(K.published, pub);
        writeLocal(K.draft, dr);
        writeLocal(K.meta, remote.meta ?? EMPTY_META);
        setSyncStatus("synced");
        setSyncError(null);
        // Release the flag on the next tick so local updates are not suppressed.
        window.setTimeout(() => {
          applyingRemote.current = false;
        }, 0);
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

    // Online / offline indicators
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
  }, [cloudEnabled]);

  /* ---------- Cross-tab local sync (preview iframe, multi-tab) ---------- */

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === K.published)
        setPublished(mergeContent(DEFAULT_CONTENT, readLocal<unknown>(K.published, null)));
      if (e.key === K.draft) setDraft(mergeContent(DEFAULT_CONTENT, readLocal<unknown>(K.draft, null)));
      if (e.key === K.media) setMedia(readLocal<MediaItem[]>(K.media, []));
      if (e.key === K.meta) setMeta(readLocal<Meta>(K.meta, EMPTY_META));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(published),
    [draft, published],
  );

  /* ---------- Draft mutations ---------- */

  const draftWriteTimer = useRef<number>(0);
  const cloudDraftTimer = useRef<number>(0);

  const pushCloud = useCallback(
    async (nextDraft: SiteContent, nextPublished: SiteContent, nextMeta: Meta) => {
      if (!cloudEnabled || !isAuthed) return;
      try {
        await pushSiteDocument({
          draft: nextDraft,
          published: nextPublished,
          meta: nextMeta,
          updatedBy: userRef.current?.uid,
        });
        setSyncStatus("synced");
        setSyncError(null);
      } catch (err) {
        setSyncStatus("error");
        const msg = err instanceof Error ? err.message : "Cloud save failed.";
        setSyncError(msg);
        notify("error", msg);
      }
    },
    [cloudEnabled, isAuthed, notify],
  );

  const updateDraft = useCallback(
    (recipe: (d: SiteContent) => SiteContent) => {
      if (applyingRemote.current) {
        // Still allow the update — remote flag only prevents echo loops on setState from listeners.
      }
      setDraft((prev) => {
        const next = recipe(prev);
        window.clearTimeout(draftWriteTimer.current);
        draftWriteTimer.current = window.setTimeout(() => writeLocal(K.draft, next), 400);

        // Debounced cloud write so keystrokes don't spam Firestore.
        if (cloudEnabled && isAuthed) {
          window.clearTimeout(cloudDraftTimer.current);
          cloudDraftTimer.current = window.setTimeout(() => {
            const stamp = { ...metaRef.current, draftSavedAt: new Date().toISOString() };
            setMeta(stamp);
            writeLocal(K.meta, stamp);
            void pushCloud(next, publishedRef.current, stamp);
          }, 1200);
        }
        return next;
      });
    },
    [cloudEnabled, isAuthed, pushCloud],
  );

  const saveDraft = useCallback(async () => {
    const current = draftRef.current;
    const res = writeLocal(K.draft, current);
    if (!res.ok) {
      notify("error", res.error);
      return;
    }
    const nextMeta = { ...metaRef.current, draftSavedAt: new Date().toISOString() };
    setMeta(nextMeta);
    writeLocal(K.meta, nextMeta);
    if (cloudEnabled && isAuthed) {
      await pushCloud(current, publishedRef.current, nextMeta);
      notify("success", "Draft saved and synced across all devices.");
    } else {
      notify("success", "Draft saved. The public website is unchanged.");
    }
  }, [cloudEnabled, isAuthed, notify, pushCloud]);

  const publish = useCallback(async () => {
    const snapshot = cloneContent(draftRef.current);
    const res = writeLocal(K.published, snapshot);
    if (!res.ok) {
      notify("error", res.error);
      return;
    }
    setPublished(snapshot);
    setDraft(snapshot);
    writeLocal(K.draft, snapshot);
    const stamp = new Date().toISOString();
    const nextMeta = { publishedAt: stamp, draftSavedAt: stamp };
    setMeta(nextMeta);
    writeLocal(K.meta, nextMeta);
    if (cloudEnabled && isAuthed) {
      await pushCloud(snapshot, snapshot, nextMeta);
      notify("success", "Published. Live on every device and browser.");
    } else {
      notify("success", "Published. Your changes are now live on the public website.");
    }
  }, [cloudEnabled, isAuthed, notify, pushCloud]);

  const discardDraft = useCallback(async () => {
    const snapshot = cloneContent(publishedRef.current);
    setDraft(snapshot);
    writeLocal(K.draft, snapshot);
    if (cloudEnabled && isAuthed) {
      await pushCloud(snapshot, publishedRef.current, metaRef.current);
    }
    notify("info", "Draft discarded. Editor reset to the published website.");
  }, [cloudEnabled, isAuthed, notify, pushCloud]);

  const resetEverything = useCallback(async () => {
    const fresh = cloneContent(DEFAULT_CONTENT);
    setDraft(fresh);
    setPublished(fresh);
    writeLocal(K.draft, fresh);
    writeLocal(K.published, fresh);
    const stamp = new Date().toISOString();
    const nextMeta = { publishedAt: stamp, draftSavedAt: stamp };
    setMeta(nextMeta);
    writeLocal(K.meta, nextMeta);
    if (cloudEnabled && isAuthed) {
      await pushCloud(fresh, fresh, nextMeta);
    }
    notify("info", "All website content restored to the original defaults.");
  }, [cloudEnabled, isAuthed, notify, pushCloud]);

  /* ---------- Media ---------- */

  const uploadMedia = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return [];
      const added: MediaItem[] = [];

      for (const file of list) {
        try {
          if (cloudEnabled && isAuthed) {
            added.push(await uploadMediaToCloud(file));
          } else {
            added.push(await processImageFile(file));
          }
        } catch (err) {
          notify("error", err instanceof Error ? err.message : "Upload failed.");
        }
      }

      if (!added.length) return [];

      if (!(cloudEnabled && isAuthed)) {
        // Local mode: keep blobs in localStorage.
        const next = [...added, ...media];
        const res = writeLocal(K.media, next);
        if (!res.ok) {
          notify("error", res.error);
          return [];
        }
        setMedia(next);
      }
      // Cloud mode: the media snapshot listener updates state automatically.
      notify("success", `${added.length} image${added.length === 1 ? "" : "s"} uploaded.`);
      return added;
    },
    [cloudEnabled, isAuthed, media, notify],
  );

  const deleteMedia = useCallback(
    async (id: string) => {
      const target = media.find((m) => m.id === id);
      if (!target) return;
      try {
        if (cloudEnabled && isAuthed) {
          await deleteMediaFromCloud(target);
        } else {
          const next = media.filter((m) => m.id !== id);
          const res = writeLocal(K.media, next);
          if (!res.ok) {
            notify("error", res.error);
            return;
          }
          setMedia(next);
        }
        notify("info", `"${target.name}" deleted from the media library.`);
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Delete failed.");
      }
    },
    [cloudEnabled, isAuthed, media, notify],
  );

  const replaceMedia = useCallback(
    async (id: string, file: File) => {
      try {
        if (cloudEnabled && isAuthed) {
          await replaceMediaInCloud(id, file);
        } else {
          const fresh = await processImageFile(file);
          const next = media.map((m) => (m.id === id ? { ...fresh, id, name: fresh.name } : m));
          const res = writeLocal(K.media, next);
          if (!res.ok) {
            notify("error", res.error);
            return;
          }
          setMedia(next);
        }
        notify("success", "Image replaced everywhere it was used.");
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Replace failed.");
      }
    },
    [cloudEnabled, isAuthed, media, notify],
  );

  const renameMedia = useCallback(
    async (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) {
        notify("error", "File name cannot be empty.");
        return;
      }
      try {
        if (cloudEnabled && isAuthed) {
          await renameMediaInCloud(id, clean);
        } else {
          const next = media.map((m) => (m.id === id ? { ...m, name: clean } : m));
          writeLocal(K.media, next);
          setMedia(next);
        }
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Rename failed.");
      }
    },
    [cloudEnabled, isAuthed, media, notify],
  );

  /* ---------- Auth actions ---------- */

  const login = useCallback(
    async (email: string, password: string) => {
      if (!cloudEnabled) {
        // Local fallback (dev without Firebase): accept the seeded admin email with any 8+ char password.
        const ok =
          email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password.length >= 8;
        if (ok) {
          setAuthed(true);
          try {
            sessionStorage.setItem("bn.session.v1", "active");
          } catch {
            /* ignore */
          }
          setAccount({ email: ADMIN_EMAIL, name: ADMIN_NAME });
          notify("success", "Signed in (local mode).");
          return { ok: true };
        }
        return { ok: false, error: "Those details do not match an administrator account." };
      }

      const fb = getFirebase();
      if (!fb) return { ok: false, error: "Firebase is not configured." };

      try {
        await signInWithEmailAndPassword(fb.auth, email.trim(), password);
        notify("success", "Signed in. Welcome back.");
        return { ok: true };
      } catch (err) {
        return { ok: false, error: authErrorMessage(err) };
      }
    },
    [cloudEnabled, notify],
  );

  const logout = useCallback(async () => {
    if (cloudEnabled) {
      const fb = getFirebase();
      try {
        if (fb) await signOut(fb.auth);
      } catch {
        /* ignore */
      }
    }
    setAuthed(false);
    try {
      sessionStorage.removeItem("bn.session.v1");
    } catch {
      /* ignore */
    }
    window.location.hash = "#/admin";
    notify("info", "You have been signed out.");
  }, [cloudEnabled, notify]);

  const updateAccount = useCallback(
    async (patch: { email?: string; name?: string }) => {
      if (!account) return;
      const next = { ...account, ...patch };
      setAccount(next);
      writeLocal(K.account, next);

      if (cloudEnabled && userRef.current && patch.name) {
        try {
          await updateProfile(userRef.current, { displayName: patch.name });
        } catch (err) {
          notify("error", authErrorMessage(err));
          return;
        }
      }
      // Email changes require a verified flow — we keep the display copy local and warn.
      if (patch.email && cloudEnabled && patch.email !== account.email) {
        notify(
          "info",
          "Display email updated locally. To change the Firebase sign-in email, use the Firebase console.",
        );
      } else {
        notify("success", "Administrator profile updated.");
      }
    },
    [account, cloudEnabled, notify],
  );

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!cloudEnabled) {
        notify("info", "Password changes require Firebase Authentication.");
        return false;
      }
      const user = userRef.current;
      if (!user?.email) {
        notify("error", "No signed-in user.");
        return false;
      }
      try {
        const cred = EmailAuthProvider.credential(user.email, current);
        await reauthenticateWithCredential(user, cred);
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

  const ready = authReady && contentReady;

  const value = useMemo<StoreValue>(
    () => ({
      published,
      draft,
      media,
      meta,
      account,
      isAuthed,
      isDirty,
      cloudEnabled,
      syncStatus,
      syncError,
      ready,
      updateDraft,
      saveDraft,
      publish,
      discardDraft,
      resetEverything,
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
      published,
      draft,
      media,
      meta,
      account,
      isAuthed,
      isDirty,
      cloudEnabled,
      syncStatus,
      syncError,
      ready,
      updateDraft,
      saveDraft,
      publish,
      discardDraft,
      resetEverything,
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
      const num = settings.whatsapp.replace(/[^\d]/g, "");
      const base = `https://wa.me/${num}`;
      return message ? `${base}?text=${encodeURIComponent(message)}` : base;
    },
    [settings.whatsapp],
  );
}
