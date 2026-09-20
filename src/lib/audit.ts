import { push, ref, serverTimestamp, set, update } from "firebase/database";
import { getFirebase } from "@/lib/firebase";
import type { RiskAssessment } from "@/lib/safeguarding";

/**
 * Append-only safeguarding and administrator audit trail.
 *
 * These records are written server-side in production where possible. The
 * client-side writer below is used for immediate flagging so a safeguarding
 * lead sees the case even before Cloud Functions run.
 */

export type AuditAction =
  | "safeguarding.flagged"
  | "safeguarding.escalated"
  | "safeguarding.resolved"
  | "admin.content.edit"
  | "admin.user.status"
  | "admin.user.role"
  | "admin.story.publish"
  | "admin.story.decline"
  | "admin.library.toggle"
  | "admin.settings.edit";

export type CaseStatus = "open" | "escalated" | "resolved";

export type SafeguardingCase = {
  id: string;
  threadId: string;
  userId: string;
  userName: string;
  userEmail: string;
  messageId: string;
  excerpt: string;
  level: "elevated" | "urgent";
  categories: string[];
  matched: string[];
  status: CaseStatus;
  assignedTo: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
};

export type AuditRecord = {
  id: string;
  action: AuditAction;
  actorUid: string;
  actorEmail: string;
  actorRole: "admin" | "user" | "system";
  targetPath: string;
  detail: string;
  /** Server timestamp sentinel when written, or epoch ms when reconstructed. */
  createdAt: number | object | null;
};

function safeExcerpt(text: string, limit = 240): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

/**
 * Raises a safeguarding case. Called by the client when a user message is
 * screened as elevated or urgent, so a safeguarding lead is alerted immediately.
 */
export async function raiseSafeguardingCase(input: {
  threadId: string;
  userId: string;
  userName: string;
  userEmail: string;
  messageId: string;
  text: string;
  assessment: RiskAssessment;
}): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  const now = Date.now();
  const id = push(ref(fb.rtdb, "safeguardingCases")).key || `case_${now}`;
  const record: SafeguardingCase = {
    id,
    threadId: input.threadId,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    messageId: input.messageId,
    excerpt: safeExcerpt(input.text),
    level: input.assessment.level === "urgent" ? "urgent" : "elevated",
    categories: input.assessment.categories,
    matched: input.assessment.matched,
    status: input.assessment.level === "urgent" ? "escalated" : "open",
    assignedTo: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  };

  // Writes are best-effort: an audit failure must never block the member from
  // sending a message or from seeing crisis information.
  await set(ref(fb.rtdb, `safeguardingCases/${id}`), record).catch(() => undefined);
  await set(ref(fb.rtdb, `auditLog/${id}`), {
    id,
    action: "safeguarding.flagged" as AuditAction,
    actorUid: input.userId,
    actorEmail: input.userEmail,
    actorRole: "user" as const,
    targetPath: `threads/${input.threadId}/messages/${input.messageId}`,
    detail: `Automatic screening flagged ${input.assessment.level} risk (${input.assessment.categories.join(", ") || "unspecified"}).`,
    createdAt: serverTimestamp(),
  } satisfies AuditRecord).catch(() => undefined);
}

/** Administrator action on a safeguarding case. */
export async function updateSafeguardingCase(
  caseId: string,
  patch: { status?: CaseStatus; assignedTo?: string; notes?: string },
  actor: { uid: string; email: string },
): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  await update(ref(fb.rtdb, `safeguardingCases/${caseId}`), {
    ...patch,
    updatedAt: Date.now(),
    ...(patch.status === "resolved" ? { resolvedAt: Date.now() } : {}),
  });
  await set(ref(fb.rtdb, `auditLog/${caseId}_${Date.now()}`), {
    id: `${caseId}_${Date.now()}`,
    action: (patch.status === "resolved"
      ? "safeguarding.resolved"
      : patch.status === "escalated"
        ? "safeguarding.escalated"
        : "safeguarding.flagged") as AuditAction,
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: "admin" as const,
    targetPath: `safeguardingCases/${caseId}`,
    detail: `Status: ${patch.status ?? "unchanged"}${patch.assignedTo ? `, assigned to ${patch.assignedTo}` : ""}`,
    createdAt: serverTimestamp(),
  } satisfies AuditRecord).catch(() => undefined);
}

