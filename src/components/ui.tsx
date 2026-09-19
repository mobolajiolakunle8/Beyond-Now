import type { ElementType, ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/utils/cn";

export function Wrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-12", className)}>{children}</div>;
}

export function Reveal({
  children,
  className,
  delay = 0,
  blur = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  blur?: boolean;
  as?: ElementType;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      data-visible={inView ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", blur && "reveal-blur", className)}
    >
      {children}
    </Tag>
  );
}

type ButtonVariant = "sun" | "navy" | "outline" | "ghost" | "teal" | "light";

const buttonBase =
  "group relative inline-flex items-center justify-center gap-2.5 rounded-full font-display text-[0.9rem] font-semibold tracking-[-0.01em] transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  sun: "bg-sun text-navy-deep shadow-[0_10px_30px_-12px_rgba(255,193,7,0.75)] hover:-translate-y-0.5 hover:bg-[#ffd35c] hover:shadow-[0_18px_40px_-14px_rgba(255,193,7,0.85)]",
  navy: "bg-navy text-white shadow-lift hover:-translate-y-0.5 hover:bg-navy-soft",
  teal: "bg-teal text-white shadow-[0_10px_30px_-14px_rgba(0,184,148,0.8)] hover:-translate-y-0.5 hover:bg-[#00c9a2]",
  outline:
    "border border-navy/20 bg-white/70 text-navy backdrop-blur hover:-translate-y-0.5 hover:border-navy/40 hover:bg-white",
  ghost: "text-navy hover:text-teal-ink",
  light: "bg-white text-navy hover:-translate-y-0.5 hover:bg-mist",
};

const buttonSizes: Record<"sm" | "md" | "lg", string> = {
  sm: "px-4 py-2 text-[0.8rem]",
  md: "px-5 py-2.5",
  lg: "px-7 py-3.5 text-[0.95rem]",
};

export function Btn({
  href,
  children,
  variant = "sun",
  size = "md",
  className,
  external = false,
  onClick,
  ariaLabel,
}: {
  href?: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  external?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const classes = cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
  if (href) {
    return (
      <a
        href={href}
        className={classes}
        onClick={onClick}
        aria-label={ariaLabel}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("h-4 w-4 transition-transform duration-300 group-hover:translate-x-1", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  tone = "light",
  align = "left",
  index,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
  index?: string;
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <Reveal>
        <div
          className={cn(
            "flex items-center gap-3",
            align === "center" && "justify-center",
          )}
        >
          {index && (
            <span
              className={cn(
                "eyebrow rounded-full px-2.5 py-1",
                dark ? "bg-white/10 text-sun" : "bg-navy/5 text-navy/70",
              )}
            >
              {index}
            </span>
          )}
          <span className={cn("eyebrow", dark ? "text-sun" : "text-teal-ink")}>{eyebrow}</span>
          <span
            aria-hidden="true"
            className={cn("h-px w-10", dark ? "bg-white/25" : "bg-navy/20", align === "center" && "hidden")}
          />
        </div>
      </Reveal>
      <Reveal delay={80}>
        <h2
          className={cn(
            "mt-5 text-[clamp(1.9rem,4.3vw,3.15rem)] leading-[1.06] font-extrabold",
            dark && "text-white",
          )}
        >
          {title}
        </h2>
      </Reveal>
      {lead && (
        <Reveal delay={150}>
          <p
            className={cn(
              "mt-5 text-[1.02rem] leading-relaxed sm:text-[1.12rem]",
              dark ? "text-white/70" : "text-charcoal/70",
            )}
          >
            {lead}
          </p>
        </Reveal>
      )}
    </div>
  );
}

