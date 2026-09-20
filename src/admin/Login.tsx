import { useState } from "react";
import { AdminBtn, Field, TextInput } from "@/admin/ui";
import { LogoMark } from "@/components/Logo";
import { ADMIN_EMAIL, isFirebaseConfigured } from "@/lib/firebase";
import { useStore } from "@/lib/store";

export function Login() {
  const { login, cloudEnabled, syncStatus } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const firebaseReady = isFirebaseConfigured();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter both your email and password.");
      return;
    }
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Those details do not match an administrator account.");
  };

  return (
    <div className="grid min-h-screen bg-navy lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_20%_0%,#12407d_0%,#0b2d5b_50%,#061a38_100%)]" />
          <div className="dot-grid absolute inset-0 opacity-30" />
          <svg viewBox="0 0 600 400" className="absolute right-0 bottom-0 w-full opacity-25">
            <path d="M-50 320C120 240 240 330 380 280s160-120 300-70" fill="none" stroke="#FFC107" strokeWidth="1.5" />
            <path d="M-50 360C140 290 260 370 400 320s150-110 290-60" fill="none" stroke="#00B894" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
            <LogoMark className="h-8 w-8" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-[-0.04em] text-white">
            BEYOND<span className="text-sun"> NOW</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="font-display text-[0.7rem] font-bold tracking-[0.24em] text-sun uppercase">
            Master Admin Dashboard
          </p>
          <h1 className="mt-4 font-display text-[2.6rem] leading-[1.02] font-extrabold text-white">
            Today Is Not The Whole Story.
          </h1>
          <p className="mt-5 text-[1rem] leading-relaxed text-white/70">
            The control centre for the Beyond Now website — content, stories, resources, media and settings, synced
            securely across every browser and device.
          </p>
        </div>

        <p className="relative text-[0.75rem] font-semibold tracking-[0.2em] text-white/45 uppercase">
          Understand · Choose · Move Forward
        </p>
      </aside>

      <main className="flex items-center justify-center bg-bone px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-10 w-10" />
            <span className="font-display text-base font-extrabold tracking-[-0.04em] text-navy">
              BEYOND<span className="text-sun"> NOW</span>
            </span>
          </div>

          <h2 className="font-display text-[1.75rem] font-extrabold text-navy">Administrator sign in</h2>
          <p className="mt-2 text-[0.9rem] text-charcoal/65">
            Protected by Firebase Authentication. Only authorised administrators can manage the public website.
          </p>

          <div
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-display text-[0.7rem] font-bold tracking-[0.08em] uppercase ${
              firebaseReady
                ? "bg-teal/12 text-teal-ink"
                : "bg-sun/20 text-[#8a6500]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${firebaseReady ? "bg-teal" : "bg-sun-deep"}`} />
            {firebaseReady ? `Firebase connected · ${syncStatus}` : "Local mode · add .env to enable cloud"}
          </div>

          <form onSubmit={submit} noValidate className="mt-7 space-y-4">
            <Field label="Email address">
              <TextInput
                type="email"
                value={email}
                onChange={setEmail}
                placeholder={ADMIN_EMAIL}
                invalid={Boolean(error)}
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                invalid={Boolean(error)}
              />
            </Field>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] font-medium text-red-700"
              >
                {error}
              </p>
            )}

            <AdminBtn type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? "Verifying…" : "Sign in to dashboard"}
            </AdminBtn>
          </form>

          <div className="mt-6 rounded-xl border border-mist bg-white p-4">
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="flex w-full items-center justify-between gap-2 font-display text-[0.8rem] font-semibold text-navy"
            >
              {cloudEnabled ? "How to create the first admin" : "Local development credentials"}
              <span className={showHint ? "rotate-180" : ""}>▾</span>
            </button>
            {showHint && (
              <div className="mt-3 space-y-2 border-t border-mist pt-3 text-[0.82rem] leading-relaxed text-charcoal/70">
                {cloudEnabled ? (
                  <>
                    <p>
                      1. Open the Firebase console → <strong>Authentication</strong> → <strong>Sign-in method</strong>{" "}
                      and enable <strong>Email/Password</strong>.
                    </p>
                    <p>
                      2. Under <strong>Users</strong>, add{" "}
                      <code className="rounded bg-bone px-1.5 py-0.5 font-semibold text-navy">{ADMIN_EMAIL}</code>{" "}
                      with a strong password.
                    </p>
                    <p>
                      3. Deploy the included security rules (
                      <code className="rounded bg-bone px-1 py-0.5">firestore.rules</code> +{" "}
                      <code className="rounded bg-bone px-1 py-0.5">storage.rules</code>).
                    </p>
                    <p className="text-[0.75rem] text-charcoal/55">
                      After the first sign-in you can change the password from Admin Account.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Email:{" "}
                      <code className="rounded bg-bone px-1.5 py-0.5 font-semibold text-navy">{ADMIN_EMAIL}</code>
                    </p>
                    <p>
                      Password: any password with <strong>8+ characters</strong> (local mode only).
                    </p>
                    <p className="text-[0.75rem] text-charcoal/55">
                      Copy <code className="rounded bg-bone px-1 py-0.5">.env.example</code> to{" "}
                      <code className="rounded bg-bone px-1 py-0.5">.env</code> to enable Firebase cloud sync.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <a
            href="#home"
            className="mt-6 inline-flex items-center gap-2 text-[0.82rem] font-semibold text-charcoal/60 transition-colors hover:text-navy"
          >
            ← Back to the public website
          </a>
        </div>
      </main>
    </div>
  );
}
