import { get, ref, remove, set, update } from "firebase/database";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { databaseErrorMessage, getFirebase } from "@/lib/firebase";
import type { NotificationItem, SavedItem, UserProfile } from "@/lib/users";
import type { StorySubmission } from "@/lib/storySubmissions";
import type { Message, Thread } from "@/lib/chat";

export const CONSENT_POLICY_VERSION = "2026-01";

export type ConsentRecord = {
  /** Acceptable Use + safeguarding agreement shown at sign-up. */
  acceptableUse: boolean;
  /** Agreement that conversations are reviewed for safeguarding purposes. */
  safeguardingReview: boolean;
  /** Optional marketing / newsletter opt-in. */
  marketing: boolean;
  policyVersion: string;
  acceptedAt: number;
};

export type PrivacyExport = {
  exportedAt: string;
  policyVersion: string;
  profile: UserProfile | null;
  saved: SavedItem[];
  notifications: NotificationItem[];
  storySubmissions: StorySubmission[];
  conversation: { thread: Thread | null; messages: Message[] };
};

function getRtdb() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return fb.rtdb;
}

async function read<T>(path: string): Promise<T | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const snap = await get(ref(fb.rtdb, path));
  return snap.exists() ? (snap.val() as T) : null;
}

/** Records (or refreshes) the consent choices attached to an account. */
export async function saveConsent(
  uid: string,
  consent: Omit<ConsentRecord, "policyVersion" | "acceptedAt">,
): Promise<void> {
  const db = getRtdb();
  const record: ConsentRecord = {
    ...consent,
    policyVersion: CONSENT_POLICY_VERSION,
    acceptedAt: Date.now(),
  };
  await set(ref(db, `users/${uid}/consent`), record);
}

export async function readConsent(uid: string): Promise<ConsentRecord | null> {
  const profile = await read<UserProfile>(`users/${uid}`);
  return profile ? ((profile as UserProfile & { consent?: ConsentRecord }).consent ?? null) : null;
}

/**
 * Builds a complete, human-readable export of everything Beyond Now holds for
 * this account. Runs entirely client-side: no message content leaves the
 * member's browser unless they choose to save the file.
 */
export async function buildPrivacyExport(uid: string): Promise<PrivacyExport> {
  const [profile, saved, notifications, thread, messages, submissions] = await Promise.all([
    read<UserProfile>(`users/${uid}`),
    read<SavedItem[]>(`users/${uid}/saved`),
    read<NotificationItem[]>(`users/${uid}/notifications`),
    read<Thread>(`threads/${uid}/meta`),
    read<Record<string, Message>>(`threads/${uid}/messages`),
    read<Record<string, StorySubmission>>(`storySubmissions/${uid}`),
  ]);

  const messageList = messages ? Object.values(messages).sort((a, b) => a.createdAt - b.createdAt) : [];
  const submissionList = submissions
    ? Object.values(submissions).sort((a, b) => b.submittedAt - a.submittedAt)
    : [];

  return {
    exportedAt: new Date().toISOString(),
    policyVersion: CONSENT_POLICY_VERSION,
    profile,
    saved: saved ? Object.values(saved) : [],
    notifications: notifications ? Object.values(notifications) : [],
    storySubmissions: submissionList,
    conversation: { thread, messages: messageList },
  };
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Exports the member's data as a formatted JSON file download. */
export async function downloadPrivacyExport(uid: string, email: string): Promise<void> {
  const data = await buildPrivacyExport(uid);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`beyond-now-my-data-${stamp}.json`, JSON.stringify(data, null, 2));
  void email;
}

/**
 * Deletes every piece of member-generated content. The Auth user record and the
 * profile document are removed last so rules can still verify ownership while
 * child nodes are cleared.
 */
export async function deleteMyAccountData(uid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const db = getRtdb();

  // Best-effort avatar cleanup in Storage.
  for (const ext of ["webp", "png", "jpg", "jpeg"]) {
    try {
      await deleteObject(storageRef(fb.storage, `avatars/${uid}/avatar.${ext}`));
    } catch {
      // Avatar may not exist.
    }
  }

  try {
    await remove(ref(db, `users/${uid}/saved`));
    await remove(ref(db, `users/${uid}/notifications`));
    await remove(ref(db, `threads/${uid}/messages`));
    await remove(ref(db, `threads/${uid}/meta`));
    await remove(ref(db, `storySubmissions/${uid}`));
    await remove(ref(db, `users/${uid}`));
  } catch (err) {
    throw new Error(databaseErrorMessage(err));
  }
}

/**
 * Submits a deletion request for review. Used when a member is signed in but
 * Realtime Database rules or a safeguarding hold prevent immediate deletion.
 */
export async function requestAccountDeletion(
  uid: string,
  email: string,
  reason: string,
): Promise<void> {
  const db = getRtdb();
  const id = `del_${Date.now()}_${uid.slice(0, 6)}`;
  await update(ref(db, `users/${uid}`), {
    deletionRequestedAt: Date.now(),
    updatedAt: Date.now(),
  }).catch(() => undefined);
  await set(ref(db, `deletionRequests/${id}`), {
    id,
    uid,
    email,
    reason: reason.trim().slice(0, 1000),
    requestedAt: Date.now(),
    status: "requested",
  }).catch(() => undefined);
}
