import { WhatsAppIcon } from "@/components/Logo";
import { ArrowRight, Btn, Reveal, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";

const HERO_MESSAGE = "Hello Beyond Now. I saw your website and I would like to talk to someone.";

export function Hero() {
  const { hero } = useContent();
  const wa = useWa();

  return (
    <section id="home" className="relative isolate overflow-hidden bg-navy pt-24 pb-16 text-white sm:pt-28 lg:pt-32 lg:pb-20">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_78%_10%,#12407d_0%,#0b2d5b_45%,#061a38_100%)]" />
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-25">
          <path d="M-100 700C220 560 480 700 760 620s420-260 780-180" fill="none" stroke="#FFC107" strokeWidth="1.2" />
          <path d="M-100 760C240 640 500 760 790 690s400-250 750-170" fill="none" stroke="#00B894" strokeWidth="1.2" />
        </svg>
      </div>

      <Wrap className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div className="max-w-xl">
          <Reveal>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-teal" />
              <span className="eyebrow text-white/85">{hero.badge}</span>
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 text-[clamp(2.4rem,7vw,4.4rem)] leading-[0.98] font-extrabold text-white">
              {hero.headingLead}{" "}
              <span className="relative inline-block">
                <span className="font-editorial text-sun italic">{hero.headingAccent}</span>
                <svg viewBox="0 0 300 10" aria-hidden="true" className="absolute -bottom-1 left-0 h-2 w-full text-sun/70" fill="none" preserveAspectRatio="none">
                  <path d="M2 7C60 1 120 8 180 4s80-3 118 1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>
          </Reveal>

          <Reveal delay={150}>
            <p className="mt-6 text-[1.02rem] leading-relaxed text-white/75 sm:text-[1.1rem]">{hero.body}</p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Btn href={wa(HERO_MESSAGE)} external variant="sun" size="lg">
                <WhatsAppIcon className="h-4 w-4" />
                {hero.ctaPrimary}
              </Btn>
              <Btn href="#/account/signup" variant="outline" size="lg" className="border-white/25 bg-white/10 text-white hover:bg-white hover:text-navy">
                {hero.ctaSecondary}
                <ArrowRight />
              </Btn>
            </div>
          </Reveal>

          {hero.trust.length > 0 && (
            <Reveal delay={280}>
              <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/60">
                {hero.trust.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sun" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>

        <Reveal delay={140}>
          <div className="relative mx-auto max-w-[24rem] overflow-hidden rounded-[1.5rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)] lg:max-w-none">
            <img
              src={hero.imageMain}
              alt={hero.imageMainAlt}
              width="1400"
              height="1750"
              loading="eager"
              decoding="async"
              className="aspect-[4/5] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/75 via-transparent to-transparent" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-navy-deep/55 p-4 backdrop-blur-md sm:inset-x-5 sm:bottom-5">
              <p className="font-editorial text-lg leading-snug text-white italic sm:text-xl">&ldquo;{hero.quote}&rdquo;</p>
              <p className="mt-2 text-[0.66rem] font-semibold tracking-[0.2em] text-sun uppercase">{hero.quoteLabel}</p>
            </div>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}
