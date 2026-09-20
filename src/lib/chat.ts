import {
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { pushNotification, type UserProfile } from "@/lib/users";

/**
 * Private messaging between one user and the Beyond Now team.
 *
 * Model: exactly one thread per user, stored at `threads/{uid}` — the thread
 * id IS the user's uid. This makes creation race-free, lets the user subscribe
 * with a single document listener, and lets an administrator open any user's
 * conversation without a query. Messages live in `threads/{uid}/messages`.
 */

export type ThreadStatus = "open" | "resolved";

export type Thread = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  status: ThreadStatus;
  lastMessage: string;
  lastSender: "user" | "admin" | "";
  lastMessageAt: number;
  unreadByUser: number;
  unreadByAdmin: number;
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  threadId: string;
  senderUid: string;
  senderRole: "user" | "admin";
  senderName: string;
  text: string;
  createdAt: number;
};

const MAX_MESSAGE_LENGTH = 2000;
const noop: Unsubscribe = () => undefined;

function fbOrThrow() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return fb;
}

const threadRef = (uid: string) => doc(fbOrThrow().db, "threads", uid);
const messagesCol = (uid: string) => collection(fbOrThrow().db, "threads", uid, "messages");
const messageId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/* -------------------------------------------------------------------------- */
/*                                  Threads                                   */
/* -------------------------------------------------------------------------- */

/** Creates the user's thread if it does not exist yet. Safe to call repeatedly. */
export async function ensureThread(profile: Pick<UserProfile, "uid" | "name" | "email" | "avatarUrl">): Promise<Thread> {
  const now = Date.now();
  const thread: Thread = {
    id: profile.uid,
    userId: profile.uid,
    userName: profile.name,
    userEmail: profile.email,
    userAvatar: profile.avatarUrl,
    status: "open",
    lastMessage: "",
    lastSender: "",
    lastMessageAt: now,
    unreadByUser: 0,
    unreadByAdmin: 0,
    createdAt: now,
    updatedAt: now,
  };

  const ref = threadRef(profile.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as Thread;
    await setDoc(ref, thread);
  } catch {
    /* fallback to local thread structure */
  }
  return thread;
}

export function subscribeThread(uid: string, onChange: (thread: Thread | null) => void, onError?: (msg: string) => void): Unsubscribe {
  if (!getFirebase()) return noop;
  return onSnapshot(
    threadRef(uid),
    (snap) => onChange(snap.exists() ? (snap.data() as Thread) : null),
    (err) => onError?.(err.message),
  );
}

export function subscribeMessages(uid: string, onChange: (messages: Message[]) => void, onError?: (msg: string) => void): Unsubscribe {
  if (!getFirebase()) return noop;
  return onSnapshot(
    query(messagesCol(uid), orderBy("createdAt", "asc"), limit(500)),
    (snap) => onChange(snap.docs.map((d) => d.data() as Message)),
    (err) => onError?.(err.message),
  );
}

/** Admin: every thread, most recent activity first. */
export function subscribeAllThreads(onChange: (threads: Thread[]) => void, onError?: (msg: string) => void): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  return onSnapshot(
    query(collection(fb.db, "threads"), orderBy("lastMessageAt", "desc"), limit(500)),
    (snap) => onChange(snap.docs.map((d) => d.data() as Thread)),
    (err) => onError?.(err.message),
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Sending                                   */
/* -------------------------------------------------------------------------- */

function cleanText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Write a message first.");
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
  return trimmed;
}

/** User → Beyond Now. Increments the admin's unread counter and reopens the thread. */
export async function sendUserMessage(profile: UserProfile, text: string): Promise<void> {
  const fb = fbOrThrow();
  const user = fb.auth.currentUser;
  if (!user || user.uid !== profile.uid) throw new Error("You are not signed in.");
  const body = cleanText(text);
  await ensureThread(profile);

  const now = Date.now();
  const message: Message = {
    id: messageId(),
    threadId: profile.uid,
    senderUid: user.uid,
    senderRole: "user",
    senderName: profile.name,
    text: body,
    createdAt: now,
  };

  const batch = writeBatch(fb.db);
  batch.set(doc(messagesCol(profile.uid), message.id), message);
  batch.update(threadRef(profile.uid), {
    userName: profile.name,
    userAvatar: profile.avatarUrl,
    lastMessage: body.slice(0, 200),
    lastSender: "user",
    lastMessageAt: now,
    unreadByAdmin: increment(1),
    status: "open",
    updatedAt: now,
  });
  batch.update(doc(fb.db, "users", profile.uid), { "activity.messages": increment(1) });
  await batch.commit();
}

/** Beyond Now → user. Increments the user's unread counter and drops an in-app notification. */
export async function sendAdminMessage(thread: Thread, text: string, admin: { uid: string; name: string }): Promise<void> {
  const fb = fbOrThrow();
  const body = cleanText(text);
  const now = Date.now();
  const message: Message = {
    id: messageId(),
    threadId: thread.id,
    senderUid: admin.uid,
    senderRole: "admin",
    senderName: admin.name || "Beyond Now",
    text: body,
    createdAt: now,
  };

  const batch = writeBatch(fb.db);
  batch.set(doc(messagesCol(thread.id), message.id), message);
  batch.update(threadRef(thread.id), {
    lastMessage: body.slice(0, 200),
    lastSender: "admin",
    lastMessageAt: now,
    unreadByUser: increment(1),
    status: "open",
    updatedAt: now,
  });
  await batch.commit();

  await pushNotification(thread.userId, {
    kind: "message",
    title: "New message from Beyond Now",
    body: body.slice(0, 140),
    href: "#/account/messages",
  }).catch(() => undefined);
}

/* -------------------------------------------------------------------------- */
/*                                Read state                                  */
/* -------------------------------------------------------------------------- */

export async function markThreadRead(uid: string, role: "user" | "admin"): Promise<void> {
  await updateDoc(threadRef(uid), role === "user" ? { unreadByUser: 0 } : { unreadByAdmin: 0 });
}

export async function setThreadStatus(uid: string, status: ThreadStatus): Promise<void> {
  await updateDoc(threadRef(uid), { status, updatedAt: Date.now() });
}
