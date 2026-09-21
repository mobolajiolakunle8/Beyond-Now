/**
 * Admin access code.
 *
 * The admin dashboard is no longer linked from the public site. It is reached
 * by visiting `#/admin?k=<code>`, which unlocks the panel for this browser
 * session. The code is an obfuscation layer that hides the URL — Firebase
 * Authentication remains the real security boundary.
 *
 * Change the code by setting VITE_ADMIN_ACCESS_CODE and redeploying.
 */

const SESSION_KEY = "bn.admin.unlocked";

export const ADMIN_ACCESS_CODE =
  (import.meta.env.VITE_ADMIN_ACCESS_CODE as string | undefined)?.trim() || "BN-2026";

/** Extracts an access code from a hash like `#/admin?k=BN-2026`. */
export function parseAccessCode(hash: string): string | null {
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return null;
  try {
    return new URLSearchParams(hash.slice(queryIndex + 1)).get("k");
  } catch {
    return null;
  }
}

export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === ADMIN_ACCESS_CODE;
  } catch {
    return false;
  }
}

export function unlockAdmin(code: string): boolean {
  if (code.trim() !== ADMIN_ACCESS_CODE) return false;
  try {
    sessionStorage.setItem(SESSION_KEY, ADMIN_ACCESS_CODE);
  } catch {
    /* private mode — the code stays valid for this tab only */
  }
  return true;
}

export function lockAdmin(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
