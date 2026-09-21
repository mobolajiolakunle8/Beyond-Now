import { Logo, WhatsAppIcon } from "@/components/Logo";
import { Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";

const YEAR = new Date().getFullYear();

export function Footer() {
  const { footer, nav, settings } = useContent();
  const wa = useWa();
  const socials = settings.socials.filter((s) => s.url.trim());

  return (
    <footer className="bg-navy-deep pt-14 text-white">
      <Wrap>
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo variant="light" showTagline markClassName="h-11 w-11" />
            <p className="mt-5 max-w-sm text-[0.92rem] leading-relaxed text-white/65">{footer.blurb}</p>
            <p className="mt-4 font-editorial text-lg text-sun italic">&ldquo;{footer.quote}&rdquo;</p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="eyebrow text-white/60">Explore</h2>
            <ul className="mt-4 space-y-2.5 text-[0.9rem]">
              {nav.links.map((link) => (
                <li key={link.id}>
                  <a href={link.href} className="text-white/70 transition-colors hover:text-sun">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="#/account/signin" className="text-white/70 transition-colors hover:text-sun">
                  My account
                </a>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow text-white/60">Talk to us</h2>
            <ul className="mt-4 space-y-3 text-[0.9rem]">
              <li>
                <a
                  href={wa("Hello Beyond Now. I'd like to talk to someone.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-sun transition-colors hover:text-white"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  {settings.whatsappDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className="text-white/70 transition-colors hover:text-sun">
                  {settings.email}
                </a>
              </li>
            </ul>
            <p className="mt-5 text-[0.78rem] leading-relaxed text-white/50">{footer.safeguarding}</p>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 py-6 text-xs text-white/55 sm:flex-row sm:items-center">
          <p>
            © {YEAR} Beyond Now · <span className="text-white/75">{footer.coreMessage}</span> {footer.tagline}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {socials.map((social) => (
              <a key={social.id} href={social.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-sun">
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </Wrap>
    </footer>
  );
}
