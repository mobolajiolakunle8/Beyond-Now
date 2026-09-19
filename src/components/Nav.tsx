import { useEffect, useMemo, useRef, useState } from "react";
import { Logo, WhatsAppIcon } from "@/components/Logo";
import { ArrowRight, Btn } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";
import { useUserStore } from "@/account/UserStore";
import { useActiveSection, useScrolled } from "@/hooks/useInView";
import { cn } from "@/utils/cn";

const TALK_MESSAGE =
  "Hello Beyond Now. I would like to talk to someone about what I'm going through.";

export function Nav() {
  const { nav, brand } = useContent();
  const wa = useWa();
  const { authedUser, profile } = useUserStore();
  const NAV_LINKS = nav.links;
  const sectionIds = useMemo(() => NAV_LINKS.map((l) => l.href.replace("#", "")), [NAV_LINKS]);
  const scrolled = useScrolled(30);
  const active = useActiveSection(sectionIds);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("no-scroll");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onLight = scrolled && !open;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          onLight
            ? "border-b border-navy/10 bg-white/85 shadow-[0_10px_30px_-24px_rgba(11,45,91,0.5)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex w-full max-w-[80rem] items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-12">
          <a
            href="#home"
            aria-label="Beyond Now — home"
            onClick={() => setOpen(false)}
            className="shrink-0"
          >
            <Logo variant={onLight ? "dark" : "light"} markClassName="h-9 w-9 sm:h-10 sm:w-10" />
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = active === link.href.replace("#", "");
              return (
                <a
                  key={link.id}
                  href={link.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 font-display text-[0.86rem] font-semibold transition-colors duration-300",
                    onLight
                      ? isActive
                        ? "text-navy"
                        : "text-charcoal/60 hover:text-navy"
                      : isActive
                        ? "text-white"
                        : "text-white/65 hover:text-white",
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-3.5 -bottom-0.5 h-[2px] origin-left rounded-full transition-transform duration-300",
                      onLight ? "bg-teal" : "bg-sun",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            {authedUser ? (
              <a
                href="#/account"
                className={cn(
                  "hidden items-center gap-2 rounded-full px-3 py-1.5 font-display text-[0.78rem] font-semibold transition-colors sm:inline-flex",
                  onLight ? "bg-navy text-white hover:bg-navy-soft" : "border border-white/25 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-sun text-[0.7rem] font-bold text-navy-deep">
                    {(profile?.name || authedUser.email || "?")[0]?.toUpperCase()}
                  </span>
                )}
                <span>My account</span>
              </a>
            ) : (
              <a
                href="#/account/signin"
                className={cn(
                  "hidden rounded-full px-3 py-1.5 font-display text-[0.82rem] font-semibold transition-colors sm:inline-block",
                  onLight ? "text-navy hover:text-teal-ink" : "text-white/80 hover:text-white",
                )}
              >
                Sign in
              </a>
            )}
            <Btn
              href={wa(TALK_MESSAGE)}
              external
              variant={onLight ? "navy" : "sun"}
              size="sm"
              className="hidden sm:inline-flex"
              ariaLabel="Talk to Beyond Now on WhatsApp"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {nav.ctaLabel}
            </Btn>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden",
                onLight
                  ? "border-navy/15 bg-white text-navy hover:border-navy/35"
                  : "border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20",
              )}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className={cn(
            "h-[2px] origin-left bg-gradient-to-r from-sun via-teal to-navy transition-opacity duration-300",
            onLight ? "opacity-100" : "opacity-0",
          )}
          style={{ transform: `scaleX(${progress})` }}
        />
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[60] lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-navy-deep/70 backdrop-blur-sm transition-opacity duration-400",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            "absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-navy transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="dot-grid flex items-center justify-between border-b border-white/10 px-6 py-5">
            <Logo variant="light" markClassName="h-9 w-9" />
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-6">
            {authedUser && (
              <a
                href="#/account"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 border-b border-white/10 py-4 font-display text-xl font-bold text-white"
              >
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-sun text-[0.85rem] font-bold text-navy-deep">
                    {(profile?.name || authedUser.email || "?")[0]?.toUpperCase()}
                  </span>
                )}
                <span className="flex flex-col">
                  <span>My account</span>
                  <span className="text-[0.72rem] font-normal text-white/55">{authedUser.email}</span>
                </span>
              </a>
            )}
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: `${open ? 120 + i * 45 : 0}ms` }}
                className={cn(
                  "group flex items-center justify-between border-b border-white/10 py-4 font-display text-xl font-bold text-white transition-all duration-500",
                  open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                )}
              >
                <span>{link.label}</span>
                <ArrowRight className="text-sun group-hover:translate-x-1.5" />
              </a>
            ))}
          </nav>

          <div className="space-y-3 border-t border-white/10 px-6 py-6">
            {!authedUser && (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="#/account/signin"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/25 px-4 py-2.5 text-center font-display text-[0.85rem] font-semibold text-white"
                >
                  Sign in
                </a>
                <Btn
                  href="#/account/signup"
                  variant="sun"
                  size="md"
                  onClick={() => setOpen(false)}
                >
                  Create account
                </Btn>
              </div>
            )}
            <Btn
              href={wa(TALK_MESSAGE)}
              external
              variant="sun"
              size="lg"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              <WhatsAppIcon className="h-4 w-4" />
              {nav.ctaLabel}
            </Btn>
            <p className="text-center text-xs leading-relaxed text-white/50">
              {brand.coreMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp action */}
      <a
        href={wa(TALK_MESSAGE)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Beyond Now on WhatsApp"
        className={cn(
          "fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-teal px-4 py-3 font-display text-sm font-semibold text-white shadow-[0_16px_40px_-14px_rgba(0,184,148,0.9)] transition-all duration-500 hover:bg-[#00c9a2] sm:right-6 sm:bottom-6",
          progress > 0.06 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
        )}
      >
        <WhatsAppIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Talk to us</span>
      </a>
    </>
  );
}
