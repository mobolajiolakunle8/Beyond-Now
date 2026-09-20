import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
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

/**
 * Canonical Beyond Now web configuration.
 *
 * These values are **compiled into the bundle on purpose**. A Firebase web
 * config is public by design — it identifies the project, it does not authorise
 * anything. All authorisation is enforced by Firestore/Storage security rules
 * and Firebase Authentication.
 *
 * Hardcoding it removes an entire class of production failures: a missing or
 * un-copied `.env` during a CI build previously produced an app that could not
 * reach Firebase at all ("Firebase is not configured"). Environment variables
 * are still honoured as an override so a second environment (staging, a fork)
 * can point at its own project without touching code.
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBFCcuKcHSPsMIKK3o5kZjFnfoKaRPG5Sw",
  authDomain: "beyond-now-14935.firebaseapp.com",
  databaseURL: "https://beyond-now-14935-default-rtdb.firebaseio.com",
  projectId: "beyond-now-14935",
  storageBucket: "beyond-now-14935.firebasestorage.app",
  messagingSenderId: "198562263965",
  appId: "1:198562263965:web:26b12df22078a93886b574",
  measurementId: "G-SHHCW15QQJ",
} as const;

/** `import.meta.env` is undefined in some non-Vite runtimes (tests, SSR probes). */
function env(key: string): string | undefined {
  try {
    const bag = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const value = bag?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

const config = {
  apiKey: env("VITE_FIREBASE_API_KEY") ?? FIREBASE_CONFIG.apiKey,
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN") ?? FIREBASE_CONFIG.authDomain,
  databaseURL: env("VITE_FIREBASE_DATABASE_URL") ?? FIREBASE_CONFIG.databaseURL,
  projectId: env("VITE_FIREBASE_PROJECT_ID") ?? FIREBASE_CONFIG.projectId,
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET") ?? FIREBASE_CONFIG.storageBucket,
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID") ?? FIREBASE_CONFIG.messagingSenderId,
  appId: env("VITE_FIREBASE_APP_ID") ?? FIREBASE_CONFIG.appId,
  measurementId: env("VITE_FIREBASE_MEASUREMENT_ID") ?? FIREBASE_CONFIG.measurementId,
};

export const PROJECT_ID = config.projectId;

export const ADMIN_EMAIL = (env("VITE_ADMIN_EMAIL") ?? "beyondnow.ng@gmail.com").toLowerCase();
export const ADMIN_NAME = env("VITE_ADMIN_NAME") ?? "Master Administrator";

/** The config is compiled in, so this is always true outside a broken bundle. */
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let services: FirebaseServices | null = null;
let initError: string | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

/** Human-readable reason Firebase is unavailable, if any. */
export function firebaseInitError(): string | null {
  return initError;
}

/**
 * Returns the initialised Firebase services, or `null` if the SDK genuinely
 * cannot start in this browser.
 *
 * Never throws. Unlike the previous implementation it also never caches a
 * failure permanently — a transient error (storage partitioned, extension
 * interference, SDK still loading) is retried on the next call, so the app
 * heals itself instead of staying dead until a reload.
 */
export function getFirebase(): FirebaseServices | null {
  if (services) return services;
  if (!isFirebaseConfigured()) {
    initError = "The Firebase configuration compiled into this build is incomplete.";
    return null;
  }

  try {
    const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
    services = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
      analytics: null,
    };
    initError = null;

    // Analytics is optional and must never block or break startup.
    if (typeof window !== "undefined" && config.measurementId) {
      analyticsPromise = analyticsSupported()
        .then((ok) => (ok ? getAnalytics(app) : null))
        .then((analytics) => {
          if (services) services.analytics = analytics;
          return analytics;
        })
        .catch(() => null);
    }
  } catch (err) {
    initError = err instanceof Error ? err.message : "Firebase could not start in this browser.";
    services = null; // retried on the next call
  }
  return services;
}

// Start initialisation as early as possible so the first render already has
// Auth/Firestore available, rather than waiting for the first consumer.
if (typeof window !== "undefined") getFirebase();

export function getAnalyticsInstance(): Promise<Analytics | null> {
  getFirebase();
  return analyticsPromise ?? Promise.resolve(null);
}

function codeOf(err: unknown): string {
  return err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
}

/** Friendly mapping of Firebase Auth error codes. */
export function authErrorMessage(err: unknown): string {
  switch (codeOf(err)) {
    case "auth/invalid-email":
      return "That email address does not look valid.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact Beyond Now.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "That email and password do not match an account.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/weak-password":
      return "Please choose a password with at least 6 characters.";
    case "auth/requires-recent-login":
      return "For security, please sign out and sign back in before changing your password.";
    case "auth/operation-not-allowed":
      return "Email sign-in is not enabled yet. In the Firebase console open Authentication → Sign-in method and enable Email/Password.";
    case "auth/unauthorized-domain":
      return "This web address is not authorised. Add it under Authentication → Settings → Authorized domains in the Firebase console.";
    default:
      return err instanceof Error ? err.message : "Sign-in failed. Please try again.";
  }
}

/**
 * Friendly mapping for Firestore/Storage failures. `permission-denied` almost
 * always means the security rules in this repository have not been deployed,
 * so the copy says exactly that instead of leaking the raw SDK string.
 */
export function firestoreErrorMessage(err: unknown): string {
  const code = codeOf(err);
  const raw = err instanceof Error ? err.message : "";

  if (code === "permission-denied" || /insufficient permissions/i.test(raw)) {
    return "The server rejected this request because the Beyond Now security rules have not been deployed yet. An administrator can fix it by running: npm run deploy:rules";
  }
  switch (code) {
    case "unavailable":
      return "Cannot reach Firebase right now. We will keep retrying automatically.";
    case "failed-precondition":
      return "Firestore is not ready. In the Firebase console open Firestore Database and create the database, then deploy the rules.";
    case "not-found":
      return "That record does not exist yet. It will be created on the next save.";
    case "unauthenticated":
      return "Your session expired. Please sign in again.";
    default:
      return raw || "Cloud sync failed.";
  }
}

/** True when the failure is a rules/permission problem rather than a bug. */
export function isPermissionError(err: unknown): boolean {
  return codeOf(err) === "permission-denied" || /insufficient permissions|permission-denied/i.test(err instanceof Error ? err.message : "");
}
