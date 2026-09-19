import { useState } from "react";
import { ArrowRight, Btn, Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";
import { cn } from "@/utils/cn";

const accentStyles: Record<string, string> = {
  sun: "bg-sun text-navy-deep",
  teal: "bg-teal text-white",
  navy: "bg-navy text-sun",
};

export function Stories() {
  const { stories, storiesSection } = useContent();
  const wa = useWa();
  const STORIES = stories.filter((s) => s.status === "published");
  const FORMATS = storiesSection.formats;
  const [active, setActive] = useState(0);
  const story = STORIES[Math.min(active, Math.max(0, STORIES.length - 1))];

  if (!story) return null;

  return (
    <section id="stories" className="relative overflow-hidden bg-bone py-16 sm:py-20 lg:py-24">
      <Wrap>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={storiesSection.eyebrow}
            index="04"
            title={
              <>
                {storiesSection.headingLead}{" "}
                <span className="font-editorial font-normal text-teal-ink italic">
                  {storiesSection.headingAccent}
                </span>
                .
              </>
            }
            lead={storiesSection.lead}
          />
          <Reveal delay={180}>
            <div className="grid gap-3 sm:grid-cols-3 lg:max-w-sm lg:grid-cols-1">
              {FORMATS.map((format) => (
                <div
                  key={format.id}
                  className="rounded-xl border border-navy/10 bg-white/70 px-4 py-3 backdrop-blur"
                >
                  <p className="font-display text-sm font-bold text-navy">{format.label}</p>
                  <p className="text-xs text-charcoal/60">{format.detail}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-8">
          {/* Featured story */}
          <Reveal>
            <article className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-navy/10 bg-white shadow-card">
              <div className="relative">
                <img
                  key={story.id}
                  src={story.image}
                  alt={story.imageAlt}
                  width="1200"
                  height="900"
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-navy/85 via-navy/25 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 font-display text-[0.68rem] font-bold tracking-[0.16em] uppercase",
                      accentStyles[story.accent],
                    )}
                  >
                    {story.category || story.format}
                  </span>
                  <span className="text-xs font-medium text-white/80">{story.who}</span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <h3 className="text-2xl leading-tight font-extrabold sm:text-[1.75rem]">
                  {story.title}
                </h3>
                <p className="mt-3 font-editorial text-[1.15rem] text-charcoal/75 italic">
                  {story.teaser}
                </p>
                <div className="mt-5 space-y-4 text-[0.97rem] leading-relaxed text-charcoal/75">
                  {story.body.map((para) => (
                    <p key={para.slice(0, 24)}>{para}</p>
                  ))}
                </div>
                <div className="mt-auto pt-7">
                  <div className="rounded-2xl border-l-[3px] border-sun bg-bone px-5 py-4">
                    <p className="eyebrow text-teal-ink">The takeaway</p>
                    <p className="mt-2 text-[0.97rem] font-medium text-navy">{story.lesson}</p>
                  </div>
                </div>
              </div>
            </article>
          </Reveal>

          {/* Story list */}
          <div className="flex flex-col gap-3">
            {STORIES.map((item, i) => {
              const isActive = i === active;
              return (
                <Reveal key={item.id} delay={i * 70}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={isActive}
                    className={cn(
                      "group w-full rounded-2xl border p-5 text-left transition-all duration-400",
                      isActive
                        ? "border-navy bg-white shadow-card"
                        : "border-navy/10 bg-white/50 hover:border-navy/30 hover:bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span
                          className={cn(
                            "font-display text-[0.65rem] font-bold tracking-[0.18em] uppercase",
                            isActive ? "text-teal-ink" : "text-charcoal/45",
                          )}
                        >
                          {item.category || item.format} · {item.who.split(",")[0]}
                        </span>
                        <p
                          className={cn(
                            "mt-2 font-display text-[1.05rem] leading-snug font-bold",
                            isActive ? "text-navy" : "text-charcoal/70",
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="mt-2 line-clamp-2 text-[0.85rem] leading-relaxed text-charcoal/60">
                          {item.teaser}
                        </p>
                      </div>
                      <ArrowRight
                        className={cn(
                          "mt-1 shrink-0 transition-all duration-300",
                          isActive ? "text-teal-ink" : "text-charcoal/25 group-hover:text-navy",
                        )}
                      />
                    </div>
                  </button>
                </Reveal>
              );
            })}

            <Reveal delay={300}>
              <div className="rounded-2xl bg-navy p-6 text-white">
                <p className="font-editorial text-xl leading-snug italic">
                  &ldquo;{storiesSection.pullQuote}&rdquo;
                </p>
                <Btn
                  href={wa("Hello Beyond Now. I'd like to share my story (anonymously if possible).")}
                  external
                  variant="sun"
                  size="md"
                  className="mt-5 w-full sm:w-auto"
                >
                  {storiesSection.shareLabel}
                </Btn>
              </div>
            </Reveal>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
