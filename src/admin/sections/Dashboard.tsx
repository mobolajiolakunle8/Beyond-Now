import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdminBtn, Card, ConfirmDialog, EmptyState, PageHeader, StatusBadge } from "@/admin/ui";
import { LandingPage } from "@/components/LandingPage";
import { formatBytes, formatDateTime, relativeTime, resolveContentMedia } from "@/lib/media";
import { ContentProvider, useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

const SECTION_SUMMARY = [
  { key: "hero", label: "Hero", get: (c: ReturnType<typeof useStore>["draft"]) => c.hero.headingLead },
  { key: "about", label: "About & Founder", get: (c: ReturnType<typeof useStore>["draft"]) => c.about.eyebrow },
  { key: "pillars", label: "Four Pillars", get: (c: ReturnType<typeof useStore>["draft"]) => `${c.pillars.length} pillars` },
  { key: "method", label: "Beyond Now Method", get: (c: ReturnType<typeof useStore>["draft"]) => `${c.method.length} steps` },
  { key: "stories", label: "Stories", get: (c: ReturnType<typeof useStore>["draft"]) => `${c.stories.length} stories` },
  { key: "resources", label: "Resources", get: (c: ReturnType<typeof useStore>["draft"]) => `${c.resources.length} packs` },
  { key: "impact", label: "Impact & Vision", get: (c: ReturnType<typeof useStore>["draft"]) => `${c.impact.vision.length} pillars` },
  { key: "footer", label: "Footer", get: () => "Safeguarding note" },
];

export function Overview({ go }: { go: (route: string) => void }) {
  const { draft, published, media, meta, isDirty, account, cloudEnabled, syncStatus, syncError } = useStore();

  const publishedStories = draft.stories.filter((s) => s.status === "published").length;
  const publishedPacks = draft.resources.filter((r) => r.status === "published").length;
  const mediaBytes = media.reduce((sum, m) => sum + m.size, 0);

  const changedSections = useMemo(() => {
    const keys = Object.keys(draft) as (keyof typeof draft)[];
    return keys.filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(published[k]));
  }, [draft, published]);

  const syncLabel =
    !cloudEnabled
      ? "Local only"
      : syncStatus === "synced"
        ? "Cloud synced"
        : syncStatus === "connecting"
          ? "Connecting…"
          : syncStatus === "offline"
            ? "Offline cache"
            : "Sync issue";

  const stats = [
    { label: "Website status", value: isDirty ? "Unpublished changes" : "Live & up to date", tone: isDirty ? "sun" : "teal" },
    { label: "Cloud sync", value: syncLabel, sub: syncError ? syncError.slice(0, 48) : cloudEnabled ? "Firebase" : "Enable via .env", tone: syncStatus === "error" ? "sun" : "navy" },
    { label: "Media files", value: `${media.length}`, sub: formatBytes(mediaBytes), tone: "navy" },
    { label: "Last published", value: meta.publishedAt ? relativeTime(meta.publishedAt) : "Never", tone: "navy" },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${account?.name?.split(" ")[0] ?? "Admin"}`}
        description="Everything on the public Beyond Now website can be managed from here. Changes stay in draft until you publish."
      >
        <AdminBtn variant="outline" onClick={() => go("preview")}>
          Live preview
        </AdminBtn>
        <AdminBtn variant="accent" onClick={() => go("publish")}>
          Review &amp; publish
        </AdminBtn>
      </PageHeader>

      <div
        className={cn(
          "mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4",
          isDirty ? "border-sun bg-sun/10" : "border-teal/30 bg-teal/8",
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-lg", isDirty ? "bg-sun/30" : "bg-teal/20")}>
            {isDirty ? "✎" : "✓"}
          </span>
          <div>
            <p className="font-display text-[0.95rem] font-bold text-navy">
              {isDirty
                ? `You have unpublished changes in ${changedSections.length} area${changedSections.length === 1 ? "" : "s"}`
                : "The published website matches your draft"}
            </p>
            <p className="text-[0.8rem] text-charcoal/60">
              Draft saved {meta.draftSavedAt ? relativeTime(meta.draftSavedAt) : "never"} · Published{" "}
              {meta.publishedAt ? relativeTime(meta.publishedAt) : "never"}
            </p>
          </div>
        </div>
        {isDirty && (
          <AdminBtn variant="accent" onClick={() => go("publish")}>
            Publish now
          </AdminBtn>
        )}
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-mist bg-white p-5">
            <p className="font-display text-[0.7rem] font-bold tracking-[0.12em] text-charcoal/50 uppercase">
              {stat.label}
            </p>
            <p
              className={cn(
                "mt-2 font-display text-[1.35rem] leading-tight font-extrabold",
                stat.tone === "teal" ? "text-teal-ink" : stat.tone === "sun" ? "text-[#8a6500]" : "text-navy",
              )}
            >
              {stat.value}
            </p>
            {stat.sub && <p className="mt-0.5 text-[0.78rem] text-charcoal/50">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card
          title="Content sections"
          description="Every editable area of the public landing page."
          action={
            <AdminBtn size="sm" variant="outline" onClick={() => go("content")}>
              Edit content
            </AdminBtn>
          }
        >
          <ul className="divide-y divide-mist">
            {SECTION_SUMMARY.map((section) => {
              const changed = changedSections.some((k) => String(k).toLowerCase().includes(section.key));
              return (
                <li key={section.key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[0.86rem] font-semibold text-navy">{section.label}</p>
                    <p className="truncate text-[0.76rem] text-charcoal/55">{section.get(draft)}</p>
                  </div>
                  <StatusBadge status={changed ? "draft" : "published"} />
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title="Published items" description="What visitors can currently reach.">
            <dl className="space-y-3">
              {[
                { k: "Stories live", v: `${publishedStories} of ${draft.stories.length}`, action: "stories" },
                { k: "Resource packs live", v: `${publishedPacks} of ${draft.resources.length}`, action: "resources" },
                { k: "Media library", v: `${media.length} files`, action: "media" },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-3">
                  <dt className="text-[0.85rem] text-charcoal/65">{row.k}</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-display text-[0.85rem] font-bold text-navy">{row.v}</span>
                    <AdminBtn size="sm" variant="ghost" onClick={() => go(row.action)}>
                      Manage
                    </AdminBtn>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Contact channels" description="Used by every call to action.">
            <dl className="space-y-2.5 text-[0.85rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Email</dt>
                <dd className="truncate font-medium text-navy">{draft.settings.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">WhatsApp</dt>
                <dd className="font-medium text-navy">{draft.settings.whatsappDisplay}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal/60">Last updated</dt>
                <dd className="font-medium text-navy">{formatDateTime(meta.publishedAt)}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <AdminBtn size="sm" variant="outline" onClick={() => go("settings")}>
                Open site settings
              </AdminBtn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================== PREVIEW ============================== */

const DEVICES = [
  { id: "desktop", label: "Desktop", width: "100%", icon: "🖥" },
  { id: "tablet", label: "Tablet", width: "820px", icon: "▭" },
  { id: "mobile", label: "Mobile", width: "390px", icon: "▯" },
] as const;

export function PreviewPage({ toolbar }: { toolbar?: ReactNode }) {
  const { isDirty, meta, draft, media } = useStore();
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [nonce, setNonce] = useState(0);
  const [scale, setScale] = useState(1);

  const width = DEVICES.find((d) => d.id === device)?.width ?? "100%";
  const isNarrow = device !== "desktop";
  const shellRef = useRef<HTMLDivElement>(null);

  // Scale narrow viewports down so tablet/mobile layouts stay fully visible.
  useEffect(() => {
    if (!isNarrow || !shellRef.current) {
      setScale(1);
      return;
    }
    const measure = () => {
      const shellWidth = shellRef.current?.clientWidth ?? 0;
      const px = parseInt(width, 10);
      if (!shellWidth || !px) return setScale(1);
      setScale(Math.min(1, shellWidth / px));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isNarrow, width]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Live Preview"
        description="Exactly how the public website will look with your current draft — before anyone else sees it."
      >
        {toolbar}
        <AdminBtn variant="outline" onClick={() => setNonce((n) => n + 1)}>
          Refresh
        </AdminBtn>
        <AdminBtn
          variant="outline"
          onClick={() => {
            window.location.hash = "#/preview";
          }}
        >
          Full screen ↗
        </AdminBtn>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mist bg-white px-4 py-3">
        <div className="flex gap-1 rounded-lg bg-bone p-1">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDevice(d.id)}
              className={cn(
                "rounded-md px-3 py-1.5 font-display text-[0.78rem] font-semibold transition-colors",
                device === d.id ? "bg-navy text-white" : "text-charcoal/60 hover:text-navy",
              )}
            >
              <span aria-hidden="true" className="mr-1.5">
                {d.icon}
              </span>
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-[0.8rem] text-charcoal/60">
          {isDirty ? (
            <span className="font-semibold text-[#8a6500]">Showing unpublished draft</span>
          ) : (
            <span className="font-semibold text-teal-ink">Draft matches the live website</span>
          )}
          {meta.draftSavedAt && <> · saved {relativeTime(meta.draftSavedAt)}</>}
        </p>
      </div>

      {/*
        Rendered inline instead of in an iframe. The previous implementation
        loaded the entire single-file bundle a second time (≈1 MB) and could
        hang on the same Firebase boot path, which is what produced a blank
        preview. Rendering in place is instant and always reflects the draft.
      */}
      <div
        ref={shellRef}
        className="flex min-h-[32rem] flex-1 justify-center overflow-hidden rounded-2xl border border-mist bg-charcoal/5 p-3 sm:p-5"
      >
        <div
          key={`${device}-${nonce}`}
          className="relative h-[72vh] min-h-[32rem] w-full overflow-hidden rounded-xl bg-white shadow-xl transition-all duration-300"
          style={{ maxWidth: width }}
        >
          {/* Scopes `position: fixed` inside the preview so nav/badges stay put */}
          <div className="preview-scope h-full w-full overflow-y-auto overflow-x-hidden">
            <ContentProvider value={resolveContentMedia(draft, media)}>
              <LandingPage applySeo={false} />
            </ContentProvider>
          </div>
          {isNarrow && scale < 1 && (
            <span className="absolute top-2 right-2 rounded-full bg-navy/85 px-2.5 py-1 font-display text-[0.62rem] font-bold text-white backdrop-blur">
              {Math.round(scale * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== PUBLISH ============================== */

export function PublishPage({ toolbar, go }: { toolbar?: ReactNode; go: (r: string) => void }) {
  const { draft, published, meta, isDirty, publish, saveDraft, discardDraft, cloudEnabled, syncStatus } = useStore();
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);

  const diffs = useMemo(() => {
    const labels: Record<string, string> = {
      brand: "Brand & logo",
      nav: "Navigation",
      hero: "Hero section",
      about: "About & founder",
      pillarsSection: "Pillars intro",
      pillars: "Four pillars",
      methodSection: "Method intro",
      method: "Method steps",
      storiesSection: "Stories intro",
      stories: "Stories",
      resourcesSection: "Resources intro",
      resources: "Resource packs",
      impact: "Impact & vision",
      finalCta: "Final call to action",
      footer: "Footer",
      settings: "Site settings",
    };
    return (Object.keys(draft) as (keyof typeof draft)[])
      .filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(published[k]))
      .map((k) => labels[String(k)] ?? String(k));
  }, [draft, published]);

  return (
    <div>
      <PageHeader
        title="Publish"
        description="Review what has changed, then push your draft live to the public Beyond Now website."
      >
        {toolbar}
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Pending changes" description="Areas that differ between your draft and the live website.">
          {diffs.length === 0 ? (
            <EmptyState
              icon="✓"
              title="Nothing to publish"
              body="Your draft is identical to the published website. Make an edit in Website Content, Stories or Resources to see it here."
              action={
                <AdminBtn variant="primary" size="sm" onClick={() => go("content")}>
                  Edit website content
                </AdminBtn>
              }
            />
          ) : (
            <ul className="space-y-2">
              {diffs.map((label) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-sun/40 bg-sun/8 px-4 py-3"
                >
                  <span className="font-display text-[0.88rem] font-semibold text-navy">{label}</span>
                  <StatusBadge status="draft" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Status">
            <dl className="space-y-3 text-[0.85rem]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-charcoal/60">Current state</dt>
                <dd>
                  <StatusBadge status={isDirty ? "draft" : "published"} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-charcoal/60">Cloud</dt>
                <dd className="font-medium text-navy">
                  {cloudEnabled ? syncStatus : "local mode"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-charcoal/60">Draft saved</dt>
                <dd className="font-medium text-navy">{formatDateTime(meta.draftSavedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-charcoal/60">Last published</dt>
                <dd className="font-medium text-navy">{formatDateTime(meta.publishedAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Actions" description="Saving a draft never affects the public website. Publish pushes to every browser via Firebase.">
            <div className="flex flex-col gap-2.5">
              <AdminBtn variant="outline" disabled={busy} onClick={() => void saveDraft()}>
                Save draft
              </AdminBtn>
              <AdminBtn variant="outline" onClick={() => go("preview")}>
                Preview draft
              </AdminBtn>
              <AdminBtn variant="accent" disabled={!isDirty || busy} onClick={() => setConfirmPublish(true)}>
                Publish to live website
              </AdminBtn>
              <AdminBtn variant="ghost" disabled={!isDirty || busy} className="text-red-600" onClick={() => setConfirmDiscard(true)}>
                Discard draft changes
              </AdminBtn>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        tone="teal"
        title="Publish these changes?"
        confirmLabel="Yes, publish now"
        onCancel={() => setConfirmPublish(false)}
        onConfirm={() => {
          setBusy(true);
          void publish().finally(() => {
            setBusy(false);
            setConfirmPublish(false);
          });
        }}
        body={
          <>
            <p>
              Your draft will immediately replace the live content on the public BEYOND NOW website
              {cloudEnabled ? " and sync to every browser via Firebase" : ""}. This affects{" "}
              <strong>{diffs.length}</strong> area{diffs.length === 1 ? "" : "s"}:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-[0.85rem] text-charcoal/70">
              {diffs.slice(0, 8).map((d) => (
                <li key={d}>{d}</li>
              ))}
              {diffs.length > 8 && <li>and {diffs.length - 8} more…</li>}
            </ul>
          </>
        }
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard draft changes?"
        confirmLabel="Discard changes"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setBusy(true);
          void discardDraft().finally(() => {
            setBusy(false);
            setConfirmDiscard(false);
          });
        }}
        body="Your editor will be reset to match the currently published website. Unpublished edits will be lost permanently."
      />
    </div>
  );
}
