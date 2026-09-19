import { useState } from "react";
import { ArrowRight, Btn, Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";
import { cn } from "@/utils/cn";

export function Method() {
  const { method: METHOD, methodSection } = useContent();
  const wa = useWa();
  const [step, setStep] = useState(0);
  const current = METHOD[Math.min(step, Math.max(0, METHOD.length - 1))];

  if (!current) return null;

  return (
    <section
      id="method"
      className="relative isolate overflow-hidden bg-navy py-16 text-white sm:py-20 lg:py-24"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_15%_0%,#12407d_0%,#0b2d5b_50%,#061a38_100%)]" />
        <div className="dot-grid absolute inset-0 opacity-30" />
      </div>

      <Wrap>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            tone="dark"
            eyebrow={methodSection.eyebrow}
            index="03"
            title={
              <>
                {methodSection.headingLead}{" "}
                <span className="font-editorial font-normal text-sun italic">
                  {methodSection.headingAccent}
                </span>
              </>
            }
            lead={methodSection.lead}
          />
          <Reveal delay={200} className="shrink-0">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur">
              <p className="font-display text-3xl font-extrabold text-sun">
                0{step + 1}
                <span className="text-white/35"> / {String(METHOD.length).padStart(2, "0")}</span>
              </p>
              <p className="mt-1 text-xs tracking-[0.16em] text-white/55 uppercase">Current step</p>
            </div>
          </Reveal>
        </div>

         {/* Track */}
         <Reveal delay={100}>
           <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {METHOD.map((item, i) => {
              const isActive = i === step;
              const done = i < step;
              return (
                <li key={item.id} className="relative lg:flex lg:flex-col">
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "group h-full w-full rounded-2xl border p-5 text-left transition-all duration-400 lg:rounded-none lg:border-0 lg:border-t-[3px] lg:px-6 lg:py-6",
                      isActive
                        ? "border-sun bg-white/10 lg:border-t-sun"
                        : done
                          ? "border-teal/40 bg-white/[0.04] lg:border-t-teal"
                          : "border-white/12 bg-white/[0.02] hover:bg-white/[0.06] lg:border-t-white/20",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "font-display text-[0.7rem] font-bold tracking-[0.2em] uppercase",
                          isActive ? "text-sun" : done ? "text-teal" : "text-white/55",
                        )}
                      >
                        Step {i + 1}
                      </span>
                      {done && (
                        <svg viewBox="0 0 20 20" className="h-4 w-4 text-teal" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 10.5l4 4 8-9" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={cn(
                        "mt-2 block font-display text-lg font-extrabold tracking-[-0.02em] sm:text-xl",
                        isActive ? "text-white" : "text-white/60 group-hover:text-white/85",
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[0.8rem] text-white/60">{item.kicker}</span>
                  </button>
                  {i < METHOD.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -top-[3px] -right-3 hidden h-[3px] w-6 lg:block",
                        done ? "bg-teal" : "bg-white/20",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </Reveal>

         {/* Detail */}
         <div
           key={current.id}
           className="mt-8 grid gap-5 rounded-[1.75rem] border border-white/12 bg-white/[0.05] p-5 backdrop-blur-md sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8"
         >
          <div className="animate-sunrise">
            <p className="eyebrow text-sun">{current.kicker}</p>
            <h3 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">{current.title}</h3>
            <p className="mt-5 text-[1.02rem] leading-relaxed text-white/75">{current.body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Btn
                variant="sun"
                size="md"
                onClick={() => setStep((s) => (s + 1) % METHOD.length)}
                ariaLabel={`Next step: ${METHOD[(step + 1) % METHOD.length].title}`}
              >
                Next: {METHOD[(step + 1) % METHOD.length].title}
                <ArrowRight />
              </Btn>
              <Btn
                href={wa(`Hello Beyond Now. I'm on step ${step + 1} (${current.title}) and I'd like help with the next part.`)}
                external
                variant="outline"
                size="md"
                className="border-white/25 bg-transparent text-white hover:bg-white hover:text-navy"
              >
                Talk it through
              </Btn>
            </div>
          </div>

          <div className="animate-sunrise lg:border-l lg:border-white/12 lg:pl-10">
            <p className="eyebrow text-white/50">What this looks like</p>
            <ul className="mt-4 space-y-4">
              {current.actions.map((action) => (
                <li key={action} className="flex gap-3.5">
                  <span
                    aria-hidden="true"
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun/15"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-sun" />
                  </span>
                  <span className="text-[0.97rem] leading-relaxed text-white/80">{action}</span>
                </li>
              ))}
            </ul>
            <p className="mt-7 border-t border-white/10 pt-5 font-editorial text-lg text-white/70 italic">
              &ldquo;{methodSection.quote}&rdquo;
            </p>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
