import { useState } from "react";
import { Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useUserStore } from "@/account/UserStore";
import { useContent } from "@/lib/store";
import { cn } from "@/utils/cn";

export function Pillars() {
  const { pillars, pillarsSection } = useContent();
  const { authedUser } = useUserStore();
  const [open, setOpen] = useState<string | null>(null);

  const startChat = (title: string) => {
    const draft = `Hi Beyond Now, I'd like to talk about something related to ${title.replace("Beyond ", "").toLowerCase()}.`;
    try {
      sessionStorage.setItem("bn.chat.draft", draft);
      sessionStorage.setItem("bn.account.next", "messages");
    } catch {
      /* storage unavailable — route still works */
    }
    window.location.hash = authedUser ? "#/account/messages" : "#/account/signin";
  };

  if (pillars.length === 0) return null;

  return (
    <section id="pillars" className="bg-white py-16 sm:py-20">
      <Wrap>
        <SectionHeading
          eyebrow={pillarsSection.eyebrow}
          index="02"
          title={
            <>
              {pillarsSection.headingLead}{" "}
              <span className="font-editorial font-normal text-teal-ink italic">{pillarsSection.headingAccent}</span>{" "}
              {pillarsSection.headingTail}
            </>
          }
          lead={pillarsSection.lead}
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar, i) => {
            const expanded = open === pillar.id;
            const panelId = `pillar-panel-${pillar.id}`;
            return (
              <Reveal key={pillar.id} delay={i * 60} as="li">
                <article
                  className={cn(
                    "h-full rounded-2xl border bg-bone/60 transition-all duration-300",
                    expanded ? "border-navy/25 bg-white shadow-card" : "border-navy/10 hover:border-navy/25 hover:bg-white",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? null : pillar.id)}
                    className="flex w-full items-start gap-4 p-6 text-left"
                  >
                    <span className="font-display text-[0.75rem] font-bold tracking-[0.1em] text-teal-ink">{pillar.index}</span>
                    <span className="flex-1">
                      <span className="block font-display text-xl font-extrabold tracking-[-0.02em] text-navy">{pillar.title}</span>
                      <span className="mt-1.5 block text-[0.95rem] leading-snug text-charcoal/70">{pillar.line}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-navy/15 text-navy transition-transform duration-300",
                        expanded && "rotate-45 bg-navy text-white",
                      )}
                    >
                      +
                    </span>
                  </button>

                  <div id={panelId} hidden={!expanded} className="px-6 pb-6">
                    <p className="text-[0.95rem] leading-relaxed text-charcoal/75">{pillar.body}</p>
                    {pillar.prompts.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {pillar.prompts.map((prompt) => (
                          <li key={prompt} className="flex gap-3 font-editorial text-[1.02rem] text-charcoal/80 italic">
                            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sun" />
                            {prompt}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => startChat(pillar.title)}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal px-4 py-2 font-display text-[0.82rem] font-semibold text-white transition-colors hover:bg-[#00c9a2]"
                    >
                      Talk about this in chat
                      <span aria-hidden="true">→</span>
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
