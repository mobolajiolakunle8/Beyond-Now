import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AdminBtn,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  ImagePicker,
  ListEditor,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  TextArea,
  TextInput,
  Toggle,
  useImg,
} from "@/admin/ui";
import { uid, type ResourceTrackContent, type SiteContent, type StoryContent } from "@/lib/content";
import { relativeTime } from "@/lib/media";
import { useStore } from "@/lib/store";
import {
  reviewStorySubmission,
  subscribeAllStorySubmissions,
  type StorySubmission,
} from "@/lib/storySubmissions";
import { cn } from "@/utils/cn";

const ACCENTS: { value: StoryContent["accent"]; label: string; swatch: string }[] = [
  { value: "sun", label: "Sunrise Yellow", swatch: "bg-sun" },
  { value: "teal", label: "Growth Teal", swatch: "bg-teal" },
  { value: "navy", label: "Deep Navy", swatch: "bg-navy" },
];

function newStory(): StoryContent {
  return {
    id: uid(),
    category: "Story",
    title: "",
    who: "",
    teaser: "",
    body: [""],
    lesson: "",
    accent: "sun",
    image: "",
    imageAlt: "",
    link: "",
    status: "draft",
    updatedAt: new Date().toISOString(),
  };
}

/* ============================== STORIES ============================== */

