import { useEffect } from "react";
import { About } from "@/components/About";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Method } from "@/components/Method";
import { Nav } from "@/components/Nav";
import { Pillars } from "@/components/Pillars";
import { Stories } from "@/components/Stories";
import { useContent } from "@/lib/store";

/** Applies the SEO fields managed in the dashboard to the live document. */
function useSeo(enabled: boolean) {
  const { settings } = useContent();
  useEffect(() => {
    if (!enabled) return;
    if (settings.seoTitle) document.title = settings.seoTitle;

    const setMeta = (selector: string, attr: string, key: string, value: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(selector);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", value);
    };

    if (settings.seoDescription) {
      setMeta('meta[name="description"]', "name", "description", settings.seoDescription);
      setMeta('meta[property="og:description"]', "property", "og:description", settings.seoDescription);
    }
    if (settings.seoTitle) setMeta('meta[property="og:title"]', "property", "og:title", settings.seoTitle);
    if (settings.favicon) {
      let icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        document.head.appendChild(icon);
      }
      icon.href = settings.favicon;
    }
  }, [enabled, settings]);
}

export function LandingPage({ applySeo = true }: { applySeo?: boolean }) {
  useSeo(applySeo);

  return (
    <div className="min-h-screen bg-bone">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-full focus:bg-navy focus:px-5 focus:py-3 focus:font-display focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <About />
        <Pillars />
        <Method />
        <Stories />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
