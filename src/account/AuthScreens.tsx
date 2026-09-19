import { useState } from "react";
import { AcctBtn, AcctField, AcctInput, AuthShell } from "@/account/ui";
import { signIn, signUp, sendReset } from "@/lib/users";

/* ------------------------------- Sign in ------------------------------- */

export function SignInScreen({ go }: { go: (id: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Beyond Now account. Your resources, messages and progress stay in sync across devices."
      footer={
        <div className="mt-7 grid gap-3 text-center text-[0.85rem] text-charcoal/65">
          <p>
            No account yet?{" "}
            <button type="button" className="font-bold text-navy underline-offset-4 hover:underline" onClick={() => go("signup")}>
              Create one in 30 seconds
            </button>
          </p>
          <p>
            Forgot your password?{" "}
            <button type="button" className="font-bold text-navy underline-offset-4 hover:underline" onClick={() => go("reset")}>
              Reset it
            </button>
          </p>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AcctField label="Email">
          <AcctInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" invalid={Boolean(error)} autoComplete="email" />
        </AcctField>
        <AcctField label="Password">
          <AcctInput type="password" value={password} onChange={setPassword} placeholder="••••••••" invalid={Boolean(error)} autoComplete="current-password" />
        </AcctField>
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] font-medium text-red-700">
            {error}
          </p>
        )}
        <AcctBtn type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </AcctBtn>
      </form>

    </AuthShell>
  );
}

/* ------------------------------- Sign up ------------------------------- */

export function SignUpScreen({ go }: { go: (id: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!agree) return setError("Please agree to the safeguarding guidelines to continue.");
    setBusy(true);
    try {
      await signUp({ email, password, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save resources, message the Beyond Now team, and pick up where you left off on any device."
      footer={
        <p className="mt-7 text-center text-[0.85rem] text-charcoal/65">
          Already have an account?{" "}
          <button type="button" className="font-bold text-navy underline-offset-4 hover:underline" onClick={() => go("signin")}>
            Sign in
          </button>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AcctField label="Display name">
          <AcctInput value={name} onChange={setName} placeholder="Your first name is fine" autoComplete="name" />
        </AcctField>
        <AcctField label="Email">
          <AcctInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" invalid={Boolean(error)} />
        </AcctField>
        <AcctField label="Password" hint="At least 8 characters">
          <AcctInput type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="new-password" invalid={Boolean(error)} />
        </AcctField>
        <AcctField label="Confirm password">
          <AcctInput type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" invalid={Boolean(error)} />
        </AcctField>

        <label className="flex items-start gap-2 text-[0.82rem] text-charcoal/65">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-mist text-navy focus:ring-navy"
          />
          <span>
            I agree that Beyond Now is a guidance service — not a substitute for medical, legal or emergency help —
            and that I will be respectful in conversations with the team.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] font-medium text-red-700">
            {error}
          </p>
        )}

        <AcctBtn type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? "Creating your account…" : "Create my account"}
        </AcctBtn>
      </form>
    </AuthShell>
  );
}

/* ------------------------------- Reset password ------------------------------- */

export function ResetPasswordScreen({ go }: { go: (id: string) => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await sendReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We will email you a secure link to set a new password."
      footer={
        <p className="mt-7 text-center text-[0.85rem] text-charcoal/65">
          Remembered it?{" "}
          <button type="button" className="font-bold text-navy underline-offset-4 hover:underline" onClick={() => go("signin")}>
            Back to sign in
          </button>
        </p>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-teal/30 bg-teal/10 p-5">
          <p className="font-display text-[1rem] font-bold text-teal-ink">Check your inbox</p>
          <p className="mt-1 text-[0.88rem] text-charcoal/70">
            We just sent a reset link to <strong>{email}</strong>. The link expires in one hour.
          </p>
          <AcctBtn variant="outline" size="md" className="mt-4" onClick={() => go("signin")}>
            Back to sign in
          </AcctBtn>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <AcctField label="Email">
            <AcctInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" invalid={Boolean(error)} />
          </AcctField>
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] font-medium text-red-700">
              {error}
            </p>
          )}
          <AcctBtn type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </AcctBtn>
        </form>
      )}
    </AuthShell>
  );
}
