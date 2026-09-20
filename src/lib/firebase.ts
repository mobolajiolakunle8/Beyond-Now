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

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

const REQUIRED = ["apiKey", "authDomain", "projectId", "storageBucket", "appId"] as const;

/** True when every required Vite env var is present and non-empty. */
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

/** Human-readable reason Firebase is unavailable, if any. */
export function firebaseInitError(): string | null {
  return initError;
}

/**
 * Lazily initialises the Firebase app and core services.
 *
 * This function is **guaranteed never to throw**. A bad config, a blocked
 * network or an unsupported browser degrades to `null` (local mode) instead of
 * taking the whole React tree down with an uncaught error.
 */
export function getFirebase(): FirebaseServices | null {
  if (cached !== undefined) return cached;
  if (!isFirebaseConfigured()) {
    initError = "Firebase env vars are missing.";
    cached = null;
    return null;
  }

  try {
    const app =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({
            apiKey: config.apiKey!,
            authDomain: config.authDomain!,
            projectId: config.projectId!,
            storageBucket: config.storageBucket!,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId!,
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

    // Analytics is strictly optional and must never block or break startup.
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

export function firestoreErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";

  switch (code) {
    case "permission-denied":
      return "Permission denied. Sign in as an administrator, or deploy the Firestore security rules.";
    case "unavailable":
      return "Firebase is temporarily unavailable. Your last local copy is still shown.";
    case "not-found":
      return "Cloud document not found yet. It will be created on the next save.";
    default:
      return err instanceof Error ? err.message : "Cloud sync failed.";
  }
}
