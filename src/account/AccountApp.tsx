import { useEffect, useState, type ComponentType } from "react";
import { ResetPasswordScreen, SignInScreen, SignUpScreen } from "@/account/AuthScreens";
import {
  DashboardPage,
  MessagesPage,
  NotificationsPage,
  PrivacyPage,
  ProfilePage,
  ProgressPage,
  ResourcesPage,
  SavedPage,
  ShareStoryPage,
  SettingsPage,
} from "@/account/Pages";
import { AccountLayout, NAV, useDocumentTitle } from "@/account/ui";
import { useUserStore } from "@/account/UserStore";
import { LogoMark } from "@/components/Logo";

const AUTH_ROUTES = new Set(["signin", "signup", "reset"]);
const PAGES: Record<string, ComponentType> = {
  dashboard: DashboardPage,
  profile: ProfilePage,
  messages: MessagesPage,
  resources: ResourcesPage,
  saved: SavedPage,
  progress: ProgressPage,
  notifications: NotificationsPage,
  privacy: PrivacyPage,
  "share-story": ShareStoryPage,
  settings: SettingsPage,
};

const go = (id: string) => {
  window.location.hash = `#/account/${id}`;
};

function consumeNextRoute(): string {
  try {
    const next = sessionStorage.getItem("bn.account.next");
    sessionStorage.removeItem("bn.account.next");
    return next === "messages" || next === "share-story" ? next : "dashboard";
  } catch {
    return "dashboard";
  }
}

function Splash({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bone">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-navy/15" />
        <p className="mt-4 font-display text-sm font-semibold text-navy">{message}</p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bone px-6">
      <div className="text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 font-display text-2xl font-extrabold text-navy">Page not found</h1>
        <a href="#/account/dashboard" className="mt-5 inline-block rounded-full bg-navy px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-navy-soft">
          Back to your dashboard
        </a>
      </div>
    </div>
  );
}

function useHashSegment() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash.replace(/^#\/account\/?/, "").split("/")[0] ?? "";
}

export function AccountApp() {
  const route = useHashSegment();
  const { authReady, authedUser, profile, isAdmin, signOutUser } = useUserStore();

  useDocumentTitle(`${NAV.find((n) => n.id === route)?.label ?? "Account"} · Beyond Now`);

  // Redirects are side effects, not render output.
  useEffect(() => {
    if (!authReady) return;
    if (!authedUser && !AUTH_ROUTES.has(route)) go("signin");
    if (authedUser && (AUTH_ROUTES.has(route) || route === "")) go(consumeNextRoute());
    if (authedUser && route === "logout") {
      void signOutUser().then(() => {
        window.location.hash = "#home";
      });
    }
  }, [authReady, authedUser, route, signOutUser]);

  if (!authReady) return <Splash message="Loading your account…" />;

  if (!authedUser) {
    if (route === "signup") return <SignUpScreen go={go} />;
    if (route === "reset") return <ResetPasswordScreen go={go} />;
    return <SignInScreen go={go} />;
  }

  if (route === "logout") return <Splash message="Signing you out…" />;

  const Page = PAGES[route];
  if (!Page) return AUTH_ROUTES.has(route) || route === "" ? <Splash message="Opening your dashboard…" /> : <NotFound />;

  return (
    <AccountLayout
      user={{
        name: profile?.name || authedUser.displayName || "Account",
        email: profile?.email || authedUser.email || "",
        avatarUrl: profile?.avatarUrl || "",
      }}
      isAdmin={isAdmin}
      route={route}
      go={go}
      onSignOut={() => go("logout")}
    >
      <Page />
    </AccountLayout>
  );
}
