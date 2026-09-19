import {
  createUserWithEmailAndPassword,
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
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { authErrorMessage, getFirebase } from "@/lib/firebase";

/* -------------------------------------------------------------------------- */
/*                              Profile / user shape                          */
/* -------------------------------------------------------------------------- */

export type UserRole = "user" | "admin";

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  bio: string;
  avatarUrl: string;
  status: "active" | "suspended";
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
  /** Aggregated activity counters (cheap to read). */
  activity: {
    saved: number;
    messages: number;
    notifications: number;
  };
};

/** Seed used when a user first logs in. */
export function buildEmptyProfile(uid: string, email: string, name: string): UserProfile {
  const now = Date.now();
  return {
    uid,
    email,
    name,
    role: "user",
    bio: "",
    avatarUrl: "",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    activity: { saved: 0, messages: 0, notifications: 0 },
  };
}

function scrub<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function userRef(uid: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return doc(fb.db, "users", uid);
}

/* -------------------------------------------------------------------------- */
/*                              Auth flows                                    */
/* -------------------------------------------------------------------------- */

export type SignUpInput = { email: string; password: string; name: string };
export type SignInInput = { email: string; password: string };

export async function signUp(input: SignUpInput): Promise<UserCredential> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  try {
    const cred = await createUserWithEmailAndPassword(fb.auth, input.email.trim(), input.password);
    if (input.name.trim()) {
      await fbUpdateProfile(cred.user, { displayName: input.name.trim() });
    }
    // Seed the user document. Cloud Function `onUserCreate` would normally do this,
    // but a client-side seed keeps the system functional even before deployment.
    await setDoc(
      userRef(cred.user.uid),
      buildEmptyProfile(cred.user.uid, input.email.trim(), input.name.trim() || input.email.split("@")[0]!),
      { merge: true },
    );
    return cred;
  } catch (err) {
    throw new Error(authErrorMessage(err));
  }
}

export async function signIn(input: SignInInput): Promise<UserCredential> {
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
  if (!fb) return;
  await signOut(fb.auth);
}

/** Reads custom claim — drives admin gating client-side. Firestore rules are the real source of truth. */
export async function isAdminUser(user: User): Promise<boolean> {
  const tokenResult = await user.getIdTokenResult(true);
  return Boolean(tokenResult.claims.isAdmin);
}

/* -------------------------------------------------------------------------- */
/*                              Profile reads / writes                        */
/* -------------------------------------------------------------------------- */

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const fb = getFirebase();
  if (!fb) return null;
  try {
    const snap = await getDoc(userRef(uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    console.error("fetchProfile", err);
    return null;
  }
}

export function subscribeProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    onChange(null);
    return () => undefined;
  }
  return onSnapshot(
    userRef(uid),
    (snap) => onChange(snap.exists() ? (snap.data() as UserProfile) : null),
    (err) => onError?.(err.message),
  );
}

export async function updateOwnProfile(
  uid: string,
  patch: { name?: string; bio?: string; avatarUrl?: string },
): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  try {
    await setDoc(
      userRef(uid),
      {
        ...scrub(patch),
        uid,
        updatedAt: Date.now(),
        lastSeenAt: Date.now(),
      },
      { merge: true },
    );
    if (patch.name !== undefined && fb.auth.currentUser) {
      await fbUpdateProfile(fb.auth.currentUser, { displayName: patch.name });
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Could not update your profile.");
  }
}

export async function changeOwnPassword(current: string, next: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const user = fb.auth.currentUser;
  if (!user?.email) throw new Error("No signed-in user.");
  const { EmailAuthProvider, reauthenticateWithCredential } = await import("firebase/auth");
  const cred = EmailAuthProvider.credential(user.email, current);
  await reauthenticateWithCredential(user, cred);
  await fbUpdatePassword(user, next);
}

/* -------------------------------------------------------------------------- */
/*                              Avatar upload                                 */
/* -------------------------------------------------------------------------- */

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  if (!/^image\//.test(file.type)) throw new Error("Profile picture must be JPG, PNG or WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile picture must be under 5 MB.");

  // Reuse compressor for consistent output (max 512px square profile picture).
  const { processImageFile } = await import("@/lib/media");
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
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  try {
    for (const ext of ["webp", "png", "jpg", "jpeg"]) {
      try {
        await deleteObject(storageRef(fb.storage, `avatars/${uid}/avatar.${ext}`));
      } catch {
        /* not present */
      }
    }
    await updateOwnProfile(uid, { avatarUrl: "" });
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Could not remove avatar.");
  }
}

/* -------------------------------------------------------------------------- */
/*                              Admin user search                             */
/* -------------------------------------------------------------------------- */

