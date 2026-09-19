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
  const { content, media, ready } = useStore();
  const hash = useHashRoute();

  // Swap `media:<id>` references for real image URLs before rendering.
  const live = useMemo(() => resolveContentMedia(content, media), [content, media]);

  // The public website paints immediately from cache; only the dashboards wait
  // (and even they are bounded by the store's boot watchdog).
  const isApp = hash.startsWith("#/admin") || hash.startsWith("#/account");
  if (isApp && !ready) return <BootSplash />;

  return (
    <ContentProvider value={live}>
      {hash.startsWith("#/account") ? (
        <AccountApp />
      ) : hash.startsWith("#/admin") ? (
        <AdminApp route={hash.replace(/^#\/admin\/?/, "").split("/")[0]} />
      ) : (
        <LandingPage />
      )}
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
