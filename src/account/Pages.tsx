import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AcctBtn, AcctField, AcctInput, AcctTextArea, Empty, PageTitle } from "@/account/ui";
import { useUserStore } from "@/account/UserStore";
import { markThreadRead, sendUserMessage } from "@/lib/chat";
import { raiseSafeguardingCase } from "@/lib/audit";
import { URGENT_SUPPORT_COPY, assessRisk } from "@/lib/safeguarding";
import { databaseErrorMessage, isSyncFailure, memberFacingMessage } from "@/lib/firebase";
import { formatDate, formatDateTime, relativeTime } from "@/lib/media";
import { useStore, useWa } from "@/lib/store";
import { useDisplayPreferences } from "@/lib/preferences";
import { onInstallPromptChange } from "@/lib/pwa";
import {
  flushStoryOutbox,
  queueStoryOffline,
  readStoryOutbox,
  removeQueuedStory,
  submitStory,
  subscribeMyStorySubmissions,
  type QueuedSubmission,
  type StoryIdentity,
  type StorySubmission,
} from "@/lib/storySubmissions";
import {
  changeOwnPassword,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  removeAvatar,
  removeSaved,
  saveResource,
  updateOwnProfile,
  uploadAvatar,
  type UserPreferences,
} from "@/lib/users";
import { cn } from "@/utils/cn";

/* ------------------------------ shared bits ------------------------------ */

function Stat({ label, value, sub, tone = "navy" }: { label: string; value: string; sub?: string; tone?: "navy" | "teal" | "sun" }) {
  return (
    <div className="rounded-2xl border border-mist bg-white p-5">
      <p className="font-display text-[0.68rem] font-bold tracking-[0.12em] text-charcoal/50 uppercase">{label}</p>
      <p className={cn("mt-2 font-display text-[1.4rem] leading-tight font-extrabold", tone === "teal" ? "text-teal-ink" : tone === "sun" ? "text-[#8a6500]" : "text-navy")}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[0.78rem] text-charcoal/55">{sub}</p>}
    </div>
  );
}

function Notice({ tone, children }: { tone: "success" | "error" | "info"; children: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3.5 py-2.5 text-[0.84rem] font-medium",
        tone === "success"
          ? "border-teal/30 bg-teal/10 text-teal-ink"
          : tone === "info"
            ? "border-sun/30 bg-sun/10 text-navy-deep"
            : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {children}
    </p>
  );
}

/* -------------------------------- Dashboard ------------------------------- */

