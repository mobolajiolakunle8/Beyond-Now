import { useEffect, useState } from "react";
import { Login } from "@/admin/Login";
import { ResourcesAdmin, StoriesAdmin } from "@/admin/sections/Collections";
import { ContentEditor } from "@/admin/sections/ContentEditor";
import { Overview, PreviewPage } from "@/admin/sections/Dashboard";
import { AccountPage, MediaLibraryPage, SettingsPage } from "@/admin/sections/Library";
import { ArticlesAdmin, MessagesAdmin, UsersAdmin } from "@/admin/sections/UserManagement";
import { AdminBtn, ToastStack } from "@/admin/ui";
import { LogoMark } from "@/components/Logo";
import { relativeTime } from "@/lib/media";
import { useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

const NAV = [
  { id: "overview", label: "Overview", icon: "◎" },
  { id: "content", label: "Website Content", icon: "✎" },
  { id: "stories", label: "Stories", icon: "❝" },
  { id: "resources", label: "Resources", icon: "▤" },
  { id: "articles", label: "Articles", icon: "≡" },
  { id: "media", label: "Media Library", icon: "▣" },
  { id: "users", label: "Users", icon: "◍" },
  { id: "messages", label: "Messages", icon: "✉" },
  { id: "settings", label: "Site Settings", icon: "⚙" },
  { id: "preview", label: "Preview", icon: "▷" },
  { id: "account", label: "Admin Account", icon: "▙" },
] as const;

type RouteId = (typeof NAV)[number]["id"];

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

function Restricted({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bone px-6">
      <div className="w-full max-w-md rounded-2xl border border-mist bg-white p-8 text-center shadow-card">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-5 font-display text-2xl font-extrabold text-navy">Administrators only</h1>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-charcoal/65">
          <strong className="text-navy">{email}</strong> is signed in as a member, not an administrator. Your account and messages are available in your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <AdminBtn variant="primary" onClick={() => (window.location.hash = "#/account/dashboard")}>Go to my account</AdminBtn>
          <AdminBtn variant="outline" onClick={onSignOut}>Sign out</AdminBtn>
        </div>
      </div>
    </div>
  );
}

export function AdminApp({ route }: { route: string }) {
  const { isAuthed, isAdmin, ready, account, logout, saving, updatedAt, cloudEnabled, syncStatus } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = (NAV.find((n) => n.id === route)?.id ?? "overview") as RouteId;

  const go = (id: string) => {
    window.location.hash = `#/admin/${id}`;
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    document.title = `Beyond Now — ${NAV.find((n) => n.id === current)?.label ?? "Dashboard"}`;
  }, [current]);

  // Never let the tab close while an edit is still being written.
  useEffect(() => {
    if (!saving) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saving]);

  if (!ready) return <Splash message={cloudEnabled ? "Connecting to Firebase…" : "Loading dashboard…"} />;
  if (!isAuthed) {
    return (
      <>
        <Login />
        <ToastStack />
      </>
    );
  }
  if (!isAdmin) {
    return (
      <>
        <Restricted email={account?.email ?? ""} onSignOut={() => void logout()} />
        <ToastStack />
      </>
    );
  }

  const statusBadge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[0.68rem] font-bold tracking-[0.08em] uppercase",
        saving ? "bg-sun/20 text-[#8a6500]" : syncStatus === "error" ? "bg-red-100 text-red-700" : "bg-teal/12 text-teal-ink",
      )}
      title={cloudEnabled ? `Firebase ${syncStatus}` : "Running without Firebase"}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", saving ? "animate-pulse bg-sun-deep" : syncStatus === "error" ? "bg-red-500" : "bg-teal")} />
      {saving ? "Publishing…" : syncStatus === "error" ? "Sync error" : "Live"}
    </span>
  );

  const sidebar = (
    <nav aria-label="Dashboard" className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
          <LogoMark className="h-7 w-7" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[0.92rem] leading-tight font-extrabold tracking-[-0.04em] text-white">
            BEYOND<span className="text-sun"> NOW</span>
          </span>
          <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-white/45 uppercase">Admin dashboard</span>
        </span>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const active = item.id === current;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-display text-[0.85rem] font-semibold transition-colors",
                  active ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/8 hover:text-white",
                )}
              >
                <span aria-hidden="true" className={cn("w-4 text-center text-[0.9rem]", active ? "text-sun" : "text-white/40")}>{item.icon}</span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sun font-display text-[0.75rem] font-bold text-navy-deep">
            {(account?.name ?? "A").slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-[0.78rem] font-bold text-white">{account?.name ?? "Administrator"}</span>
            <span className="block truncate text-[0.68rem] text-white/45">{account?.email}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <a href="#home" className="flex-1 rounded-lg border border-white/20 px-2.5 py-2 text-center font-display text-[0.72rem] font-semibold text-white/75 transition-colors hover:bg-white/10">
            View site
          </a>
          <button type="button" onClick={() => void logout()} className="flex-1 rounded-lg bg-white/10 px-2.5 py-2 font-display text-[0.72rem] font-semibold text-white transition-colors hover:bg-white/20">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-bone lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-navy lg:block">{sidebar}</aside>

      <div className={cn("fixed inset-0 z-[70] lg:hidden", menuOpen ? "" : "pointer-events-none")} aria-hidden={!menuOpen}>
        <div onClick={() => setMenuOpen(false)} className={cn("absolute inset-0 bg-navy-deep/60 transition-opacity", menuOpen ? "opacity-100" : "opacity-0")} />
        <div className={cn("absolute inset-y-0 left-0 w-72 max-w-[85%] bg-navy transition-transform duration-300", menuOpen ? "translate-x-0" : "-translate-x-full")}>
          {sidebar}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-mist bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open dashboard menu" className="rounded-lg border border-mist p-2 text-navy lg:hidden">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[0.9rem] font-bold text-navy">{NAV.find((n) => n.id === current)?.label}</p>
            <p className="truncate text-[0.72rem] text-charcoal/55">
              {saving ? "Saving your change…" : "All changes publish automatically"}
              {updatedAt && ` · updated ${relativeTime(updatedAt)}`}
            </p>
          </div>
          {statusBadge}
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {current === "overview" && <Overview go={go} />}
          {current === "content" && <ContentEditor toolbar={statusBadge} />}
          {current === "stories" && <StoriesAdmin toolbar={statusBadge} />}
          {current === "resources" && <ResourcesAdmin toolbar={statusBadge} />}
          {current === "articles" && <ArticlesAdmin />}
          {current === "media" && <MediaLibraryPage />}
          {current === "users" && <UsersAdmin />}
          {current === "messages" && <MessagesAdmin />}
          {current === "settings" && <SettingsPage toolbar={statusBadge} />}
          {current === "preview" && <PreviewPage toolbar={statusBadge} />}
          {current === "account" && <AccountPage />}
        </main>
      </div>

      <ToastStack />
    </div>
  );
}
