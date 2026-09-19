import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { AdminBtn, Card, ConfirmDialog, EmptyState, PageHeader, SearchInput, StatusBadge } from "@/admin/ui";
import {
  ensureThread,
  markThreadRead,
  sendAdminMessage,
  setThreadStatus,
  subscribeAllThreads,
  subscribeMessages,
  subscribeThread,
  type Message,
  type Thread,
} from "@/lib/chat";
import { getFirebase } from "@/lib/firebase";
import { formatDate, formatDateTime, relativeTime } from "@/lib/media";
import { useStore } from "@/lib/store";
import { adminSetUserRole, adminSetUserStatus, type UserProfile } from "@/lib/users";
import { cn } from "@/utils/cn";
import { subscribeAllUsers } from "@/lib/users";

/* ------------------------------ shared bits ------------------------------ */

function Avatar({ name, url, size = "h-9 w-9 text-[0.75rem]" }: { name: string; url?: string; size?: string }) {
  return url ? (
    <img src={url} alt="" className={cn("shrink-0 rounded-full object-cover", size)} />
  ) : (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-navy font-display font-bold text-sun", size)}>
      {(name || "?")[0]?.toUpperCase()}
    </span>
  );
}

function RoleBadge({ role }: { role: UserProfile["role"] }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 font-display text-[0.66rem] font-bold tracking-[0.08em] uppercase", role === "admin" ? "bg-sun/20 text-[#8a6500]" : "bg-navy/5 text-navy")}>
      {role}
    </span>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-lg border border-mist bg-white p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn("rounded-md px-3 py-1.5 font-display text-[0.78rem] font-semibold transition-colors", value === o.key ? "bg-navy text-white" : "text-charcoal/60 hover:text-navy")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* =============================== CONVERSATION =============================== */

/**
 * Realtime transcript + composer for one user's thread. Used inline on the
 * Messages page and inside the user detail drawer.
 */
function Conversation({ uid, seed, className }: { uid: string; seed?: Pick<UserProfile, "uid" | "name" | "email" | "avatarUrl">; className?: string }) {
  const { account, notify } = useStore();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubThread = subscribeThread(uid, setThread, setError);
    const unsubMessages = subscribeMessages(uid, setMessages, setError);
    return () => {
      unsubThread();
      unsubMessages();
    };
  }, [uid]);

  useEffect(() => {
    if (thread && thread.unreadByAdmin > 0) void markThreadRead(uid, "admin").catch(() => undefined);
  }, [uid, thread?.unreadByAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (busy || !account?.uid) return;
    setBusy(true);
    setError(null);
    try {
      const target = thread ?? (seed ? await ensureThread(seed) : null);
      if (!target) throw new Error("This user has no conversation yet.");
      await sendAdminMessage(target, text, { uid: account.uid, name: account.name });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    if (!thread) return;
    const next = thread.status === "open" ? "resolved" : "open";
    await setThreadStatus(uid, next).catch((err) => notify("error", err instanceof Error ? err.message : "Could not update status."));
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-bone/30 px-4 py-5">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-md text-center text-[0.88rem] text-charcoal/55">No messages yet. Send a friendly intro to open the conversation.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === "admin";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[78%] rounded-2xl px-4 py-2.5 text-[0.92rem] shadow-sm", mine ? "bg-navy text-white" : "border border-mist bg-white text-charcoal")}>
                  {!mine && <p className="font-display text-[0.7rem] font-bold text-navy">{m.senderName}</p>}
                  <p className={cn("mt-0.5 whitespace-pre-wrap", mine ? "text-white" : "text-charcoal/85")}>{m.text}</p>
                  <p className={cn("mt-1.5 text-right text-[0.65rem]", mine ? "text-white/55" : "text-charcoal/45")}>{formatDateTime(m.createdAt)}</p>
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
            placeholder={`Reply to ${thread?.userName ?? seed?.name ?? "user"}…`}
            aria-label="Reply"
            className="max-h-32 min-h-[44px] flex-1 resize-y rounded-2xl border border-navy/15 bg-bone/30 px-4 py-2.5 text-[0.9rem] placeholder:text-charcoal/40 focus:border-navy focus:bg-white focus:outline-none"
          />
          <AdminBtn size="sm" variant="primary" type="submit" disabled={busy || !text.trim()}>{busy ? "Sending…" : "Send"}</AdminBtn>
        </div>
        {error && <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">{error}</p>}
        <div className="mt-2 flex items-center justify-between text-[0.7rem] text-charcoal/45">
          <span>Delivered instantly to {thread?.userEmail ?? seed?.email ?? "the user"}, with an in-app notification.</span>
          {thread && (
            <button type="button" onClick={() => void toggleStatus()} className="font-semibold text-navy hover:underline">
              Mark {thread.status === "open" ? "resolved" : "open"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ================================== USERS ================================== */

export function UsersAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "admin">("all");
  const [selected, setSelected] = useState<UserProfile | null>(null);

  useEffect(() => subscribeAllUsers(setUsers, setError), []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "active" && u.status !== "active") return false;
      if (filter === "suspended" && u.status !== "suspended") return false;
      if (filter === "admin" && u.role !== "admin") return false;
      return !needle || u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle) || u.bio.toLowerCase().includes(needle);
    });
  }, [users, q, filter]);

  // Keep the drawer in sync with realtime updates to the selected user.
  const live = selected ? (users.find((u) => u.uid === selected.uid) ?? selected) : null;

  return (
    <div>
      <PageHeader title="Users" description="Every registered account, with search, status management and direct conversation access." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or bio…" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { key: "all", label: `All (${users.length})` },
            { key: "active", label: "Active" },
            { key: "suspended", label: `Suspended (${users.filter((u) => u.status === "suspended").length})` },
            { key: "admin", label: `Admins (${users.filter((u) => u.role === "admin").length})` },
          ]}
        />
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] text-red-700">{error}</p>}

      {visible.length === 0 ? (
        <EmptyState icon="◍" title={users.length ? "No matches" : "No users yet"} body={users.length ? "Try a different search term." : "Users appear here the moment they sign up."} />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[0.85rem]">
              <thead className="bg-bone text-[0.72rem] tracking-[0.1em] text-charcoal/55 uppercase">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3 text-right">Activity</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {visible.map((u) => (
                  <tr key={u.uid} className="hover:bg-bone/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name || u.email} url={u.avatarUrl} />
                        <div>
                          <p className="font-display text-[0.88rem] font-bold text-navy">{u.name || "Unnamed"}</p>
                          <p className="text-[0.72rem] text-charcoal/55">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={u.status === "active" ? "published" : "draft"} /></td>
                    <td className="px-4 py-3 text-charcoal/65">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-charcoal/65">{relativeTime(u.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-right text-charcoal/65">{u.activity.saved} saved · {u.activity.messages} msgs</td>
                    <td className="px-4 py-3 text-right">
                      <AdminBtn size="sm" variant="outline" onClick={() => setSelected(u)}>Open</AdminBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {live && <UserDrawer user={live} onClose={() => setSelected(null)} />}
    </div>
  );
}

function UserDrawer({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const { account, notify } = useStore();
  const [tab, setTab] = useState<"profile" | "conversation">("profile");
  const [confirm, setConfirm] = useState<"suspend" | "promote" | "demote" | null>(null);
  const [busy, setBusy] = useState(false);
  const isSelf = account?.uid === user.uid;

  const act = async (task: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await task();
      notify("success", ok);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-navy-deep/55 backdrop-blur-sm" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={`${user.name || user.email} details`} className="fixed inset-y-0 right-0 z-[75] flex w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-mist px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name || user.email} url={user.avatarUrl} size="h-12 w-12 text-[0.95rem]" />
            <div>
              <h2 className="font-display text-[1.05rem] font-bold text-navy">{user.name || "Unnamed"}</h2>
              <p className="text-[0.78rem] text-charcoal/55">{user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-charcoal/55 hover:bg-mist">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="border-b border-mist px-5 pt-3">
          <Segmented value={tab} onChange={setTab} options={[{ key: "profile", label: "Profile" }, { key: "conversation", label: "Conversation" }]} />
        </div>

        {tab === "conversation" ? (
          <Conversation uid={user.uid} seed={user} className="min-h-0 flex-1" />
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <dl className="divide-y divide-mist text-[0.85rem]">
              {[
                ["User ID", <code key="id" className="font-mono text-[0.75rem] text-charcoal/65">{user.uid}</code>],
                ["Role", <RoleBadge key="role" role={user.role} />],
                ["Status", <StatusBadge key="status" status={user.status === "active" ? "published" : "draft"} />],
                ["Joined", formatDateTime(user.createdAt)],
                ["Last seen", relativeTime(user.lastSeenAt)],
                ["Saved resources", String(user.activity.saved)],
                ["Messages sent", String(user.activity.messages)],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-[0.78rem] text-charcoal/55">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>

            {user.bio && (
              <div className="rounded-xl border border-mist bg-bone p-3">
                <p className="eyebrow text-charcoal/55">Bio</p>
                <p className="mt-1 text-[0.88rem] leading-relaxed text-charcoal/80">{user.bio}</p>
              </div>
            )}

            <Card title="Account status" description="Suspended members keep their data but cannot use messaging.">
              {user.status === "active" ? (
                <AdminBtn size="sm" variant="danger" disabled={busy || isSelf} onClick={() => setConfirm("suspend")}>Suspend account</AdminBtn>
              ) : (
                <AdminBtn size="sm" variant="teal" disabled={busy} onClick={() => void act(() => adminSetUserStatus(user.uid, "active"), "Account reactivated.")}>Reactivate</AdminBtn>
              )}
            </Card>

            <Card title="Admin privileges" description="Administrators can edit the website and read every conversation.">
              <AdminBtn size="sm" variant={user.role === "admin" ? "ghost" : "accent"} disabled={busy || isSelf} onClick={() => setConfirm(user.role === "admin" ? "demote" : "promote")}>
                {user.role === "admin" ? "Revoke admin" : "Make admin"}
              </AdminBtn>
              {isSelf && <p className="mt-2 text-[0.75rem] text-charcoal/50">You cannot change your own role or status.</p>}
            </Card>
          </div>
        )}
      </aside>

      <ConfirmDialog
        open={confirm === "suspend"}
        title="Suspend this account?"
        body={`${user.email} will be blocked from messaging until you reactivate the account.`}
        confirmLabel="Suspend"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void act(() => adminSetUserStatus(user.uid, "suspended"), "Account suspended.")}
      />
      <ConfirmDialog
        open={confirm === "promote" || confirm === "demote"}
        tone="primary"
        title={confirm === "promote" ? "Grant admin access?" : "Revoke admin access?"}
        confirmLabel={confirm === "promote" ? "Grant admin" : "Revoke admin"}
        body={
          confirm === "promote"
            ? `${user.email} will gain full access to website content, the media library, user data and every conversation.`
            : `${user.email} will lose access to the admin dashboard and remain a normal member.`
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          void act(
            () => adminSetUserRole(user.uid, confirm === "promote" ? "admin" : "user", account?.uid ?? "admin"),
            confirm === "promote" ? "Admin access granted." : "Admin access revoked.",
          )
        }
      />
    </>
  );
}

/* ================================ MESSAGES ================================ */

export function MessagesAdmin() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "open" | "resolved">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => subscribeAllThreads(setThreads, setError), []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return threads.filter((t) => {
      if (filter === "unread" && t.unreadByAdmin === 0) return false;
      if (filter === "open" && t.status !== "open") return false;
      if (filter === "resolved" && t.status !== "resolved") return false;
      return !needle || t.userName.toLowerCase().includes(needle) || t.userEmail.toLowerCase().includes(needle) || t.lastMessage.toLowerCase().includes(needle);
    });
  }, [threads, q, filter]);

  const unread = threads.reduce((sum, t) => sum + t.unreadByAdmin, 0);
  const selected = threads.find((t) => t.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Messages"
        description={unread ? `${unread} unread across ${threads.length} conversation${threads.length === 1 ? "" : "s"}.` : "Every member conversation, updated in real time."}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search by user, email or message…" />
        <Segmented value={filter} onChange={setFilter} options={[{ key: "all", label: "All" }, { key: "unread", label: `Unread (${threads.filter((t) => t.unreadByAdmin > 0).length})` }, { key: "open", label: "Open" }, { key: "resolved", label: "Resolved" }]} />
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className="p-0 lg:max-h-[72vh] lg:overflow-hidden">
          {visible.length === 0 ? (
            <EmptyState icon="✉" title={threads.length ? "No matches" : "No conversations yet"} body={threads.length ? "Try a different filter." : "A conversation appears here as soon as a member writes to you."} />
          ) : (
            <ul className="divide-y divide-mist overflow-y-auto lg:max-h-[72vh]">
              {visible.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setSelectedId(t.id)} className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors", selectedId === t.id ? "bg-bone/70" : "hover:bg-bone/40")}>
                    <Avatar name={t.userName} url={t.userAvatar} size="h-10 w-10 text-[0.78rem]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-display text-[0.88rem] font-bold text-navy">{t.userName}</p>
                        <span className="shrink-0 text-[0.7rem] text-charcoal/45">{relativeTime(t.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-[0.8rem] text-charcoal/65">{t.lastMessage || "No messages yet"}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 font-display text-[0.62rem] font-bold tracking-[0.08em] uppercase", t.status === "open" ? "bg-teal/15 text-teal-ink" : "bg-mist text-charcoal/60")}>{t.status}</span>
                        {t.unreadByAdmin > 0 && <span className="rounded-full bg-sun px-2 py-0.5 font-display text-[0.65rem] font-bold text-navy-deep">{t.unreadByAdmin} new</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <div className="flex h-[72vh] flex-col overflow-hidden rounded-2xl border border-mist bg-white shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-mist bg-bone/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={selected.userName} url={selected.userAvatar} />
                <div>
                  <p className="font-display text-[0.95rem] font-bold text-navy">{selected.userName}</p>
                  <p className="text-[0.72rem] text-charcoal/55">{selected.userEmail}</p>
                </div>
              </div>
              <AdminBtn size="sm" variant="outline" onClick={() => setSelectedId(null)}>Close</AdminBtn>
            </div>
            <Conversation key={selected.id} uid={selected.id} className="min-h-0 flex-1" />
          </div>
        ) : (
          <EmptyState icon="✉" title="Select a conversation" body="Pick a member on the left to read their messages and reply in real time." />
        )}
      </div>
    </div>
  );
}

/* ================================ ARTICLES ================================ */

export type Article = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  published: boolean;
  createdAt: number;
  updatedAt: number;
  authorId: string;
  authorName: string;
};

