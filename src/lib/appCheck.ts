import { initializeAppCheck, getToken, onTokenChanged, type AppCheck } from "firebase/app-check";
import { getFirebase } from "@/lib/firebase";

/**
 * Firebase App Check protects Realtime Database, Storage and callable
 * Cloud Functions from requests made outside the genuine Beyond Now app
 * (bots, scripts and abusive traffic).
 *
 * reCAPTCHA v3 is invisible to users; reCAPTCHA Enterprise is used only when
 * an explicit site key is provided. Activation is entirely server-side: once
 * the Firebase project enforces App Check, requests without a valid token are
 * rejected. This module simply ensures clients attach a token.
 *
 * Debug tokens are used automatically by the Firebase SDK when the app runs on
 * an allow-listed localhost origin, so local development is unaffected.
 */

type AppCheckState = {
  enabled: boolean;
  ready: boolean;
  token: string | null;
  error: string | null;
};

let appCheck: AppCheck | null = null;
let initPromise: Promise<AppCheckState> | null = null;

const state: AppCheckState = { enabled: false, ready: false, token: null, error: null };

function recaptchaSiteKey(): string | null {
  const explicit = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim();
  if (explicit) return explicit;
  // reCAPTCHA v3 uses the same key for both enterprise and v3 flows here.
  return (import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY as string | undefined)?.trim() || null;
}

/**
 * Initialises App Check once. Safe to call repeatedly and from any component.
 * Never throws: if App Check cannot start, the app continues to work normally
 * and `getAppCheckState()` reports why.
 */
export function initAppCheck(): Promise<AppCheckState> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const fb = getFirebase();
    if (!fb) {
      state.error = "Firebase is not configured.";
      state.ready = true;
      return state;
    }
    const siteKey = recaptchaSiteKey();
    if (!siteKey) {
      state.error = "App Check is optional. Add VITE_RECAPTCHA_V3_SITE_KEY to enable it.";
      state.ready = true;
      return state;
    }

    try {
      const { ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } = await import("firebase/app-check");
      const provider = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
        ? new ReCaptchaEnterpriseProvider(siteKey)
        : new ReCaptchaV3Provider(siteKey);
      appCheck = initializeAppCheck(fb.app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
      state.enabled = true;
      state.error = null;

      const token = await getToken(appCheck);
      state.token = token?.token ?? null;
      state.ready = true;

      onTokenChanged(appCheck, (result) => {
        state.token = result.token ?? null;
      });

      return state;
    } catch (err) {
      state.enabled = false;
      state.ready = true;
      state.error = err instanceof Error ? err.message : "App Check could not start.";
      return state;
    }
  })();

  return initPromise;
}

/** Current App Check status for the admin security panel. */
export function getAppCheckState(): AppCheckState {
  return { ...state };
}

