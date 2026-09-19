import { useContent } from "@/lib/store";
import { cn } from "@/utils/cn";

type LogoProps = {
  variant?: "dark" | "light";
  className?: string;
  showTagline?: boolean;
  markClassName?: string;
};

/** The default BEYOND NOW mark: horizon arc + rising sun, drawn as vector. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Beyond Now" className={cn("shrink-0", className)}>
      <path
        d="M8 34.5A16.5 16.5 0 1 1 40 34.5"
        fill="none"
        stroke="#0B2D5B"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path d="M13.5 34.5a10.5 10.5 0 0 1 21 0Z" fill="#FFC107" />
      <path d="M3.5 34.5h41" fill="none" stroke="#00B894" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="40" cy="34.5" r="2.6" fill="#0B2D5B" />
    </svg>
  );
}

/**
 * Official BEYOND NOW identity lockup. When a logo file has been uploaded in the
 * admin dashboard it is rendered with `object-contain` inside a fixed box, so the
 * artwork is never stretched, cropped or recoloured by responsive layout.
 */
export function Logo({
  variant = "dark",
  className,
  showTagline = false,
  markClassName = "h-11 w-11",
}: LogoProps) {
  const { brand } = useContent();
  const wordColor = variant === "dark" ? "text-navy" : "text-white";
  const taglineColor = variant === "dark" ? "text-charcoal/55" : "text-white/60";

  if (brand.logoUrl) {
    return (
      <span className={cn("flex items-center gap-3", className)}>
        <img
          src={brand.logoUrl}
          alt="Beyond Now"
          className={cn("w-auto max-w-[190px] object-contain object-left", markClassName)}
        />
        {showTagline && (
          <span
            className={cn(
              "hidden text-[0.58rem] font-semibold tracking-[0.28em] uppercase sm:block",
              taglineColor,
            )}
          >
            {brand.tagline}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark className={markClassName} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[1.02rem] font-extrabold tracking-[-0.045em] sm:text-[1.12rem]",
            wordColor,
          )}
        >
          {brand.wordmarkPrimary}
          <span className="text-sun"> {brand.wordmarkAccent}</span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[0.58rem] font-semibold tracking-[0.28em] uppercase",
              taglineColor,
            )}
          >
            {brand.tagline}
          </span>
        )}
      </span>
    </span>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("h-4 w-4", className)} fill="currentColor">
      <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.9.53 3.68 1.46 5.2L2 22l5.1-1.6a9.9 9.9 0 0 0 4.94 1.32c5.44 0 9.84-4.4 9.84-9.84S17.48 2 12.04 2Zm0 17.9c-1.6 0-3.1-.44-4.38-1.22l-.32-.2-3.02.95.94-2.96-.2-.32a7.98 7.98 0 0 1-1.24-4.3c0-4.46 3.64-8.1 8.22-8.1 4.58 0 8.1 3.64 8.1 8.1 0 4.46-3.64 8.05-8.1 8.05Zm4.5-5.98c-.24-.12-1.46-.72-1.68-.8-.22-.1-.38-.12-.54.12-.16.24-.62.8-.76.96-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.02-.38.1-.5.12-.12.26-.3.38-.46.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.32-.74-1.8-.2-.46-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.7 4.14 3.68 2.44.98 2.44.66 2.88.62.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}
