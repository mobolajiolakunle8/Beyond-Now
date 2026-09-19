import { Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent } from "@/lib/store";

export function Method() {
  const { method, methodSection } = useContent();
  if (method.length === 0) return null;

  return (
    <section id="method" className="relative isolate overflow-hidden bg-navy py-16 text-white sm:py-20">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_15%_0%,#12407d_0%,#0b2d5b_50%,#061a38_100%)]" />
        <div className="dot-grid absolute inset-0 opacity-25" />
      </div>

      <Wrap>
        <SectionHeading
          tone="dark"
          eyebrow={methodSection.eyebrow}
          index="03"
          title={
            <>
              {methodSection.headingLead}{" "}
              <span className="font-editorial font-normal text-sun italic">{methodSection.headingAccent}</span>
            </>
          }
          lead={methodSection.lead}
        />

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {method.map((step, i) => (
            <Reveal key={step.id} delay={i * 70} as="li">
              <div className="relative h-full rounded-2xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur-sm">
                <span className="font-display text-[0.7rem] font-bold tracking-[0.2em] text-sun uppercase">Step {i + 1}</span>
                <h3 className="mt-2 text-2xl font-extrabold text-white">{step.title}</h3>
                <p className="mt-1 text-[0.8rem] font-semibold text-white/55">{step.kicker}</p>
                <p className="mt-3 text-[0.92rem] leading-relaxed text-white/75">{step.body}</p>
                {i < method.length - 1 && (
                  <span aria-hidden="true" className="absolute top-1/2 -right-2 hidden -translate-y-1/2 text-white/25 lg:block">
                    →
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </ol>
      </Wrap>
    </section>
  );
}
