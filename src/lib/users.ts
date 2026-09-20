import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as fbUpdatePassword,
  updateProfile as fbUpdateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";
import { get, onValue, push, ref, remove, set, update, type Unsubscribe } from "firebase/database";
import { deleteObject, getDownloadURL, ref as storageRef } from "firebase/storage";
import { ADMIN_EMAIL, authErrorMessage, databaseErrorMessage, getFirebase } from "@/lib/firebase";
import { ICON_SOURCE_BYTES, processImageFile, uploadResumable, withTimeout, type UploadHooks } from "@/lib/media";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended";

export type UserPreferences = {
  notifyMessages: boolean;
  notifyResources: boolean;
};

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  bio: string;
  avatarUrl: string;
  preferences: UserPreferences;
  activity: { saved: number; messages: number; notifications: number };
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
};

export type SavedItem = {
  id: string;
  userId: string;
  ref: string;
  title: string;
  description: string;
  savedAt: number;
};

export type NotificationItem = {
  id: string;
  userId: string;
  kind: "message" | "system" | "resource";
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: number;
};

export type AdminRecord = {
  uid: string;
  email: string;
  grantedBy: string;
  grantedAt: number;
};

const noop: Unsubscribe = () => undefined;

function getRtdb() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return fb.rtdb;
}

export function buildProfile(uid: string, email: string, name: string): UserProfile {
  const now = Date.now();
  return {
    uid,
    email: email.toLowerCase(),
    name,
    role: "user",
    status: "active",
    bio: "",
    avatarUrl: "",
    preferences: { notifyMessages: true, notifyResources: false },
    activity: { saved: 0, messages: 0, notifications: 0 },
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  };
}

/**
 * Display-side normalization for user records read from the database.
 *
 * Records can be schema-incomplete: older accounts predate fields like
 * `activity`, console-edited nodes can miss keys, and denied reads can leave
 * partial objects behind. Reading `activity.saved` on such a record used to
 * crash the whole admin Users page, so every consumer gets a fully-shaped
 * profile here. This is render-only and is NEVER written back — the server
 * rules remain the source of truth for roles and status.
 */
export function normalizeProfile(raw: unknown): UserProfile {
  const r = (raw ?? {}) as Partial<UserProfile> & Record<string, unknown>;
  const activity = (r.activity ?? {}) as Partial<UserProfile["activity"]>;
  const preferences = (r.preferences ?? {}) as Partial<UserPreferences>;
  return {
    uid: typeof r.uid === "string" ? r.uid : "",
    email: typeof r.email === "string" ? r.email : "",
    name: typeof r.name === "string" ? r.name : "",
    role: r.role === "admin" ? "admin" : "user",
    status: r.status === "suspended" ? "suspended" : "active",
    bio: typeof r.bio === "string" ? r.bio : "",
    avatarUrl: typeof r.avatarUrl === "string" ? r.avatarUrl : "",
    preferences: {
      notifyMessages: preferences.notifyMessages ?? true,
      notifyResources: preferences.notifyResources ?? false,
    },
    activity: {
      saved: Number(activity.saved) || 0,
      messages: Number(activity.messages) || 0,
      notifications: Number(activity.notifications) || 0,
    },
    createdAt: Number(r.createdAt) || 0,
    updatedAt: Number(r.updatedAt) || 0,
    lastSeenAt: Number(r.lastSeenAt) || 0,
  };
}

function displayNameFor(user: User): string {
  return user.displayName?.trim() || user.email?.split("@")[0] || "Member";
}

/* -------------------------------------------------------------------------- */
/*                                Auth flows                                  */
/* -------------------------------------------------------------------------- */

export async function signUp(input: { email: string; password: string; name: string }): Promise<UserCredential> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  try {
    const cred = await createUserWithEmailAndPassword(fb.auth, input.email.trim(), input.password);
    const name = input.name.trim() || displayNameFor(cred.user);
    if (input.name.trim()) await fbUpdateProfile(cred.user, { displayName: name });
    const profile = buildProfile(cred.user.uid, cred.user.email ?? input.email, name);
    await set(ref(fb.rtdb, `users/${cred.user.uid}`), profile).catch(() => undefined);
    // Delivered immediately after account creation, not deferred to a listener.
    await sendWelcome(cred.user.uid, name).catch(() => undefined);
    return cred;
  } catch (err) {
    throw new Error(authErrorMessage(err));
  }
}

