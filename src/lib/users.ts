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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { ADMIN_EMAIL, authErrorMessage, firestoreErrorMessage, getFirebase } from "@/lib/firebase";
import { processImageFile } from "@/lib/media";

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
  /** Stable reference into the CMS, e.g. `resource:<trackId>:<itemId>` */
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

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function fbOrThrow() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return fb;
}

/** Firestore rejects `undefined`; strip it before writing. */
function scrub<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const userRef = (uid: string) => doc(fbOrThrow().db, "users", uid);
const adminRef = (uid: string) => doc(fbOrThrow().db, "admins", uid);
const savedCol = (uid: string) => collection(fbOrThrow().db, "users", uid, "saved");
const notifCol = (uid: string) => collection(fbOrThrow().db, "users", uid, "notifications");

const noop: Unsubscribe = () => undefined;

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

function displayNameFor(user: User): string {
  return user.displayName?.trim() || user.email?.split("@")[0] || "Member";
}

/* -------------------------------------------------------------------------- */
/*                                Auth flows                                  */
/* -------------------------------------------------------------------------- */

export async function signUp(input: { email: string; password: string; name: string }): Promise<UserCredential> {
  const fb = fbOrThrow();
  try {
    const cred = await createUserWithEmailAndPassword(fb.auth, input.email.trim(), input.password);
    const name = input.name.trim() || displayNameFor(cred.user);
    if (input.name.trim()) await fbUpdateProfile(cred.user, { displayName: name });
    await setDoc(userRef(cred.user.uid), buildProfile(cred.user.uid, cred.user.email ?? input.email, name));
    return cred;
  } catch (err) {
    throw new Error(authErrorMessage(err));
  }
}

export async function signIn(input: { email: string; password: string }): Promise<UserCredential> {
  const fb = fbOrThrow();
  try {
    return await signInWithEmailAndPassword(fb.auth, input.email.trim(), input.password);
  } catch (err) {
    throw new Error(authErrorMessage(err));
  }
}

export async function sendReset(email: string): Promise<void> {
  const fb = fbOrThrow();
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

/**
 * Client-side admin detection. Mirrors the server rule exactly:
 * custom claim → root admin email → `admins/{uid}` allow-list document.
 * The Firestore/Storage rules are the source of truth; this only shapes the UI.
 */
export async function resolveIsAdmin(user: User): Promise<boolean> {
  try {
    const token = await user.getIdTokenResult();
    if (token.claims.isAdmin === true) return true;
  } catch {
    /* token unavailable offline — fall through */
  }
  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  try {
    return (await getDoc(adminRef(user.uid))).exists();
  } catch {
    return false;
  }
}

/**
 * Writes (or refreshes) the `admins/{uid}` allow-list record. This is the
 * bootstrap path the root administrator uses to unlock Cloud access — the
 * security rules permit it only for `{ROOT ADMIN EMAIL}`. Members calling it
 * receive `permission-denied`, which the caller turns into remediation copy.
 */
export async function writeAdminAllowList(uid: string, email: string, grantedBy = "bootstrap"): Promise<void> {
  const record: AdminRecord = { uid, email, grantedBy, grantedAt: Date.now() };
  await setDoc(adminRef(uid), record, { merge: true });
}

/**
 * Guarantees the signed-in user has a profile document (covers accounts that
 * were created before the profile seed existed) and, for administrators,
 * that their role and allow-list record are in place.
 *
 * This is deliberately best-effort: a member must be able to use the app the
 * instant they sign in, even while the cloud is misconfigured. Any write that
 * Firestore rejects is reported through `onIssue` rather than thrown, and the
 * caller always receives a usable profile (falling back to the auth record).
 */
export async function ensureUserRecords(
  user: User,
  isAdmin: boolean,
  onIssue?: (message: string) => void,
): Promise<UserProfile> {
  const fallback = buildProfile(user.uid, user.email ?? "", displayNameFor(user));
  if (isAdmin) fallback.role = "admin";

  const ref = userRef(user.uid);
  let profile: UserProfile = fallback;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, fallback);
    } else {
      const existing = snap.data() as UserProfile;
      const patch: Partial<UserProfile> = { lastSeenAt: Date.now() };
      if (isAdmin && existing.role !== "admin") patch.role = "admin";
      // setDoc+merge tolerates documents created by older builds with missing fields.
      await setDoc(ref, patch, { merge: true });
      profile = { ...fallback, ...existing, ...patch };
    }
  } catch (err) {
    onIssue?.(firestoreErrorMessage(err, isAdmin ? "admin" : "member"));
  }

  if (isAdmin) {
    // The allow-list write is what unlocks admin access under the rules.
    // The root email is permitted to create its own record.
    try {
      const admin = await getDoc(adminRef(user.uid));
      if (!admin.exists()) await writeAdminAllowList(user.uid, user.email ?? "", "bootstrap");
    } catch (err) {
      onIssue?.(firestoreErrorMessage(err, "admin"));
    }
  }

  return profile;
}

/* -------------------------------------------------------------------------- */
/*                                  Profile                                   */
/* -------------------------------------------------------------------------- */

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  if (!getFirebase()) return null;
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function subscribeProfile(uid: string, onChange: (p: UserProfile | null) => void, onError?: (msg: string) => void): Unsubscribe {
  if (!getFirebase()) return noop;
  return onSnapshot(
    userRef(uid),
    (snap) => onChange(snap.exists() ? (snap.data() as UserProfile) : null),
    (err) => onError?.(firestoreErrorMessage(err, "member")),
  );
}

