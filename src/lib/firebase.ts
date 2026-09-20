import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
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

export const firebaseConfig = {
  apiKey: "AIzaSyBFCcuKcHSPsMIKK3o5kZjFnfoKaRPG5Sw",
  authDomain: "beyond-now-14935.firebaseapp.com",
  databaseURL: "https://beyond-now-14935-default-rtdb.firebaseio.com",
  projectId: "beyond-now-14935",
  storageBucket: "beyond-now-14935.firebasestorage.app",
  messagingSenderId: "198562263965",
  appId: "1:198562263965:web:26b12df22078a93886b574",
  measurementId: "G-SHHCW15QQJ",
};

const config = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() || firebaseConfig.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() || firebaseConfig.authDomain,
  databaseURL: (import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined)?.trim() || firebaseConfig.databaseURL,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() || firebaseConfig.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined)?.trim() || firebaseConfig.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim() || firebaseConfig.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim() || firebaseConfig.appId,
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined)?.trim() || firebaseConfig.measurementId,
};

// Robust, direct, single-instance initialization
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

let analyticsInstance: Analytics | null = null;
if (typeof window !== "undefined" && config.measurementId) {
  analyticsSupported()
    .then((supported) => (supported ? getAnalytics(app) : null))
    .then((instance) => {
      analyticsInstance = instance;
    })
    .catch(() => {
      // Analytics is optional and non-blocking
    });
}

/** Always true because Firebase credentials are fully configured. */
export function isFirebaseConfigured(): boolean {
  return true;
}

export const ADMIN_EMAIL =
  (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() || "beyondnow.ng@gmail.com";

export const ADMIN_NAME =
  (import.meta.env.VITE_ADMIN_NAME as string | undefined)?.trim() || "Master Administrator";

export function getFirebase(): FirebaseServices {
  return {
    app,
    auth,
    db,
    storage,
    analytics: analyticsInstance,
  };
}

export function getAnalyticsInstance(): Promise<Analytics | null> {
  return Promise.resolve(analyticsInstance);
}

/** Friendly mapping of Firebase Auth error codes for sign-in and sign-up screens. */
export function authErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";

  switch (code) {
    case "auth/invalid-email":
      return "That email address is not valid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
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
      return "Firebase is temporarily unavailable. Your last cached copy is shown.";
    case "not-found":
      return "Document not found.";
    default:
      return err instanceof Error ? err.message : "Cloud sync failed.";
  }
}
