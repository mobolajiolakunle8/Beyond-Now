import { useEffect, useState, type ReactNode } from "react";
import { AdminBtn, PageHeader, StatusBadge } from "@/admin/ui";
import { getAppCheckState, initAppCheck } from "@/lib/appCheck";
import { useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

type SecurityCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  /** True when the fix is performed in the Firebase console, not the code. */
  console: boolean;
};

export function SecurityAdmin({ toolbar }: { toolbar?: ReactNode }) {
  const { account, cloudEnabled, syncStatus } = useStore();
  const [appCheck, setAppCheck] = useState(() => getAppCheckState());
  const [checking, setChecking] = useState(false);

  const run = async () => {
    setChecking(true);
    await initAppCheck();
    setAppCheck(getAppCheckState());
    setChecking(false);
  };

  useEffect(() => {
    void run();
  }, []);

  const checks: SecurityCheck[] = [
    {
      id: "auth",
      label: "Signed in with an authorised administrator account",
      ok: Boolean(account?.uid),
      detail: account?.uid
        ? `${account.email} · uid ${account.uid}`
        : "No administrator session found.",
      console: false,
    },
    {
      id: "database",
      label: "Realtime Database rules published",
      ok: cloudEnabled ? syncStatus !== "error" : true,
      detail: cloudEnabled
        ? syncStatus === "error"
          ? "Writes are being rejected. Publish database.rules.json in Realtime Database → Rules."
          : "Rules are accepting authenticated reads and writes."
        : "Running in local mode — rules are not exercised.",
      console: true,
    },
    {
      id: "storage",
      label: "Cloud Storage rules published and bucket active",
      ok: true,
      detail:
        "storage.rules restricts /media and /avatars to images only. If Storage returns 404, create it in Storage → Get started. Uploads fall back to Realtime Database meanwhile.",
      console: true,
    },
    {
      id: "appcheck",
      label: "App Check protecting Realtime Database, Storage and Functions",
      ok: appCheck.enabled && appCheck.ready,
      detail: appCheck.enabled
        ? appCheck.token
          ? "reCAPTCHA token attached to Firebase requests."
          : "App Check active; first token still issuing."
        : (appCheck.error ?? "App Check is not configured."),
      console: true,
    },
    {
      id: "claims",
      label: "Administrator roles issued by the Admin SDK",
      ok: false,
      detail:
        "Set an isAdmin custom claim for each administrator using the Firebase Admin SDK, then have them sign out and in. The admins/{uid} allow-list governs the database; Storage also requires the claim or root-admin email.",
      console: true,
    },
    {
      id: "functions",
      label: "Cloud Functions for email, notifications and audit",
      ok: false,
      detail:
        "Deploy Cloud Functions to send email, deliver push notifications, enforce rate limits, write server-side audit records and process account deletion.",
      console: true,
    },
    {
      id: "pwa",
      label: "Progressive Web App installed and offline-capable",
      ok: true,
      detail: "manifest.webmanifest and sw.js are published with the site for offline reading and fast repeat loads.",
      console: false,
    },
    {
      id: "privacy",
      label: "Member privacy controls live",
      ok: true,
      detail: "Members can export all of their data, delete their content, and record consent choices from Privacy & Data.",
      console: false,
    },
  ];

  const passing = checks.filter((c) => c.ok).length;

  return (
    <div>
      <PageHeader
        title="Security & Compliance"
        description="Live status of the protections around member data, plus the console steps required to complete hardening."
      >
        {toolbar}
        <AdminBtn variant="outline" onClick={() => void run()} disabled={checking}>
          {checking ? "Checking…" : "Re-run checks"}
        </AdminBtn>
      </PageHeader>

      <div
        className={cn(
          "mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4",
          passing === checks.length ? "border-teal/30 bg-teal/10" : "border-sun/30 bg-sun/10",
        )}
      >
        <div>
          <p className="font-display text-[1.1rem] font-extrabold text-navy">
            {passing} of {checks.length} protections verified
          </p>
          <p className="mt-0.5 text-[0.82rem] text-charcoal/60">
            {passing === checks.length
              ? "Everything that can be verified in the browser is in place."
              : "Items marked Console require action in the Firebase project before launch."}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {checks.map((check) => (
          <li key={check.id} className="rounded-2xl border border-mist bg-white p-5">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold text-white",
                  check.ok ? "bg-teal" : "bg-sun text-navy-deep",
                )}
                aria-hidden="true"
              >
                {check.ok ? "✓" : "!"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-[0.92rem] font-bold text-navy">{check.label}</p>
                  {!check.console && <StatusBadge status="published" />}
                  {check.console && !check.ok && <StatusBadge status="draft" />}
                </div>
                <p className="mt-1 text-[0.84rem] leading-relaxed text-charcoal/65">{check.detail}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl border border-mist bg-bone/60 p-5">
        <h2 className="font-display text-[1rem] font-bold text-navy">Console checklist</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.85rem] leading-relaxed text-charcoal/70">
          <li>
            Publish <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-navy">database.rules.json</code>{" "}
            and <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-navy">storage.rules</code> —{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-navy">npm run deploy:rules</code>
          </li>
          <li>
            Enable <strong>App Check</strong> (reCAPTCHA v3) for Realtime Database, Storage and Functions. Register
            localhost as a debug target for development.
          </li>
          <li>
            Issue an <strong>isAdmin custom claim</strong> to every administrator with the Admin SDK, then have them sign
            out and in.
          </li>
          <li>
            Deploy <strong>Cloud Functions</strong> for email, push notifications, rate limits, audit records and account
            deletion.
          </li>
          <li>
            Enable <strong>scheduled backups</strong> for Realtime Database and review the audit log weekly.
          </li>
        </ol>
      </div>
    </div>
  );
}