export async function updateOwnProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, "name" | "bio" | "avatarUrl" | "preferences">>,
): Promise<void> {
  const fb = fbOrThrow();
  await updateDoc(userRef(uid), { ...scrub(patch), updatedAt: Date.now() });
  if (patch.name !== undefined && fb.auth.currentUser) {
    await fbUpdateProfile(fb.auth.currentUser, { displayName: patch.name });
  }
}

export async function changeOwnPassword(current: string, next: string): Promise<void> {
  const fb = fbOrThrow();
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

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const fb = fbOrThrow();
  if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) throw new Error("Profile picture must be JPG, PNG or WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile picture must be under 5 MB.");

  const processed = await processImageFile(file);
  const blob = await (await fetch(processed.dataUrl)).blob();
  const ext = blob.type === "image/png" ? "png" : "webp";
  const path = `avatars/${uid}/avatar.${ext}`;

  await uploadBytes(storageRef(fb.storage, path), blob, {
    contentType: blob.type,
    cacheControl: "public, max-age=300",
  });
  const url = await getDownloadURL(storageRef(fb.storage, path));
  await updateOwnProfile(uid, { avatarUrl: url });
  return url;
}

export async function removeAvatar(uid: string): Promise<void> {
  const fb = fbOrThrow();
  await Promise.all(
    AVATAR_EXTS.map((ext) => deleteObject(storageRef(fb.storage, `avatars/${uid}/avatar.${ext}`)).catch(() => undefined)),
  );
  await updateOwnProfile(uid, { avatarUrl: "" });
}

/* -------------------------------------------------------------------------- */
/*                              Admin: user list                              */
/* -------------------------------------------------------------------------- */

export function subscribeAllUsers(onChange: (users: UserProfile[]) => void, onError?: (msg: string) => void): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  return onSnapshot(
    query(collection(fb.db, "users"), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => d.data() as UserProfile)),
    (err) => onError?.(firestoreErrorMessage(err, "admin")),
  );
}

export async function adminSetUserStatus(uid: string, status: UserStatus): Promise<void> {
  await updateDoc(userRef(uid), { status, updatedAt: Date.now() });
}

/** Promotes or demotes a user. Keeps `users/{uid}.role` and `admins/{uid}` in sync. */
export async function adminSetUserRole(uid: string, role: UserRole, grantedBy: string): Promise<void> {
  const fb = fbOrThrow();
  const batch = writeBatch(fb.db);
  batch.update(userRef(uid), { role, updatedAt: Date.now() });
  if (role === "admin") {
    const target = await getDoc(userRef(uid));
    const email = target.exists() ? (target.data() as UserProfile).email : "";
    const record: AdminRecord = { uid, email, grantedBy, grantedAt: Date.now() };
    batch.set(adminRef(uid), record);
  } else {
    batch.delete(adminRef(uid));
  }
  await batch.commit();
}

/* -------------------------------------------------------------------------- */
/*                                Saved items                                 */
/* -------------------------------------------------------------------------- */

export function subscribeSaved(uid: string, onChange: (items: SavedItem[]) => void, onError?: (msg: string) => void): Unsubscribe {
  if (!getFirebase()) return noop;
  return onSnapshot(
    query(savedCol(uid), orderBy("savedAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => d.data() as SavedItem)),
    (err) => onError?.(firestoreErrorMessage(err, "member")),
  );
}

/** Idempotent: saving the same resource twice keeps a single record. */
export async function saveResource(uid: string, item: Pick<SavedItem, "ref" | "title" | "description">): Promise<void> {
  const fb = fbOrThrow();
  const id = item.ref.replace(/[^a-z0-9_-]/gi, "_");
  const batch = writeBatch(fb.db);
  batch.set(doc(savedCol(uid), id), scrub({ ...item, id, userId: uid, savedAt: Date.now() }));
  batch.update(userRef(uid), { "activity.saved": increment(1), updatedAt: Date.now() });
  await batch.commit();
}

export async function removeSaved(uid: string, id: string): Promise<void> {
  const fb = fbOrThrow();
  const batch = writeBatch(fb.db);
  batch.delete(doc(savedCol(uid), id));
  batch.update(userRef(uid), { "activity.saved": increment(-1), updatedAt: Date.now() });
  await batch.commit();
}

/* -------------------------------------------------------------------------- */
/*                               Notifications                                */
/* -------------------------------------------------------------------------- */

export function subscribeNotifications(uid: string, onChange: (items: NotificationItem[]) => void, onError?: (msg: string) => void): Unsubscribe {
  if (!getFirebase()) return noop;
  return onSnapshot(
    query(notifCol(uid), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => d.data() as NotificationItem)),
    (err) => onError?.(firestoreErrorMessage(err, "member")),
  );
}

export async function pushNotification(
  uid: string,
  n: Pick<NotificationItem, "kind" | "title" | "body" | "href">,
): Promise<void> {
  const fb = fbOrThrow();
  const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const batch = writeBatch(fb.db);
  batch.set(doc(notifCol(uid), id), scrub({ ...n, id, userId: uid, read: false, createdAt: Date.now() }));
  batch.update(userRef(uid), { "activity.notifications": increment(1) });
  await batch.commit();
}

export async function markNotificationRead(uid: string, id: string): Promise<void> {
  await updateDoc(doc(notifCol(uid), id), { read: true });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const fb = fbOrThrow();
  const snap = await getDocs(notifCol(uid));
  if (snap.empty) return;
  const batch = writeBatch(fb.db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function deleteNotification(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(notifCol(uid), id));
}

export async function sendWelcome(uid: string, name: string): Promise<void> {
  await pushNotification(uid, {
    kind: "system",
    title: `Welcome${name ? `, ${name.split(" ")[0]}` : ""}!`,
    body: "You can now save resources, track your progress and message the Beyond Now team privately.",
    href: "#/account/dashboard",
  });
}
