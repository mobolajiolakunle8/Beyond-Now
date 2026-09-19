import { WhatsAppIcon } from "@/components/Logo";
import { ArrowRight, Btn, Reveal, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";

export function FinalCTA() {
  const { finalCta, settings, resources } = useContent();
  const wa = useWa();
  const tracks = resources.filter((t) => t.status === "published");

  return (
    <section id="contact" className="bg-sun py-16 sm:py-20">
      <Wrap className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-14">
        <div>
          <Reveal>
            <span className="eyebrow text-navy/60">{finalCta.eyebrow}</span>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,3.4rem)] leading-[0.98] font-extrabold text-navy-deep">{finalCta.heading}</h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 max-w-lg text-[1.02rem] leading-relaxed text-navy-deep/80">{finalCta.body}</p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-7 space-y-3">
              <a
                href={wa("Hello Beyond Now. I'd like to talk to someone.")}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 rounded-2xl bg-navy-deep px-5 py-4 text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy"
              >
                <span className="flex items-center gap-3">
                  <WhatsAppIcon className="h-5 w-5 text-sun" />
                  <span>
                    <span className="block font-display text-[0.95rem] font-bold">{settings.whatsappDisplay}</span>
                    <span className="block text-xs text-white/60">{finalCta.whatsappLabel}</span>
                  </span>
                </span>
                <ArrowRight className="text-sun" />
              </a>
              <a
                href={`mailto:${settings.email}?subject=${encodeURIComponent("Beyond Now enquiry")}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-navy-deep/20 bg-navy-deep/5 px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-deep/10"
              >
                <span>
                  <span className="block font-display text-[0.95rem] font-bold text-navy-deep">{settings.email}</span>
                  <span className="block text-xs text-navy-deep/60">{finalCta.emailLabel}</span>
                </span>
                <ArrowRight className="text-navy-deep/50" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={260}>
            <p className="mt-6 rounded-2xl border border-navy-deep/15 bg-white/50 px-5 py-4 text-[0.82rem] leading-relaxed text-navy-deep/75">
              {finalCta.safetyNote}
            </p>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="rounded-[1.5rem] bg-white p-6 shadow-[0_40px_80px_-40px_rgba(11,45,91,0.5)] sm:p-7">
            <p className="eyebrow text-teal-ink">{finalCta.accountTitle}</p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-charcoal/75">{finalCta.accountBody}</p>
            {tracks.length > 0 && (
              <ul className="mt-5 divide-y divide-mist border-y border-mist">
                {tracks.map((track) => (
                  <li key={track.id} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block font-display text-[0.92rem] font-bold text-navy">{track.label}</span>
                      <span className="block text-xs text-charcoal/55">{track.audience}</span>
                    </span>
                    <span className="rounded-full bg-bone px-2.5 py-1 font-display text-[0.68rem] font-bold text-charcoal/60">
                      {track.items.filter((i) => i.status === "published").length} guides
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Btn href="#/account/signup" variant="navy" size="lg">
                {finalCta.accountCta}
                <ArrowRight />
              </Btn>
              <Btn href="#/account/signin" variant="ghost" size="lg">
                Sign in
              </Btn>
            </div>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}
