import { useEffect, useState } from "react";
import { Banner, PageTitle, AcctBtn, AcctField, AcctTextArea } from "@/account/ui";
import { useUserStore } from "@/account/UserStore";
import {
  CONSENT_POLICY_VERSION,
  deleteMyAccountData,
  downloadPrivacyExport,
  readConsent,
  requestAccountDeletion,
  saveConsent,
  type ConsentRecord,
} from "@/lib/privacy";
import { formatDateTime } from "@/lib/media";
import { databaseErrorMessage } from "@/lib/firebase";
import { cn } from "@/utils/cn";

type Stage = "idle" | "exporting" | "deleting" | "deleted";

export function PrivacyPage() {
  const { authedUser } = useUserStore();
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [busy, setBusy] = useState<Stage>("idle");
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "warning"; msg: string } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [immediateRequest, setImmediateRequest] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!authedUser) return;
    void readConsent(authedUser.uid).then(setConsent).catch(() => undefined);
  }, [authedUser]);

  const uid = authedUser?.uid;
  const email = authedUser?.email ?? "";

  const handleConsent = async (patch: Partial<ConsentRecord>) => {
    if (!uid) return;
    setBusy("exporting");
    setNotice(null);
    try {
      await saveConsent(uid, {
        acceptableUse: consent?.acceptableUse ?? true,
        safeguardingReview: consent?.safeguardingReview ?? true,
        marketing: patch.marketing ?? consent?.marketing ?? false,
        ...patch,
      });
      setConsent(await readConsent(uid));
      setNotice({ tone: "success", msg: "Your privacy choices have been saved." });
    } catch (err) {
      setNotice({ tone: "error", msg: databaseErrorMessage(err) });
    } finally {
      setBusy("idle");
    }
  };

  const handleExport = async () => {
    if (!uid) return;
    setBusy("exporting");
    setNotice(null);
    try {
      await downloadPrivacyExport(uid, email);
      setNotice({ tone: "success", msg: "Your data export has been downloaded." });
    } catch (err) {
      setNotice({ tone: "error", msg: databaseErrorMessage(err) });
    } finally {
      setBusy("idle");
    }
  };

  const handleDelete = async () => {
    if (!uid) return;
    setBusy("deleting");
    setNotice(null);
    try {
      await deleteMyAccountData(uid);
      setNotice({ tone: "success", msg: "Your content has been deleted from Beyond Now." });
      setBusy("deleted");
    } catch (err) {
      setNotice({ tone: "error", msg: databaseErrorMessage(err) });
      setBusy("idle");
    }
  };

  const handleRequest = async () => {
    if (!uid) return;
    setBusy("deleting");
    setNotice(null);
    try {
      await requestAccountDeletion(uid, email, reason);
      setNotice({
        tone: "warning",
        msg: "Your deletion request has been submitted. A Beyond Now administrator will review it and confirm by email.",
      });
      setReason("");
      setConfirmDelete(false);
      setConfirmText("");
      setBusy("idle");
    } catch (err) {
      setNotice({ tone: "error", msg: databaseErrorMessage(err) });
      setBusy("idle");
    }
  };

  const consentMissing = !consent;

  return (
    <div>
      <PageTitle
        title="Privacy & Data"
        description="See exactly what Beyond Now stores, download a copy, and control what happens to your information."
      />

      <div className="space-y-5">
        {/* Consent */}
        <section className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
          <h2 className="font-display text-[1.05rem] font-bold text-navy">Your consent choices</h2>
          <p className="mt-1 text-[0.85rem] text-charcoal/60">
            Policy version {CONSENT_POLICY_VERSION}
            {consent?.acceptedAt ? ` · accepted ${formatDateTime(consent.acceptedAt)}` : ""}
          </p>

          {consentMissing && (
            <div className="mt-4">
              <Banner tone="info">
                We are asking you to confirm your privacy choices. Your conversations remain private either way.
              </Banner>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <ConsentRow
              title="Acceptable use"
              body="I agree to use Beyond Now respectfully and understand it offers guidance, not medical, legal or emergency help."
              checked={consent?.acceptableUse ?? false}
              locked
            />
            <ConsentRow
              title="Safeguarding review"
              body="I understand conversations are reviewed by trained staff, and that Beyond Now may involve emergency services or a trusted adult where someone appears to be at risk of serious harm — talking to me about it first wherever we safely can."
              checked={consent?.safeguardingReview ?? false}
              locked
            />
            <ConsentRow
              title="Optional updates"
              body="Occasionally email me about new resources, stories and Library releases."
              checked={consent?.marketing ?? false}
              onToggle={(marketing) => void handleConsent({ marketing })}
              disabled={busy !== "idle"}
            />
          </div>

          {notice?.msg.includes("privacy choices") && (
            <div className="mt-4"><Banner tone="success">{notice.msg}</Banner></div>
          )}
        </section>

        {/* Export */}
        <section className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
          <h2 className="font-display text-[1.05rem] font-bold text-navy">Download your data</h2>
          <p className="mt-1.5 text-[0.9rem] leading-relaxed text-charcoal/65">
            Get a copy of your profile, saved resources, notifications, story submissions and your full private
            conversation. The file is created on your device — it is not sent anywhere.
          </p>
          <ul className="mt-4 grid gap-2 text-[0.84rem] text-charcoal/70 sm:grid-cols-2">
            <li>• Profile and privacy choices</li>
            <li>• Saved resources</li>
            <li>• Notifications</li>
            <li>• Story submissions and their status</li>
            <li className="sm:col-span-2">• Your complete message history with Beyond Now</li>
          </ul>
          <div className="mt-5">
            <AcctBtn variant="primary" disabled={busy !== "idle"} onClick={() => void handleExport()}>
              {busy === "exporting" ? "Preparing…" : "Download my data (JSON)"}
            </AcctBtn>
          </div>
        </section>

        {/* Deletion */}
        <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
          <h2 className="font-display text-[1.05rem] font-bold text-red-700">Delete my data</h2>
          <p className="mt-1.5 text-[0.9rem] leading-relaxed text-charcoal/65">
            This permanently removes your saved resources, notifications, story submissions and your conversation
            history. Your sign-in account is removed from Beyond Now's records.
          </p>

          {busy === "deleted" ? (
            <div className="mt-4">
              <Banner tone="success">
                Your content has been deleted. You can now sign out — this account no longer holds any of your
                information.
              </Banner>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <Banner tone="warning">
                  Deletion cannot be undone. If you would prefer a temporary break instead, you can simply stop using
                  the account — nothing is shared or published without your action.
                </Banner>
              </div>

              {!confirmDelete ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <AcctBtn variant="danger" disabled={busy !== "idle"} onClick={() => setConfirmDelete(true)}>
                    Delete my data and account
                  </AcctBtn>
                  <AcctBtn variant="outline" disabled={busy !== "idle"} onClick={() => { setConfirmDelete(true); setImmediateRequest(true); }}>
                    Request deletion by email instead
                  </AcctBtn>
                </div>
              ) : (
                <div className="mt-5 space-y-4 rounded-xl border border-red-200 bg-red-50/60 p-4">
                  <AcctField label="Why are you leaving? (optional)" hint="Helps us improve">
                    <AcctTextArea
                      rows={3}
                      value={reason}
                      onChange={setReason}
                      placeholder="Anything you would like the team to know."
                    />
                  </AcctField>
                  <AcctField
                    label="Type DELETE to confirm"
                    error={confirmText && confirmText !== "DELETE" ? "Please type DELETE exactly" : undefined}
                  >
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full rounded-lg border border-navy/15 bg-white px-3.5 py-2.5 text-[0.9rem] tracking-widest focus:border-navy focus:outline-none"
                      placeholder="DELETE"
                    />
                  </AcctField>
                  <div className="flex flex-wrap gap-2">
                    {immediateRequest ? (
                    <AcctBtn
                      variant="danger"
                      disabled={busy !== "idle"}
                      onClick={() => void handleRequest()}
                    >
                      {busy === "deleting" ? "Submitting…" : "Submit deletion request"}
                    </AcctBtn>
                  ) : (
                    <AcctBtn
                      variant="danger"
                      disabled={busy !== "idle" || confirmText !== "DELETE"}
                      onClick={() => void handleDelete()}
                    >
                      {busy === "deleting" ? "Deleting…" : "Permanently delete everything"}
                    </AcctBtn>
                  )}
                  <AcctBtn variant="outline" disabled={busy !== "idle"} onClick={() => { setConfirmDelete(false); setConfirmText(""); setImmediateRequest(false); }}>
                    Cancel
                  </AcctBtn>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Retention & transparency */}
        <section className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
          <h2 className="font-display text-[1.05rem] font-bold text-navy">How Beyond Now handles your data</h2>
          <dl className="mt-4 divide-y divide-mist text-[0.88rem]">
            {[
              ["Who can read my messages", "Only you and authorised Beyond Now administrators. Other members cannot see them."],
              ["Do you sell my data?", "No. Beyond Now never sells or trades member information."],
              ["How long are messages kept?", "Messages are kept while your account is active so your conversation can continue. Deleting your data removes them."],
              ["Story submissions", "Kept privately until an editor reviews them. You can withdraw consent before publication from Share your story."],
              ["Profile pictures", "Stored in Firebase Storage and deleted when you delete your data."],
              ["Email address", "Used for account sign-in and essential service emails only."],
            ].map(([k, v]) => (
              <div key={k} className="py-3">
                <dt className="font-display text-[0.88rem] font-semibold text-navy">{k}</dt>
                <dd className="mt-0.5 leading-relaxed text-charcoal/70">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[0.8rem] leading-relaxed text-charcoal/55">
            Questions or a data request? Email{" "}
            <a href="mailto:beyondnow.ng@gmail.com" className="font-semibold text-navy underline-offset-2 hover:underline">
              beyondnow.ng@gmail.com
            </a>
            .
          </p>
        </section>

        {notice && !notice.msg.includes("privacy choices") && (
          <div className="sticky bottom-4"><Banner tone={notice.tone}>{notice.msg}</Banner></div>
        )}
      </div>
    </div>
  );
}

function ConsentRow({
  title,
  body,
  checked,
  onToggle,
  locked = false,
  disabled = false,
}: {
  title: string;
  body: string;
  checked: boolean;
  onToggle?: (value: boolean) => void;
  locked?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border px-4 py-3.5", locked ? "border-mist bg-bone/50" : "border-mist bg-white")}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold text-white",
            checked ? "bg-teal" : "bg-mist text-charcoal/40",
          )}
        >
          {checked ? "✓" : "—"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.88rem] font-semibold text-navy">{title}</p>
          <p className="mt-0.5 text-[0.82rem] leading-relaxed text-charcoal/70">{body}</p>
        </div>
        {!locked && onToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={title}
            disabled={disabled}
            onClick={() => onToggle(!checked)}
            className={cn(
              "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
              checked ? "bg-teal" : "bg-mist",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
              )}
            />
          </button>
        )}
      </div>
      {locked && (
        <p className="mt-2 pl-8 text-[0.75rem] text-charcoal/50">
          Required to use Beyond Now. Recorded when you created your account.
        </p>
      )}
    </div>
  );
}
