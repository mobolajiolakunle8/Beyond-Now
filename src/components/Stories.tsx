import { useState } from "react";
import { useUserStore } from "@/account/UserStore";
import { Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent } from "@/lib/store";
import { cn } from "@/utils/cn";

const ACCENT: Record<string, string> = {
  sun: "bg-sun text-navy-deep",
  teal: "bg-teal text-white",
  navy: "bg-navy text-sun",
};

export function Stories() {
  const { stories, storiesSection } = useContent();
  const { authedUser } = useUserStore();
  const [open, setOpen] = useState<string | null>(null);

  const published = stories.filter((s) => s.status === "published").slice(0, 3);

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
          {authedUser && (
            <a
              href="#/account/share-story"
              className="shrink-0 font-display text-[0.88rem] font-bold text-navy underline-offset-4 hover:underline"
            >
              {storiesSection.shareLabel} →
            </a>
          )}
        </div>

        {!authedUser ? (
          <Reveal delay={100}>
            <div className="mt-10 grid gap-6 rounded-[1.5rem] border border-navy/10 bg-white p-6 shadow-card sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
              <div>
                <p className="font-display text-xl font-extrabold text-navy">Stories are for registered members.</p>
                <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-charcoal/65">
                  Create a free account to read real-life-inspired stories, save the ones that help, and share your own safely.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 sm:justify-end">
                <a href="#/account/signup" className="rounded-full bg-navy px-5 py-3 font-display text-[0.85rem] font-semibold text-white transition-colors hover:bg-navy-soft">
                  Create free account
                </a>
                <a href="#/account/signin" className="rounded-full border border-navy/15 px-5 py-3 font-display text-[0.85rem] font-semibold text-navy hover:border-navy/35">
                  Sign in
                </a>
              </div>
            </div>
          </Reveal>
        ) : published.length === 0 ? (
          <Reveal delay={100}>
            <div className="mt-10 rounded-[1.5rem] border border-dashed border-navy/20 bg-white p-8 text-center">
              <p className="font-display text-lg font-bold text-navy">New stories are coming soon.</p>
              <a href="#/account/share-story" className="mt-3 inline-block font-display text-sm font-semibold text-teal-ink hover:underline">
                Be the first to share yours →
              </a>
            </div>
          </Reveal>
        ) : (
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
        )}
      </Wrap>
    </section>
  );
}
