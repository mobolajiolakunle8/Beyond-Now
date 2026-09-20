import { get, onValue, push, ref, set, update, type Unsubscribe } from "firebase/database";
import { databaseErrorMessage, getFirebase } from "@/lib/firebase";
import { pushNotification } from "@/lib/users";

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

export type ParticipantInfo = {
  uid: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
};

const MAX_MESSAGE_LENGTH = 2000;
const noop: Unsubscribe = () => undefined;

function getRtdb() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return fb.rtdb;
}

/* -------------------------------------------------------------------------- */
/*                                  Threads                                   */
/* -------------------------------------------------------------------------- */

export async function ensureThread(info: ParticipantInfo): Promise<Thread> {
  const db = getRtdb();
  const metaRef = ref(db, `threads/${info.uid}/meta`);
  try {
    const snap = await get(metaRef);
    if (snap.exists()) {
      return snap.val() as Thread;
    }
  } catch {
    // If permission issue or offline, continue with local creation
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

  try {
    await set(metaRef, thread);
  } catch {
    // proceed gracefully
  }
  return thread;
}

export function subscribeThread(
  uid: string,
  onChange: (thread: Thread | null) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    const metaRef = ref(fb.rtdb, `threads/${uid}/meta`);
    return onValue(
      metaRef,
      (snap) => {
        if (snap.exists()) {
          onChange(snap.val() as Thread);
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

export function subscribeMessages(
  uid: string,
  onChange: (messages: Message[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    const msgsRef = ref(fb.rtdb, `threads/${uid}/messages`);
    return onValue(
      msgsRef,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.val() as Record<string, Message>;
          const list = Object.values(raw).sort((a, b) => a.createdAt - b.createdAt);
          onChange(list);
        } else {
          onChange([]);
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

export function subscribeAllThreads(
  onChange: (threads: Thread[]) => void,
  onError?: (msg: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    const threadsRef = ref(fb.rtdb, "threads");
    return onValue(
      threadsRef,
      (snap) => {
        if (snap.exists()) {
          const all = snap.val() as Record<string, { meta?: Thread }>;
          const list: Thread[] = [];
          for (const key of Object.keys(all)) {
            const item = all[key];
            if (item && item.meta) {
              list.push(item.meta);
            }
          }
          list.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
          onChange(list);
        } else {
          onChange([]);
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

/* -------------------------------------------------------------------------- */
/*                                  Sending                                   */
/* -------------------------------------------------------------------------- */

function cleanText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Write a message first.");
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
  return trimmed;
}

export async function sendUserMessage(info: ParticipantInfo, text: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const user = fb.auth.currentUser;
  if (!user || user.uid !== info.uid) throw new Error("You are not signed in.");

  const body = cleanText(text);
  const now = Date.now();
  const senderName = info.name || user.displayName || user.email?.split("@")[0] || "Member";
  const senderEmail = info.email || user.email || "";
  const senderAvatar = info.avatarUrl || "";

  const msgKey = push(ref(fb.rtdb, `threads/${user.uid}/messages`)).key || `m_${now}`;
  const message: Message = {
    id: msgKey,
    threadId: user.uid,
    senderUid: user.uid,
    senderRole: "user",
    senderName,
    text: body,
    createdAt: now,
  };

  // Get current unreadByAdmin count
  let currentUnread = 0;
  try {
    const metaSnap = await get(ref(fb.rtdb, `threads/${user.uid}/meta/unreadByAdmin`));
    if (metaSnap.exists()) {
      currentUnread = Number(metaSnap.val()) || 0;
    }
  } catch {
    // proceed
  }

  const threadMeta: Thread = {
    id: user.uid,
    userId: user.uid,
    userName: senderName,
    userEmail: senderEmail,
    userAvatar: senderAvatar,
    lastMessage: body.slice(0, 200),
    lastSender: "user",
    lastMessageAt: now,
    unreadByUser: 0,
    unreadByAdmin: currentUnread + 1,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  await set(ref(fb.rtdb, `threads/${user.uid}/messages/${msgKey}`), message);
  await update(ref(fb.rtdb, `threads/${user.uid}/meta`), threadMeta);
  await update(ref(fb.rtdb, `users/${user.uid}`), { lastSeenAt: now }).catch(() => undefined);
}

export async function sendAdminMessage(
  thread: Thread,
  text: string,
  admin: { uid: string; name: string },
): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");

  const body = cleanText(text);
  const now = Date.now();
  const msgKey = push(ref(fb.rtdb, `threads/${thread.id}/messages`)).key || `m_${now}`;

  const message: Message = {
    id: msgKey,
    threadId: thread.id,
    senderUid: admin.uid,
    senderRole: "admin",
    senderName: admin.name || "Beyond Now team",
    text: body,
    createdAt: now,
  };

  let currentUnread = 0;
  try {
    const unreadSnap = await get(ref(fb.rtdb, `threads/${thread.id}/meta/unreadByUser`));
    if (unreadSnap.exists()) {
      currentUnread = Number(unreadSnap.val()) || 0;
    }
  } catch {
    // proceed
  }

  await set(ref(fb.rtdb, `threads/${thread.id}/messages/${msgKey}`), message);
  await update(ref(fb.rtdb, `threads/${thread.id}/meta`), {
    lastMessage: body.slice(0, 200),
    lastSender: "admin",
    lastMessageAt: now,
    unreadByUser: currentUnread + 1,
    status: "open",
    updatedAt: now,
  });

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
    const patch = role === "user" ? { unreadByUser: 0 } : { unreadByAdmin: 0 };
    await update(ref(fb.rtdb, `threads/${uid}/meta`), patch);
  } catch {
    // ignore
  }
}

export async function setThreadStatus(uid: string, status: ThreadStatus): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  try {
    await update(ref(fb.rtdb, `threads/${uid}/meta`), { status, updatedAt: Date.now() });
  } catch {
    // ignore
  }
}
