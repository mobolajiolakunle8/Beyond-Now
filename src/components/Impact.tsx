import { Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent } from "@/lib/store";

export function Impact() {
  const { impact } = useContent();
  const VISION = impact.vision;
  return (
    <section
      id="impact"
      className="relative isolate overflow-hidden bg-navy-deep py-16 text-white sm:py-20 lg:py-24"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <img
          src={impact.image}
          alt=""
          aria-hidden="true"
          width="1600"
          height="900"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-30"
        />
         <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/95 via-navy/85 to-navy-deep" />
       </div>

      <Wrap>
        <SectionHeading
          tone="dark"
          align="center"
          index="07"
          eyebrow={impact.eyebrow}
          title={
            <>
              {impact.headingLead}{" "}
              <span className="font-editorial font-normal text-sun italic">
                {impact.headingAccent}
              </span>{" "}
              {impact.headingTail}
            </>
          }
          lead={impact.lead}
        />

         <div className="mt-12 grid gap-2 overflow-hidden rounded-3xl border border-white/12 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
           {VISION.map((item, i) => (
             <Reveal key={item.id} delay={i * 60}>
               <div className="group h-full bg-navy-deep/60 p-5 sm:p-6 transition-colors duration-400 hover:bg-navy/70">
                 <div className="flex items-center gap-2">
                   <span className="h-1.5 w-1.5 rounded-full bg-sun transition-transform duration-300 group-hover:scale-150" />
                   <h3 className="text-[0.95rem] font-extrabold text-white">{item.title}</h3>
                 </div>
                 <p className="mt-2 text-[0.82rem] leading-relaxed text-white/70">{item.body}</p>
               </div>
             </Reveal>
           ))}
        </div>

         <Reveal delay={140}>
          <figure className="mx-auto mt-14 max-w-3xl text-center">
            <blockquote className="font-editorial text-[1.5rem] leading-[1.35] text-white/90 italic sm:text-[2rem]">
              &ldquo;{impact.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 text-[0.7rem] font-semibold tracking-[0.24em] text-sun uppercase">
              {impact.quoteLabel}
            </figcaption>
          </figure>
        </Reveal>
      </Wrap>
    </section>
  );
}
