import { onValue, push, ref, set, update, type Unsubscribe } from "firebase/database";
import { databaseErrorMessage, getFirebase } from "@/lib/firebase";
import { pushNotification } from "@/lib/users";

export type StorySubmissionStatus = "submitted" | "reviewing" | "published" | "declined";
export type StoryIdentity = "anonymous" | "firstName";

export type StorySubmission = {
  id: string;
  userId: string;
  authorName: string;
  category: string;
  title: string;
  story: string;
  identity: StoryIdentity;
  consentToPublish: boolean;
  status: StorySubmissionStatus;
  adminNote: string;
  submittedAt: number;
  reviewedAt: number | null;
  reviewedBy: string;
};

const noop: Unsubscribe = () => undefined;

function getRtdb() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return fb.rtdb;
}

function sortByRecent<T extends { submittedAt: number }>(items: T[]) {
  return items.sort((a, b) => b.submittedAt - a.submittedAt);
}

export type QueuedStoryInput = Omit<
  StorySubmission,
  "id" | "status" | "adminNote" | "submittedAt" | "reviewedAt" | "reviewedBy"
>;

export type QueuedSubmission = QueuedStoryInput & {
  queuedAt: number;
  attempts: number;
};

const outboxKey = (uid: string) => `bn.storyOutbox.v1.${uid}`;

/** Local queue for stories that could not be sent (offline or rules rejected). */
export function readStoryOutbox(uid: string): QueuedSubmission[] {
  try {
    const raw = localStorage.getItem(outboxKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedSubmission =>
        !!item && typeof item === "object" && typeof (item as QueuedSubmission).title === "string",
    );
  } catch {
    return [];
  }
}

function writeStoryOutbox(uid: string, items: QueuedSubmission[]): void {
  try {
    localStorage.setItem(outboxKey(uid), JSON.stringify(items));
  } catch {
    /* private mode — the in-memory list still works for this session */
  }
}

/**
 * Saves a validated submission locally so it survives refresh and can be
 * retried later. Validation still runs first inside `submitStory`, so only
 * genuine send failures ever land here.
 */
export function queueStoryOffline(input: QueuedStoryInput): QueuedSubmission {
  const queued: QueuedSubmission = { ...input, queuedAt: Date.now(), attempts: 0 };
  const items = readStoryOutbox(input.userId);
  writeStoryOutbox(input.userId, [...items, queued]);
  return queued;
}

export function removeQueuedStory(uid: string, queuedAt: number): void {
  writeStoryOutbox(
    uid,
    readStoryOutbox(uid).filter((item) => item.queuedAt !== queuedAt),
  );
}

/**
 * Retries every queued submission in order. Successful sends are removed;
 * failures stay queued with a bumped attempt count. Never throws.
 */
export async function flushStoryOutbox(uid: string): Promise<{ sent: number; failed: number }> {
  const pending = readStoryOutbox(uid);
  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      const { queuedAt: _queuedAt, attempts: _attempts, ...input } = item;
      await submitStory(input);
      removeQueuedStory(uid, item.queuedAt);
      sent += 1;
    } catch {
      failed += 1;
      writeStoryOutbox(
        uid,
        readStoryOutbox(uid).map((entry) =>
          entry.queuedAt === item.queuedAt ? { ...entry, attempts: entry.attempts + 1 } : entry,
        ),
      );
    }
  }
  return { sent, failed };
}

export async function submitStory(input: QueuedStoryInput): Promise<StorySubmission> {
  if (!input.title.trim()) throw new Error("Give your story a title.");
  if (input.story.trim().length < 40) throw new Error("Please share at least a few sentences (40 characters or more). ");
  if (!input.consentToPublish) throw new Error("Please confirm that Beyond Now may review your story before you submit it.");

  const db = getRtdb();
  const now = Date.now();
  const id = push(ref(db, `storySubmissions/${input.userId}`)).key || `story_${now}`;
  const submission: StorySubmission = {
    ...input,
    id,
    title: input.title.trim(),
    story: input.story.trim(),
    status: "submitted",
    adminNote: "",
    submittedAt: now,
    reviewedAt: null,
    reviewedBy: "",
  };
  await set(ref(db, `storySubmissions/${input.userId}/${id}`), submission);
  return submission;
}

export function subscribeMyStorySubmissions(
  uid: string,
  onChange: (items: StorySubmission[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    return onValue(
      ref(fb.rtdb, `storySubmissions/${uid}`),
      (snap) => {
        if (!snap.exists()) return onChange([]);
        onChange(sortByRecent(Object.values(snap.val() as Record<string, StorySubmission>)));
      },
      (err) => onError?.(databaseErrorMessage(err)),
    );
  } catch (err) {
    onError?.(databaseErrorMessage(err));
    return noop;
  }
}

export function subscribeAllStorySubmissions(
  onChange: (items: StorySubmission[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) return noop;
  try {
    return onValue(
      ref(fb.rtdb, "storySubmissions"),
      (snap) => {
        if (!snap.exists()) return onChange([]);
        const byUser = snap.val() as Record<string, Record<string, StorySubmission>>;
        const all = Object.values(byUser).flatMap((items) => Object.values(items));
        onChange(sortByRecent(all));
      },
      (err) => onError?.(databaseErrorMessage(err)),
    );
  } catch (err) {
    onError?.(databaseErrorMessage(err));
    return noop;
  }
}

export async function reviewStorySubmission(
  submission: StorySubmission,
  updateData: { status: StorySubmissionStatus; adminNote?: string; reviewedBy: string },
): Promise<void> {
  const db = getRtdb();
  const patch = {
    status: updateData.status,
    adminNote: updateData.adminNote?.trim() || "",
    reviewedAt: Date.now(),
    reviewedBy: updateData.reviewedBy,
  };
  await update(ref(db, `storySubmissions/${submission.userId}/${submission.id}`), patch);

  const titles: Record<StorySubmissionStatus, string> = {
    submitted: "Your story was received",
    reviewing: "Your story is being reviewed",
    published: "Your story was shared",
    declined: "An update on your story",
  };
  const bodies: Record<StorySubmissionStatus, string> = {
    submitted: "Thank you for trusting Beyond Now with your experience.",
    reviewing: "A Beyond Now editor is reviewing it with care.",
    published: "Thank you for helping another young person feel less alone.",
    declined: "Thank you for sharing. We could not publish this version, but your voice matters.",
  };
  await pushNotification(submission.userId, {
    kind: "system",
    title: titles[updateData.status],
    body: updateData.adminNote?.trim() || bodies[updateData.status],
    href: "#/account/share-story",
  }).catch(() => undefined);
}