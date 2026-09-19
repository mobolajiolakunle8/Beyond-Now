/**
 * Helpers that run alongside the user account store to keep custom claim
 * presence in sync with the Firestore profile. The Firestore rules and
 * Cloud Functions (when deployed) are the source of truth for authorization.
 */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { UserProfile } from "@/lib/users";

/**
 * Lazily promotes a Firestore user document to admin by setting `role` and
 * `isAdmin`. The function name intentionally mirrors a Cloud Function that
 * should be deployed separately for production-grade claim enforcement:
 *
 *   exports.grantAdmin = functions.https.onCall(async (data, ctx) => {
 *     // require existing admin
 *     return admin.auth().setCustomUserClaims(uid, { isAdmin: true });
 *   });
 *
 * The version below writes the role in the user document so the UI can render
 * admin chrome immediately while you wire up the deployable Cloud Function.
 */
export async function grantAdminClaim(uid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  const ref = doc(fb.db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User profile not found.");
  await setDoc(ref, { role: "admin", updatedAt: Date.now() }, { merge: true });
}

export async function revokeAdminClaim(uid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  await setDoc(doc(fb.db, "users", uid), { role: "user", updatedAt: Date.now() }, { merge: true });
}

export async function isAdminProfile(uid: string): Promise<boolean> {
  const fb = getFirebase();
  if (!fb) return false;
  const snap = await getDoc(doc(fb.db, "users", uid));
  if (!snap.exists()) return false;
  return (snap.data() as UserProfile).role === "admin";
}