export function StoriesAdmin({ toolbar }: { toolbar?: ReactNode }) {
  const { content, updateContent, notify, account } = useStore();
  const img = useImg();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<StoryContent | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<StorySubmission[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<StorySubmission | null>(null);

  const stories = content.stories;
  const q = query.trim().toLowerCase();

  useEffect(
    () =>
      subscribeAllStorySubmissions(
        setSubmissions,
        setSubmissionError,
      ),
    [],
  );

  const visible = useMemo(
    () =>
      stories.filter((s) => {
        const matchesQuery =
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.teaser.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.who.toLowerCase().includes(q);
        const matchesFilter = filter === "all" || s.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [stories, q, filter],
  );

  const write = (next: StoryContent[]) => updateContent((c) => ({ ...c, stories: next }) as SiteContent);

  const save = (story: StoryContent) => {
    if (!story.title.trim()) return notify("error", "A story needs a title.");
    if (!story.teaser.trim()) return notify("error", "A story needs a short teaser.");
    const stamped = { ...story, updatedAt: new Date().toISOString() };
    const exists = stories.some((s) => s.id === story.id);
    write(exists ? stories.map((s) => (s.id === story.id ? stamped : s)) : [stamped, ...stories]);
    setEditing(null);
    notify("success", exists ? "Story saved and live." : "Story created and live.");
  };

  const toggleStatus = (story: StoryContent) => {
    const status = story.status === "published" ? "draft" : "published";
    write(
      stories.map((s) => (s.id === story.id ? { ...s, status, updatedAt: new Date().toISOString() } : s)),
    );
    notify("info", status === "published" ? "Story is now visible on the website." : "Story hidden from the website.");
  };

  const remove = (id: string) => {
    write(stories.filter((s) => s.id !== id));
    setConfirmId(null);
    notify("info", "Story deleted.");
  };

  const publishSubmission = async (submission: StorySubmission, adminNote: string) => {
    const now = new Date().toISOString();
    const visibleAuthor = submission.identity === "anonymous" ? "Shared anonymously" : submission.authorName;
    const story: StoryContent = {
      id: uid(),
      category: submission.category || "Member story",
      title: submission.title,
      who: visibleAuthor,
      teaser: submission.story.slice(0, 180) + (submission.story.length > 180 ? "…" : ""),
      body: [submission.story],
      lesson: "Shared with permission from the Beyond Now community.",
      accent: "teal",
      image: "/images/story-placeholder.jpg",
      imageAlt: "Beyond Now community story",
      link: "",
      status: "published",
      updatedAt: now,
    };
    updateContent((c) => ({ ...c, stories: [story, ...c.stories] }));
    try {
      await reviewStorySubmission(submission, {
        status: "published",
        adminNote: adminNote || "Your story was reviewed and shared with care. Thank you for helping someone else feel less alone.",
        reviewedBy: account?.uid || "admin",
      });
      notify("success", "Story published to registered members and the author was notified.");
      setReviewing(null);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "The story was published, but the review status could not be saved.");
    }
  };

  const updateSubmission = async (submission: StorySubmission, status: "reviewing" | "declined", adminNote: string) => {
    try {
      await reviewStorySubmission(submission, {
        status,
        adminNote,
        reviewedBy: account?.uid || "admin",
      });
      notify("success", status === "reviewing" ? "Submission marked as in review." : "Submission declined and the author was notified.");
      setReviewing(null);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not update submission.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Stories"
        description="Create, edit, show or hide the comics, scenarios and letters in the Stories section. Changes go live instantly."
      >
        {toolbar}
        <AdminBtn variant="primary" onClick={() => setEditing(newStory())}>
          + New story
        </AdminBtn>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search stories…" />
        <div className="flex gap-1 rounded-lg border border-mist bg-white p-1">
          {(["all", "published", "draft"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 font-display text-[0.78rem] font-semibold capitalize transition-colors",
                filter === key ? "bg-navy text-white" : "text-charcoal/60 hover:text-navy",
              )}
            >
              {key}
              {key !== "all" && (
                <span className="ml-1.5 opacity-60">{stories.filter((s) => s.status === key).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="✎"
          title={stories.length ? "No stories match" : "No stories yet"}
          body={
            stories.length
              ? "Adjust your search or filter to see more."
              : "Publish real-life-inspired scenarios, comics and letters to help young people feel less alone."
          }
          action={
            <AdminBtn variant="primary" size="sm" onClick={() => setEditing(newStory())}>
              + New story
            </AdminBtn>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((story) => (
            <li
              key={story.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-mist bg-white shadow-[0_1px_2px_rgba(11,45,91,0.05)]"
            >
              {img(story.image) ? (
                <img src={img(story.image)} alt="" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-mist/50 text-[0.8rem] text-charcoal/40">
                  No image
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[0.68rem] font-bold tracking-[0.14em] text-teal-ink uppercase">
                    {story.category}
                  </span>
                  <StatusBadge status={story.status} />
                </div>
                <h4 className="mt-2 font-display text-[1rem] leading-snug font-bold text-navy">
                  {story.title || "Untitled story"}
                </h4>
                <p className="mt-1.5 line-clamp-2 text-[0.82rem] text-charcoal/60">{story.teaser}</p>
                <p className="mt-3 text-[0.72rem] text-charcoal/45">Updated {relativeTime(story.updatedAt)}</p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-mist pt-3">
                  <AdminBtn size="sm" variant="outline" onClick={() => setEditing({ ...story })}>
                    Edit
                  </AdminBtn>
                  <AdminBtn
                    size="sm"
                    variant={story.status === "published" ? "ghost" : "teal"}
                    onClick={() => toggleStatus(story)}
                  >
                    {story.status === "published" ? "Unpublish" : "Publish"}
                  </AdminBtn>
                  <AdminBtn size="sm" variant="ghost" className="ml-auto text-red-600" onClick={() => setConfirmId(story.id)}>
                    Delete
                  </AdminBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 rounded-2xl border border-mist bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-[1.05rem] font-bold text-navy">Member story submissions</h3>
            <p className="mt-1 text-[0.82rem] text-charcoal/60">
              Private submissions from registered members. Review, add a note, then share a safeguarding-checked version.
            </p>
          </div>
          <span className="rounded-full bg-bone px-3 py-1 font-display text-[0.72rem] font-bold text-charcoal/65">
            {submissions.filter((s) => s.status === "submitted").length} awaiting review
          </span>
        </div>

        {submissionError && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] text-red-700">
            {submissionError}
          </p>
        )}

        {submissions.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-mist bg-bone/40 p-5 text-center text-[0.85rem] text-charcoal/60">
            No member stories have been submitted yet.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-mist">
            {submissions.slice(0, 20).map((submission) => (
              <li key={`${submission.userId}-${submission.id}`} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-[0.95rem] font-bold text-navy">{submission.title}</p>
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 font-display text-[0.64rem] font-bold tracking-[0.08em] uppercase",
                      submission.status === "published" ? "bg-teal/15 text-teal-ink" : submission.status === "declined" ? "bg-red-100 text-red-700" : "bg-sun/20 text-[#8a6500]",
                    )}>
                      {submission.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.78rem] text-charcoal/55">
                    {submission.category} · {submission.identity === "anonymous" ? "Anonymous" : submission.authorName} · {relativeTime(submission.submittedAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-[0.85rem] leading-relaxed text-charcoal/70">{submission.story}</p>
                </div>
                <AdminBtn size="sm" variant="outline" onClick={() => setReviewing(submission)}>
                  Review
                </AdminBtn>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <StoryEditorModal key={editing.id} story={editing} onClose={() => setEditing(null)} onSave={save} />
      )}

      {reviewing && (
        <SubmissionReviewModal
          submission={reviewing}
          onClose={() => setReviewing(null)}
          onReview={updateSubmission}
          onPublish={publishSubmission}
        />
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete this story?"
        body="This removes it from the live website immediately."
        confirmLabel="Delete story"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId && remove(confirmId)}
      />
    </div>
  );
}

function StoryEditorModal({
  story,
  onClose,
  onSave,
}: {
  story: StoryContent | null;
  onClose: () => void;
  onSave: (s: StoryContent) => void;
}) {
  const [local, setLocal] = useState<StoryContent | null>(story);
  const [touched, setTouched] = useState(false);

  // Re-seed when a different story is opened.
  if (story && (!local || local.id !== story.id)) setLocal(story);
  if (!story || !local) return null;

  const patch = (p: Partial<StoryContent>) => setLocal({ ...local, ...p });

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={story.title ? `Edit: ${story.title}` : "New story"}
      footer={
        <>
          <AdminBtn variant="outline" onClick={onClose}>
            Cancel
          </AdminBtn>
          <AdminBtn
            variant="primary"
            onClick={() => {
              setTouched(true);
              onSave(local);
            }}
          >
            Save story
          </AdminBtn>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" error={touched && !local.title.trim() ? "Title is required" : undefined}>
          <TextInput value={local.title} onChange={(v) => patch({ title: v })} invalid={touched && !local.title.trim()} />
        </Field>
        <Field label="Category" hint="Comic, Scenario, Letter…">
          <TextInput value={local.category} onChange={(v) => patch({ category: v })} />
        </Field>
        <Field label="Who it's about" hint="e.g. Amara, 17 — SS3">
          <TextInput value={local.who} onChange={(v) => patch({ who: v })} />
        </Field>
        <Field label="Optional link" hint="Full URL, opens in a new tab">
          <TextInput value={local.link} onChange={(v) => patch({ link: v })} placeholder="https://" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Teaser" error={touched && !local.teaser.trim() ? "Teaser is required" : undefined}>
            <TextArea rows={2} value={local.teaser} onChange={(v) => patch({ teaser: v })} invalid={touched && !local.teaser.trim()} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Story paragraphs">
            <ListEditor multiline values={local.body} onChange={(body) => patch({ body })} addLabel="Add paragraph" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="The takeaway">
            <TextArea rows={2} value={local.lesson} onChange={(v) => patch({ lesson: v })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <ImagePicker
            label="Story image"
            dimensions="1600 × 900 px · landscape 16:9"
            aspect="aspect-video"
            uploadOptions={{ profile: "image" }}
            value={local.image}
            onChange={(image) => patch({ image })}
          />
        </div>
        <Field label="Image alt text">
          <TextInput value={local.imageAlt} onChange={(v) => patch({ imageAlt: v })} />
        </Field>
        <Field label="Accent colour">
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => patch({ accent: a.value })}
                title={a.label}
                aria-label={a.label}
                aria-pressed={local.accent === a.value}
                className={cn(
                  "h-10 flex-1 rounded-lg border-2 transition-all",
                  a.swatch,
                  local.accent === a.value ? "border-navy ring-2 ring-navy/20" : "border-transparent opacity-60",
                )}
              />
            ))}
          </div>
        </Field>
        <div className="sm:col-span-2 rounded-xl border border-mist bg-bone p-4">
          <Toggle
            checked={local.status === "published"}
            onChange={(v) => patch({ status: v ? "published" : "draft" })}
            label={local.status === "published" ? "Visible on the website" : "Hidden from the website"}
          />
          <p className="mt-2 text-[0.78rem] text-charcoal/55">
            Changes go live as soon as you save.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function SubmissionReviewModal({
  submission,
  onClose,
  onReview,
  onPublish,
}: {
  submission: StorySubmission;
  onClose: () => void;
  onReview: (submission: StorySubmission, status: "reviewing" | "declined", note: string) => Promise<void>;
  onPublish: (submission: StorySubmission, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(submission.adminNote || "");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Review: ${submission.title}`}
      footer={
        <>
          <AdminBtn variant="outline" onClick={onClose} disabled={busy}>Close</AdminBtn>
          <AdminBtn variant="ghost" className="text-[#8a6500]" disabled={busy} onClick={() => void run(() => onReview(submission, "reviewing", note))}>
            Mark in review
          </AdminBtn>
          <AdminBtn variant="danger" disabled={busy} onClick={() => void run(() => onReview(submission, "declined", note || "Thank you for sharing. We could not publish this version, but your voice matters."))}>
            Decline
          </AdminBtn>
          <AdminBtn variant="teal" disabled={busy} onClick={() => void run(() => onPublish(submission, note))}>
            {busy ? "Saving…" : "Publish to stories"}
          </AdminBtn>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-charcoal/60">
          <span className="rounded-full bg-bone px-2.5 py-1 font-display font-semibold text-navy">{submission.category}</span>
          <span>{submission.identity === "anonymous" ? "Will be credited anonymously" : `Will be credited to ${submission.authorName}`}</span>
          <span>Submitted {relativeTime(submission.submittedAt)}</span>
        </div>

        <article className="rounded-2xl border border-mist bg-bone/40 p-5">
          <h3 className="font-display text-lg font-bold text-navy">{submission.title}</h3>
          <p className="mt-3 whitespace-pre-wrap text-[0.92rem] leading-relaxed text-charcoal/80">{submission.story}</p>
        </article>

        <Field label="Private note to the member" hint="Sent as an in-app notification">
          <TextArea rows={4} value={note} onChange={setNote} placeholder="Thank them, explain any edit, or let them know what happens next." />
        </Field>

        <p className="rounded-xl border border-sun/30 bg-sun/10 p-4 text-[0.8rem] leading-relaxed text-navy-deep/80">
          Publishing creates a member-only story immediately. Confirm the submission does not identify the author or anyone else, and that it is appropriate for the Beyond Now audience.
        </p>
      </div>
    </Modal>
  );
}

/* ============================= RESOURCES ============================= */

export function ResourcesAdmin({ toolbar }: { toolbar?: ReactNode }) {
  const { content, updateContent, notify } = useStore();
  const [query, setQuery] = useState("");
  const [openTrack, setOpenTrack] = useState<string | null>(content.resources[0]?.id ?? null);
  const [confirm, setConfirm] = useState<{ kind: "track" | "item"; trackId: string; itemId?: string } | null>(null);

  const tracks = content.resources;
  const q = query.trim().toLowerCase();

  const write = (next: ResourceTrackContent[]) =>
    updateContent((c) => ({ ...c, resources: next }) as SiteContent);

  const patchTrack = (id: string, patch: Partial<ResourceTrackContent>) =>
    write(tracks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)));

  const visible = tracks.filter(
    (t) =>
      !q ||
      t.label.toLowerCase().includes(q) ||
      t.intro.toLowerCase().includes(q) ||
      t.items.some((i) => i.title.toLowerCase().includes(q)),
  );

  const addTrack = () => {
    const track: ResourceTrackContent = {
      id: uid(),
      label: "New resource pack",
      audience: "Audience",
      intro: "",
      status: "draft",
      updatedAt: new Date().toISOString(),
      items: [],
    };
    write([...tracks, track]);
    setOpenTrack(track.id);
    notify("success", "Resource pack created.");
  };

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Manage the practical guidance packs and the individual resource cards inside each one."
      >
        {toolbar}
        <AdminBtn variant="primary" onClick={addTrack}>
          + New pack
        </AdminBtn>
      </PageHeader>

      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search packs and resources…" />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="📘"
          title={tracks.length ? "No packs match" : "No resource packs yet"}
          body={
            tracks.length
              ? "Try a different search term."
              : "Create a pack for young people, parents or schools and fill it with practical tools."
          }
          action={
            <AdminBtn variant="primary" size="sm" onClick={addTrack}>
              + New pack
            </AdminBtn>
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((track) => {
            const expanded = openTrack === track.id;
            return (
              <Card key={track.id} className="p-0">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setOpenTrack(expanded ? null : track.id)}
                    aria-expanded={expanded}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className={cn("text-charcoal/40 transition-transform", expanded && "rotate-180")}>▾</span>
                    <span>
                      <span className="block font-display text-[1rem] font-bold text-navy">{track.label}</span>
                      <span className="block text-[0.78rem] text-charcoal/55">
                        {track.audience} · {track.items.length} resource{track.items.length === 1 ? "" : "s"} ·
                        updated {relativeTime(track.updatedAt)}
                      </span>
                    </span>
                  </button>
                  <StatusBadge status={track.status} />
                  <AdminBtn
                    size="sm"
                    variant={track.status === "published" ? "ghost" : "teal"}
                    onClick={() =>
                      patchTrack(track.id, { status: track.status === "published" ? "draft" : "published" })
                    }
                  >
                    {track.status === "published" ? "Unpublish" : "Publish"}
                  </AdminBtn>
                  <AdminBtn
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => setConfirm({ kind: "track", trackId: track.id })}
                  >
                    Delete
                  </AdminBtn>
                </div>

                {expanded && (
                  <div className="border-t border-mist bg-bone/40 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Pack name">
                        <TextInput value={track.label} onChange={(v) => patchTrack(track.id, { label: v })} />
                      </Field>
                      <Field label="Audience line">
                        <TextInput value={track.audience} onChange={(v) => patchTrack(track.id, { audience: v })} />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Intro">
                          <TextArea rows={2} value={track.intro} onChange={(v) => patchTrack(track.id, { intro: v })} />
                        </Field>
                      </div>
                    </div>

                    <h4 className="mt-6 mb-2 font-display text-[0.75rem] font-bold tracking-[0.08em] text-charcoal/60 uppercase">
                      Resource cards
                    </h4>

                    {track.items.length === 0 ? (
                      <EmptyState
                        icon="＋"
                        title="No resources in this pack"
                        body="Add the individual tools, guides and checklists that make up this pack."
                        action={
                          <AdminBtn
                            size="sm"
                            variant="primary"
                            onClick={() =>
                              patchTrack(track.id, {
                                items: [...track.items, { id: uid(), title: "", detail: "", link: "", status: "published" }],
                              })
                            }
                          >
                            + Add resource
                          </AdminBtn>
                        }
                      />
                    ) : (
                      <ul className="space-y-2">
                        {track.items.map((item, i) => (
                          <li key={item.id} className="rounded-xl border border-mist bg-white p-3">
                            <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                              <Field label={`Title ${i + 1}`}>
                                <TextInput
                                  value={item.title}
                                  onChange={(v) =>
                                    patchTrack(track.id, {
                                      items: track.items.map((x) => (x.id === item.id ? { ...x, title: v } : x)),
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Detail">
                                <TextInput
                                  value={item.detail}
                                  onChange={(v) =>
                                    patchTrack(track.id, {
                                      items: track.items.map((x) => (x.id === item.id ? { ...x, detail: v } : x)),
                                    })
                                  }
                                />
                              </Field>
                              <div className="flex items-center gap-2 pb-1">
                                <Toggle
                                  checked={item.status === "published"}
                                  label=""
                                  onChange={(v) =>
                                    patchTrack(track.id, {
                                      items: track.items.map((x) =>
                                        x.id === item.id ? { ...x, status: v ? "published" : "draft" } : x,
                                      ),
                                    })
                                  }
                                />
                                <AdminBtn
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => setConfirm({ kind: "item", trackId: track.id, itemId: item.id })}
                                >
                                  ✕
                                </AdminBtn>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {track.items.length > 0 && (
                      <div className="mt-3">
                        <AdminBtn
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            patchTrack(track.id, {
                              items: [...track.items, { id: uid(), title: "", detail: "", link: "", status: "published" }],
                            })
                          }
                        >
                          + Add resource
                        </AdminBtn>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "track" ? "Delete this resource pack?" : "Delete this resource?"}
        body="This removes it from the live website immediately."
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "track") {
            write(tracks.filter((t) => t.id !== confirm.trackId));
            notify("info", "Resource pack deleted.");
          } else {
            const track = tracks.find((t) => t.id === confirm.trackId);
            if (track) patchTrack(track.id, { items: track.items.filter((i) => i.id !== confirm.itemId) });
            notify("info", "Resource deleted.");
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
