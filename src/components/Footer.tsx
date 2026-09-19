import { Logo, WhatsAppIcon } from "@/components/Logo";
import { Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";

const YEAR = new Date().getFullYear();

export function Footer() {
  const { footer, nav, pillars, settings, methodSection } = useContent();
  const wa = useWa();
  const NAV_LINKS = nav.links;
  const PILLARS = pillars;
  const EMAIL = settings.email;
  const WHATSAPP_DISPLAY = settings.whatsappDisplay;
  return (
    <footer className="relative overflow-hidden bg-navy-deep pt-16 text-white">
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.14]">
        <svg viewBox="0 0 1440 240" preserveAspectRatio="none" className="h-full w-full">
          <path d="M-100 180C240 60 520 200 800 120s420-160 740-60" fill="none" stroke="#FFC107" strokeWidth="1.2" />
          <path d="M-100 220C260 120 540 240 830 160s400-150 710-50" fill="none" stroke="#00B894" strokeWidth="1.2" />
        </svg>
      </div>

      <Wrap className="relative">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr] lg:gap-10">
          <div>
            <Logo variant="light" showTagline markClassName="h-12 w-12" />
            <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-white/65">
              {footer.blurb}
            </p>
            <p className="mt-5 font-editorial text-xl text-sun italic">&ldquo;{footer.quote}&rdquo;</p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="eyebrow text-white/60">Explore</h2>
            <ul className="mt-5 space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    className="text-[0.92rem] text-white/70 transition-colors hover:text-sun"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow text-white/60">Pillars</h2>
            <ul className="mt-5 space-y-3">
              {PILLARS.map((pillar) => (
                <li key={pillar.id}>
                  <a
                    href="#pillars"
                    className="text-[0.92rem] text-white/70 transition-colors hover:text-sun"
                  >
                    {pillar.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#method" className="text-[0.92rem] text-white/70 transition-colors hover:text-sun">
                  {methodSection.eyebrow}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-white/60">Talk to us</h2>
            <ul className="mt-5 space-y-4 text-[0.92rem]">
              <li>
                <a
                  href={wa("Hello Beyond Now. I'd like to talk to someone.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 font-semibold text-sun transition-colors hover:text-white"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  {WHATSAPP_DISPLAY}
                </a>
                <span className="mt-1 block text-xs text-white/60">
                  Open 24/7 · WhatsApp chat
                </span>
              </li>
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  className="text-white/70 transition-colors hover:text-sun"
                >
                  {EMAIL}
                </a>
                <span className="mt-1 block text-xs text-white/60">Schools, partners & press</span>
              </li>
            </ul>
            <a
              href="#contact"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 font-display text-[0.82rem] font-semibold text-white transition-colors hover:border-sun hover:bg-white/10"
            >
              Send a message
            </a>
          </div>
        </div>

        {/* Safeguarding */}
        <div className="grid gap-6 border-b border-white/10 py-8 md:grid-cols-[1.6fr_1fr] md:gap-10">
          <div>
            <h2 className="eyebrow text-white/60">Safeguarding note</h2>
            <p className="mt-3 text-[0.85rem] leading-relaxed text-white/60">
              {footer.safeguarding}
            </p>
          </div>
          <div className="md:text-right">
            <h2 className="eyebrow text-white/60">Core message</h2>
            <p className="mt-3 font-display text-lg font-extrabold text-white">
              {footer.coreMessage}
            </p>
            <p className="text-sm text-sun">{footer.tagline}</p>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 py-7 text-xs text-white/55 sm:flex-row sm:items-center">
          <p>© {YEAR} Beyond Now. Advocacy · Guidance · Storytelling.</p>
          <div className="flex flex-wrap items-center gap-5">
            {settings.socials
              .filter((social) => social.url.trim())
              .map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-sun"
                >
                  {social.label}
                </a>
              ))}
            <a href="#who-we-serve" className="transition-colors hover:text-sun">
              Who we serve
            </a>
            <a href="#impact" className="transition-colors hover:text-sun">
              Impact &amp; vision
            </a>
            <a href="#home" className="transition-colors hover:text-sun">
              Back to top ↑
            </a>
            <a
              href="#/admin"
              className="rounded-full border border-white/15 px-3 py-1 transition-colors hover:border-sun hover:text-sun"
            >
              Admin
            </a>
          </div>
        </div>
      </Wrap>
    </footer>
  );
}