export async function listAllUsers(): Promise<UserProfile[]> {
  const fb = getFirebase();
  if (!fb) return [];
  const snap = await getDocs(query(collection(fb.db, "users"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as UserProfile);
}

export function subscribeAllUsers(
  onChange: (users: UserProfile[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(collection(fb.db, "users"), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => d.data() as UserProfile)),
    (err) => onError?.(err.message),
  );
}

export async function adminSetUserStatus(uid: string, status: "active" | "suspended"): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  await updateDoc(userRef(uid), { status, updatedAt: Date.now() });
}

export async function adminSetUserRole(uid: string, role: UserRole): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  await updateDoc(userRef(uid), { role, updatedAt: Date.now() });
}

/* -------------------------------------------------------------------------- */
/*                              Saved resources                               */
/* -------------------------------------------------------------------------- */

export type SavedItem = {
  id: string;
  userId: string;
  /** Stable reference into the CMS: e.g. resource:trackId:itemId or story:id */
  ref: string;
  title: string;
  description: string;
  url: string;
  savedAt: number;
};

function savedCol(uid: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return collection(fb.db, "saved", uid, "items");
}

export function subscribeSaved(
  uid: string,
  onChange: (items: SavedItem[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(savedCol(uid), orderBy("savedAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => d.data() as SavedItem)),
    (err) => onError?.(err.message),
  );
}

export async function saveResource(uid: string, item: Omit<SavedItem, "id" | "userId" | "savedAt">): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const id = `${item.ref.replace(/[^a-z0-9_-]/gi, "_")}_${Date.now()}`;
  await setDoc(
    doc(savedCol(uid), id),
    { ...scrub(item), id, userId: uid, savedAt: Date.now() },
    { merge: true },
  );
  // Bump activity counter atomically.
  await setDoc(
    userRef(uid),
    { activity: { saved: (await getActivity(uid)).saved + 1 } } as Partial<UserProfile>,
    { merge: true },
  );
}

export async function removeSaved(uid: string, id: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  await writeBatch(fb.db).delete(doc(savedCol(uid), id)).commit();
  await setDoc(
    userRef(uid),
    { activity: { saved: Math.max(0, (await getActivity(uid)).saved - 1) } } as Partial<UserProfile>,
    { merge: true },
  );
}

async function getActivity(uid: string): Promise<UserProfile["activity"]> {
  const profile = await fetchProfile(uid);
  return profile?.activity ?? { saved: 0, messages: 0, notifications: 0 };
}

/* -------------------------------------------------------------------------- */
/*                              Notifications                                 */
/* -------------------------------------------------------------------------- */

export type NotificationItem = {
  id: string;
  userId: string;
  kind: "message" | "resource" | "system" | "saved";
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: number;
};

function notifCol(uid: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return collection(fb.db, "notifications", uid, "items");
}

export function subscribeNotifications(
  uid: string,
  onChange: (items: NotificationItem[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(notifCol(uid), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => d.data() as NotificationItem)),
    (err) => onError?.(err.message),
  );
}

export async function pushNotification(uid: string, n: Omit<NotificationItem, "id" | "userId" | "createdAt" | "read">) {
  const fb = getFirebase();
  if (!fb) return;
  const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await setDoc(doc(notifCol(uid), id), {
    ...scrub(n),
    id,
    userId: uid,
    read: false,
    createdAt: Date.now(),
  });
  await setDoc(
    userRef(uid),
    { activity: { notifications: (await getActivity(uid)).notifications + 1 } } as Partial<UserProfile>,
    { merge: true },
  );
}

export async function markNotificationRead(uid: string, id: string, read: boolean) {
  const fb = getFirebase();
  if (!fb) return;
  await updateDoc(doc(notifCol(uid), id), { read });
}

export async function markAllNotificationsRead(uid: string) {
  const fb = getFirebase();
  if (!fb) return;
  const snap = await getDocs(notifCol(uid));
  const batch = writeBatch(fb.db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function clearNotifications(uid: string) {
  const fb = getFirebase();
  if (!fb) return;
  const snap = await getDocs(notifCol(uid));
  const batch = writeBatch(fb.db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export function touchLastSeen(uid: string) {
  const fb = getFirebase();
  if (!fb) return;
  updateDoc(userRef(uid), { lastSeenAt: Date.now() }).catch(() => undefined);
}

/** Used by the welcome notification in `pushNotification`. */
export async function sendWelcome(uid: string, name: string) {
  await pushNotification(uid, {
    kind: "system",
    title: `Welcome${name ? `, ${name.split(" ")[0]}` : ""}!`,
    body: "You can now save resources, track your progress and message the Beyond Now team privately.",
    href: "#/account",
  });
}