export async function signIn(input: { email: string; password: string }): Promise<UserCredential> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  try {
    return await signInWithEmailAndPassword(fb.auth, input.email.trim(), input.password);
  } catch (err) {
    throw new Error(authErrorMessage(err));
  }
}

export async function sendReset(email: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  try {
    await sendPasswordResetEmail(fb.auth, email.trim());
  } catch (err) {
    throw new Error(authErrorMessage(err));
  }
}

export async function signOutCurrent(): Promise<void> {
  const fb = getFirebase();
  if (fb) await signOut(fb.auth);
}

export async function resolveIsAdmin(user: User): Promise<boolean> {
  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  try {
    const token = await user.getIdTokenResult();
    if (token.claims.isAdmin === true) return true;
  } catch {
    // offline
  }
  try {
    const fb = getFirebase();
    if (fb) {
      const snap = await get(ref(fb.rtdb, `admins/${user.uid}`));
      if (snap.exists()) return true;
    }
  } catch {
    // fallback
  }
  return false;
}

export async function writeAdminAllowList(uid: string, email: string, grantedBy = "bootstrap"): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  const record: AdminRecord = { uid, email, grantedBy, grantedAt: Date.now() };
  await set(ref(fb.rtdb, `admins/${uid}`), record).catch(() => undefined);
}

export async function ensureUserRecords(user: User, isAdmin: boolean): Promise<UserProfile> {
  const fb = getFirebase();
  const db = getRtdb();
  const userNode = ref(db, `users/${user.uid}`);
  let profile: UserProfile;

  try {
    const snap = await get(userNode);
    if (!snap.exists()) {
      profile = buildProfile(user.uid, user.email ?? "", displayNameFor(user));
      if (isAdmin) profile.role = "admin";
      await set(userNode, profile).catch(() => undefined);
    } else {
      profile = normalizeProfile(snap.val());
      const patch: Partial<UserProfile> = { lastSeenAt: Date.now() };
      if (isAdmin && profile.role !== "admin") patch.role = "admin";
      await update(userNode, patch).catch(() => undefined);
      profile = { ...profile, ...patch };
    }
  } catch {
    profile = buildProfile(user.uid, user.email ?? "", displayNameFor(user));
    if (isAdmin) profile.role = "admin";
  }

  if (isAdmin && fb) {
    await writeAdminAllowList(user.uid, user.email ?? "").catch(() => undefined);
  }

  return profile;
}

/* -------------------------------------------------------------------------- */
/*                                  Profile                                   */
/* -------------------------------------------------------------------------- */

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const fb = getFirebase();
  if (!fb) return null;
  try {
    const snap = await get(ref(fb.rtdb, `users/${uid}`));
    return snap.exists() ? normalizeProfile(snap.val()) : null;
  } catch {
    return null;
  }
}

export function subscribeProfile(
  uid: string,
  onChange: (p: UserProfile | null) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    return onValue(
      ref(fb.rtdb, `users/${uid}`),
      (snap) => {
        if (snap.exists()) {
          onChange(normalizeProfile(snap.val()));
        } else {
          onChange(null);
        }
      },
      (err) => {
        onError?.(databaseErrorMessage(err));
      },
    );
  } catch (err) {
    onError?.(databaseErrorMessage(err));
    return noop;
  }
}

export async function updateOwnProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, "name" | "bio" | "avatarUrl" | "preferences">>,
): Promise<void> {
  const db = getRtdb();
  const fb = getFirebase();
  await update(ref(db, `users/${uid}`), { ...patch, updatedAt: Date.now() });
  if (patch.name !== undefined && fb?.auth.currentUser) {
    await fbUpdateProfile(fb.auth.currentUser, { displayName: patch.name }).catch(() => undefined);
  }
}