export function ArticlesAdmin() {
  const { account, notify } = useStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Article | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    return onSnapshot(
      query(collection(fb.db, "articles"), orderBy("updatedAt", "desc"), limit(200)),
      (snap) => setArticles(snap.docs.map((d) => d.data() as Article)),
      (err) => notify("error", err.message),
    );
  }, [notify]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? articles.filter((a) => a.title.toLowerCase().includes(needle) || a.summary.toLowerCase().includes(needle)) : articles;
  }, [articles, q]);

  const save = async (article: Article) => {
    const fb = getFirebase();
    if (!fb) return;
    if (!article.title.trim()) return notify("error", "An article needs a title.");
    const now = Date.now();
    const id = article.id || doc(collection(fb.db, "articles")).id;
    const data: Article = {
      ...article,
      id,
      title: article.title.trim(),
      summary: article.summary.trim(),
      createdAt: article.createdAt || now,
      updatedAt: now,
      authorId: article.authorId || account?.uid || "",
      authorName: article.authorName || account?.name || "Beyond Now",
    };
    try {
      await setDoc(doc(fb.db, "articles", id), data);
      setEditing(null);
      notify("success", "Article saved.");
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not save article.");
    }
  };

  const remove = async (id: string) => {
    const fb = getFirebase();
    if (!fb) return;
    try {
      await deleteDoc(doc(fb.db, "articles", id));
      notify("info", "Article deleted.");
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not delete article.");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <PageHeader title="Articles" description="Long-form pieces visible to signed-in members. Use them for announcements and editorial work.">
        <AdminBtn variant="primary" onClick={() => setEditing({ id: "", title: "", summary: "", body: "", category: "Stories", published: false, createdAt: 0, updatedAt: 0, authorId: "", authorName: "" })}>
          + New article
        </AdminBtn>
      </PageHeader>

      <div className="mb-4"><SearchInput value={q} onChange={setQ} placeholder="Search articles…" /></div>

      {visible.length === 0 ? (
        <EmptyState icon="≡" title={articles.length ? "No matches" : "No articles yet"} body="Create an article to share a longer piece with members." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((a) => (
            <li key={a.id} className="rounded-2xl border border-mist bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-navy/5 px-2.5 py-0.5 font-display text-[0.66rem] font-bold tracking-[0.08em] text-navy uppercase">{a.category}</span>
                <StatusBadge status={a.published ? "published" : "draft"} />
              </div>
              <h3 className="mt-2 font-display text-[1rem] font-bold text-navy">{a.title}</h3>
              <p className="mt-1 line-clamp-2 text-[0.85rem] text-charcoal/65">{a.summary}</p>
              <p className="mt-1 text-[0.7rem] text-charcoal/45">By {a.authorName} · updated {relativeTime(a.updatedAt)}</p>
              <div className="mt-3 flex gap-2 border-t border-mist pt-3">
                <AdminBtn size="sm" variant="outline" onClick={() => setEditing(a)}>Edit</AdminBtn>
                <AdminBtn size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(a.id)}>Delete</AdminBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <ArticleEditor key={editing.id || "new"} article={editing} onClose={() => setEditing(null)} onSave={save} />}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this article?"
        confirmLabel="Delete"
        body="It will be removed for all members immediately."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && void remove(confirmDelete)}
      />
    </div>
  );
}

function ArticleEditor({ article, onClose, onSave }: { article: Article; onClose: () => void; onSave: (a: Article) => Promise<void> }) {
  const [local, setLocal] = useState<Article>(article);
  const input = "w-full rounded-lg border border-mist bg-white px-3 py-2 text-[0.92rem] focus:border-navy focus:outline-none";
  const field = (label: string, node: ReactNode, wide = false) => (
    <label className={cn("block", wide && "sm:col-span-2")}>
      <span className="mb-1 block font-display text-[0.72rem] font-bold tracking-[0.08em] text-charcoal/65 uppercase">{label}</span>
      {node}
    </label>
  );

  return (
    <ConfirmDialog
      open
      wide
      tone="primary"
      title={article.id ? `Edit: ${article.title}` : "New article"}
      confirmLabel="Save article"
      onCancel={onClose}
      onConfirm={() => void onSave(local)}
      body={
        <div className="grid gap-3 sm:grid-cols-2">
          {field("Title", <input value={local.title} onChange={(e) => setLocal({ ...local, title: e.target.value })} className={input} />, true)}
          {field("Summary", <input value={local.summary} onChange={(e) => setLocal({ ...local, summary: e.target.value })} className={input} />)}
          {field("Category", <input value={local.category} onChange={(e) => setLocal({ ...local, category: e.target.value })} className={input} />)}
          {field("Body", <textarea rows={8} value={local.body} onChange={(e) => setLocal({ ...local, body: e.target.value })} className={cn(input, "resize-y leading-relaxed")} />, true)}
          <label className="flex items-center gap-2 text-[0.85rem] text-charcoal/75">
            <input type="checkbox" checked={local.published} onChange={(e) => setLocal({ ...local, published: e.target.checked })} className="h-4 w-4 rounded border-mist" />
            Visible to members
          </label>
        </div>
      }
    />
  );
}
