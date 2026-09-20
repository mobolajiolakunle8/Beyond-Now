import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  analytics: Analytics | null;
};

// Official Beyond Now Firebase credentials provided by project setup
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBFCcuKcHSPsMIKK3o5kZjFnfoKaRPG5Sw",
  authDomain: "beyond-now-14935.firebaseapp.com",
  databaseURL: "https://beyond-now-14935-default-rtdb.firebaseio.com",
  projectId: "beyond-now-14935",
  storageBucket: "beyond-now-14935.firebasestorage.app",
  messagingSenderId: "198562263965",
  appId: "1:198562263965:web:26b12df22078a93886b574",
  measurementId: "G-SHHCW15QQJ",
};

// Allow environment variables to override if present, but fallback to project defaults
const config = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() || DEFAULT_FIREBASE_CONFIG.authDomain,
  databaseURL: (import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined)?.trim() || DEFAULT_FIREBASE_CONFIG.databaseURL,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined)?.trim() || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim() || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim() || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined)?.trim() || DEFAULT_FIREBASE_CONFIG.measurementId,
};

const REQUIRED = ["apiKey", "authDomain", "projectId", "storageBucket", "appId"] as const;

/** Always true because default credentials for beyond-now-14935 are embedded. */
export function isFirebaseConfigured(): boolean {
  return REQUIRED.every((key) => Boolean(config[key]?.trim()));
}

export const ADMIN_EMAIL =
  (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() || "beyondnow.ng@gmail.com";

export const ADMIN_NAME =
  (import.meta.env.VITE_ADMIN_NAME as string | undefined)?.trim() || "Master Administrator";

let cached: FirebaseServices | null | undefined;
let initError: string | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

export function firebaseInitError(): string | null {
  return initError;
}

/**
 * Initializes the Firebase app and core services.
 * Embedded defaults guarantee it always connects to beyond-now-14935.
 */
export function getFirebase(): FirebaseServices | null {
  if (cached !== undefined) return cached;

  try {
    const app =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            databaseURL: config.databaseURL,
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId,
            measurementId: config.measurementId || undefined,
          });

    cached = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
      analytics: null,
    };
    initError = null;

    if (typeof window !== "undefined" && config.measurementId && app) {
      analyticsPromise = analyticsSupported()
        .then((ok) => (ok ? getAnalytics(app) : null))
        .then((analytics) => {
          if (cached) cached.analytics = analytics;
          return analytics;
        })
        .catch(() => null);
    }
  } catch (err) {
    initError = err instanceof Error ? err.message : "Firebase could not start.";
    cached = null;
  }
  return cached;
}

export function getAnalyticsInstance(): Promise<Analytics | null> {
  getFirebase();
  return analyticsPromise ?? Promise.resolve(null);
}

/** Friendly mapping of Firebase Auth error codes for the login screen. */
export function authErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";

  switch (code) {
    case "auth/invalid-email":
      return "That email address does not look valid.";
    case "auth/user-disabled":
      return "This administrator account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Those details do not match an administrator account.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/requires-recent-login":
      return "For security, please sign out and sign back in before changing your password.";
    default:
      return err instanceof Error ? err.message : "Authentication failed. Please try again.";
  }
}

/** Extracts a Firebase error code such as `permission-denied` or `storage/unauthorized`. */
export function firebaseErrorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const code = "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
  if (code) return code.replace(/^firestore\//, "");
  // Some SDK paths only expose the message ("Missing or insufficient permissions.").
  const msg = err instanceof Error ? err.message : "";
  if (/insufficient permissions|permission[- ]denied/i.test(msg)) return "permission-denied";
  if (/unavailable|network/i.test(msg)) return "unavailable";
  return "";
}

export function isPermissionError(err: unknown): boolean {
  const code = firebaseErrorCode(err);
  return code === "permission-denied" || code === "storage/unauthorized" || code === "storage/unauthenticated";
}

/**
 * Translates a Firestore / Storage error into copy a person can act on.
 *
 * `audience` shapes the advice: administrators are told how to repair the
 * project, members are reassured and told the team has been alerted.
 */
export function firestoreErrorMessage(err: unknown, audience: "admin" | "member" = "admin"): string {
  const code = firebaseErrorCode(err);

  switch (code) {
    case "permission-denied":
    case "storage/unauthorized":
      return audience === "admin"
        ? `Firebase rejected the request. The security rules in this project have not been published yet, or you are not signed in as ${ADMIN_EMAIL}. Publish the rules (npm run deploy:rules) and retry.`
        : "We couldn't reach your account data just now. This is a setup issue on our side, not yours — please try again in a moment.";
    case "storage/unauthenticated":
      return "Your session has expired. Please sign in again.";
    case "unavailable":
      return "Firebase is temporarily unreachable. Showing your last saved copy — we will reconnect automatically.";
    case "failed-precondition":
      return "Firestore needs an index for this query. Check the browser console for the one-click index link.";
    case "resource-exhausted":
      return "Firebase quota reached for today. Please try again later.";
    case "not-found":
      return "That record does not exist yet. It will be created on the next save.";
    case "unauthenticated":
      return "Your session has expired. Please sign in again.";
    default:
      return err instanceof Error && err.message ? err.message : "Cloud sync failed. Please try again.";
  }
}