export async function changeOwnPassword(current: string, next: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const user = fb.auth.currentUser;
  if (!user?.email) throw new Error("No signed-in user.");
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
    await fbUpdatePassword(user, next);
  } catch (err) {
    throw new Error(authErrorMessage(err));
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Avatar                                    */
/* -------------------------------------------------------------------------- */

const AVATAR_EXTS = ["webp", "png", "jpg", "jpeg"] as const;

export async function uploadAvatar(uid: string, file: File, hooks: UploadHooks = {}): Promise<string> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) throw new Error("Profile picture must be JPG, PNG or WebP.");
  if (file.size > ICON_SOURCE_BYTES) throw new Error("Profile picture must be under 5 MB.");

  hooks.onProgress?.({ loaded: 10, total: 100, percent: 10 });
  const processed = await processImageFile(file, { profile: "icon", preserveTransparency: true });
  hooks.onProgress?.({ loaded: 50, total: 100, percent: 50 });

  let avatarUrl = processed.dataUrl;
  try {
    const ext = processed.type === "image/png" ? "png" : "webp";
    const path = `avatars/${uid}/avatar.${ext}`;
    const sRef = storageRef(fb.storage, path);
    const blob = await (await fetch(processed.dataUrl)).blob();
    await withTimeout(
      uploadResumable(sRef, blob, {
        contentType: blob.type || "image/webp",
        cacheControl: "public, max-age=300",
      }, { ...hooks, timeoutMs: 2500 }),
      2500,
      "Storage timeout",
    );
    avatarUrl = await withTimeout(getDownloadURL(sRef), 2000, "URL timeout");
  } catch {
    // Storage 404 or disabled -> use the 512x512 compressed WebP dataUrl directly!
    avatarUrl = processed.dataUrl;
  }

  hooks.onProgress?.({ loaded: 85, total: 100, percent: 85 });
  await updateOwnProfile(uid, { avatarUrl });
  hooks.onProgress?.({ loaded: 100, total: 100, percent: 100 });
  return avatarUrl;
}

export async function removeAvatar(uid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  await Promise.all(
    AVATAR_EXTS.map((ext) => deleteObject(storageRef(fb.storage, `avatars/${uid}/avatar.${ext}`)).catch(() => undefined)),
  );
  await updateOwnProfile(uid, { avatarUrl: "" });
}

/* -------------------------------------------------------------------------- */
/*                              Admin: user list                              */
/* -------------------------------------------------------------------------- */

