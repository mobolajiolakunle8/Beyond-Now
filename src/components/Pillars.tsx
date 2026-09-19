import { useRef, useState } from "react";
import { ArrowRight, Btn, Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";
import { cn } from "@/utils/cn";

const TAB_MESSAGE =
  "Hello Beyond Now. I'd like guidance about a situation I'm dealing with.";

export function Pillars() {
  const { pillars: PILLARS, pillarsSection } = useContent();
  const wa = useWa();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pillar = PILLARS[Math.min(active, Math.max(0, PILLARS.length - 1))];

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = PILLARS.length - 1;
    let next = active;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  if (!pillar) return null;

    return (
    <section id="pillars" className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="rule-horizon absolute inset-x-0 top-1/2 h-px opacity-60"
      />
      <Wrap>
        <SectionHeading
          eyebrow={pillarsSection.eyebrow}
          index="02"
          title={
            <>
              {pillarsSection.headingLead}{" "}
              <span className="font-editorial font-normal text-teal-ink italic">
                {pillarsSection.headingAccent}
              </span>{" "}
              {pillarsSection.headingTail}
            </>
          }
          lead={pillarsSection.lead}
          className="max-w-4xl"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
          {/* Tabs */}
          <Reveal>
            <div
              role="tablist"
              aria-label="Beyond Now pillars"
              aria-orientation="vertical"
              onKeyDown={onKeyDown}
              className="flex flex-col divide-y divide-mist border-y border-mist"
            >
              {PILLARS.map((item, i) => {
                const isActive = i === active;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    role="tab"
                    id={`pillar-tab-${item.id}`}
                    aria-selected={isActive}
                    aria-controls={`pillar-panel-${item.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActive(i)}
                    className="group relative flex items-center gap-5 py-5 text-left transition-colors duration-300"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-0 bottom-0 -left-3 w-[3px] origin-center rounded-full transition-transform duration-400",
                        isActive ? "scale-y-100 bg-sun" : "scale-y-0 bg-navy/20",
                      )}
                    />
                    <span
                      className={cn(
                        "font-display text-[0.75rem] font-bold tracking-[0.1em] transition-colors",
                        isActive ? "text-teal-ink" : "text-charcoal/50",
                      )}
                    >
                      {item.index}
                    </span>
                    <span className="flex-1">
                      <span
                        className={cn(
                          "block font-display text-xl font-extrabold tracking-[-0.02em] transition-colors duration-300 sm:text-[1.6rem]",
                          isActive ? "text-navy" : "text-charcoal/45 group-hover:text-navy/80",
                        )}
                      >
                        {item.title}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-sm leading-snug transition-all duration-400",
                          isActive ? "text-charcoal/70" : "text-charcoal/55",
                        )}
                      >
                        {item.line}
                      </span>
                    </span>
                    <ArrowRight
                      className={cn(
                        "shrink-0 transition-all duration-300",
                        isActive ? "text-teal-ink opacity-100" : "opacity-0 group-hover:opacity-40",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Panel */}
          <Reveal delay={120}>
            <div
              role="tabpanel"
              id={`pillar-panel-${pillar.id}`}
              aria-labelledby={`pillar-tab-${pillar.id}`}
              className="overflow-hidden rounded-[1.75rem] border border-navy/10 bg-bone shadow-card"
            >
              <div className="relative">
                <img
                  key={pillar.id}
                  src={pillar.image}
                  alt={pillar.alt}
                  width="1000"
                  height="750"
                  loading="lazy"
                  decoding="async"
                  className="animate-sunrise aspect-[16/10] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" />
                <p className="absolute bottom-4 left-5 font-display text-[0.7rem] font-bold tracking-[0.22em] text-white uppercase">
                  Pillar {pillar.index} — {pillar.title}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                <h3 className="text-xl font-extrabold sm:text-2xl">{pillar.title}</h3>
                <p className="mt-3 leading-relaxed text-charcoal/75">{pillar.body}</p>
                <p className="eyebrow mt-7 text-teal-ink">Questions we sit with</p>
                <ul className="mt-3 space-y-2.5">
                  {pillar.prompts.map((prompt) => (
                    <li key={prompt} className="flex gap-3 text-[0.95rem] text-charcoal/80">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun"
                      />
                      <span className="font-editorial text-[1.05rem] italic">{prompt}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Btn href={wa(TAB_MESSAGE)} external variant="teal" size="md">
                    Ask about {pillar.title.replace("Beyond ", "").toLowerCase()}
                  </Btn>
                  <Btn href="#method" variant="outline" size="md">
                    How we work
                  </Btn>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}
