import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AccountApp } from "@/account/AccountApp";
import { UserStoreProvider } from "@/account/UserStore";
import { AdminApp } from "@/admin/AdminApp";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LandingPage } from "@/components/LandingPage";
import { LogoMark } from "@/components/Logo";
import { isAdminUnlocked, parseAccessCode, unlockAdmin } from "@/lib/adminAccess";
import { resolveContentMedia } from "@/lib/media";
import { ContentProvider, StoreProvider, useStore } from "@/lib/store";

/** Reads the hash. Section anchors (#about) never match an app route. */
function useHashRoute() {
  const [hash, setHash] = useState(() => (typeof window === "undefined" ? "" : window.location.hash));
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function BootSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bone">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-navy/15" />
        <p className="mt-4 font-display text-sm font-semibold text-navy">Loading Beyond Now…</p>
      </div>
    </div>
  );
}

/**
 * Code-gated entrance to the admin dashboard. The dashboard is intentionally
 * unlisted on the public site; it is reached via `#/admin?k=<code>`.
 */
function AdminGate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (unlockAdmin(code)) {
      window.location.hash = "#/admin/overview";
    } else {
      setError("That code is not valid. Check the link and try again.");
      setCode("");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-navy px-5 py-12">
      <div aria-hidden="true" className="dot-grid pointer-events-none fixed inset-0 opacity-25" />
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white p-7 shadow-lift"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy">
            <LogoMark className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-[0.62rem] font-bold tracking-[0.22em] text-charcoal/50 uppercase">
              Beyond Now
            </p>
            <p className="font-display text-[1.05rem] font-extrabold text-navy">Restricted area</p>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block font-display text-[0.72rem] font-bold tracking-[0.08em] text-charcoal/70 uppercase">
            Access code
          </span>
          <input
            type="password"
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            placeholder="Enter your access code"
            className="w-full rounded-lg border border-navy/15 bg-bone px-3.5 py-2.5 font-display text-[0.9rem] tracking-widest text-charcoal focus:border-navy focus:outline-none"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] font-medium text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-sun px-5 py-3 font-display text-[0.9rem] font-semibold text-navy-deep transition-colors hover:bg-[#ffd35c]"
        >
          Unlock dashboard
        </button>
        <a
          href="#home"
          className="mt-4 inline-flex items-center gap-2 text-[0.8rem] font-semibold text-charcoal/60 transition-colors hover:text-navy"
        >
          ← Back to the public website
        </a>
      </form>
    </div>
  );
}

function Router() {
  const { content, media, ready } = useStore();
  const hash = useHashRoute();
  const [, bumpNav] = useState(0);

  // Swap `media:<id>` references for real image URLs before rendering.
  const live = useMemo(() => resolveContentMedia(content, media), [content, media]);

  // The dashboard is hidden from the public site and gated by an access code:
  // visiting `#/admin?k=<code>` unlocks this browser session exactly once.
  useEffect(() => {
    if (!hash.startsWith("#/admin")) return;
    const supplied = parseAccessCode(hash);
    if (supplied !== null && unlockAdmin(supplied)) {
      // Strip the code from the address bar, then re-render into the panel.
      window.history.replaceState(null, "", "#/admin/overview");
      bumpNav((n) => n + 1);
    }
  }, [hash]);

  // The public website paints immediately from cache; only the dashboards wait
  // (and even they are bounded by the store's boot watchdog).
  const isApp = hash.startsWith("#/admin") || hash.startsWith("#/account");
  if (isApp && !ready) return <BootSplash />;

  if (hash.startsWith("#/admin")) {
    if (parseAccessCode(hash) !== null && !isAdminUnlocked()) return <AdminGate />;
    if (!isAdminUnlocked()) return <AdminGate />;
    const section = hash.replace(/^#\/admin\/?/, "").split("?")[0].split("/")[0];
    return (
      <ContentProvider value={live}>
        <AdminApp route={section} />
      </ContentProvider>
    );
  }

  return (
    <ContentProvider value={live}>
      {hash.startsWith("#/account") ? <AccountApp /> : <LandingPage />}
    </ContentProvider>
  );
}

export default function App() {
  // UserStoreProvider sits at the root because the public navbar renders
  // account-aware controls and the admin dashboard reads the signed-in user.
  return (
    <ErrorBoundary>
      <StoreProvider>
        <UserStoreProvider>
          <Router />
        </UserStoreProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}