export function subscribeAllUsers(
  onChange: (users: UserProfile[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    return onValue(
      ref(fb.rtdb, "users"),
      (snap) => {
        if (snap.exists()) {
          const raw = snap.val() as Record<string, unknown>;
          const list = Object.values(raw)
            .map((item) => normalizeProfile(item))
            .filter((item) => item.uid !== "")
            .sort((a, b) => b.createdAt - a.createdAt);
          onChange(list);
        } else {
          onChange([]);
        }
      },
      (err) => onError?.(databaseErrorMessage(err)),
    );
  } catch (err) {
    onError?.(databaseErrorMessage(err));
    return noop;
  }
}

export async function adminSetUserStatus(uid: string, status: UserStatus): Promise<void> {
  const db = getRtdb();
  await update(ref(db, `users/${uid}`), { status, updatedAt: Date.now() });
}

export async function adminSetUserRole(uid: string, role: UserRole, grantedBy: string): Promise<void> {
  const db = getRtdb();
  await update(ref(db, `users/${uid}`), { role, updatedAt: Date.now() });
  if (role === "admin") {
    const target = await fetchProfile(uid);
    const email = target?.email || "";
    await writeAdminAllowList(uid, email, grantedBy);
  } else {
    await remove(ref(db, `admins/${uid}`)).catch(() => undefined);
  }
}

/* -------------------------------------------------------------------------- */
/*                                Saved items                                 */
/* -------------------------------------------------------------------------- */

export function subscribeSaved(
  uid: string,
  onChange: (items: SavedItem[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    return onValue(
      ref(fb.rtdb, `users/${uid}/saved`),
      (snap) => {
        if (snap.exists()) {
          const raw = snap.val() as Record<string, SavedItem>;
          const list = Object.values(raw).sort((a, b) => b.savedAt - a.savedAt);
          onChange(list);
        } else {
          onChange([]);
        }
      },
      (err) => onError?.(databaseErrorMessage(err)),
    );
  } catch (err) {
    onError?.(databaseErrorMessage(err));
    return noop;
  }
}

export async function saveResource(
  uid: string,
  item: Pick<SavedItem, "ref" | "title" | "description">,
): Promise<void> {
  const db = getRtdb();
  const id = item.ref.replace(/[^a-z0-9_-]/gi, "_");
  const savedItem: SavedItem = { ...item, id, userId: uid, savedAt: Date.now() };

  await set(ref(db, `users/${uid}/saved/${id}`), savedItem);
  let currentSaved = 0;
  try {
    const actSnap = await get(ref(db, `users/${uid}/activity/saved`));
    if (actSnap.exists()) currentSaved = Number(actSnap.val()) || 0;
  } catch {
    // proceed
  }
  await update(ref(db, `users/${uid}/activity`), { saved: currentSaved + 1 }).catch(() => undefined);
}

export async function removeSaved(uid: string, id: string): Promise<void> {
  const db = getRtdb();
  await remove(ref(db, `users/${uid}/saved/${id}`));
  let currentSaved = 0;
  try {
    const actSnap = await get(ref(db, `users/${uid}/activity/saved`));
    if (actSnap.exists()) currentSaved = Number(actSnap.val()) || 0;
  } catch {
    // proceed
  }
  await update(ref(db, `users/${uid}/activity`), { saved: Math.max(0, currentSaved - 1) }).catch(() => undefined);
}

/* -------------------------------------------------------------------------- */
/*                               Notifications                                */
/* -------------------------------------------------------------------------- */

export function subscribeNotifications(
  uid: string,
  onChange: (items: NotificationItem[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    return onValue(
      ref(fb.rtdb, `users/${uid}/notifications`),
      (snap) => {
        if (snap.exists()) {
          const raw = snap.val() as Record<string, NotificationItem>;
          const list = Object.values(raw).sort((a, b) => b.createdAt - a.createdAt);
          onChange(list);
        } else {
          onChange([]);
        }
      },
      (err) => onError?.(databaseErrorMessage(err)),
    );
  } catch (err) {
    onError?.(databaseErrorMessage(err));
    return noop;
  }
}

export async function pushNotification(
  uid: string,
  n: Pick<NotificationItem, "kind" | "title" | "body" | "href">,
): Promise<void> {
  const db = getRtdb();
  const id = push(ref(db, `users/${uid}/notifications`)).key || `n_${Date.now()}`;
  const notification: NotificationItem = { ...n, id, userId: uid, read: false, createdAt: Date.now() };

  await set(ref(db, `users/${uid}/notifications/${id}`), notification);
}

export async function markNotificationRead(uid: string, id: string): Promise<void> {
  const db = getRtdb();
  await update(ref(db, `users/${uid}/notifications/${id}`), { read: true });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const db = getRtdb();
  try {
    const snap = await get(ref(db, `users/${uid}/notifications`));
    if (snap.exists()) {
      const all = snap.val() as Record<string, NotificationItem>;
      const patch: Record<string, boolean> = {};
      for (const k of Object.keys(all)) {
        patch[`${k}/read`] = true;
      }
      await update(ref(db, `users/${uid}/notifications`), patch);
    }
  } catch {
    // ignore
  }
}

export async function deleteNotification(uid: string, id: string): Promise<void> {
  const db = getRtdb();
  await remove(ref(db, `users/${uid}/notifications/${id}`));
}

export async function sendWelcome(uid: string, name: string): Promise<void> {
  await pushNotification(uid, {
    kind: "system",
    title: `Welcome${name ? `, ${name.split(" ")[0]}` : ""}!`,
    body: "Beyond Now is a trusted space to understand what you feel, choose your next step and move forward. Your conversations are private and will not be shared without your permission, except where we believe you or someone else may face immediate serious harm — then we will work with you to find safe support.",
    href: "#/account/dashboard",
  });
}
