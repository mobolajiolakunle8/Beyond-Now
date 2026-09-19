import { useState } from "react";
import { WhatsAppIcon } from "@/components/Logo";
import { ArrowRight, Reveal, Wrap } from "@/components/ui";
import { useContent, useWa } from "@/lib/store";
import { cn } from "@/utils/cn";

export function FinalCTA() {
  const { finalCta, settings } = useContent();
  const wa = useWa();
  const ROLES = finalCta.roles;
  const EMAIL = settings.email;
  const WHATSAPP_DISPLAY = settings.whatsappDisplay;
  const [role, setRole] = useState(ROLES[0] ?? "");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [opened, setOpened] = useState(false);

  const valid = message.trim().length >= 10;

  const composed = [
    "Hello Beyond Now.",
    "",
    `Who I am: ${role}`,
    name.trim() ? `Name: ${name.trim()}` : null,
    "",
    "What's going on:",
    message.trim() || "(I'll share in the chat)",
    "",
    "— Sent from beyondnow.org",
  ]
    .filter(Boolean)
    .join("\n");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    window.open(wa(composed), "_blank", "noopener,noreferrer");
    setOpened(true);
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(composed);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <section id="contact" className="relative overflow-hidden bg-sun py-16 sm:py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-navy/10 to-transparent"
      />
      <Wrap className="relative">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <span className="eyebrow text-navy/60">{finalCta.eyebrow}</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-5 text-[clamp(2.3rem,5.5vw,3.8rem)] leading-[0.98] font-extrabold text-navy-deep">
                {finalCta.heading}
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-navy-deep/80 sm:text-[1.12rem]">
                {finalCta.body}
              </p>
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-8 space-y-3">
                <a
                  href={wa("Hello Beyond Now. I'd like to talk to someone.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-navy-deep/15 bg-navy-deep px-5 py-4 text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy"
                >
                  <span className="flex items-center gap-3">
                    <WhatsAppIcon className="h-5 w-5 text-sun" />
                    <span>
                      <span className="block font-display text-[0.95rem] font-bold">
                        {WHATSAPP_DISPLAY}
                      </span>
                      <span className="block text-xs text-white/60">{finalCta.whatsappLabel}</span>
                    </span>
                  </span>
                  <ArrowRight className="text-sun" />
                </a>
                <a
                  href={`mailto:${EMAIL}?subject=${encodeURIComponent("Beyond Now enquiry")}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-navy-deep/20 bg-navy-deep/5 px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-deep/10"
                >
                  <span>
                    <span className="block font-display text-[0.95rem] font-bold text-navy-deep">
                      {EMAIL}
                    </span>
                    <span className="block text-xs text-navy-deep/60">{finalCta.emailLabel}</span>
                  </span>
                  <ArrowRight className="text-navy-deep/50" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <p className="mt-7 rounded-2xl border border-navy-deep/15 bg-white/50 px-5 py-4 text-[0.85rem] leading-relaxed text-navy-deep/75">
                {finalCta.safetyNote}
              </p>
            </Reveal>
          </div>

          {/* Form */}
          <Reveal delay={140}>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-[1.75rem] bg-white p-6 shadow-[0_40px_80px_-40px_rgba(11,45,91,0.5)] sm:p-8"
            >
              <h3 className="text-xl font-extrabold sm:text-2xl">{finalCta.formTitle}</h3>
              <p className="mt-2 text-[0.9rem] text-charcoal/60">{finalCta.formIntro}</p>

              <fieldset className="mt-6">
                <legend className="eyebrow text-charcoal/50">Who are you?</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ROLES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      aria-pressed={role === option}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-[0.8rem] font-semibold transition-all duration-300",
                        role === option
                          ? "border-navy bg-navy text-white"
                          : "border-navy/15 bg-bone text-charcoal/65 hover:border-navy/35 hover:text-navy",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5">
                <label htmlFor="bn-name" className="eyebrow text-charcoal/50">
                  Name <span className="text-charcoal/30">(optional)</span>
                </label>
                <input
                  id="bn-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="However you'd like to be called"
                  className="mt-2 w-full rounded-xl border border-navy/15 bg-bone px-4 py-3 text-[0.95rem] text-navy placeholder:text-charcoal/35 focus:border-navy focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="bn-message" className="eyebrow text-charcoal/50">
                  What&rsquo;s going on?
                </label>
                <textarea
                  id="bn-message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Say as much or as little as you want. Even one line is enough to start."
                  aria-invalid={touched && !valid}
                  aria-describedby="bn-message-help"
                  className={cn(
                    "mt-2 w-full resize-y rounded-xl border bg-bone px-4 py-3 text-[0.95rem] text-navy placeholder:text-charcoal/35 focus:bg-white focus:outline-none",
                    touched && !valid ? "border-red-400" : "border-navy/15 focus:border-navy",
                  )}
                />
                <p
                  id="bn-message-help"
                  className={cn(
                    "mt-2 text-xs",
                    touched && !valid ? "text-red-500" : "text-charcoal/50",
                  )}
                >
                  {touched && !valid
                    ? "Please write at least a short sentence so we know how to help."
                    : "Messages stay private. We only involve others with your knowledge."}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-navy px-7 py-3.5 font-display text-[0.95rem] font-semibold text-white shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-soft"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Send on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={copyMessage}
                  className="font-display text-[0.85rem] font-semibold text-charcoal/60 underline decoration-navy/20 underline-offset-4 transition-colors hover:text-navy"
                >
                  Copy message instead
                </button>
              </div>

              {opened && (
                <p
                  role="status"
                  className="mt-5 rounded-xl border border-teal/30 bg-teal/10 px-4 py-3 text-[0.85rem] text-teal-ink"
                >
                  WhatsApp should be opening in a new tab. If nothing happened, use the copy button
                  and paste your message into a chat with {WHATSAPP_DISPLAY}.
                </p>
              )}
            </form>
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}
