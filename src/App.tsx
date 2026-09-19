import { useEffect, useMemo, useState } from "react";
import { AccountApp } from "@/account/AccountApp";
import { UserStoreProvider } from "@/account/UserStore";
import { AdminApp } from "@/admin/AdminApp";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LandingPage } from "@/components/LandingPage";
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

function Router() {
  const { published, draft, media, ready } = useStore();
  const hash = useHashRoute();

  // Swap `media:<id>` references for real image data before rendering.
  const livePublished = useMemo(() => resolveContentMedia(published, media), [published, media]);
  const liveDraft = useMemo(() => resolveContentMedia(draft, media), [draft, media]);

  // The public website renders IMMEDIATELY from the local cache (or defaults).
  // Cloud sync happens in the background — a slow or unavailable Firebase must
  // never blank the page. Only the dashboards wait, and even they are bounded
  // by the store's boot watchdog.
  if ((hash.startsWith("#/admin") || hash.startsWith("#/account")) && !ready) {
    return <BootSplash />;
  }

  // #/account/<section> → user dashboard, #/admin/<section> → CMS dashboard,
  // #/preview → draft render, anything else → public site.
  if (hash.startsWith("#/account")) {
    return (
      <ContentProvider value={livePublished}>
        <AccountApp />
      </ContentProvider>
    );
  }

  if (hash.startsWith("#/admin")) {
    const route = hash.replace(/^#\/admin\/?/, "").split("/")[0];
    return (
      <ContentProvider value={liveDraft}>
        <AdminApp route={route} />
      </ContentProvider>
    );
  }

  if (hash.startsWith("#/preview")) {
    return (
      <ContentProvider value={liveDraft}>
        <div className="relative">
          <div className="pointer-events-none fixed top-3 left-1/2 z-[100] -translate-x-1/2">
            <span className="rounded-full bg-navy/90 px-3.5 py-1.5 font-display text-[0.68rem] font-bold tracking-[0.14em] text-sun uppercase shadow-lg backdrop-blur">
              Draft preview
            </span>
          </div>
          <LandingPage applySeo={false} />
        </div>
      </ContentProvider>
    );
  }

  return (
    <ContentProvider value={livePublished}>
      <LandingPage />
    </ContentProvider>
  );
}

export default function App() {
  // UserStoreProvider sits at the root because the PUBLIC navbar renders
  // account-aware controls (sign in / my account). Nesting it only inside the
  // account app made the landing page throw on first render.
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
