import { useState } from "react";
import { Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";
import { cn } from "@/utils/cn";

const ACCENT: Record<string, string> = {
  sun: "bg-sun text-navy-deep",
  teal: "bg-teal text-white",
  navy: "bg-navy text-sun",
};

export function Stories() {
  const { stories, storiesSection } = useContent();
  const wa = useWa();
  const [open, setOpen] = useState<string | null>(null);

  const published = stories.filter((s) => s.status === "published").slice(0, 3);
  if (published.length === 0) return null;

  return (
    <section id="stories" className="bg-bone py-16 sm:py-20">
      <Wrap>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={storiesSection.eyebrow}
            index="04"
            title={
              <>
                {storiesSection.headingLead}{" "}
                <span className="font-editorial font-normal text-teal-ink italic">{storiesSection.headingAccent}</span>.
              </>
            }
            lead={storiesSection.lead}
          />
          <a
            href={wa("Hello Beyond Now. I'd like to share my story (anonymously if possible).")}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 font-display text-[0.88rem] font-bold text-navy underline-offset-4 hover:underline"
          >
            {storiesSection.shareLabel} →
          </a>
        </div>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {published.map((story, i) => {
            const expanded = open === story.id;
            const panelId = `story-${story.id}`;
            return (
              <Reveal key={story.id} delay={i * 70} as="li">
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
                  {story.image && (
                    <img
                      src={story.image}
                      alt={story.imageAlt}
                      width="1200"
                      height="800"
                      loading="lazy"
                      decoding="async"
                      className="aspect-[16/9] w-full object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("rounded-full px-2.5 py-0.5 font-display text-[0.64rem] font-bold tracking-[0.16em] uppercase", ACCENT[story.accent])}>
                        {story.category}
                      </span>
                      <span className="text-xs text-charcoal/55">{story.who}</span>
                    </div>
                    <h3 className="mt-3 text-[1.15rem] leading-tight font-extrabold">{story.title}</h3>
                    <p className="mt-2 text-[0.9rem] leading-relaxed text-charcoal/70">{story.teaser}</p>

                    <div id={panelId} hidden={!expanded} className="mt-4 space-y-3 text-[0.9rem] leading-relaxed text-charcoal/75">
                      {story.body.map((para, j) => (
                        <p key={j}>{para}</p>
                      ))}
                      <p className="rounded-xl border-l-[3px] border-sun bg-bone px-4 py-3 font-medium text-navy">{story.lesson}</p>
                    </div>

                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => setOpen(expanded ? null : story.id)}
                      className="mt-auto pt-4 text-left font-display text-[0.82rem] font-bold text-teal-ink hover:underline"
                    >
                      {expanded ? "Show less" : "Read the story"}
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </Wrap>
    </section>
  );
}
