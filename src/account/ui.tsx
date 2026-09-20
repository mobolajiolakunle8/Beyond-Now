import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/utils/cn";

/* ------------------------------- shared UI ------------------------------- */

export function AcctBtn({
  children,
  variant = "outline",
  type = "button",
  onClick,
  disabled,
  className,
  size = "md",
}: {
  children: ReactNode;
  variant?: "primary" | "sun" | "outline" | "ghost" | "danger";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-[0.78rem]", md: "px-4 py-2.5 text-[0.85rem]", lg: "px-6 py-3 text-[0.95rem]" };
  const variants = {
    primary: "bg-navy text-white hover:bg-navy-soft shadow-lift",
    sun: "bg-sun text-navy-deep hover:bg-[#ffd35c]",
    outline: "border border-navy/15 bg-white text-navy hover:border-navy/40 hover:bg-bone",
    ghost: "text-charcoal/65 hover:bg-mist hover:text-navy",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function AcctField({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-display text-[0.72rem] font-bold tracking-[0.08em] text-charcoal/65 uppercase">
          {label}
        </span>
        {hint && <span className="text-[0.7rem] text-charcoal/45">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[0.75rem] font-medium text-red-600">{error}</span>}
    </label>
  );
}

export function AcctInput({
  type = "text",
  value,
  onChange,
  placeholder,
  invalid,
  autoComplete,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={cn(
        "w-full rounded-lg border bg-white px-3.5 py-2.5 text-[0.9rem] transition-colors placeholder:text-charcoal/35 focus:outline-none",
        invalid ? "border-red-400 focus:border-red-500" : "border-navy/15 focus:border-navy",
      )}
    />
  );
}

export function AcctTextArea({
  rows = 4,
  value,
  onChange,
  placeholder,
}: {
  rows?: number;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-y rounded-lg border border-navy/15 bg-white px-3.5 py-2.5 text-[0.9rem] leading-relaxed transition-colors placeholder:text-charcoal/35 focus:border-navy focus:outline-none"
    />
  );
}

/* ------------------------------- chrome ------------------------------- */

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-navy lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_20%_0%,#12407d_0%,#0b2d5b_50%,#061a38_100%)]" />
          <div className="dot-grid absolute inset-0 opacity-30" />
        </div>

        <a href="#home" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
            <LogoMark className="h-7 w-7" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-[-0.04em] text-white">
            BEYOND<span className="text-sun"> NOW</span>
          </span>
        </a>

        <div className="relative max-w-md">
          <p className="font-display text-[0.7rem] font-bold tracking-[0.24em] text-sun uppercase">
            Beyond Now · User account
          </p>
          <h1 className="mt-4 font-display text-[2.6rem] leading-[1.04] font-extrabold text-white">
            Today Is Not The Whole Story.
          </h1>
          <p className="mt-5 text-[1rem] leading-relaxed text-white/75">
            A private space to save resources, follow stories and message the Beyond Now team — synced across every
            device you sign in on.
          </p>
        </div>

        <p className="relative text-[0.72rem] font-semibold tracking-[0.22em] text-white/45 uppercase">
          Understand · Choose · Move Forward
        </p>
      </aside>

      <main className="flex items-center justify-center bg-bone px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-10 w-10" />
            <span className="font-display text-base font-extrabold tracking-[-0.04em] text-navy">
              BEYOND<span className="text-sun"> NOW</span>
            </span>
          </div>

          <h2 className="font-display text-[1.85rem] font-extrabold text-navy">{title}</h2>
          {subtitle && <p className="mt-2 text-[0.92rem] text-charcoal/65">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer}

          <a
            href="#home"
            className="mt-6 inline-flex items-center gap-2 text-[0.82rem] font-semibold text-charcoal/60 transition-colors hover:text-navy"
          >
            ← Back to the website
          </a>
        </div>
      </main>
    </div>
  );
}

/** Sidebar wrapper used by every authenticated user account page. */
export function AccountLayout({
  user,
  isAdmin = false,
  route,
  go,
  onSignOut,
  children,
}: {
  user: { name: string; email: string; avatarUrl: string };
  isAdmin?: boolean;
  route: string;
  go: (id: string) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bone lg:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-mist bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-mist p-2 text-navy"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
        <span className="font-display text-[0.92rem] font-bold text-navy">
          {NAV.find((n) => n.id === route)?.label ?? "My account"}
        </span>
        <a
          href="#home"
          className="ml-auto rounded-lg border border-mist px-2.5 py-1.5 font-display text-[0.72rem] font-semibold text-navy"
        >
          Website
        </a>
      </header>

      {/* Sidebar (desktop + mobile drawer) */}
      <div className={cn("fixed inset-0 z-[70] lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-navy-deep/60", open ? "opacity-100" : "opacity-0")} />
        <div className={cn("absolute inset-y-0 left-0 w-72 max-w-[85%] bg-navy transition-transform duration-300", open ? "translate-x-0" : "-translate-x-full")}>
          <Sidebar user={user} isAdmin={isAdmin} route={route} go={(r) => { go(r); setOpen(false); }} onSignOut={onSignOut} />
        </div>
      </div>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-navy lg:block">
        <Sidebar user={user} isAdmin={isAdmin} route={route} go={go} onSignOut={onSignOut} />
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

export const NAV: { id: string; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "◎" },
  { id: "profile", label: "My Profile", icon: "◍" },
  { id: "messages", label: "Messages", icon: "✉" },
  { id: "share-story", label: "Share your story", icon: "✎" },
  { id: "resources", label: "Library", icon: "▤" },
  { id: "saved", label: "Saved", icon: "✦" },
  { id: "progress", label: "Progress", icon: "↗" },
  { id: "notifications", label: "Notifications", icon: "♦" },
  { id: "privacy", label: "Privacy & Data", icon: "⛨" },
  { id: "settings", label: "Settings", icon: "⚙" },
  { id: "logout", label: "Logout", icon: "⏻" },
];

function Sidebar({
  user,
  isAdmin,
  route,
  go,
  onSignOut,
}: {
  user: { name: string; email: string; avatarUrl: string };
  isAdmin: boolean;
  route: string;
  go: (id: string) => void;
  onSignOut: () => void;
}) {
  return (
    <nav aria-label="Account" className="flex h-full flex-col">
      <a href="#home" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
          <LogoMark className="h-7 w-7" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[0.92rem] leading-tight font-extrabold tracking-[-0.04em] text-white">
            BEYOND<span className="text-sun"> NOW</span>
          </span>
          <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-white/45 uppercase">My account</span>
        </span>
      </a>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV.filter((n) => n.id !== "logout").map((item) => {
          const active = item.id === route;
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
                <span aria-hidden="true" className={cn("w-4 text-center text-[0.9rem]", active ? "text-sun" : "text-white/40")}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-white/10 px-4 py-4">
        {isAdmin && (
          <a
            href="#/admin"
            className="mb-3 flex items-center justify-between rounded-lg border border-sun/40 bg-sun/10 px-3 py-2 font-display text-[0.78rem] font-semibold text-sun transition-colors hover:bg-sun/20"
          >
            Admin dashboard
            <span aria-hidden="true">→</span>
          </a>
        )}
        <div className="mb-3 flex items-center gap-2.5">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sun font-display text-[0.78rem] font-bold text-navy-deep">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-display text-[0.78rem] font-bold text-white">{user.name || "Account"}</span>
            <span className="block truncate text-[0.68rem] text-white/45">{user.email}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 font-display text-[0.78rem] font-semibold text-white hover:bg-white/20"
        >
          <span aria-hidden="true">⏻</span>
          Sign out
        </button>
      </div>
    </nav>
  );
}

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[1.7rem] font-extrabold text-navy sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[0.9rem] text-charcoal/65">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-mist bg-bone/60 px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-navy/40 shadow-sm">
        {icon ?? "◇"}
      </span>
      <h4 className="mt-4 font-display text-[1.05rem] font-bold text-navy">{title}</h4>
      <p className="mx-auto mt-1.5 max-w-sm text-[0.85rem] text-charcoal/60">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Hook to set the page title on the fly. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

/**
 * Accessible, toast-free confirmation banner. Uses role="status" so screen
 * readers announce the result without stealing focus.
 */
export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "error";
  children: ReactNode;
}) {
  const tones = {
    info: "border-navy/15 bg-bone text-navy",
    success: "border-teal/30 bg-teal/10 text-teal-ink",
    warning: "border-sun/40 bg-sun/10 text-[#8a6500]",
    error: "border-red-200 bg-red-50 text-red-700",
  } as const;
  return (
    <div role={tone === "warning" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-[0.86rem] leading-relaxed", tones[tone])}>
      {children}
    </div>
  );
}
