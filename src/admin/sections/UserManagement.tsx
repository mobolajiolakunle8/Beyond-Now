import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  where,
  query as fsQuery,
  setDoc,
  doc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { useStore } from "@/lib/store";
import { getFirebase } from "@/lib/firebase";
import {
  adminSetUserRole,
  adminSetUserStatus,
  subscribeAllUsers,
  type UserProfile,
} from "@/lib/users";
import {
  markThreadReadForRole,
  sendAdminMessage,
  subscribeAllThreads,
  subscribeThreadMessages,
  setThreadStatus,
  type Thread,
  type Message,
} from "@/lib/chat";
import { AdminBtn, Card, ConfirmDialog, EmptyState, SearchInput, StatusBadge } from "@/admin/ui";
import { useUserStore } from "@/account/UserStore";
function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[1.6rem] font-extrabold text-navy sm:text-[1.9rem]">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-[0.9rem] text-charcoal/65">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
import { formatDate, formatDateTime, relativeTime } from "@/lib/media";
import { cn } from "@/utils/cn";

/* ============================== USERS ============================== */

export function UsersAdmin({ toolbar }: { toolbar?: ReactNode }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "admin">("all");
  const [selected, setSelected] = useState<UserProfile | null>(null);

  useEffect(() => {
    return subscribeAllUsers(
      (list) => setUsers(list),
      (msg) => console.error("users", msg),
    );
  }, []);

  const visible = useMemo(() => {
    let list = users;
    if (filter === "active") list = list.filter((u) => u.status === "active");
    if (filter === "suspended") list = list.filter((u) => u.status === "suspended");
    if (filter === "admin") list = list.filter((u) => u.role === "admin");
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          (u.bio || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, query, filter]);

  const counts = useMemo(() => {
    const admin = users.filter((u) => u.role === "admin").length;
    const suspended = users.filter((u) => u.status === "suspended").length;
    return { total: users.length, admin, suspended };
  }, [users]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every registered account, with search, status management and direct conversation access."
      >
        {toolbar}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or bio…" />
        <div className="flex gap-1 rounded-lg border border-mist bg-white p-1">
          {(
            [
              ["all", `All (${counts.total})`],
              ["active", `Active`],
              ["suspended", `Suspended (${counts.suspended})`],
              ["admin", `Admins (${counts.admin})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 font-display text-[0.78rem] font-semibold transition-colors",
                filter === key ? "bg-navy text-white" : "text-charcoal/60 hover:text-navy",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="◍"
          title={users.length ? "No matches" : "No users yet"}
          body={users.length ? "Try a different search term." : "Users will appear here as they sign up."}
        />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[0.85rem]">
              <thead className="bg-bone text-[0.72rem] uppercase tracking-[0.1em] text-charcoal/55">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3 text-right">Activity</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {visible.map((u) => (
                  <tr key={u.uid} className="hover:bg-bone/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy font-display text-[0.75rem] font-bold text-sun">
                            {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-display text-[0.88rem] font-bold text-navy">{u.name || "Unnamed"}</p>
                          <p className="text-[0.72rem] text-charcoal/55">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status === "active" ? "published" : "draft"} />
                    </td>
                    <td className="px-4 py-3 text-charcoal/65">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-charcoal/65">{relativeTime(u.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-right text-charcoal/65">
                      {u.activity.saved} saved · {u.activity.messages} msgs
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AdminBtn size="sm" variant="outline" onClick={() => setSelected(u)}>
                        Open
                      </AdminBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <UserDetailPanel user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function RoleBadge({ role }: { role: UserProfile["role"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[0.66rem] font-bold tracking-[0.08em] uppercase",
        role === "admin" ? "bg-sun/20 text-[#8a6500]" : "bg-navy/5 text-navy",
      )}
    >
      {role}
    </span>
  );
}

function UserDetailPanel({ user, onClose }: { user: UserProfile | null; onClose: () => void }) {
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmRole, setConfirmRole] = useState<"user" | "admin" | null>(null);
  const [busy, setBusy] = useState(false);
  const [openThread, setOpenThread] = useState(false);

  if (!user) return null;

  const setStatus = async (status: "active" | "suspended") => {
    setBusy(true);
    try {
      await adminSetUserStatus(user.uid, status);
      setConfirmSuspend(false);
    } finally {
      setBusy(false);
    }
  };

  const setRole = async (role: "user" | "admin") => {
    setBusy(true);
    try {
      await adminSetUserRole(user.uid, role);
      setConfirmRole(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-navy-deep/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-[75] flex w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-mist px-5 py-4">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-navy font-display text-[0.95rem] font-bold text-sun">
                {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
              </span>
            )}
            <div>
              <h2 className="font-display text-[1.05rem] font-bold text-navy">{user.name || "Unnamed"}</h2>
              <p className="text-[0.78rem] text-charcoal/55">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-charcoal/55 hover:bg-mist"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <dl className="grid gap-2 text-[0.85rem]">
            <Row k="User ID" v={user.uid} mono />
            <Row k="Role" v={<RoleBadge role={user.role} />} />
            <Row k="Status" v={<StatusBadge status={user.status === "active" ? "published" : "draft"} />} />
            <Row k="Joined" v={formatDateTime(user.createdAt)} />
            <Row k="Last seen" v={relativeTime(user.lastSeenAt)} />
            <Row k="Saved resources" v={String(user.activity.saved)} />
            <Row k="Messages" v={String(user.activity.messages)} />
          </dl>
          {user.bio && (
            <div className="rounded-xl border border-mist bg-bone p-3">
              <p className="eyebrow text-charcoal/55">Bio</p>
              <p className="mt-1 text-[0.88rem] leading-relaxed text-charcoal/80">{user.bio}</p>
            </div>
          )}

          <div className="rounded-2xl border border-mist bg-white p-4">
            <h3 className="font-display text-[0.95rem] font-bold text-navy">Conversation</h3>
            <p className="mt-1 text-[0.82rem] text-charcoal/55">Open the live conversation and reply in real time.</p>
            <div className="mt-3 flex gap-2">
              <AdminBtn size="sm" variant="primary" onClick={() => setOpenThread(true)}>
                Open conversation
              </AdminBtn>
            </div>
          </div>

          <div className="rounded-2xl border border-mist bg-white p-4">
            <h3 className="font-display text-[0.95rem] font-bold text-navy">Account status</h3>
            <p className="mt-1 text-[0.82rem] text-charcoal/55">
              Suspended users cannot sign in or use the messaging system.
            </p>
            <div className="mt-3 flex gap-2">
              {user.status === "active" ? (
                <AdminBtn size="sm" variant="danger" onClick={() => setConfirmSuspend(true)}>
                  Suspend account
                </AdminBtn>
              ) : (
                <AdminBtn size="sm" variant="teal" onClick={() => void setStatus("active")} disabled={busy}>
                  Reactivate
                </AdminBtn>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-mist bg-white p-4">
            <h3 className="font-display text-[0.95rem] font-bold text-navy">Admin privileges</h3>
            <p className="mt-1 text-[0.82rem] text-charcoal/55">
              Promote or revoke admin access. The role change applies instantly.
            </p>
            <div className="mt-3 flex gap-2">
              <AdminBtn
                size="sm"
                variant={user.role === "admin" ? "ghost" : "accent"}
                onClick={() => setConfirmRole(user.role === "admin" ? "user" : "admin")}
              >
                {user.role === "admin" ? "Revoke admin" : "Make admin"}
              </AdminBtn>
            </div>
          </div>
        </div>
      </aside>

      {openThread && user && <AdminThreadModal user={user} onClose={() => setOpenThread(false)} />}

      <ConfirmDialog
        open={confirmSuspend}
        title="Suspend this account?"
        body={`${user.email} will be signed out and prevented from signing in until you reactivate the account.`}
        confirmLabel="Suspend account"
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={() => void setStatus("suspended")}
      />

      <ConfirmDialog
        open={confirmRole !== null}
        title={confirmRole === "admin" ? "Grant admin access?" : "Revoke admin access?"}
        tone="primary"
        confirmLabel={confirmRole === "admin" ? "Grant admin" : "Revoke admin"}
        body={
          confirmRole === "admin"
            ? `${user.email} will gain full access to website content, media library, user data and conversations.`
            : `${user.email} will lose access to the admin dashboard and user data. They remain a normal user.`
        }
        onCancel={() => setConfirmRole(null)}
        onConfirm={() => confirmRole && void setRole(confirmRole)}
      />
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-mist py-1.5 last:border-0">
      <dt className="text-[0.78rem] text-charcoal/55">{k}</dt>
      <dd className={cn("text-right", mono && "font-mono text-[0.78rem] text-charcoal/65")}>{v}</dd>
    </div>
  );
}

function AdminThreadModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const [thread, setThread] = useState<Thread | null>(null);
  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    const q = fsQuery(collection(fb.db, "threads"), where("userId", "==", user.uid), limit(1));
    return onSnapshot(q, (snap) => {
      const d = snap.docs[0];
      if (d) setThread({ id: d.id, ...(d.data() as Omit<Thread, "id">) });
    });
  }, [user.uid]);
  if (!thread) {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-navy-deep/55 backdrop-blur-sm" onClick={onClose}>
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <p className="font-display text-[1rem] font-bold text-navy">Loading conversation…</p>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-end sm:p-6" onClick={onClose}>
      <div
        className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <UserDetailInner thread={thread} asModal onClose={onClose} />
      </div>
    </div>
  );
}

/* ============================== MESSAGES ============================== */

export function MessagesAdmin({ toolbar }: { toolbar?: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [selected, setSelected] = useState<Thread | null>(null);

  useEffect(() => {
    return subscribeAllThreads(
      (list) => setThreads(list),
      (msg) => console.error("threads", msg),
    );
  }, []);

  const visible = useMemo(() => {
    let list = threads;
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.userName.toLowerCase().includes(q) ||
          t.userEmail.toLowerCase().includes(q) ||
          t.lastMessage.toLowerCase().includes(q),
      );
    }
    return list;
  }, [threads, query, filter]);

  const unread = threads.reduce((sum, t) => sum + (t.unreadByAdmin ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Messages"
        description={`Realtime conversations between users and the Beyond Now team. ${unread ? `${unread} unread across ${threads.length} threads.` : "All caught up."}`}
      >
        {toolbar}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by user, email or message…" />
        <div className="flex gap-1 rounded-lg border border-mist bg-white p-1">
          {(
            [
              ["all", "All"],
              ["open", "Open"],
              ["resolved", "Resolved"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 font-display text-[0.78rem] font-semibold transition-colors",
                filter === key ? "bg-navy text-white" : "text-charcoal/60 hover:text-navy",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className="p-0 lg:max-h-[70vh] lg:overflow-hidden">
          {visible.length === 0 ? (
            <EmptyState icon="✉" title="No conversations" body="New conversations appear here in real time." />
          ) : (
            <ul className="divide-y divide-mist overflow-y-auto lg:max-h-[70vh]">
              {visible.map((t) => {
                const isActive = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(t)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                        isActive ? "bg-bone/70" : "hover:bg-bone/40",
                      )}
                    >
                      {t.userAvatar ? (
                        <img src={t.userAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-navy font-display text-[0.78rem] font-bold text-sun">
                          {t.userName[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-display text-[0.88rem] font-bold text-navy">{t.userName}</p>
                          <span className="text-[0.7rem] text-charcoal/45">{relativeTime(t.lastMessageAt)}</span>
                        </div>
                        <p className="truncate text-[0.8rem] text-charcoal/65">
                          {t.lastMessage || "(no messages yet)"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-display text-[0.62rem] font-bold tracking-[0.08em] uppercase",
                              t.status === "open" ? "bg-teal/15 text-teal-ink" : "bg-mist text-charcoal/60",
                            )}
                          >
                            {t.status}
                          </span>
                          {t.unreadByAdmin > 0 && (
                            <span className="rounded-full bg-sun px-2 py-0.5 font-display text-[0.65rem] font-bold text-navy-deep">
                              {t.unreadByAdmin} new
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div>
          {selected ? (
            <AdminConversation thread={selected} onClose={() => setSelected(null)} />
          ) : (
            <EmptyState icon="✉" title="Select a conversation" body="Pick a user on the left to view their full conversation and reply." />
          )}
        </div>
      </div>
    </div>
  );
}

function AdminConversation({ thread, onClose }: { thread: Thread; onClose: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-mist bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-mist bg-bone/60 px-4 py-3">
        <div className="flex items-center gap-3">
          {thread.userAvatar ? (
            <img src={thread.userAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-navy font-display text-[0.78rem] font-bold text-sun">
              {thread.userName[0]?.toUpperCase()}
            </span>
          )}
          <div>
            <p className="font-display text-[0.95rem] font-bold text-navy">{thread.userName}</p>
            <p className="text-[0.72rem] text-charcoal/55">{thread.userEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-display text-[0.62rem] font-bold tracking-[0.1em] uppercase",
              thread.status === "open" ? "bg-teal/12 text-teal-ink" : "bg-mist text-charcoal/55",
            )}
          >
            {thread.status}
          </span>
          {thread.unreadByAdmin > 0 && (
            <span className="rounded-full bg-sun/30 px-2.5 py-1 font-display text-[0.66rem] font-bold text-navy-deep">
              {thread.unreadByAdmin} unread
            </span>
          )}
          <AdminBtn size="sm" variant="outline" onClick={onClose}>
            Close
          </AdminBtn>
        </div>
      </div>
      <UserDetailInner thread={thread} asModal={false} onClose={onClose} />
    </div>
  );
}

/** Chat composer + transcript, shared between inline view and modal. */
function UserDetailInner({
  thread: initialThread,
  asModal: _asModal,
  onClose: _onClose,
}: {
  thread: Thread;
  asModal: boolean;
  onClose: () => void;
}) {
  const { authedUser } = useUserStore();
  const { account } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [thread, setThread] = useState<Thread | null>(initialThread ?? null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!thread) return;
    return subscribeThreadMessages(thread.id, (msgs) => setMessages(msgs));
  }, [thread?.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Mark admin read when opened
  useEffect(() => {
    if (!thread) return;
    if (thread.unreadByAdmin > 0) void markThreadReadForRole(thread, "admin");
  }, [thread?.id, thread?.unreadByAdmin]);

  const onSend = async () => {
    if (!thread) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await sendAdminMessage(
        thread,
        trimmed,
        account?.name || authedUser?.displayName || "Beyond Now team",
        authedUser?.uid ?? "admin",
      );
      setText("");
      setThread({ ...thread, lastMessage: trimmed, lastSender: "admin", lastMessageAt: Date.now() });
    } finally {
      setBusy(false);
    }
  };

  const onResolve = async (status: "open" | "resolved") => {
    if (!thread) return;
    await setThreadStatus(thread, status);
    setThread({ ...thread, status });
  };

  return (
    <div className={cn("flex h-full flex-col", "h-[60vh]")}>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-bone/30 px-4 py-5">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-md text-center text-[0.88rem] text-charcoal/55">
            No messages yet. Send a friendly intro to open the conversation.
          </p>
        ) : (
          messages.map((m) => {
            const isAdmin = m.senderRole === "admin";
            return (
              <div key={m.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-4 py-2.5 text-[0.92rem] shadow-sm",
                    isAdmin ? "bg-navy text-white" : "bg-white border border-mist text-charcoal",
                  )}
                >
                  {!isAdmin && (
                    <p className="font-display text-[0.7rem] font-bold text-navy">{m.senderName}</p>
                  )}
                  <p className={cn("mt-0.5 whitespace-pre-wrap", isAdmin ? "text-white" : "text-charcoal/85")}>
                    {m.text}
                  </p>
                  <p
                    className={cn(
                      "mt-1.5 text-right text-[0.65rem]",
                      isAdmin ? "text-white/55" : "text-charcoal/45",
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
            placeholder={`Reply to ${thread?.userName ?? "user"}…`}
            className="min-h-[44px] max-h-32 flex-1 resize-y rounded-2xl border border-navy/15 bg-bone/30 px-4 py-2.5 text-[0.9rem] placeholder:text-charcoal/40 focus:border-navy focus:bg-white focus:outline-none"
          />
          <AdminBtn size="sm" variant="primary" onClick={() => void onSend()} disabled={busy || !text.trim()}>
            {busy ? "Sending…" : "Send"}
          </AdminBtn>
        </div>
        <div className="mt-2 flex items-center justify-between text-[0.7rem] text-charcoal/45">
          <span>Replies go to {thread?.userEmail}. They will see them instantly.</span>
          {thread && (
            <button
              type="button"
              onClick={() => void onResolve(thread.status === "open" ? "resolved" : "open")}
              className="font-semibold text-navy hover:underline"
            >
              Mark {thread.status === "open" ? "resolved" : "open"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== ARTICLES ============================== */

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

export function ArticlesAdmin({ toolbar }: { toolbar?: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Article | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    return onSnapshot(
      fsQuery(collection(fb.db, "articles"), orderBy("updatedAt", "desc"), limit(200)),
      (snap) => setArticles(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Article, "id">) }))),
    );
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? articles.filter((a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q)) : articles;
  }, [articles, query]);

  const onSave = async (article: Article) => {
    const fb = getFirebase();
    if (!fb) return;
    const { account } = useStore();
    const now = Date.now();
    const data: Article = {
      ...article,
      title: article.title.trim(),
      summary: article.summary.trim(),
      body: article.body,
      updatedAt: now,
      authorId: account?.uid || article.authorId,
      authorName: account?.name || article.authorName,
    };
    if (!article.id || !articles.find((a) => a.id === article.id)) {
      const ref = await addDoc(collection(fb.db, "articles"), { ...data, id: "", createdAt: now });
      await setDoc(doc(fb.db, "articles", ref.id), { ...data, id: ref.id }, { merge: true });
    } else {
      await setDoc(doc(fb.db, "articles", article.id), data, { merge: true });
    }
    setEditing(null);
  };

  const onDelete = async (id: string) => {
    const fb = getFirebase();
    if (!fb) return;
    await deleteDoc(doc(fb.db, "articles", id));
    setConfirmDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Articles"
        description="Long-form pieces visible to all signed-in users. Use them for newsletters, announcements and editorial work."
      >
        {toolbar}
        <AdminBtn
          variant="primary"
          onClick={() =>
            setEditing({
              id: "",
              title: "",
              summary: "",
              body: "",
              category: "Stories",
              published: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              authorId: "",
              authorName: "",
            })
          }
        >
          + New article
        </AdminBtn>
      </PageHeader>

      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search articles…" />
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="✎" title={articles.length ? "No matches" : "No articles yet"} body="Create a new article to share a longer story with your audience." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((a) => (
            <li key={a.id} className="rounded-2xl border border-mist bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-navy/5 px-2.5 py-0.5 font-display text-[0.66rem] font-bold tracking-[0.08em] text-navy uppercase">
                  {a.category}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-display text-[0.66rem] font-bold tracking-[0.08em] uppercase",
                    a.published ? "bg-teal/12 text-teal-ink" : "bg-sun/20 text-[#8a6500]",
                  )}
                >
                  {a.published ? "Published" : "Draft"}
                </span>
              </div>
              <h3 className="mt-2 font-display text-[1rem] font-bold text-navy">{a.title}</h3>
              <p className="mt-1 line-clamp-2 text-[0.85rem] text-charcoal/65">{a.summary}</p>
              <p className="mt-1 text-[0.7rem] text-charcoal/45">
                By {a.authorName || "Admin"} · updated {relativeTime(a.updatedAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-mist pt-3">
                <AdminBtn size="sm" variant="outline" onClick={() => setEditing(a)}>
                  Edit
                </AdminBtn>
                <AdminBtn size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(a.id)}>
                  Delete
                </AdminBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <ArticleEditorModal article={editing} onClose={() => setEditing(null)} onSave={onSave} />}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this article?"
        confirmLabel="Delete"
        body="It will be removed for all users immediately."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && void onDelete(confirmDelete)}
      />
    </div>
  );
}

function ArticleEditorModal({
  article,
  onClose,
  onSave,
}: {
  article: Article;
  onClose: () => void;
  onSave: (a: Article) => Promise<void>;
}) {
  const [local, setLocal] = useState<Article>(article);
  return (
    <ConfirmDialog
      open
      wide
      title={article.title ? `Edit: ${article.title}` : "New article"}
      tone="primary"
      confirmLabel="Save article"
      onCancel={onClose}
      onConfirm={() => void onSave(local)}
      body={
        <div className="grid gap-3 sm:grid-cols-2">
          <Field2 label="Title" className="sm:col-span-2">
            <input
              value={local.title}
              onChange={(e) => setLocal({ ...local, title: e.target.value })}
              className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-[0.92rem] focus:border-navy focus:outline-none"
            />
          </Field2>
          <Field2 label="Summary">
            <input
              value={local.summary}
              onChange={(e) => setLocal({ ...local, summary: e.target.value })}
              className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-[0.92rem] focus:border-navy focus:outline-none"
            />
          </Field2>
          <Field2 label="Category">
            <input
              value={local.category}
              onChange={(e) => setLocal({ ...local, category: e.target.value })}
              className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-[0.92rem] focus:border-navy focus:outline-none"
            />
          </Field2>
          <Field2 label="Body" className="sm:col-span-2">
            <textarea
              rows={8}
              value={local.body}
              onChange={(e) => setLocal({ ...local, body: e.target.value })}
              className="w-full resize-y rounded-lg border border-mist bg-white px-3 py-2 text-[0.92rem] leading-relaxed focus:border-navy focus:outline-none"
            />
          </Field2>
          <label className="flex items-center gap-2 text-[0.85rem] text-charcoal/75">
            <input
              type="checkbox"
              checked={local.published}
              onChange={(e) => setLocal({ ...local, published: e.target.checked })}
              className="h-4 w-4 rounded border-mist"
            />
            Published (visible to users)
          </label>
        </div>
      }
    />
  );
}

function Field2({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block font-display text-[0.72rem] font-bold tracking-[0.08em] text-charcoal/65 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
