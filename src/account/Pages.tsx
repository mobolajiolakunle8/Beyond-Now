import { useEffect, useMemo, useRef, useState } from "react";
import { useUserStore } from "@/account/UserStore";
import { Empty, PageTitle, AcctBtn, AcctField, AcctInput, AcctTextArea } from "@/account/ui";
import { useStore, useWa } from "@/lib/store";
import {
  changeOwnPassword,
  markAllNotificationsRead,
  markNotificationRead,
  pushNotification,
  removeSaved,
  saveResource,
  updateOwnProfile,
  uploadAvatar,
  removeAvatar,
  type SavedItem,
} from "@/lib/users";
import { formatDate, formatDateTime, relativeTime } from "@/lib/media";
import { markThreadReadForRole, sendUserMessage } from "@/lib/chat";
import { cn } from "@/utils/cn";

/* ------------------------------- Dashboard ------------------------------- */

export function DashboardPage() {
  const { profile, saved, notifications, messages, unreadNotifications, unreadMessages } = useUserStore();
  const recent = useMemo(() => saved.slice(0, 4), [saved]);
  const lastMessage = messages[messages.length - 1];

  return (
    <div>
      <PageTitle
        title={`Welcome back, ${profile?.name?.split(" ")[0] || "friend"}`}
        description="A snapshot of your account activity and the latest messages from the Beyond Now team."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Saved resources" value={String(saved.length)} tone="navy" />
        <Stat label="Messages" value={String(messages.length)} sub={unreadMessages ? `${unreadMessages} unread` : "All caught up"} tone={unreadMessages ? "sun" : "teal"} />
        <Stat label="Notifications" value={String(notifications.length)} sub={unreadNotifications ? `${unreadNotifications} new` : "Nothing new"} tone={unreadNotifications ? "sun" : "teal"} />
        <Stat label="Member since" value={profile ? formatDate(profile.createdAt) : "—"} tone="navy" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-mist bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-[1.05rem] font-bold text-navy">Latest conversation</h2>
              <p className="text-[0.82rem] text-charcoal/55">Private, encrypted messages with the Beyond Now team.</p>
            </div>
            <a
              href="#/account/messages"
              className="rounded-full border border-mist px-3 py-1.5 font-display text-[0.72rem] font-semibold text-navy hover:border-navy/35"
            >
              Open messages
            </a>
          </div>
          {lastMessage ? (
            <div className="rounded-xl border border-mist bg-bone p-4">
              <div className="flex items-center gap-2 text-[0.72rem] tracking-[0.12em] text-charcoal/45 uppercase">
                <span
                  className={cn(
                    "inline-flex h-1.5 w-1.5 rounded-full",
                    lastMessage.senderRole === "user" ? "bg-teal" : "bg-sun",
                  )}
                />
                {lastMessage.senderRole === "user" ? "You" : "Beyond Now"} · {relativeTime(lastMessage.createdAt)}
              </div>
              <p className="mt-2 text-[0.95rem] text-charcoal/80">{lastMessage.text}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-mist bg-bone/60 p-6 text-center text-[0.88rem] text-charcoal/55">
              No messages yet. Start the conversation whenever you&rsquo;re ready.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-mist bg-white p-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-[1.05rem] font-bold text-navy">Recent notifications</h2>
              <p className="text-[0.82rem] text-charcoal/55">What you missed.</p>
            </div>
            <a href="#/account/notifications" className="font-display text-[0.78rem] font-semibold text-navy hover:text-teal-ink">
              All →
            </a>
          </div>
          {notifications.length === 0 ? (
            <p className="rounded-xl border border-dashed border-mist bg-bone/60 p-4 text-center text-[0.85rem] text-charcoal/55">
              Nothing yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {notifications.slice(0, 4).map((n) => (
                <li key={n.id} className={cn("rounded-xl border px-3.5 py-3", n.read ? "border-mist bg-white" : "border-sun/30 bg-sun/10")}>
                  <p className="font-display text-[0.86rem] font-bold text-navy">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[0.78rem] text-charcoal/65">{n.body}</p>
                  <p className="mt-1 text-[0.7rem] text-charcoal/45">{relativeTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-mist bg-white p-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[1.05rem] font-bold text-navy">Recently saved</h2>
            <p className="text-[0.82rem] text-charcoal/55">Resources you bookmarked.</p>
          </div>
          <a href="#/account/saved" className="font-display text-[0.78rem] font-semibold text-navy hover:text-teal-ink">
            All →
          </a>
        </div>
        {recent.length === 0 ? (
          <Empty title="Nothing saved yet" body="Browse the Resources section and tap the save icon to keep things for later." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {recent.map((s) => (
              <li key={s.id} className="rounded-xl border border-mist bg-bone p-3">
                <p className="font-display text-[0.9rem] font-bold text-navy">{s.title}</p>
                <p className="line-clamp-2 text-[0.78rem] text-charcoal/60">{s.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "navy" | "teal" | "sun" }) {
  return (
    <div className="rounded-2xl border border-mist bg-white p-5">
      <p className="font-display text-[0.68rem] font-bold tracking-[0.12em] text-charcoal/50 uppercase">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-[1.4rem] leading-tight font-extrabold",
          tone === "teal" ? "text-teal-ink" : tone === "sun" ? "text-[#8a6500]" : "text-navy",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[0.78rem] text-charcoal/55">{sub}</p>}
    </div>
  );
}

/* ------------------------------- Profile ------------------------------- */

export function ProfilePage() {
  const { authedUser, profile, refreshProfile } = useUserStore();
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onSave = async () => {
    if (!authedUser) return;
    setBusy(true);
    setStatus("idle");
    setError("");
    try {
      await updateOwnProfile(authedUser.uid, { name: name.trim(), bio: bio.trim() });
      await refreshProfile();
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  const onAvatar = async (file: File | undefined) => {
    if (!authedUser || !file) return;
    setBusy(true);
    try {
      await uploadAvatar(authedUser.uid, file);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload picture.");
    } finally {
      setBusy(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!authedUser) return;
    setBusy(true);
    try {
      await removeAvatar(authedUser.uid);
      await refreshProfile();
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
          <AcctBtn variant="primary" onClick={onSave} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </AcctBtn>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-mist bg-white p-5">
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
                accept="image/*"
                className="hidden"
                onChange={(e) => void onAvatar(e.target.files?.[0])}
              />
              <AcctBtn variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Upload picture
              </AcctBtn>
              {profile?.avatarUrl && (
                <AcctBtn variant="ghost" size="sm" className="text-red-600" onClick={onRemoveAvatar}>
                  Remove picture
                </AcctBtn>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-mist pt-4 text-[0.82rem] text-charcoal/60">
            <p><strong className="text-charcoal/80">Email:</strong> {authedUser?.email}</p>
            <p><strong className="text-charcoal/80">Role:</strong> {profile?.role ?? "user"}</p>
            <p><strong className="text-charcoal/80">Member since:</strong> {profile ? formatDate(profile.createdAt) : "—"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-mist bg-white p-5 space-y-4">
          <AcctField label="Display name">
            <AcctInput value={name} onChange={setName} placeholder="How would you like to be called?" />
          </AcctField>
          <AcctField label="Short bio" hint="Optional">
            <AcctTextArea rows={4} value={bio} onChange={setBio} placeholder="A few sentences about what brings you to Beyond Now." />
          </AcctField>

          {status === "saved" && (
            <p className="rounded-lg border border-teal/30 bg-teal/10 px-3.5 py-2.5 text-[0.85rem] text-teal-ink">
              Profile saved. Your changes are synced everywhere you sign in.
            </p>
          )}
          {status === "error" && error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] text-red-700">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Messages ------------------------------- */

export function MessagesPage() {
  const { authedUser, profile, thread, messages, unreadMessages } = useUserStore();
  const wa = useWa();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thread && unreadMessages) {
      void markThreadReadForRole(thread, "user");
    }
  }, [thread?.id, thread?.unreadByUser]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !thread) return;
    setBusy(true);
    try {
      await sendUserMessage(thread, trimmed);
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle
        title="Messages"
        description="A private, encrypted channel with the Beyond Now team. They reply as soon as they can, in any timezone."
        action={
          <a
            href={wa("Hello Beyond Now, I'm messaging from my account.")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-mist bg-white px-3.5 py-2 font-display text-[0.78rem] font-semibold text-navy hover:border-navy/35"
          >
            Open WhatsApp ↗
          </a>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-mist bg-white shadow-[0_1px_2px_rgba(11,45,91,0.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-mist bg-bone/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-navy font-display text-[0.85rem] font-extrabold text-sun">
              BN
            </span>
            <div>
              <p className="font-display text-[0.95rem] font-bold text-navy">Beyond Now team</p>
              <p className="text-[0.72rem] text-charcoal/55">
                Replies typically within 24 hours · Encrypted in transit
              </p>
            </div>
          </div>
          <span className="rounded-full bg-teal/15 px-2.5 py-1 font-display text-[0.68rem] font-bold tracking-[0.1em] text-teal-ink uppercase">
            Online
          </span>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] min-h-[260px] space-y-3 overflow-y-auto bg-bone/30 px-4 py-5"
        >
          {messages.length === 0 ? (
            <div className="mx-auto max-w-md text-center text-[0.88rem] text-charcoal/55">
              Start the conversation — share what is on your mind, or ask anything you&rsquo;d like guidance on.
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderRole === "user";
              return (
                <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-2.5 text-[0.92rem] shadow-sm",
                      isMe
                        ? "bg-navy text-white"
                        : "bg-white text-charcoal border border-mist",
                    )}
                  >
                    {!isMe && <p className="font-display text-[0.7rem] font-bold text-navy">{m.senderName}</p>}
                    <p className={cn("mt-0.5 whitespace-pre-wrap", isMe ? "text-white" : "text-charcoal/85")}>{m.text}</p>
                    <p
                      className={cn(
                        "mt-1.5 text-right text-[0.65rem]",
                        isMe ? "text-white/55" : "text-charcoal/40",
                      )}
                    >
                      {formatDateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-mist bg-white p-3">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
              placeholder="Write to Beyond Now…"
              className="min-h-[44px] max-h-32 flex-1 resize-y rounded-2xl border border-navy/15 bg-bone/30 px-4 py-2.5 text-[0.9rem] placeholder:text-charcoal/40 focus:border-navy focus:bg-white focus:outline-none"
            />
            <AcctBtn variant="primary" size="md" onClick={onSend} disabled={busy || !text.trim()}>
              {busy ? "Sending…" : "Send"}
            </AcctBtn>
          </div>
          <p className="mt-2 text-[0.7rem] text-charcoal/45">
            Messages are private to you and the Beyond Now team. If you are in immediate danger, please contact
            emergency services first.
          </p>
        </div>
      </div>

      {profile?.bio && (
        <p className="mt-4 rounded-xl border border-mist bg-bone/40 p-3 text-[0.78rem] text-charcoal/55">
          Signed in as <strong className="text-charcoal/80">{authedUser?.email}</strong>. Your identity is only visible to
          you and the Beyond Now team.
        </p>
      )}
    </div>
  );
}

/* ------------------------------- Resources ------------------------------- */

export function ResourcesPage() {
  const { saved } = useUserStore();
  const { published } = useStore();
  const [query, setQuery] = useState("");
  const savedRefs = useMemo(() => new Set(saved.map((s) => s.ref)), [saved]);

  const items = useMemo(() => {
    const all: { id: string; ref: string; title: string; description: string; track: string }[] = [];
    published.resources.forEach((t) =>
      t.items.forEach((it, i) =>
        all.push({
          id: `${t.id}-${i}`,
          ref: `resource:${t.id}:${it.id || i}`,
          title: it.title,
          description: it.detail,
          track: t.label,
        }),
      ),
    );
    if (!query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter((it) => it.title.toLowerCase().includes(q) || it.description.toLowerCase().includes(q));
  }, [published.resources, query]);

  const onSave = async (item: (typeof items)[number]) => {
    try {
      const { authedUser } = useUserStore();
      if (!authedUser) return;
      await saveResource(authedUser.uid, {
        ref: item.ref,
        title: item.title,
        description: item.description,
        url: `#/account/resources?focus=${encodeURIComponent(item.ref)}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <PageTitle
        title="Resources"
        description="All practical guidance packs published by Beyond Now. Tap the save icon to keep one for later."
      />

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
            const saved = savedRefs.has(it.ref);
            return (
              <li key={it.id} className="rounded-2xl border border-mist bg-white p-4 shadow-[0_1px_2px_rgba(11,45,91,0.05)]">
                <p className="font-display text-[0.7rem] font-bold tracking-[0.16em] text-teal-ink uppercase">
                  {it.track}
                </p>
                <h3 className="mt-1 font-display text-[1.02rem] font-bold text-navy">{it.title}</h3>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-charcoal/65">{it.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-mist pt-3">
                  <AcctBtn
                    variant={saved ? "ghost" : "outline"}
                    size="sm"
                    onClick={() => onSave(it)}
                    disabled={saved}
                  >
                    {saved ? "✓ Saved" : "Save"}
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

/* ------------------------------- Saved ------------------------------- */

export function SavedPage() {
  const { authedUser, saved } = useUserStore();
  const onRemove = async (id: string) => {
    if (!authedUser) return;
    await removeSaved(authedUser.uid, id);
  };

  return (
    <div>
      <PageTitle title="Saved" description="Resources you have bookmarked to revisit." />
      {saved.length === 0 ? (
        <Empty
          title="Nothing saved yet"
          body="Open Resources and tap Save on anything you want to keep for later."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {saved.map((s) => (
            <SavedRow key={s.id} item={s} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SavedRow({ item, onRemove }: { item: SavedItem; onRemove: (id: string) => Promise<void> | void }) {
  return (
    <li className="rounded-2xl border border-mist bg-white p-4 shadow-[0_1px_2px_rgba(11,45,91,0.05)]">
      <h3 className="font-display text-[1.02rem] font-bold text-navy">{item.title}</h3>
      <p className="mt-1.5 text-[0.85rem] leading-relaxed text-charcoal/65">{item.description}</p>
      <p className="mt-2 text-[0.72rem] text-charcoal/45">Saved {relativeTime(item.savedAt)}</p>
      <div className="mt-3 flex justify-end border-t border-mist pt-3">
        <AcctBtn variant="ghost" size="sm" className="text-red-600" onClick={() => onRemove(item.id)}>
          Remove
        </AcctBtn>
      </div>
    </li>
  );
}

/* ------------------------------- Progress ------------------------------- */

export function ProgressPage() {
  const { saved, profile } = useUserStore();
  const { published } = useStore();

  const totals = useMemo(() => {
    const stories = published.stories.filter((s) => s.status === "published").length;
    const resources = published.resources.reduce((sum, t) => sum + t.items.length, 0);
    return { stories, resources };
  }, [published]);

  const milestones = [
    { id: "signed-up", label: "Created account", at: profile?.createdAt, done: true },
    { id: "profile", label: "Added profile details", at: profile?.updatedAt, done: Boolean(profile?.bio) },
    { id: "saved", label: "Saved your first resource", at: saved[0]?.savedAt, done: saved.length > 0 },
    { id: "msg", label: "Messaged the team", done: false },
    { id: "story", label: "Read a story", done: false },
  ];

  const complete = milestones.filter((m) => m.done).length;

  return (
    <div>
      <PageTitle
        title="Your progress"
        description="A simple map of how you are using Beyond Now. No streaks, no pressure — just clarity."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Saved resources" value={String(saved.length)} sub="across all packs" tone="navy" />
        <Stat label="Published stories" value={String(totals.stories)} sub="on the website" tone="navy" />
        <Stat label="Milestones" value={`${complete} / ${milestones.length}`} sub="Keep going" tone="teal" />
      </div>

      <div className="mt-6 rounded-2xl border border-mist bg-white p-5">
        <h2 className="font-display text-[1.05rem] font-bold text-navy">Milestones</h2>
        <ol className="mt-4 space-y-3">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold",
                  m.done ? "bg-teal text-white" : "border border-mist bg-white text-charcoal/40",
                )}
              >
                {m.done ? "✓" : "•"}
              </span>
              <div>
                <p className="font-display text-[0.92rem] font-bold text-navy">{m.label}</p>
                <p className="text-[0.78rem] text-charcoal/55">{m.at ? formatDateTime(m.at) : "Not yet"}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-4 rounded-2xl border border-mist bg-bone/40 p-4 text-[0.8rem] text-charcoal/60">
        Total resources available on the website: <strong className="text-navy">{totals.resources}</strong>. Tap{" "}
        <a href="#/account/resources" className="font-semibold text-navy underline-offset-4 hover:underline">
          Resources
        </a>{" "}
        to save your next one.
      </p>
    </div>
  );
}

/* ------------------------------- Notifications ------------------------------- */

export function NotificationsPage() {
  const { authedUser, notifications } = useUserStore();
  const onMarkAll = async () => authedUser && markAllNotificationsRead(authedUser.uid);
  const onMark = async (id: string) => authedUser && markNotificationRead(authedUser.uid, id, true);

  return (
    <div>
      <PageTitle
        title="Notifications"
        description="Updates from the Beyond Now team and your account."
        action={
          <AcctBtn variant="outline" size="sm" onClick={() => void onMarkAll()}>
            Mark all read
          </AcctBtn>
        }
      />

      {notifications.length === 0 ? (
        <Empty title="Nothing here yet" body="When the team sends a message or you save a resource, it shows up here." />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-2xl border p-4",
                n.read ? "border-mist bg-white" : "border-sun/40 bg-sun/10",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                    n.kind === "message" ? "bg-navy" : n.kind === "system" ? "bg-sun" : "bg-teal",
                  )}
                />
                <div className="flex-1">
                  <p className="font-display text-[0.95rem] font-bold text-navy">{n.title}</p>
                  <p className="mt-1 text-[0.86rem] leading-relaxed text-charcoal/70">{n.body}</p>
                  <p className="mt-1.5 text-[0.72rem] text-charcoal/45">{relativeTime(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <AcctBtn variant="ghost" size="sm" onClick={() => void onMark(n.id)}>
                    Mark read
                  </AcctBtn>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- Settings ------------------------------- */

export function SettingsPage() {
  const { authedUser, profile, refreshProfile } = useUserStore();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "error"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Notification preferences live in the user document.
  const [notifyMsgs, setNotifyMsgs] = useState(true);
  const [notifySaves, setNotifySaves] = useState(false);

  const strong = next.length >= 8;
  const matches = next === confirmPw;

  const onChangePassword = async () => {
    if (!authedUser) return;
    setStatus(null);
    if (!strong || !matches) {
      setStatus({ tone: "error", msg: "Passwords must match and be at least 8 characters." });
      return;
    }
    setBusy(true);
    try {
      await changeOwnPassword(current, next);
      setStatus({ tone: "success", msg: "Password changed successfully." });
      setCurrent("");
      setNext("");
      setConfirmPw("");
    } catch (err) {
      setStatus({ tone: "error", msg: err instanceof Error ? err.message : "Could not change password." });
    } finally {
      setBusy(false);
    }
  };

  const onTestNotification = async () => {
    if (!authedUser) return;
    await pushNotification(authedUser.uid, {
      kind: "system",
      title: "Notification test",
      body: "If you can read this, in-app notifications are working as expected.",
      href: "#/account/notifications",
    });
    await refreshProfile();
  };

  return (
    <div>
      <PageTitle title="Settings" description="Manage your password and how you would like to be contacted." />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-mist bg-white p-5">
          <h2 className="font-display text-[1rem] font-bold text-navy">Change password</h2>
          <p className="mt-1 text-[0.82rem] text-charcoal/55">Use at least 8 characters.</p>
          <div className="mt-4 space-y-3">
            <AcctField label="Current password">
              <AcctInput type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
            </AcctField>
            <AcctField label="New password">
              <AcctInput type="password" value={next} onChange={setNext} autoComplete="new-password" invalid={Boolean(next) && !strong} />
            </AcctField>
            <AcctField label="Confirm new password">
              <AcctInput type="password" value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" invalid={Boolean(confirmPw) && !matches} />
            </AcctField>
            <AcctBtn variant="primary" onClick={onChangePassword} disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </AcctBtn>
            {status && (
              <p
                className={cn(
                  "rounded-lg px-3.5 py-2.5 text-[0.82rem] font-medium",
                  status.tone === "success" ? "border border-teal/30 bg-teal/10 text-teal-ink" : "border border-red-200 bg-red-50 text-red-700",
                )}
              >
                {status.msg}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-mist bg-white p-5">
          <h2 className="font-display text-[1rem] font-bold text-navy">Notification preferences</h2>
          <p className="mt-1 text-[0.82rem] text-charcoal/55">Choose what you want to be told about.</p>
          <div className="mt-4 space-y-3 text-[0.88rem]">
            <Toggle checked={notifyMsgs} onChange={setNotifyMsgs} label="New messages from the Beyond Now team" />
            <Toggle checked={notifySaves} onChange={setNotifySaves} label="When a new resource I might like is added" />
          </div>
          <div className="mt-5 border-t border-mist pt-4 text-[0.82rem] text-charcoal/60">
            <p>Signed in as <strong className="text-charcoal/85">{profile?.email || authedUser?.email}</strong></p>
            <p className="mt-0.5">Role: {profile?.role ?? "user"} · Status: {profile?.status ?? "active"}</p>
          </div>
          <AcctBtn variant="outline" size="sm" className="mt-3" onClick={onTestNotification}>
            Send me a test notification
          </AcctBtn>
        </div>
      </div>

      <p className="mt-5 rounded-2xl border border-mist bg-bone/40 p-4 text-[0.78rem] text-charcoal/60">
        For data deletion, safeguarding concerns or anything urgent, message the team or email{" "}
        <strong className="text-navy">beyondnow.ng@gmail.com</strong>.
      </p>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left">
      <span className={cn("mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-teal" : "bg-mist")}>
        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </span>
      <span className="text-charcoal/80">{label}</span>
    </button>
  );
}

