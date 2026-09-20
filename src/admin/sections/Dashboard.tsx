import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminBtn, Card, PageHeader } from "@/admin/ui";
import { LandingPage } from "@/components/LandingPage";
import { formatBytes, formatDateTime, relativeTime, resolveContentMedia } from "@/lib/media";
import { ContentProvider, useStore, type SyncStatus, type CloudCheck } from "@/lib/store";
import { cn } from "@/utils/cn";

const SYNC_LABEL: Record<SyncStatus, string> = {
  local: "Local only",
  connecting: "Connecting…",
  synced: "Live · synced",
  offline: "Offline cache",
  error: "Sync issue",
};

/* ============================== OVERVIEW ============================== */

export function Overview({ go }: { go: (route: string) => void }) {
  const { content, media, updatedAt, saving, account, cloudEnabled, syncStatus, syncError, verifyCloud, retryCloud } = useStore();
  const [checks, setChecks] = useState<CloudCheck[] | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    try {
      setChecks(await verifyCloud());
    } finally {
      setChecking(false);
    }
  };

  const publishedStories = content.stories.filter((s) => s.status === "published").length;
  const publishedPacks = content.resources.filter((r) => r.status === "published").length;
  const mediaBytes = media.reduce((sum, m) => sum + m.size, 0);

  // A permission-denied means the Firestore ruleset is still deny-all (not published).
  const rulesLocked = /security rules|permission|insufficient/i.test(syncError ?? "");

  const sections = [
    { label: "Hero", detail: content.hero.headingLead, route: "content" },
    { label: "About & founder", detail: content.about.founderName, route: "content" },
    { label: "Four pillars", detail: `${content.pillars.length} pillars`, route: "content" },
    { label: "Method", detail: `${content.method.length} steps`, route: "content" },
    { label: "Stories", detail: `${publishedStories} of ${content.stories.length} visible`, route: "stories" },
    { label: "Resource packs", detail: `${publishedPacks} of ${content.resources.length} visible`, route: "resources" },
    { label: "Contact & footer", detail: content.settings.email, route: "settings" },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${account?.name?.split(" ")[0] ?? "Admin"}`}
        description="Every change you make is published to the live website automatically — there is nothing to submit."
      >
        <AdminBtn variant="outline" onClick={() => go("preview")}>Preview site</AdminBtn>
        <AdminBtn variant="accent" onClick={() => go("content")}>Edit content</AdminBtn>
      </PageHeader>

      <div
        className={cn(
          "mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4",
          syncStatus === "error" ? "border-red-200 bg-red-50" : saving ? "border-sun bg-sun/10" : "border-teal/30 bg-teal/8",
        )}
      >
        <div className="flex flex-1 items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg",
              saving ? "bg-sun/30" : syncStatus === "error" ? "bg-red-100 text-red-600" : "bg-teal/20",
            )}
          >
            {saving ? "…" : syncStatus === "error" ? "!" : "✓"}
          </span>
          <div className="min-w-0">
            <p className="font-display text-[0.95rem] font-bold text-navy">
              {saving
                ? "Publishing your latest change…"
                : syncStatus === "error"
                  ? rulesLocked
                    ? "Cloud is locked — security rules not published"
                    : "Cloud sync error"
                  : "Website is live and up to date"}
            </p>
            <p className="text-[0.8rem] text-charcoal/60">
              {syncStatus === "error"
                ? "Run the cloud check below to see exactly what to fix — recovery is automatic once it passes."
                : (syncError ?? (updatedAt ? `Last updated ${relativeTime(updatedAt)}` : "No edits yet"))}
              {cloudEnabled ? " · Firebase" : " · local mode"}
            </p>
          </div>
        </div>
        {syncStatus === "error" && (
          <AdminBtn size="sm" variant="primary" onClick={() => void runCheck()}>
            {checking ? "Checking…" : "Run cloud check"}
          </AdminBtn>
        )}
      </div>

      {syncError && (
        <Card
          title="Cloud setup check"
          description="Diagnose exactly which server step is blocking sync, then fix it — recovery is automatic."
          className="mb-5 border-red-200"
        >
          {checks ? (
            <ul className="space-y-2.5">
              {checks.map((step) => (
                <li key={step.id} className="flex items-start gap-3 rounded-xl border border-mist bg-bone/50 px-4 py-3">
                  <span
                    className={cn(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold text-white",
                      step.ok ? "bg-teal" : "bg-red-500",
                    )}
                  >
                    {step.ok ? "✓" : "!"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-[0.88rem] font-bold text-navy">{step.label}</p>
                    {step.detail && <p className="mt-0.5 text-[0.8rem] leading-relaxed text-charcoal/65">{step.detail}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[0.85rem] leading-relaxed text-charcoal/70">
              {rulesLocked ? (
                <>
                  <p>
                    Your database (<strong>https://beyond-now-14935-default-rtdb.firebaseio.com/</strong>) requires
                    rules to be published in Firebase Console.
                  </p>
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                    <li>
                      In the <strong>Firebase Console → Build → Realtime Database → Rules</strong> tab, paste the
                      contents of <code className="rounded bg-bone px-1.5 py-0.5 font-semibold text-navy">database.rules.json</code> and
                      click <strong>Publish</strong>.
                    </li>
                    <li>
                      Or from a terminal in this project, run{" "}
                      <code className="rounded bg-bone px-1.5 py-0.5 font-semibold text-navy">npm run deploy:rules</code>.
                    </li>
                  </ol>
                  <p className="mt-3">Then press <strong>Run cloud check</strong> — everything recovers automatically, no refresh needed.</p>
                </>
              ) : (
                <p>
                  Run the check to see which of the four server checks is failing, then fix that step and run the check
                  again — recovery is automatic, no refresh needed.
                </p>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminBtn size="sm" variant="outline" onClick={retryCloud}>Retry now</AdminBtn>
          </div>
        </Card>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Cloud sync", value: cloudEnabled ? SYNC_LABEL[syncStatus] : "Local only", tone: syncStatus === "synced" ? "teal" : "navy" },
          { label: "Stories live", value: `${publishedStories} / ${content.stories.length}`, tone: "navy" },
          { label: "Media files", value: String(media.length), sub: formatBytes(mediaBytes), tone: "navy" },
          { label: "Last updated", value: updatedAt ? relativeTime(updatedAt) : "Never", sub: updatedAt ? formatDateTime(updatedAt) : undefined, tone: "navy" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-mist bg-white p-5">
            <p className="font-display text-[0.7rem] font-bold tracking-[0.12em] text-charcoal/50 uppercase">{stat.label}</p>
            <p className={cn("mt-2 font-display text-[1.35rem] leading-tight font-extrabold", stat.tone === "teal" ? "text-teal-ink" : "text-navy")}>{stat.value}</p>
            {stat.sub && <p className="mt-0.5 text-[0.78rem] text-charcoal/50">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <Card title="Website sections" description="Everything on the public site, and where to edit it.">
        <ul className="divide-y divide-mist">
          {sections.map((section) => (
            <li key={section.label} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-display text-[0.86rem] font-semibold text-navy">{section.label}</p>
                <p className="truncate text-[0.76rem] text-charcoal/55">{section.detail}</p>
              </div>
              <AdminBtn size="sm" variant="ghost" onClick={() => go(section.route)}>Edit</AdminBtn>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ============================== PREVIEW ============================== */

const DEVICES = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "820px" },
  { id: "mobile", label: "Mobile", width: "390px" },
] as const;

export function PreviewPage({ toolbar }: { toolbar?: ReactNode }) {
  const { content, media, updatedAt } = useStore();
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [scale, setScale] = useState(1);
  const shellRef = useRef<HTMLDivElement>(null);
  const width = DEVICES.find((d) => d.id === device)?.width ?? "100%";

  // Scale narrow viewports down so tablet/mobile layouts stay fully visible.
  useEffect(() => {
    if (device === "desktop") return setScale(1);
    const measure = () => {
      const shell = shellRef.current?.clientWidth ?? 0;
      const px = parseInt(width, 10);
      setScale(shell && px ? Math.min(1, shell / px) : 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [device, width]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Preview" description="The live website, rendered here exactly as visitors see it.">
        {toolbar}
        <AdminBtn variant="outline" onClick={() => window.open(`${window.location.href.split("#")[0]}#home`, "_blank", "noopener")}>
          Open live site ↗
        </AdminBtn>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mist bg-white px-4 py-3">
        <div className="flex gap-1 rounded-lg bg-bone p-1">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDevice(d.id)}
              className={cn("rounded-md px-3 py-1.5 font-display text-[0.78rem] font-semibold transition-colors", device === d.id ? "bg-navy text-white" : "text-charcoal/60 hover:text-navy")}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-[0.8rem] text-charcoal/60">{updatedAt ? `Updated ${relativeTime(updatedAt)}` : "Showing defaults"}</p>
      </div>

      <div ref={shellRef} className="flex min-h-[32rem] flex-1 justify-center overflow-hidden rounded-2xl border border-mist bg-charcoal/5 p-3 sm:p-5">
        <div className="relative h-[72vh] min-h-[32rem] w-full overflow-hidden rounded-xl bg-white shadow-xl transition-all duration-300" style={{ maxWidth: width }}>
          <div className="preview-scope h-full w-full overflow-x-hidden overflow-y-auto">
            <ContentProvider value={resolveContentMedia(content, media)}>
              <LandingPage applySeo={false} />
            </ContentProvider>
          </div>
          {scale < 1 && (
            <span className="absolute top-2 right-2 rounded-full bg-navy/85 px-2.5 py-1 font-display text-[0.62rem] font-bold text-white">{Math.round(scale * 100)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
