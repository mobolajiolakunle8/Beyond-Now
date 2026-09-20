import { useEffect, useMemo, useRef, useState } from "react";
import { AcctBtn, AcctField, AcctInput, AcctTextArea, Empty, PageTitle } from "@/account/ui";
import { useUserStore } from "@/account/UserStore";
import { markThreadRead, sendUserMessage } from "@/lib/chat";
import { formatDate, formatDateTime, relativeTime } from "@/lib/media";
import { useStore, useWa } from "@/lib/store";
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

function Notice({ tone, children }: { tone: "success" | "error"; children: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3.5 py-2.5 text-[0.84rem] font-medium",
        tone === "success" ? "border-teal/30 bg-teal/10 text-teal-ink" : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {children}
    </p>
  );
}

/* -------------------------------- Dashboard ------------------------------- */

export function DashboardPage() {
  const { profile, saved, notifications, messages, unreadNotifications, unreadMessages, syncError, retrySync } = useUserStore();
  const last = messages[messages.length - 1];

  return (
    <div>
      <PageTitle
        title={`Welcome back, ${profile?.name?.split(" ")[0] || "friend"}`}
        description="A snapshot of your account and the latest from the Beyond Now team."
      />

      {syncError && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[0.85rem] font-medium text-red-700">{syncError}</p>
          <AcctBtn variant="outline" size="sm" onClick={retrySync}>Retry</AcctBtn>
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
  const [notice, setNotice] = useState<{ tone: "success" | "error"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio);
    }
  }, [profile?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (task: () => Promise<void>, success: string) => {
    if (!authedUser) return;
    setBusy(true);
    setNotice(null);
    try {
      await task();
      setNotice({ tone: "success", msg: success });
    } catch (err) {
      setNotice({ tone: "error", msg: err instanceof Error ? err.message : "Something went wrong." });
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
          <p className="mt-1 text-[0.82rem] text-charcoal/55">JPG, PNG or WebP · 5 MB max.</p>
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
                  if (file) void run(() => uploadAvatar(authedUser!.uid, file).then(() => undefined), "Profile picture updated.");
                }}
              />
              <AcctBtn variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>Upload picture</AcctBtn>
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
  const listRef = useRef<HTMLDivElement>(null);

  // Opening the page clears the unread badge.
  useEffect(() => {
    if (authedUser && unreadMessages > 0) void markThreadRead(authedUser.uid, "user").catch(() => undefined);
  }, [authedUser, unreadMessages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!profile || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendUserMessage(profile, text);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your message could not be sent. Please try again.");
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
            <AcctBtn type="submit" variant="primary" disabled={busy || !text.trim() || !profile}>
              {busy ? "Sending…" : "Send"}
            </AcctBtn>
          </div>
          {(error || syncError) && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-[0.8rem] text-red-700">{error ?? syncError ?? ""}</span>
              {syncError && !error && (
                <button type="button" onClick={retrySync} className="shrink-0 font-display text-[0.78rem] font-semibold text-navy hover:underline">
                  Retry
                </button>
              )}
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
      <PageTitle title="Resources" description="Every practical guidance pack published by Beyond Now. Save the ones you want to come back to." />
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

export function SettingsPage() {
  const { authedUser, profile } = useUserStore();
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
      setNotice({ tone: "error", msg: err instanceof Error ? err.message : "Could not save preference." }),
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
      </div>
      <p className="mt-5 rounded-2xl border border-mist bg-bone/40 p-4 text-[0.78rem] text-charcoal/60">
        To delete your account or raise a safeguarding concern, message the team from <a href="#/account/messages" className="font-semibold text-navy underline-offset-4 hover:underline">Messages</a>.
      </p>
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
