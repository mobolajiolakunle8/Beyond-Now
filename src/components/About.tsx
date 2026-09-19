import { ArrowRight, Btn, Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent } from "@/lib/store";

export function About() {
  const { about } = useContent();
  return (
    <section id="about" className="relative overflow-hidden bg-bone py-16 sm:py-20 lg:py-24">
      <Wrap className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14">
        {/* Single focused photo */}
        <Reveal className="relative order-2 lg:order-1">
          <div className="mx-auto max-w-[28rem] lg:max-w-none">
            <div className="overflow-hidden rounded-[1.5rem] shadow-card">
              <img
                src={about.imageMain}
                alt={about.imageMainAlt}
                width="1200"
                height="1500"
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </div>
        </Reveal>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <SectionHeading
            eyebrow={about.eyebrow}
            index="01"
            title={
              <>
                {about.headingLead}{" "}
                <span className="font-editorial font-normal text-teal-ink italic">
                  {about.headingAccent}
                </span>
                .
              </>
            }
          />

          <div className="mt-6 space-y-5 text-[1rem] leading-relaxed text-charcoal/75 sm:text-[1.02rem]">
            {about.paragraphs.slice(0, 2).map((para, i) => (
              <Reveal key={i} delay={40 + i * 35}>
                <p>{para}</p>
              </Reveal>
            ))}
          </div>

          {/* Founder's vision */}
          <Reveal delay={130}>
            <blockquote className="mt-8 relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 h-1 w-20 rounded-full bg-sun"
              />
              <p className="eyebrow text-teal-ink">{about.founderEyebrow}</p>
              <p className="mt-3 font-editorial text-[1.35rem] leading-[1.35] text-navy italic sm:text-[1.5rem]">
                &ldquo;{about.founderQuote}&rdquo;
              </p>
              <p className="mt-4 font-display text-sm font-semibold text-navy">
                {about.founderName}
              </p>
            </blockquote>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-8">
              <Btn href="#method" variant="navy" size="lg">
                {about.ctaLabel}
                <ArrowRight />
              </Btn>
            </div>
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}
