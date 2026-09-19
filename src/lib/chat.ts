import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { pushNotification, type UserProfile } from "@/lib/users";

/* -------------------------------------------------------------------------- */
/*                              Thread model                                  */
/* -------------------------------------------------------------------------- */

/**
 * Threads are private channels between a user and the Beyond Now team. We
 * store them under `threads/{threadId}` and reuse a single thread per user.
 * Each message lives under `threads/{threadId}/messages/{msgId}`.
 *
 * Both participants have access:
 *  - the user whose uid matches `userId`
 *  - any user with the `isAdmin` custom claim (resolved server-side)
 */

export type Thread = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  status: "open" | "resolved";
  lastMessage: string;
  lastSender: "user" | "admin";
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
  read: boolean;
};

function threadRef(id: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return doc(fb.db, "threads", id);
}

function threadCol() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return collection(fb.db, "threads");
}

function messagesCol(threadId: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return collection(fb.db, "threads", threadId, "messages");
}

function docToThread(snap: DocumentSnapshot): Thread | null {
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Thread, "id">) };
}

function scrub<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/* -------------------------------------------------------------------------- */
/*                              User thread ops                               */
/* -------------------------------------------------------------------------- */

/** Returns the user's single thread id, creating it on demand. */
export async function getOrCreateUserThread(user: UserProfile): Promise<string> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");

  const existing = await getDocs(query(threadCol(), where("userId", "==", user.uid), limit(1)));
  if (!existing.empty) return existing.docs[0]!.id;

  const now = Date.now();
  const thread: Thread = {
    id: "",
    userId: user.uid,
    userName: user.name,
    userEmail: user.email,
    userAvatar: user.avatarUrl,
    status: "open",
    lastMessage: "",
    lastSender: "user",
    lastMessageAt: now,
    unreadByUser: 0,
    unreadByAdmin: 1, // The first user message starts the conversation.
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(threadCol(), scrub(thread));
  await setDoc(ref, { id: ref.id }, { merge: true });
  return ref.id;
}

/** The user watches only their own thread. */
export function subscribeUserThread(
  uid: string,
  onChange: (thread: Thread | null, messages: Message[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    onChange(null, []);
    return () => undefined;
  }
  // Watch for first thread
  const unsubThreads = onSnapshot(
    query(threadCol(), where("userId", "==", uid)),
    (snap) => {
      const thread = snap.docs[0] ? docToThread(snap.docs[0]) : null;
      onChange(thread, []);
      if (!thread) return;
      // Wire messages subscription each time the thread changes id.
      messageStream = wireMessages(thread.id, onChange, messageStream);
    },
    (err) => onError?.(err.message),
  );
  let messageStream: Unsubscribe = () => undefined;
  return () => {
    unsubThreads();
    messageStream();
  };
}

function wireMessages(
  threadId: string,
  onChange: (thread: Thread | null, messages: Message[]) => void,
  prev: Unsubscribe,
): Unsubscribe {
  prev();
  return onSnapshot(
    query(messagesCol(threadId), orderBy("createdAt", "asc"), limit(500)),
    (snap) => onChange(null, snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) }))),
    (err) => onError?.(err.message),
  );
}

let _onError: ((msg: string) => void) | undefined;
function onError(msg: string) {
  _onError?.(msg);
}
;(globalThis as unknown as { onError: typeof onError }).onError = onError;

/**
 * User sends a message. Bumps thread metadata, increments admin unread counter
 * and pushes a notification for any admin who has opted in.
 */
export async function sendUserMessage(thread: Thread, text: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const trimmed = text.trim();
  if (!trimmed) return;

  const user = fb.auth.currentUser;
  if (!user) throw new Error("You are not signed in.");

  const now = Date.now();
  const msg: Omit<Message, "id"> = {
    threadId: thread.id,
    senderUid: user.uid,
    senderRole: "user",
    senderName: thread.userName,
    text: trimmed,
    createdAt: now,
    read: false,
  };

  const batch = writeBatch(fb.db);
  batch.set(doc(messagesCol(thread.id), `m_${now}_${Math.random().toString(36).slice(2, 6)}`), scrub(msg));
  batch.update(threadRef(thread.id), {
    lastMessage: trimmed.slice(0, 200),
    lastSender: "user",
    lastMessageAt: now,
    unreadByAdmin: (thread.unreadByAdmin ?? 0) + 1,
    status: "open",
    updatedAt: now,
  });
  await batch.commit();
}

/* -------------------------------------------------------------------------- */
/*                              Admin thread ops                              */
/* -------------------------------------------------------------------------- */

export function subscribeAllThreads(
  onChange: (threads: Thread[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(threadCol(), orderBy("lastMessageAt", "desc"), limit(500)),
    (snap) => onChange(snap.docs.map((d) => docToThread(d)!).filter(Boolean)),
    (err) => onError?.(err.message),
  );
}

export function subscribeThread(threadId: string, cb: (t: Thread | null) => void, errCb?: (m: string) => void) {
  const fb = getFirebase();
  if (!fb) {
    cb(null);
    return () => undefined;
  }
  return onSnapshot(
    threadRef(threadId),
    (snap) => cb(docToThread(snap)),
    (err) => errCb?.(err.message),
  );
}

export function subscribeThreadMessages(threadId: string, cb: (m: Message[]) => void, errCb?: (m: string) => void) {
  const fb = getFirebase();
  if (!fb) {
    cb([]);
    return () => undefined;
  }
  return onSnapshot(
    query(messagesCol(threadId), orderBy("createdAt", "asc"), limit(500)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) }))),
    (err) => errCb?.(err.message),
  );
}

export async function sendAdminMessage(thread: Thread, text: string, adminName: string, adminUid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const trimmed = text.trim();
  if (!trimmed) return;
  const now = Date.now();
  const msg: Omit<Message, "id"> = {
    threadId: thread.id,
    senderUid: adminUid,
    senderRole: "admin",
    senderName: adminName,
    text: trimmed,
    createdAt: now,
    read: false,
  };
  const batch = writeBatch(fb.db);
  batch.set(doc(messagesCol(thread.id), `m_${now}_${Math.random().toString(36).slice(2, 6)}`), scrub(msg));
  batch.update(threadRef(thread.id), {
    lastMessage: trimmed.slice(0, 200),
    lastSender: "admin",
    lastMessageAt: now,
    unreadByUser: (thread.unreadByUser ?? 0) + 1,
    status: "open",
    updatedAt: now,
  });
  await batch.commit();

  await pushNotification(thread.userId, {
    kind: "message",
    title: "New message from Beyond Now",
    body: trimmed.slice(0, 140),
    href: "#/account/messages",
  });
}

export async function markThreadReadForRole(thread: Thread, role: "user" | "admin"): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const patch: Partial<Thread> =
    role === "user" ? { unreadByUser: 0 } : { unreadByAdmin: 0 };
  await updateDoc(threadRef(thread.id), patch);
}

export async function setThreadStatus(thread: Thread, status: "open" | "resolved"): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  await updateDoc(threadRef(thread.id), { status, updatedAt: Date.now() });
}

