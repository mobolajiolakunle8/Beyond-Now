import { Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent } from "@/lib/store";

export function About() {
  const { about } = useContent();

  return (
    <section id="about" className="bg-bone py-16 sm:py-20">
      <Wrap className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <Reveal className="order-2 lg:order-1">
          <img
            src={about.imageMain}
            alt={about.imageMainAlt}
            width="1200"
            height="1500"
            loading="lazy"
            decoding="async"
            className="mx-auto aspect-[4/5] w-full max-w-[22rem] rounded-[1.5rem] object-cover shadow-card lg:max-w-none"
          />
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionHeading
            eyebrow={about.eyebrow}
            index="01"
            title={
              <>
                {about.headingLead}{" "}
                <span className="font-editorial font-normal text-teal-ink italic">{about.headingAccent}</span>.
              </>
            }
          />

          <div className="mt-6 space-y-4 text-[1rem] leading-relaxed text-charcoal/75">
            {about.paragraphs.map((para, i) => (
              <Reveal key={i} delay={40 + i * 40}>
                <p>{para}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={140}>
            <blockquote className="relative mt-7 overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
              <span aria-hidden="true" className="absolute top-0 left-0 h-1 w-20 rounded-full bg-sun" />
              <p className="eyebrow text-teal-ink">{about.founderEyebrow}</p>
              <p className="mt-3 font-editorial text-[1.3rem] leading-[1.35] text-navy italic sm:text-[1.45rem]">
                &ldquo;{about.founderQuote}&rdquo;
              </p>
              <footer className="mt-4 font-display text-sm font-semibold text-navy">{about.founderName}</footer>
            </blockquote>
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}
