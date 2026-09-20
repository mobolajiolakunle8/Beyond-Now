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
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { pushNotification } from "@/lib/users";

/**
 * Private messaging between a user and the Beyond Now team.
 * Stored at `threads/{uid}` where the thread id equals the member's uid.
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

export type ParticipantInfo = {
  uid: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
};

/** Creates the user's thread if it does not exist yet. Safe to call repeatedly. */
export async function ensureThread(info: ParticipantInfo): Promise<Thread> {
  const ref = threadRef(info.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as Thread;
  } catch {
    // proceed to create if read was denied or doc absent
  }

  const now = Date.now();
  const thread: Thread = {
    id: info.uid,
    userId: info.uid,
    userName: info.name || info.email?.split("@")[0] || "Member",
    userEmail: info.email || "",
    userAvatar: info.avatarUrl || "",
    status: "open",
    lastMessage: "",
    lastSender: "",
    lastMessageAt: now,
    unreadByUser: 0,
    unreadByAdmin: 0,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, thread, { merge: true });
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
export async function sendUserMessage(info: ParticipantInfo, text: string): Promise<void> {
  const fb = fbOrThrow();
  const user = fb.auth.currentUser;
  if (!user || user.uid !== info.uid) throw new Error("You are not signed in.");
  const body = cleanText(text);

  const now = Date.now();
  const senderName = info.name || user.displayName || user.email?.split("@")[0] || "Member";
  const senderEmail = info.email || user.email || "";
  const senderAvatar = info.avatarUrl || "";

  const message: Message = {
    id: messageId(),
    threadId: user.uid,
    senderUid: user.uid,
    senderRole: "user",
    senderName,
    text: body,
    createdAt: now,
  };

  const batch = writeBatch(fb.db);
  batch.set(doc(messagesCol(user.uid), message.id), message);
  batch.set(
    threadRef(user.uid),
    {
      id: user.uid,
      userId: user.uid,
      userName: senderName,
      userEmail: senderEmail,
      userAvatar: senderAvatar,
      lastMessage: body.slice(0, 200),
      lastSender: "user",
      lastMessageAt: now,
      unreadByAdmin: increment(1),
      status: "open",
      updatedAt: now,
    },
    { merge: true },
  );
  // Safely record user activity without failing if user document is pending
  batch.set(doc(fb.db, "users", user.uid), { updatedAt: now }, { merge: true });
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
  batch.set(
    threadRef(thread.id),
    {
      lastMessage: body.slice(0, 200),
      lastSender: "admin",
      lastMessageAt: now,
      unreadByUser: increment(1),
      status: "open",
      updatedAt: now,
    },
    { merge: true },
  );
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
  const fb = getFirebase();
  if (!fb) return;
  try {
    await setDoc(threadRef(uid), role === "user" ? { unreadByUser: 0 } : { unreadByAdmin: 0 }, { merge: true });
  } catch {
    /* ignore read receipt error */
  }
}

export async function setThreadStatus(uid: string, status: ThreadStatus): Promise<void> {
  await setDoc(threadRef(uid), { status, updatedAt: Date.now() }, { merge: true });
}
