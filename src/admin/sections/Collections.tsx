import { useMemo, useState, type ReactNode } from "react";
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
import { cn } from "@/utils/cn";

const ACCENTS: { value: StoryContent["accent"]; label: string; swatch: string }[] = [
  { value: "sun", label: "Sunrise Yellow", swatch: "bg-sun" },
  { value: "teal", label: "Growth Teal", swatch: "bg-teal" },
  { value: "navy", label: "Deep Navy", swatch: "bg-navy" },
];

function newStory(): StoryContent {
  return {
    id: uid(),
    format: "Story",
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
  const { draft, updateDraft, notify } = useStore();
  const img = useImg();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<StoryContent | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const stories = draft.stories;
  const q = query.trim().toLowerCase();

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

  const write = (next: StoryContent[]) => updateDraft((d) => ({ ...d, stories: next }) as SiteContent);

  const save = (story: StoryContent) => {
    if (!story.title.trim()) return notify("error", "A story needs a title.");
    if (!story.teaser.trim()) return notify("error", "A story needs a short teaser.");
    const stamped = { ...story, updatedAt: new Date().toISOString() };
    const exists = stories.some((s) => s.id === story.id);
    write(exists ? stories.map((s) => (s.id === story.id ? stamped : s)) : [stamped, ...stories]);
    setEditing(null);
    notify("success", exists ? "Story updated in your draft." : "Story created in your draft.");
  };

  const toggleStatus = (story: StoryContent) => {
    const status = story.status === "published" ? "draft" : "published";
    write(
      stories.map((s) => (s.id === story.id ? { ...s, status, updatedAt: new Date().toISOString() } : s)),
    );
    notify("info", status === "published" ? "Story marked as published." : "Story unpublished.");
  };

  const remove = (id: string) => {
    write(stories.filter((s) => s.id !== id));
    setConfirmId(null);
    notify("info", "Story deleted from your draft.");
  };

  return (
    <div>
      <PageHeader
        title="Stories"
        description="Create, edit, publish and remove the comics, scenarios and letters shown in the Beyond Now Stories section."
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
                    {story.category || story.format}
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

      {editing && (
        <StoryEditorModal key={editing.id} story={editing} onClose={() => setEditing(null)} onSave={save} />
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete this story?"
        body="It will be removed from your draft. The public website only changes once you publish."
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
          <TextInput value={local.category} onChange={(v) => patch({ category: v, format: v })} />
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
          <ImagePicker label="Story image" value={local.image} onChange={(image) => patch({ image })} />
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
            Published stories still require a site-wide Publish before visitors see them.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ============================= RESOURCES ============================= */

export function ResourcesAdmin({ toolbar }: { toolbar?: ReactNode }) {
  const { draft, updateDraft, notify } = useStore();
  const [query, setQuery] = useState("");
  const [openTrack, setOpenTrack] = useState<string | null>(draft.resources[0]?.id ?? null);
  const [confirm, setConfirm] = useState<{ kind: "track" | "item"; trackId: string; itemId?: string } | null>(null);

  const tracks = draft.resources;
  const q = query.trim().toLowerCase();

  const write = (next: ResourceTrackContent[]) =>
    updateDraft((d) => ({ ...d, resources: next }) as SiteContent);

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
    notify("success", "Resource pack created in your draft.");
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
        body="It will be removed from your draft. The public website only changes once you publish."
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "track") {
            write(tracks.filter((t) => t.id !== confirm.trackId));
            notify("info", "Resource pack deleted from your draft.");
          } else {
            const track = tracks.find((t) => t.id === confirm.trackId);
            if (track) patchTrack(track.id, { items: track.items.filter((i) => i.id !== confirm.itemId) });
            notify("info", "Resource deleted from your draft.");
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
