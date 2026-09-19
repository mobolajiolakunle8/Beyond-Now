import { useEffect, useState } from "react";
import { useUserStore } from "@/account/UserStore";
import { SignInScreen, SignUpScreen, ResetPasswordScreen } from "@/account/AuthScreens";
import {
  DashboardPage,
  MessagesPage,
  NotificationsPage,
  ProfilePage,
  ProgressPage,
  ResourcesPage,
  SavedPage,
  SettingsPage,
} from "@/account/Pages";
import { AccountLayout, useDocumentTitle } from "@/account/ui";
import { AdminApp } from "@/admin/AdminApp";
import { LogoMark } from "@/components/Logo";

const AUTH_ROUTES = new Set(["signin", "signup", "reset"]);

function AuthGate({ route, go }: { route: string; go: (id: string) => void }) {
  if (route === "signup") return <SignUpScreen go={go} />;
  if (route === "reset") return <ResetPasswordScreen go={go} />;
  return <SignInScreen go={go} />;
}

function LoadingSplash({ message }: { message: string }) {
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
        <p className="mt-2 text-charcoal/65">The page you are looking for does not exist.</p>
        <a
          href="#home"
          className="mt-5 inline-block rounded-full bg-navy px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-navy-soft"
        >
          Back to the website
        </a>
      </div>
    </div>
  );
}

function SignedInRoutes({ route, go }: { route: string; go: (id: string) => void }) {
  const { profile, signOutUser } = useUserStore();
  const display = {
    name: profile?.name || "Account",
    email: profile?.email || "",
    avatarUrl: profile?.avatarUrl || "",
  };

  if (route === "logout") {
    void signOutUser();
    window.location.hash = "#home";
    return null;
  }

  useDocumentTitle(`${NAV_LABEL[route] ?? "Account"} · Beyond Now`);

  return (
    <AccountLayout user={display} route={route} go={go} onSignOut={() => void signOutUser()}>
      {route === "dashboard" && <DashboardPage />}
      {route === "profile" && <ProfilePage />}
      {route === "messages" && <MessagesPage />}
      {route === "resources" && <ResourcesPage />}
      {route === "saved" && <SavedPage />}
      {route === "progress" && <ProgressPage />}
      {route === "notifications" && <NotificationsPage />}
      {route === "settings" && <SettingsPage />}
    </AccountLayout>
  );
}

const NAV_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  profile: "My Profile",
  messages: "Messages",
  resources: "Resources",
  saved: "Saved",
  progress: "Progress",
  notifications: "Notifications",
  settings: "Settings",
};

function SignedOutRouter({ route }: { route: string }) {
  const { authReady, authedUser } = useUserStore();
  const go = (id: string) => {
    window.location.hash = `#/account/${id}`;
  };
  void go;
  if (!authReady) {
    return <LoadingSplash message="Loading your account…" />;
  }
  if (authedUser && !AUTH_ROUTES.has(route)) {
    // Signed in but landed on a signed-out page: send to dashboard.
    window.location.hash = "#/account/dashboard";
    return <LoadingSplash message="Opening your dashboard…" />;
  }
  return <AuthGate route={route || "signin"} go={go} />;
}

function AccountRouter({ route }: { route: string }) {
  const { authReady, authedUser, profile } = useUserStore();
  if (!authReady) {
    return <LoadingSplash message="Loading your account…" />;
  }

  if (!authedUser) {
    return <SignedOutRouter route={route} />;
  }

  // Admin users have a full admin dashboard. Detect on profile.role or claim.
  const isAdmin = profile?.role === "admin";
  if (isAdmin && route !== "admin") {
    // Allow admin to peek at their user account; otherwise route to admin.
  }
  if (route === "admin") {
    return <AdminApp route="overview" />;
  }

  // If signed in but landed on an auth route, jump to dashboard.
  if (AUTH_ROUTES.has(route)) {
    window.location.hash = "#/account/dashboard";
    return <LoadingSplash message="Opening your dashboard…" />;
  }
  if (!NAV_LABEL[route]) return <NotFound />;

  return <SignedInRoutes route={route} go={(id) => (window.location.hash = `#/account/${id}`)} />;
}

function AccountShell() {
  const [hash, setHash] = useState<string>(() => (typeof window === "undefined" ? "" : window.location.hash));
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const cleaned = hash.replace(/^#\/account\/?/, "").split("/")[0] ?? "";
  return <AccountRouter route={cleaned} />;
}

/**
 * The user account shell.
 *
 * `UserStoreProvider` is intentionally NOT mounted here — it is provided once
 * at the application root (see `App.tsx`) so the public navbar and the admin
 * dashboard can also read the signed-in user. Nesting it again here would
 * attach a second set of Firebase auth/profile listeners.
 */
export function AccountApp() {
  return <AccountShell />;
}
