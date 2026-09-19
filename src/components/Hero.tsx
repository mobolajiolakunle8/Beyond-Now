import { WhatsAppIcon } from "@/components/Logo";
import { ArrowRight, Btn, Reveal, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";

const HERO_MESSAGE =
  "Hello Beyond Now. I saw your website and I would like to talk to someone.";

export function Hero() {
  const { hero } = useContent();
  const wa = useWa();
  return (
    <section
      id="home"
       className="relative isolate overflow-hidden bg-navy pt-20 pb-16 sm:pt-24 lg:pt-28 lg:pb-20 text-white"
    >
      {/* Ambient background */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_78%_10%,#12407d_0%,#0b2d5b_45%,#061a38_100%)]" />
         <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-[0.28]"
        >
          <path d="M-100 700C220 560 480 700 760 620s420-260 780-180" fill="none" stroke="#FFC107" strokeWidth="1.2" />
          <path d="M-100 760C240 640 500 760 790 690s400-250 750-170" fill="none" stroke="#00B894" strokeWidth="1.2" />
          <path d="M-100 820C260 720 520 820 820 760s390-240 720-160" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.5" />
        </svg>
         <div className="absolute bottom-[-10rem] left-[-6rem] h-[22rem] w-[22rem] rounded-full bg-teal/15 blur-[90px]" />
       </div>

       <Wrap className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* Copy */}
        <div className="max-w-2xl">
          <Reveal>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
              </span>
              <span className="eyebrow text-white/85">{hero.badge}</span>
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-7 text-[clamp(2.45rem,7.6vw,4.75rem)] leading-[0.98] font-extrabold text-white">
              {hero.headingLead}{" "}
              <span className="relative inline-block">
                <span className="font-editorial text-sun italic">{hero.headingAccent}</span>
                <svg
                  viewBox="0 0 300 12"
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-0 h-2.5 w-full text-sun/70"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M2 8C60 2 120 10 180 5s80-4 118 1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <p className="mt-8 max-w-xl text-[1.05rem] leading-relaxed text-white/75 sm:text-[1.15rem]">
              {hero.body}
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Btn href="#pillars" variant="sun" size="lg">
                {hero.ctaPrimary}
                <ArrowRight />
              </Btn>
              <Btn href={wa(HERO_MESSAGE)} external variant="outline" size="lg" className="border-white/25 bg-white/10 text-white hover:bg-white hover:text-navy">
                <WhatsAppIcon className="h-4 w-4" />
                {hero.ctaSecondary}
              </Btn>
            </div>
          </Reveal>

          {/* Brand promise kept on the final call-to-action */}
        </div>

       {/* Focused editorial photo — confident, uncluttered */}
         <Reveal delay={150} className="relative">
           <div className="relative mx-auto max-w-[28rem] lg:max-w-none">
             <div className="relative overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
               <img
                 src={hero.imageMain}
                 alt={hero.imageMainAlt}
                 width="1400"
                 height="1750"
                 loading="eager"
                 decoding="async"
                 className="aspect-[4/5] w-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/72 via-transparent to-transparent" />
               <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-navy-deep/50 p-4 backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5">
                 <p className="font-editorial text-lg leading-snug text-white italic sm:text-xl">
                   &ldquo;{hero.quote}&rdquo;
                 </p>
                 <p className="mt-2 text-[0.68rem] font-semibold tracking-[0.2em] text-sun uppercase">
                   {hero.quoteLabel}
                 </p>
               </div>
             </div>
             <p className="mt-5 text-right text-sm text-charcoal/50 font-display">
               {hero.statLabel}
               {" "}
               <span className="font-display text-navy font-extrabold">{hero.statValue}</span>
             </p>
           </div>
         </Reveal>
       </Wrap>

     </section>
    );
  }