export function DashboardPage() {
  const { profile, saved, notifications, messages, unreadNotifications, unreadMessages, syncError, retrySync } = useUserStore();
  const [dismissError, setDismissError] = useState(false);
  const last = messages[messages.length - 1];

  return (
    <div>
      <PageTitle
        title={`Welcome back, ${profile?.name?.split(" ")[0] || "friend"}`}
        description="A snapshot of your account and the latest from the Beyond Now team."
      />

      {syncError && !dismissError && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[0.85rem] font-medium text-red-700">{syncError}</p>
          <div className="flex items-center gap-2">
            <AcctBtn variant="outline" size="sm" onClick={retrySync}>Retry</AcctBtn>
            <button
              type="button"
              onClick={() => setDismissError(true)}
              aria-label="Dismiss error"
              className="text-xs text-charcoal/45 hover:text-charcoal px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Saved resources" value={String(saved.length)} />
        <Stat label="Messages" value={String(messages.length)} sub={unreadMessages ? `${unreadMessages} unread` : "All caught up"} tone={unreadMessages ? "sun" : "teal"} />
        <Stat label="Notifications" value={String(notifications.length)} sub={unreadNotifications ? `${unreadNotifications} new` : "Nothing new"} tone={unreadNotifications ? "sun" : "teal"} />
        <Stat label="Member since" value={profile ? formatDate(profile.createdAt) : "—"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-mist bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-[1.05rem] font-bold text-navy">Latest conversation</h2>
              <p className="text-[0.82rem] text-charcoal/55">Private messages between you and the Beyond Now team.</p>
            </div>
            <a href="#/account/messages" className="rounded-full border border-mist px-3 py-1.5 font-display text-[0.72rem] font-semibold text-navy hover:border-navy/35">
              Open messages
            </a>
          </div>
          {last ? (
            <div className="rounded-xl border border-mist bg-bone p-4">
              <p className="flex items-center gap-2 text-[0.72rem] tracking-[0.12em] text-charcoal/45 uppercase">
                <span className={cn("h-1.5 w-1.5 rounded-full", last.senderRole === "user" ? "bg-teal" : "bg-sun")} />
                {last.senderRole === "user" ? "You" : "Beyond Now"} · {relativeTime(last.createdAt)}
              </p>
              <p className="mt-2 text-[0.95rem] text-charcoal/80">{last.text}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-mist bg-bone/60 p-6 text-center text-[0.88rem] text-charcoal/55">
              No messages yet. Start the conversation whenever you&rsquo;re ready.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-mist bg-white p-5">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-[1.05rem] font-bold text-navy">Notifications</h2>
            <a href="#/account/notifications" className="font-display text-[0.78rem] font-semibold text-navy hover:text-teal-ink">All →</a>
          </div>
          {notifications.length === 0 ? (
            <p className="rounded-xl border border-dashed border-mist bg-bone/60 p-4 text-center text-[0.85rem] text-charcoal/55">Nothing yet.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.slice(0, 4).map((n) => (
                <li key={n.id} className={cn("rounded-xl border px-3.5 py-3", n.read ? "border-mist" : "border-sun/30 bg-sun/10")}>
                  <p className="font-display text-[0.86rem] font-bold text-navy">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[0.78rem] text-charcoal/65">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* --------------------------------- Profile -------------------------------- */

export function ProfilePage() {
  const { authedUser, profile } = useUserStore();
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio);
    }
  }, [profile?.uid]);

  const run = async (task: () => Promise<void>, success: string) => {
    if (!authedUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await task();
      setNotice({ tone: "success", msg: success });
    } catch (err) {
      // Cancellation is intentional — stay quiet instead of flashing an error.
      if (err instanceof Error && /cancelled/i.test(err.message)) return;
      setNotice({ tone: "error", msg: databaseErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle
        title="My Profile"
        description="Tell the Beyond Now team what to call you, and add a profile picture."
        action={
          <AcctBtn variant="primary" disabled={busy || !name.trim()} onClick={() => void run(() => updateOwnProfile(authedUser!.uid, { name: name.trim(), bio: bio.trim() }), "Profile saved and synced across your devices.")}>
            {busy ? "Saving…" : "Save changes"}
          </AcctBtn>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-2xl border border-mist bg-white p-5">
          <h2 className="font-display text-[1rem] font-bold text-navy">Profile picture</h2>
          <p className="mt-1 text-[0.82rem] text-charcoal/55">
            Recommended 512 × 512 px square · JPG, PNG or WebP · 5 MB max · auto-resized and compressed.
          </p>
          <div className="mt-4 flex items-center gap-4">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Your profile picture" className="h-24 w-24 rounded-full object-cover ring-2 ring-mist" />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full bg-navy font-display text-2xl font-extrabold text-sun">
                {(profile?.name || authedUser?.email || "?")[0]?.toUpperCase()}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !authedUser || busy) return;
                  const controller = new AbortController();
                  avatarAbort.current = controller;
                  setAvatarProgress(10);
                  void run(
                    () => uploadAvatar(authedUser.uid, file, {
                      signal: controller.signal,
                      onProgress: (p) => setAvatarProgress(p.percent),
                    }).then(() => undefined),
                    "Profile picture updated.",
                  ).finally(() => {
                    avatarAbort.current = null;
                    setAvatarProgress(null);
                  });
                }}
              />
              <AcctBtn variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                {avatarProgress !== null ? `Uploading… ${avatarProgress}%` : "Upload picture"}
              </AcctBtn>
              {avatarProgress !== null && (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={avatarProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Uploading profile picture">
                    <div className="h-full rounded-full bg-teal transition-all duration-200" style={{ width: `${avatarProgress}%` }} />
                  </div>
                  <button type="button" onClick={() => avatarAbort.current?.abort()} className="mt-1 font-display text-[0.72rem] font-semibold text-red-600 hover:underline">
                    Cancel upload
                  </button>
                </div>
              )}
              {profile?.avatarUrl && (
                <AcctBtn variant="ghost" size="sm" className="text-red-600" disabled={busy} onClick={() => void run(() => removeAvatar(authedUser!.uid), "Profile picture removed.")}>
                  Remove picture
                </AcctBtn>
              )}
            </div>
          </div>
          <dl className="mt-5 space-y-1 border-t border-mist pt-4 text-[0.82rem] text-charcoal/60">
            <div><dt className="inline font-semibold text-charcoal/80">Email: </dt><dd className="inline">{authedUser?.email}</dd></div>
            <div><dt className="inline font-semibold text-charcoal/80">Member since: </dt><dd className="inline">{profile ? formatDate(profile.createdAt) : "—"}</dd></div>
          </dl>
        </section>

        <section className="space-y-4 rounded-2xl border border-mist bg-white p-5">
          <AcctField label="Display name">
            <AcctInput value={name} onChange={setName} placeholder="How would you like to be called?" />
          </AcctField>
          <AcctField label="Short bio" hint="Optional">
            <AcctTextArea rows={4} value={bio} onChange={setBio} placeholder="A few sentences about what brings you to Beyond Now." />
          </AcctField>
          {notice && <Notice tone={notice.tone}>{notice.msg}</Notice>}
        </section>
      </div>
    </div>
  );
}

/* -------------------------------- Messages -------------------------------- */

export function MessagesPage() {
  const { authedUser, profile, thread, messages, unreadMessages, syncError, retrySync } = useUserStore();
  const wa = useWa();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissError, setDismissError] = useState(false);
  const [riskNotice, setRiskNotice] = useState<null | { level: "elevated" | "urgent" }>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // A public pillar can hand a contextual prompt into the private chat.
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem("bn.chat.draft");
      if (draft) {
        setText(draft);
        sessionStorage.removeItem("bn.chat.draft");
        window.setTimeout(() => textareaRef.current?.focus(), 0);
      }
    } catch {
      /* storage unavailable — regular chat still works */
    }
  }, []);

  // Opening the page clears the unread badge.
  useEffect(() => {
    if (authedUser && unreadMessages > 0) void markThreadRead(authedUser.uid, "user").catch(() => undefined);
  }, [authedUser, unreadMessages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }
    if (!authedUser || busy) return;
    setBusy(true);
    setError(null);
    setDismissError(false);
    try {
      const sender = {
        uid: authedUser.uid,
        name: profile?.name || authedUser.displayName || authedUser.email?.split("@")[0] || "Member",
        email: profile?.email || authedUser.email || "",
        avatarUrl: profile?.avatarUrl || "",
      };

      // Safeguarding screening runs before delivery so a trained lead is
      // alerted immediately and the member sees crisis information right away.
      const assessment = assessRisk(trimmed);
      const messageId = await sendUserMessage(sender, trimmed);

      if (assessment.level === "elevated" || assessment.level === "urgent") {
        void raiseSafeguardingCase({
          threadId: authedUser.uid,
          userId: authedUser.uid,
          userName: sender.name,
          userEmail: sender.email,
          messageId,
          text: trimmed,
          assessment,
        });
        if (assessment.level === "urgent") {
          setRiskNotice({ level: "urgent" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }

      setText("");
    } catch (err) {
      setError(databaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle
        title="Messages"
        description="A private channel between you and the Beyond Now team. Messages arrive instantly on both sides."
        action={
          <a href={wa("Hello Beyond Now, I'm messaging from my account.")} target="_blank" rel="noopener noreferrer" className="rounded-full border border-mist bg-white px-3.5 py-2 font-display text-[0.78rem] font-semibold text-navy hover:border-navy/35">
            WhatsApp instead ↗
          </a>
        }
      />

      {syncError && !dismissError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-sun/30 bg-sun/10 px-4 py-2.5">
          <span className="text-[0.8rem] text-charcoal/70">{syncError}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={retrySync} className="font-display text-[0.75rem] font-semibold text-navy hover:underline">
              Retry
            </button>
            <button type="button" onClick={() => setDismissError(true)} className="text-xs text-charcoal/45 hover:text-charcoal px-1">
              ✕
            </button>
          </div>
        </div>
      )}

      {riskNotice && (
        <section
          role="alert"
          aria-live="assertive"
          className="mb-5 rounded-2xl border-2 border-red-300 bg-red-50 p-5 sm:p-6"
        >
          <p className="eyebrow text-red-700">Immediate support</p>
          <h2 className="mt-2 font-display text-xl font-extrabold text-red-800">{URGENT_SUPPORT_COPY.title}</h2>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-red-900/85">{URGENT_SUPPORT_COPY.body}</p>
          <ul className="mt-4 space-y-1.5 text-[0.88rem] font-medium text-red-900">
            {URGENT_SUPPORT_COPY.lines.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true">•</span>
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-red-200 pt-3 text-[0.8rem] leading-relaxed text-red-900/80">
            {URGENT_SUPPORT_COPY.footer}
          </p>
          <button
            type="button"
            onClick={() => setRiskNotice(null)}
            className="mt-4 font-display text-[0.78rem] font-semibold text-red-800 hover:underline"
          >
            I have seen this — continue
          </button>
        </section>
      )}

      <div className="overflow-hidden rounded-2xl border border-mist bg-white shadow-[0_1px_2px_rgba(11,45,91,0.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-mist bg-bone/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-navy font-display text-[0.85rem] font-extrabold text-sun">BN</span>
            <div>
              <p className="font-display text-[0.95rem] font-bold text-navy">Beyond Now team</p>
              <p className="text-[0.72rem] text-charcoal/55">Usually replies within 24 hours</p>
            </div>
          </div>
          {thread && (
            <span className={cn("rounded-full px-2.5 py-1 font-display text-[0.66rem] font-bold tracking-[0.1em] uppercase", thread.status === "open" ? "bg-teal/15 text-teal-ink" : "bg-mist text-charcoal/60")}>
              {thread.status}
            </span>
          )}
        </div>

        <div ref={listRef} className="max-h-[60vh] min-h-[260px] space-y-3 overflow-y-auto bg-bone/30 px-4 py-5">
          {messages.length === 0 ? (
            <p className="mx-auto max-w-md text-center text-[0.88rem] text-charcoal/55">
              Start the conversation — share what is on your mind, or ask anything you&rsquo;d like guidance on.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.senderRole === "user";
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[78%] rounded-2xl px-4 py-2.5 text-[0.92rem] shadow-sm", mine ? "bg-navy text-white" : "border border-mist bg-white text-charcoal")}>
                    {!mine && <p className="font-display text-[0.7rem] font-bold text-navy">{m.senderName}</p>}
                    <p className={cn("mt-0.5 whitespace-pre-wrap", mine ? "text-white" : "text-charcoal/85")}>{m.text}</p>
                    <p className={cn("mt-1.5 text-right text-[0.65rem]", mine ? "text-white/55" : "text-charcoal/40")}>{formatDateTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          className="border-t border-mist bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Write to Beyond Now…"
              aria-label="Message"
              className="max-h-32 min-h-[44px] flex-1 resize-y rounded-2xl border border-navy/15 bg-bone/30 px-4 py-2.5 text-[0.9rem] placeholder:text-charcoal/40 focus:border-navy focus:bg-white focus:outline-none"
            />
            <AcctBtn type="submit" variant="primary" disabled={busy || !authedUser}>
              {busy ? "Sending…" : "Send"}
            </AcctBtn>
          </div>
          {error && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-[0.8rem] text-red-700">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="text-xs text-charcoal/45 hover:text-charcoal px-1"
              >
                ✕
              </button>
            </div>
          )}
          <p className="mt-2 text-[0.7rem] text-charcoal/45">
            Only you and the Beyond Now team can read this. If you are in immediate danger, contact emergency services first.
          </p>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------- Resources ------------------------------- */

export function ResourcesPage() {
  const { authedUser, saved } = useUserStore();
  const { content } = useStore();
  const [query, setQuery] = useState("");
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const savedByRef = useMemo(() => new Map(saved.map((s) => [s.ref, s.id])), [saved]);

  const library = content.library;
  const items = useMemo(() => {
    const all = content.resources
      .filter((t) => t.status === "published")
      .flatMap((t) =>
        t.items
          .filter((it) => it.status === "published")
          .map((it) => ({ ref: `resource:${t.id}:${it.id}`, title: it.title, description: it.detail, track: t.label })),
      );
    const q = query.trim().toLowerCase();
    return q ? all.filter((it) => it.title.toLowerCase().includes(q) || it.description.toLowerCase().includes(q) || it.track.toLowerCase().includes(q)) : all;
  }, [content.resources, query]);

  const toggle = async (item: (typeof items)[number]) => {
    if (!authedUser) return;
    setBusyRef(item.ref);
    try {
      const existing = savedByRef.get(item.ref);
      if (existing) await removeSaved(authedUser.uid, existing);
      else await saveResource(authedUser.uid, { ref: item.ref, title: item.title, description: item.description });
    } finally {
      setBusyRef(null);
    }
  };

  return (
    <div>
      <PageTitle title={library.title} description={library.description} />
      {!library.enabled ? (
        <section className="relative overflow-hidden rounded-[1.5rem] border border-navy/10 bg-white p-7 shadow-card sm:p-10">
          <div aria-hidden="true" className="absolute -top-16 -right-12 h-48 w-48 rounded-full bg-sun/20 blur-3xl" />
          <div className="relative max-w-xl">
            <span className="eyebrow text-teal-ink">Member library</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-navy sm:text-3xl">{library.comingSoonTitle}</h2>
            <p className="mt-3 text-[0.96rem] leading-relaxed text-charcoal/70">{library.comingSoonBody}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#/account/messages" className="rounded-full bg-navy px-5 py-3 font-display text-[0.85rem] font-semibold text-white hover:bg-navy-soft">
                Talk to Beyond Now
              </a>
              <a href="#/account/share-story" className="rounded-full border border-navy/15 px-5 py-3 font-display text-[0.85rem] font-semibold text-navy hover:border-navy/35">
                Share your story
              </a>
            </div>
          </div>
        </section>
      ) : (
        <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search resources…"
        className="mb-5 w-full rounded-lg border border-mist bg-white px-3.5 py-2.5 text-[0.9rem] focus:border-navy focus:outline-none sm:max-w-md"
      />
      {items.length === 0 ? (
        <Empty title="No matches" body="Try a different search term." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => {
            const isSaved = savedByRef.has(it.ref);
            return (
              <li key={it.ref} className="rounded-2xl border border-mist bg-white p-4 shadow-[0_1px_2px_rgba(11,45,91,0.05)]">
                <p className="font-display text-[0.7rem] font-bold tracking-[0.16em] text-teal-ink uppercase">{it.track}</p>
                <h3 className="mt-1 font-display text-[1.02rem] font-bold text-navy">{it.title}</h3>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-charcoal/65">{it.description}</p>
                <div className="mt-3 border-t border-mist pt-3">
                  <AcctBtn variant={isSaved ? "ghost" : "outline"} size="sm" disabled={busyRef === it.ref} onClick={() => void toggle(it)}>
                    {isSaved ? "✓ Saved · Remove" : "Save"}
                  </AcctBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}
        </>
      )}
    </div>
  );
}

/* ---------------------------------- Saved --------------------------------- */

export function SavedPage() {
  const { authedUser, saved } = useUserStore();
  return (
    <div>
      <PageTitle title="Saved" description="Resources you have bookmarked to revisit." />
      {saved.length === 0 ? (
        <Empty title="Nothing saved yet" body="Open Resources and tap Save on anything you want to keep for later." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {saved.map((s) => (
            <li key={s.id} className="rounded-2xl border border-mist bg-white p-4 shadow-[0_1px_2px_rgba(11,45,91,0.05)]">
              <h3 className="font-display text-[1.02rem] font-bold text-navy">{s.title}</h3>
              <p className="mt-1.5 text-[0.85rem] leading-relaxed text-charcoal/65">{s.description}</p>
              <p className="mt-2 text-[0.72rem] text-charcoal/45">Saved {relativeTime(s.savedAt)}</p>
              <div className="mt-3 flex justify-end border-t border-mist pt-3">
                <AcctBtn variant="ghost" size="sm" className="text-red-600" onClick={() => authedUser && void removeSaved(authedUser.uid, s.id)}>
                  Remove
                </AcctBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- Share Story ------------------------------- */

export function ShareStoryPage() {
  const { authedUser, profile } = useUserStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("My story");
  const [story, setStory] = useState("");
  const [identity, setIdentity] = useState<StoryIdentity>("anonymous");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; msg: string } | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<StorySubmission[]>([]);
  const [queued, setQueued] = useState<QueuedSubmission[]>([]);

  const refreshQueue = useCallback(() => {
    if (!authedUser) return;
    setQueued(readStoryOutbox(authedUser.uid));
  }, [authedUser]);

  const flushQueue = useCallback(
    async (silent = false) => {
      if (!authedUser || flushing) return;
      setFlushing(true);
      try {
        const result = await flushStoryOutbox(authedUser.uid);
        refreshQueue();
        if (result.sent > 0) {
          setNotice({
            tone: "success",
            msg:
              result.failed > 0
                ? `Sent ${result.sent} saved ${result.sent === 1 ? "story" : "stories"}. ${result.failed} still waiting — we'll keep trying.`
                : "Your saved story has been sent privately to the Beyond Now team for review.",
          });
        } else if (!silent && result.failed > 0) {
          setNotice({ tone: "info", msg: memberFacingMessage() });
        }
      } finally {
        setFlushing(false);
      }
    },
    [authedUser, flushing, refreshQueue],
  );

  useEffect(() => {
    if (!authedUser) return;
    refreshQueue();
    const unsub = subscribeMyStorySubmissions(authedUser.uid, setSubmissions, () =>
      setListError(memberFacingMessage()),
    );
    const onOnline = () => void flushQueue(true);
    window.addEventListener("online", onOnline);
    void flushQueue(true);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
    };
  }, [authedUser, flushQueue, refreshQueue]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authedUser || busy) return;
    setBusy(true);
    setNotice(null);
    const input = {
      userId: authedUser.uid,
      authorName: profile?.name || authedUser.displayName || authedUser.email?.split("@")[0] || "Member",
      category: category.trim() || "My story",
      title: title.trim(),
      story: story.trim(),
      identity,
      consentToPublish: consent,
    };
    try {
      await submitStory(input);
      setTitle("");
      setStory("");
      setConsent(false);
      setNotice({ tone: "success", msg: "Thank you. Your story has been sent privately to the Beyond Now team for review." });
    } catch (err) {
      if (isSyncFailure(err)) {
        // Keep the member's work safe on this device and retry automatically.
        queueStoryOffline(input);
        refreshQueue();
        setTitle("");
        setStory("");
        setConsent(false);
        setNotice({
          tone: "info",
          msg: "We couldn't reach our servers, so your story is saved on this device. It will be sent automatically — you can also press Retry now.",
        });
      } else {
        setNotice({ tone: "error", msg: err instanceof Error ? err.message : "Your story could not be sent. Please check it and try again." });
      }
    } finally {
      setBusy(false);
    }
  };

  const label: Record<StorySubmission["status"], string> = {
    submitted: "Submitted",
    reviewing: "In review",
    published: "Shared",
    declined: "Update available",
  };

  return (
    <div>
      <PageTitle
        title="Share your story"
        description="Your story is submitted privately to the Beyond Now team. We never publish it without reviewing it and respecting the name option you choose."
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={submit} className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <AcctField label="Story title">
              <AcctInput value={title} onChange={setTitle} placeholder="A short, honest title" />
            </AcctField>
            <AcctField label="Category">
              <AcctInput value={category} onChange={setCategory} placeholder="My story" />
            </AcctField>
            <div className="sm:col-span-2">
              <AcctField label="Your story" hint="At least 40 characters">
                <AcctTextArea rows={9} value={story} onChange={setStory} placeholder="Write what happened, what you learned, or what you wish someone had told you." />
              </AcctField>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="font-display text-[0.75rem] font-bold tracking-[0.08em] text-charcoal/65 uppercase">How should we credit it?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setIdentity("anonymous")} aria-pressed={identity === "anonymous"} className={cn("rounded-full px-3.5 py-2 font-display text-[0.8rem] font-semibold", identity === "anonymous" ? "bg-navy text-white" : "border border-mist text-charcoal/65 hover:border-navy/30")}>
                Share anonymously
              </button>
              <button type="button" onClick={() => setIdentity("firstName")} aria-pressed={identity === "firstName"} className={cn("rounded-full px-3.5 py-2 font-display text-[0.8rem] font-semibold", identity === "firstName" ? "bg-navy text-white" : "border border-mist text-charcoal/65 hover:border-navy/30")}>
                Use my first name
              </button>
            </div>
          </fieldset>

          <label className="mt-5 flex items-start gap-2.5 text-[0.82rem] leading-relaxed text-charcoal/70">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-mist text-navy" />
            <span>
              I understand that Beyond Now will review this privately first. I give permission for an edited, safeguarding-checked version to be shared using the name option I selected.
            </span>
          </label>

          {notice && (
            <div className="mt-4">
              <Notice tone={notice.tone}>{notice.msg}</Notice>
              {notice.tone === "info" && (
                <button
                  type="button"
                  onClick={() => void flushQueue(false)}
                  disabled={flushing}
                  className="mt-2 font-display text-[0.8rem] font-semibold text-navy hover:underline disabled:opacity-50"
                >
                  {flushing ? "Retrying…" : "Retry now"}
                </button>
              )}
            </div>
          )}

          <div
            className="mt-5"
            title={
              !title.trim() || story.trim().length < 40 || !consent
                ? "Add a title, at least 40 characters of story, and tick the permission box to submit."
                : undefined
            }
          >
            <AcctBtn
              type="submit"
              variant="primary"
              size="lg"
              disabled={busy || !title.trim() || story.trim().length < 40 || !consent}
            >
              {busy ? "Sending…" : "Submit my story"}
            </AcctBtn>
          </div>
        </form>

        <section className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
          <h2 className="font-display text-[1.05rem] font-bold text-navy">What happens next</h2>
          <ol className="mt-4 space-y-3 text-[0.88rem] leading-relaxed text-charcoal/70">
            <li><strong className="text-navy">1. Private review.</strong> Only you and the Beyond Now team can see the submission.</li>
            <li><strong className="text-navy">2. Safeguarding check.</strong> We may edit details to protect you and others.</li>
            <li><strong className="text-navy">3. Your update.</strong> You receive a notification when it is reviewed or shared.</li>
          </ol>
          <p className="mt-5 rounded-xl border border-sun/30 bg-sun/10 p-4 text-[0.8rem] leading-relaxed text-navy-deep/80">
            Do not include full names, addresses, school names, phone numbers or anything that could identify someone else.
          </p>
        </section>
      </div>

      {listError && submissions.length === 0 && queued.length === 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sun/30 bg-sun/10 px-5 py-4">
          <p className="text-[0.85rem] text-charcoal/70">{listError}</p>
          <button
            type="button"
            onClick={() => void flushQueue(false)}
            disabled={flushing}
            className="font-display text-[0.8rem] font-semibold text-navy hover:underline disabled:opacity-50"
          >
            {flushing ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      {queued.length > 0 && (
        <section className="mt-6 rounded-2xl border border-sun/30 bg-sun/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[1.05rem] font-bold text-navy">Waiting to send ({queued.length})</h2>
            <button
              type="button"
              onClick={() => void flushQueue(false)}
              disabled={flushing}
              className="font-display text-[0.8rem] font-semibold text-navy hover:underline disabled:opacity-50"
            >
              {flushing ? "Retrying…" : "Retry now"}
            </button>
          </div>
          <p className="mt-1.5 text-[0.85rem] text-charcoal/65">
            Saved safely on this device. They send automatically once the connection is restored.
          </p>
          <ul className="mt-4 space-y-3">
            {queued.map((item) => (
              <li key={item.queuedAt} className="rounded-xl border border-sun/30 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-[0.95rem] font-bold text-navy">{item.title}</p>
                    <p className="text-[0.75rem] text-charcoal/55">
                      {item.category} · saved {relativeTime(item.queuedAt)} · tried {item.attempts} {item.attempts === 1 ? "time" : "times"}
                    </p>
                  </div>
                  <span className="rounded-full bg-sun/20 px-2.5 py-1 font-display text-[0.66rem] font-bold tracking-[0.08em] text-[#8a6500] uppercase">
                    Waiting to send
                  </span>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      removeQueuedStory(authedUser!.uid, item.queuedAt);
                      refreshQueue();
                    }}
                    className="font-display text-[0.78rem] font-semibold text-red-600 hover:underline"
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-mist bg-white p-5">
        <h2 className="font-display text-[1.05rem] font-bold text-navy">Your submissions</h2>
        {submissions.length === 0 && queued.length === 0 ? (
          <p className="mt-3 text-[0.88rem] text-charcoal/60">You have not submitted a story yet.</p>
        ) : submissions.length === 0 ? (
          <p className="mt-3 text-[0.88rem] text-charcoal/60">No sent submissions yet — see the waiting list above.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {submissions.map((submission) => (
              <li key={submission.id} className="rounded-xl border border-mist bg-bone/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-[0.95rem] font-bold text-navy">{submission.title}</p>
                    <p className="text-[0.75rem] text-charcoal/55">{submission.category} · submitted {relativeTime(submission.submittedAt)}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 font-display text-[0.66rem] font-bold tracking-[0.08em] uppercase", submission.status === "published" ? "bg-teal/15 text-teal-ink" : submission.status === "declined" ? "bg-red-100 text-red-700" : "bg-sun/20 text-[#8a6500]")}>
                    {label[submission.status]}
                  </span>
                </div>
                {submission.adminNote && <p className="mt-3 border-t border-mist pt-3 text-[0.85rem] text-charcoal/70">{submission.adminNote}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* -------------------------------- Progress -------------------------------- */

export function ProgressPage() {
  const { profile, saved, messages } = useUserStore();
  const { content } = useStore();
  const totalResources = content.resources.reduce((sum, t) => sum + t.items.filter((i) => i.status === "published").length, 0);

  const milestones = [
    { id: "account", label: "Created your account", at: profile?.createdAt, done: Boolean(profile) },
    { id: "profile", label: "Added a name and bio", at: profile?.updatedAt, done: Boolean(profile?.bio?.trim()) },
    { id: "saved", label: "Saved your first resource", at: saved[saved.length - 1]?.savedAt, done: saved.length > 0 },
    { id: "message", label: "Messaged the team", at: messages.find((m) => m.senderRole === "user")?.createdAt, done: messages.some((m) => m.senderRole === "user") },
    { id: "reply", label: "Received a reply", at: messages.find((m) => m.senderRole === "admin")?.createdAt, done: messages.some((m) => m.senderRole === "admin") },
  ];
  const complete = milestones.filter((m) => m.done).length;

  return (
    <div>
      <PageTitle title="Your progress" description="A simple map of how you are using Beyond Now. No streaks, no pressure — just clarity." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Saved resources" value={`${saved.length} / ${totalResources}`} sub="available on the website" />
        <Stat label="Messages sent" value={String(messages.filter((m) => m.senderRole === "user").length)} />
        <Stat label="Milestones" value={`${complete} / ${milestones.length}`} tone="teal" />
      </div>
      <section className="mt-6 rounded-2xl border border-mist bg-white p-5">
        <h2 className="font-display text-[1.05rem] font-bold text-navy">Milestones</h2>
        <ol className="mt-4 space-y-3">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-start gap-3">
              <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold", m.done ? "bg-teal text-white" : "border border-mist bg-white text-charcoal/40")}>
                {m.done ? "✓" : "•"}
              </span>
              <div>
                <p className="font-display text-[0.92rem] font-bold text-navy">{m.label}</p>
                <p className="text-[0.78rem] text-charcoal/55">{m.done && m.at ? formatDateTime(m.at) : "Not yet"}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* ----------------------------- Privacy & Data ----------------------------- */

export { PrivacyPage } from "@/account/PrivacyPage";

/* ------------------------------ Notifications ----------------------------- */

export function NotificationsPage() {
  const { authedUser, notifications, unreadNotifications } = useUserStore();
  const uid = authedUser?.uid;

  return (
    <div>
      <PageTitle
        title="Notifications"
        description="Updates from the Beyond Now team and your account."
        action={
          <AcctBtn variant="outline" size="sm" disabled={!uid || unreadNotifications === 0} onClick={() => uid && void markAllNotificationsRead(uid)}>
            Mark all read
          </AcctBtn>
        }
      />
      {notifications.length === 0 ? (
        <Empty title="Nothing here yet" body="When the team replies to you, it shows up here." />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className={cn("rounded-2xl border p-4", n.read ? "border-mist bg-white" : "border-sun/40 bg-sun/10")}>
              <div className="flex items-start gap-3">
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.kind === "message" ? "bg-navy" : n.kind === "system" ? "bg-sun" : "bg-teal")} />
                <div className="min-w-0 flex-1">
                  <a href={n.href} className="font-display text-[0.95rem] font-bold text-navy hover:underline">{n.title}</a>
                  <p className="mt-1 text-[0.86rem] leading-relaxed text-charcoal/70">{n.body}</p>
                  <p className="mt-1.5 text-[0.72rem] text-charcoal/45">{relativeTime(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!n.read && uid && (
                    <AcctBtn variant="ghost" size="sm" onClick={() => void markNotificationRead(uid, n.id)}>Mark read</AcctBtn>
                  )}
                  {uid && (
                    <AcctBtn variant="ghost" size="sm" className="text-red-600" onClick={() => void deleteNotification(uid, n.id)}>Delete</AcctBtn>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- Settings -------------------------------- */

function useInstallPrompt() {
  const [state, setState] = useState({ available: false, installed: false });
  useEffect(() => onInstallPromptChange((next) => setState({ available: next.available, installed: next.installed })), []);
  return [state] as const;
}

export function SettingsPage() {
  const { authedUser, profile } = useUserStore();
  const [display, setDisplayPreference] = useDisplayPreferences();
  const [installState] = useInstallPrompt();
  const installed = installState.installed;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; msg: string } | null>(null);

  const strong = next.length >= 8;
  const matches = next === confirm;
  const prefs: UserPreferences = profile?.preferences ?? { notifyMessages: true, notifyResources: false };

  const setPref = (patch: Partial<UserPreferences>) => {
    if (!authedUser) return;
    void updateOwnProfile(authedUser.uid, { preferences: { ...prefs, ...patch } }).catch((err) =>
      setNotice({ tone: "error", msg: databaseErrorMessage(err) }),
    );
  };

  const changePassword = async () => {
    setNotice(null);
    if (!strong || !matches) return setNotice({ tone: "error", msg: "Passwords must match and be at least 8 characters." });
    setBusy(true);
    try {
      await changeOwnPassword(current, next);
      setNotice({ tone: "success", msg: "Password changed successfully." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setNotice({ tone: "error", msg: err instanceof Error ? err.message : "Could not change password." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle title="Settings" description="Manage your password and how you would like to be contacted." />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-mist bg-white p-5">
          <h2 className="font-display text-[1rem] font-bold text-navy">Change password</h2>
          <p className="mt-1 text-[0.82rem] text-charcoal/55">Use at least 8 characters.</p>
          <div className="mt-4 space-y-3">
            <AcctField label="Current password"><AcctInput type="password" value={current} onChange={setCurrent} autoComplete="current-password" /></AcctField>
            <AcctField label="New password" error={next && !strong ? "Must be at least 8 characters" : undefined}>
              <AcctInput type="password" value={next} onChange={setNext} autoComplete="new-password" invalid={Boolean(next) && !strong} />
            </AcctField>
            <AcctField label="Confirm new password" error={confirm && !matches ? "Passwords do not match" : undefined}>
              <AcctInput type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={Boolean(confirm) && !matches} />
            </AcctField>
            <AcctBtn variant="primary" disabled={busy || !current} onClick={() => void changePassword()}>{busy ? "Updating…" : "Update password"}</AcctBtn>
            {notice && <Notice tone={notice.tone}>{notice.msg}</Notice>}
          </div>
        </section>

        <section className="rounded-2xl border border-mist bg-white p-5">
          <h2 className="font-display text-[1rem] font-bold text-navy">Notification preferences</h2>
          <p className="mt-1 text-[0.82rem] text-charcoal/55">Saved to your account and applied on every device.</p>
          <div className="mt-4 space-y-3">
            <Toggle checked={prefs.notifyMessages} onChange={(v) => setPref({ notifyMessages: v })} label="New messages from the Beyond Now team" />
            <Toggle checked={prefs.notifyResources} onChange={(v) => setPref({ notifyResources: v })} label="When a new resource is added" />
          </div>
          <dl className="mt-5 space-y-1 border-t border-mist pt-4 text-[0.82rem] text-charcoal/60">
            <div><dt className="inline font-semibold text-charcoal/85">Signed in as </dt><dd className="inline">{authedUser?.email}</dd></div>
            <div><dt className="inline font-semibold text-charcoal/85">Account status: </dt><dd className="inline">{profile?.status ?? "active"}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-mist bg-white p-5 lg:col-span-2">
          <h2 className="font-display text-[1rem] font-bold text-navy">Accessibility & data usage</h2>
          <p className="mt-1 text-[0.82rem] text-charcoal/55">
            Saved on this device only. Turn these on if the site feels heavy, hard to read, or distracting.
          </p>
          <div className="mt-4 space-y-3">
            <Toggle
              checked={display.lowData}
              onChange={(v) => setDisplayPreference("lowData", v)}
              label="Low-data mode — lighter layout, no decorative effects"
            />
            <Toggle
              checked={display.largerText}
              onChange={(v) => setDisplayPreference("largerText", v)}
              label="Larger text"
            />
            <Toggle
              checked={display.highContrast}
              onChange={(v) => setDisplayPreference("highContrast", v)}
              label="Higher contrast"
            />
            <Toggle
              checked={display.reducedMotion}
              onChange={(v) => setDisplayPreference("reducedMotion", v)}
              label="Reduce motion"
            />
          </div>
          {installed && (
            <div className="mt-5 border-t border-mist pt-4">
              <p className="text-[0.85rem] text-charcoal/70">
                Beyond Now is installed on this device. You already have the app.
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-mist bg-bone/40 p-4 text-[0.8rem] text-charcoal/65">
          To download a copy of your data or delete your account, go to{" "}
          <a href="#/account/privacy" className="font-semibold text-navy underline-offset-4 hover:underline">Privacy &amp; Data</a>.
        </div>
        <p className="rounded-2xl border border-mist bg-bone/40 p-4 text-[0.78rem] text-charcoal/60">
          To raise a safeguarding concern, message the team from <a href="#/account/messages" className="font-semibold text-navy underline-offset-4 hover:underline">Messages</a>.
        </p>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left">
      <span className={cn("mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-teal" : "bg-mist")}>
        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} />
      </span>
      <span className="text-[0.88rem] text-charcoal/80">{label}</span>
    </button>
  );
}
