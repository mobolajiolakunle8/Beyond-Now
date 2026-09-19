import { useState } from "react";
import { ArrowRight, Btn, Reveal, SectionHeading, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";
import { cn } from "@/utils/cn";

function downloadKit(
  trackId: string,
  title: string,
  items: { title: string; detail: string }[],
  whatsapp: string,
) {
  const header = [
    "BEYOND NOW",
    "Understand. Choose. Move Forward.",
    "",
    `${title} — Practical Guidance Pack`,
    "Today Is Not The Whole Story.",
    "",
    "-----------------------------------------------",
    "",
  ].join("\n");

  const body = items
    .map((item, i) => `${i + 1}. ${item.title}\n   ${item.detail}\n`)
    .join("\n");

  const footer = [
    "",
    "-----------------------------------------------",
    `Need to talk it through? WhatsApp: ${whatsapp}`,
    "You don't have to figure growing up out alone.",
  ].join("\n");

  const blob = new Blob([header + body + footer], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `beyond-now-${trackId}-guide.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function Resources() {
  const { resources, resourcesSection, settings } = useContent();
  const wa = useWa();
  const RESOURCE_TRACKS = resources.filter((t) => t.status === "published");
  const [track, setTrack] = useState(0);
  const active = RESOURCE_TRACKS[Math.min(track, Math.max(0, RESOURCE_TRACKS.length - 1))];

  if (!active) return null;
  const items = active.items.filter((i) => i.status === "published");

  return (
    <section id="resources" className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-teal/10 blur-[100px]"
      />
      <Wrap>
        <SectionHeading
          eyebrow={resourcesSection.eyebrow}
          index="05"
          title={
            <>
              {resourcesSection.headingLead}{" "}
              <span className="font-editorial font-normal text-teal-ink italic">
                {resourcesSection.headingAccent}
              </span>{" "}
              {resourcesSection.headingTail}
            </>
          }
          lead={resourcesSection.lead}
        />

        {/* Track switcher */}
        <Reveal delay={120}>
          <div
            role="tablist"
            aria-label="Resource tracks"
            className="mt-12 inline-flex flex-wrap gap-2 rounded-full border border-navy/10 bg-bone p-1.5"
          >
            {RESOURCE_TRACKS.map((item, i) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={i === track}
                onClick={() => setTrack(i)}
                className={cn(
                  "rounded-full px-4 py-2.5 font-display text-[0.85rem] font-semibold transition-all duration-300 sm:px-5",
                  i === track
                    ? "bg-navy text-white shadow-[0_10px_24px_-14px_rgba(11,45,91,0.9)]"
                    : "text-charcoal/60 hover:bg-white hover:text-navy",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Reveal>

        <div key={active.id} className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <div className="animate-sunrise">
            <p className="eyebrow text-teal-ink">{active.audience}</p>
            <h3 className="mt-3 text-2xl leading-tight font-extrabold sm:text-[1.85rem]">
              {active.label}
            </h3>
            <p className="mt-4 leading-relaxed text-charcoal/70">{active.intro}</p>

            <div className="mt-7 space-y-3">
              <Btn
                variant="navy"
                size="md"
                className="w-full sm:w-auto"
                onClick={() => downloadKit(active.id, active.label, items, settings.whatsappDisplay)}
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 3v10M6 9.5l4 4 4-4M4 16.5h12" />
                </svg>
                Download the {active.label.replace("For ", "")} pack
              </Btn>
              <Btn
                href={wa(`Hello Beyond Now. Please send me the "${active.label}" guidance pack.`)}
                external
                variant="outline"
                size="md"
                className="w-full sm:w-auto"
              >
                Get it on WhatsApp
                <ArrowRight />
              </Btn>
            </div>

            <div className="mt-8 rounded-2xl border border-navy/10 bg-bone p-5">
              <p className="eyebrow text-charcoal/50">Start here</p>
              <ol className="mt-3 space-y-2 text-sm text-charcoal/75">
                {resourcesSection.startHere.map((line, i) => (
                  <li key={i}>
                    {i + 1}. {line}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <ul className="animate-sunrise grid gap-3 sm:grid-cols-2">
            {items.map((item, i) => (
              <li
                key={item.title}
                className="group flex flex-col justify-between rounded-2xl border border-navy/10 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-navy/25 hover:shadow-card"
              >
                <div>
                  <span className="font-display text-[0.7rem] font-bold tracking-[0.18em] text-charcoal/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h4 className="mt-2 text-[1.05rem] leading-snug font-bold">{item.title}</h4>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-charcoal/65">
                    {item.detail}
                  </p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-teal-ink">
                  <span className="h-1 w-6 rounded-full bg-teal/30 transition-all duration-300 group-hover:w-9 group-hover:bg-teal" />
                  Included
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Wrap>
    </section>
  );
}
