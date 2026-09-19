import { Component, type ErrorInfo, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence against a blank white screen.
 *
 * Anything thrown during render (a bad Firebase config, a malformed content
 * document, a failed lazy import) is caught here and replaced with a branded,
 * actionable fallback instead of an empty document.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the detail in the console for debugging; never show a stack to users.
    console.error("Beyond Now crashed:", error, info.componentStack);
  }

  private reload = () => {
    try {
      // Clear cached content in case a corrupt document is the culprit.
      ["bn.published.v1", "bn.draft.v1", "bn.media.v1", "bn.meta.v1"].forEach((k) =>
        localStorage.removeItem(k),
      );
    } catch {
      /* storage unavailable */
    }
    window.location.hash = "#home";
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-navy px-6">
        <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_20%_0%,#12407d_0%,#0b2d5b_50%,#061a38_100%)]" />
        <div className="relative w-full max-w-lg text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white">
            <LogoMark className="h-10 w-10" />
          </span>

          <p className="mt-7 font-display text-[0.7rem] font-bold tracking-[0.24em] text-sun uppercase">
            Beyond Now
          </p>
          <h1 className="mt-3 font-display text-[2rem] leading-tight font-extrabold text-white sm:text-[2.4rem]">
            Today Is Not The Whole Story.
          </h1>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-white/70">
            Something went wrong while loading this page. Your content is safe — this is a display issue, not a
            loss of data.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.reload}
              className="rounded-full bg-sun px-6 py-3 font-display text-[0.9rem] font-semibold text-navy-deep transition-colors hover:bg-[#ffd35c]"
            >
              Reload the page
            </button>
            <a
              href="#home"
              className="rounded-full border border-white/25 px-6 py-3 font-display text-[0.9rem] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Back to the website
            </a>
          </div>

          <details className="mx-auto mt-8 max-w-md rounded-xl border border-white/15 bg-white/5 p-4 text-left">
            <summary className="cursor-pointer font-display text-[0.78rem] font-semibold text-white/70">
              Technical details
            </summary>
            <p className="mt-2 font-mono text-[0.72rem] leading-relaxed break-words text-white/50">
              {error.message || "Unknown error"}
            </p>
          </details>
        </div>
      </div>
    );
  }
}
