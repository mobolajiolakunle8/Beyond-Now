import { useMemo, useState, type ReactNode } from "react";
import {
  AdminBtn,
  Card,
  EmptyState,
  Field,
  ImagePicker,
  ListEditor,
  PageHeader,
  SearchInput,
  TextArea,
  TextInput,
} from "@/admin/ui";
import { getPath, setPath, uid, type SiteContent } from "@/lib/content";
import type { ImageProcessOptions } from "@/lib/media";
import { useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

type FieldDef = {
  path: string;
  label: string;
  type: "text" | "textarea" | "image" | "list" | "listLong";
  hint?: string;
  dimensions?: string;
  uploadOptions?: ImageProcessOptions;
  rows?: number;
  half?: boolean;
};

type ArrayDef = {
  path: string;
  title: string;
  description: string;
  singular: string;
  labelKey: string;
  fields: FieldDef[];
  factory: () => Record<string, unknown>;
  lockCount?: boolean;
};

type Group = {
  id: string;
  title: string;
  description: string;
  fields?: FieldDef[];
  arrays?: ArrayDef[];
};

const GROUPS: Group[] = [
  {
    id: "brand",
    title: "Brand & Navigation",
    description: "Wordmark, tagline and the main menu links shown in the header and footer.",
    fields: [
      { path: "brand.wordmarkPrimary", label: "Wordmark — first word", type: "text", half: true },
      { path: "brand.wordmarkAccent", label: "Wordmark — accent word", type: "text", half: true },
      { path: "brand.tagline", label: "Logo tagline", type: "text" },
      { path: "brand.coreMessage", label: "Core message", type: "text" },
      { path: "nav.ctaLabel", label: "Header button label", type: "text" },
    ],
    arrays: [
      {
        path: "nav.links",
        title: "Menu links",
        description: "Anchor links must start with # and match a section id on the page.",
        singular: "link",
        labelKey: "label",
        fields: [
          { path: "label", label: "Label", type: "text", half: true },
          { path: "href", label: "Anchor", type: "text", half: true, hint: "e.g. #about" },
        ],
        factory: () => ({ id: uid(), label: "New link", href: "#home" }),
      },
    ],
  },
  {
    id: "hero",
    title: "Hero Section",
    description: "The first screen visitors see — headline, supporting message and both call-to-action buttons.",
    fields: [
      { path: "hero.badge", label: "Badge text", type: "text" },
      { path: "hero.headingLead", label: "Headline — first part", type: "text", half: true },
      { path: "hero.headingAccent", label: "Headline — highlighted words", type: "text", half: true },
      { path: "hero.body", label: "Supporting message", type: "textarea", rows: 4 },
      { path: "hero.ctaPrimary", label: "WhatsApp button label", type: "text", half: true },
      { path: "hero.ctaSecondary", label: "Account button label", type: "text", half: true },
      { path: "hero.trust", label: "Trust line items", type: "list" },
      { path: "hero.quote", label: "Promise quote", type: "text" },
      { path: "hero.quoteLabel", label: "Promise label", type: "text" },
      { path: "hero.imageMain", label: "Hero image", type: "image", dimensions: "Recommended 1400 × 1750 px · portrait 4:5" },
      { path: "hero.imageMainAlt", label: "Image alt text", type: "text" },
    ],
  },
  {
    id: "about",
    title: "About & Founder",
    description: "Who we are and the founder's vision quote.",
    fields: [
      { path: "about.eyebrow", label: "Eyebrow", type: "text" },
      { path: "about.headingLead", label: "Heading — first part", type: "text", half: true },
      { path: "about.headingAccent", label: "Heading — highlighted words", type: "text", half: true },
      { path: "about.paragraphs", label: "Body paragraphs", type: "listLong" },
      { path: "about.founderEyebrow", label: "Founder block eyebrow", type: "text", half: true },
      { path: "about.founderName", label: "Founder name / title", type: "text", half: true },
      { path: "about.founderQuote", label: "Founder's vision quote", type: "textarea", rows: 4 },
      { path: "about.imageMain", label: "Photo", type: "image", dimensions: "Recommended 1200 × 1500 px · portrait 4:5" },
      { path: "about.imageMainAlt", label: "Photo alt text", type: "text" },
    ],
  },
  {
    id: "pillars",
    title: "Four Pillars",
    description: "Beyond Relationships, Emotions, Academics and Choices.",
    fields: [
      { path: "pillarsSection.eyebrow", label: "Eyebrow", type: "text" },
      { path: "pillarsSection.headingLead", label: "Heading — first part", type: "text" },
      { path: "pillarsSection.headingAccent", label: "Heading — highlighted word", type: "text", half: true },
      { path: "pillarsSection.headingTail", label: "Heading — end", type: "text", half: true },
      { path: "pillarsSection.lead", label: "Intro paragraph", type: "textarea", rows: 3 },
    ],
    arrays: [
      {
        path: "pillars",
        title: "Pillars",
        description: "Each pillar is an expandable card with its questions and a WhatsApp prompt.",
        singular: "pillar",
        labelKey: "title",
        fields: [
          { path: "index", label: "Number", type: "text", half: true },
          { path: "title", label: "Title", type: "text", half: true },
          { path: "line", label: "One-line summary", type: "text" },
          { path: "body", label: "Description", type: "textarea", rows: 4 },
          { path: "prompts", label: "Questions we sit with", type: "list" },
        ],
        factory: () => ({ id: uid(), index: "05", title: "Beyond …", line: "", body: "", prompts: [] }),
      },
    ],
  },
  {
    id: "method",
    title: "Beyond Now Method",
    description: "The Pause → Understand → Choose → Move framework.",
    fields: [
      { path: "methodSection.eyebrow", label: "Eyebrow", type: "text" },
      { path: "methodSection.headingLead", label: "Heading — first part", type: "text", half: true },
      { path: "methodSection.headingAccent", label: "Heading — highlighted word", type: "text", half: true },
      { path: "methodSection.lead", label: "Intro paragraph", type: "textarea", rows: 3 },
    ],
    arrays: [
      {
        path: "method",
        title: "Method steps",
        description: "Shown in order as four numbered steps.",
        singular: "step",
        labelKey: "title",
        fields: [
          { path: "title", label: "Step name", type: "text", half: true },
          { path: "kicker", label: "Short kicker", type: "text", half: true },
          { path: "body", label: "Description", type: "textarea", rows: 3 },
        ],
        factory: () => ({ id: uid(), title: "New step", kicker: "", body: "" }),
      },
    ],
  },
  {
    id: "storiesSection",
    title: "Stories Section",
    description: "Section headings. Manage the story cards themselves under Stories.",
    fields: [
      { path: "storiesSection.eyebrow", label: "Eyebrow", type: "text" },
      { path: "storiesSection.headingLead", label: "Heading — first part", type: "text", half: true },
      { path: "storiesSection.headingAccent", label: "Heading — highlighted word", type: "text", half: true },
      { path: "storiesSection.lead", label: "Intro paragraph", type: "textarea", rows: 2 },
      { path: "storiesSection.shareLabel", label: "Share link label", type: "text" },
    ],
  },
  {
    id: "finalCta",
    title: "Final Call To Action",
    description: "The yellow 'What happens next matters' band.",
    fields: [
      { path: "finalCta.eyebrow", label: "Eyebrow", type: "text" },
      { path: "finalCta.heading", label: "Heading", type: "text" },
      { path: "finalCta.body", label: "Body", type: "textarea", rows: 3 },
      { path: "finalCta.whatsappLabel", label: "WhatsApp caption", type: "text" },
      { path: "finalCta.emailLabel", label: "Email caption", type: "text" },
      { path: "finalCta.accountTitle", label: "Account box title", type: "text", half: true },
      { path: "finalCta.accountCta", label: "Account button label", type: "text", half: true },
      { path: "finalCta.accountBody", label: "Account box body", type: "textarea", rows: 2 },
      { path: "finalCta.safetyNote", label: "Safety note", type: "textarea", rows: 3 },
    ],
  },
  {
    id: "footer",
    title: "Footer",
    description: "Blurb, quote and the safeguarding statement.",
    fields: [
      { path: "footer.blurb", label: "Footer blurb", type: "textarea", rows: 3 },
      { path: "footer.quote", label: "Footer quote", type: "text" },
      { path: "footer.safeguarding", label: "Safeguarding note", type: "textarea", rows: 5 },
      { path: "footer.coreMessage", label: "Core message", type: "text", half: true },
      { path: "footer.tagline", label: "Tagline", type: "text", half: true },
    ],
  },
];

function FieldRenderer({
  def,
  content,
  set,
}: {
  def: FieldDef;
  content: SiteContent;
  set: (path: string, value: unknown) => void;
}) {
  const raw = getPath(content, def.path);

  if (def.type === "image") {
    return (
      <div className="sm:col-span-2">
        <ImagePicker
          label={def.label}
          hint={def.hint}
          dimensions={def.dimensions}
          uploadOptions={def.uploadOptions}
          value={typeof raw === "string" ? raw : ""}
          onChange={(url) => set(def.path, url)}
        />
      </div>
    );
  }

  if (def.type === "list" || def.type === "listLong") {
    return (
      <div className="sm:col-span-2">
        <Field label={def.label} hint={def.hint}>
          <ListEditor
            values={Array.isArray(raw) ? (raw as string[]) : []}
            multiline={def.type === "listLong"}
            onChange={(next) => set(def.path, next)}
          />
        </Field>
      </div>
    );
  }

  const value = typeof raw === "string" ? raw : "";
  return (
    <div className={def.half ? "" : "sm:col-span-2"}>
      <Field label={def.label} hint={def.hint} error={!value.trim() ? "This field is empty" : undefined}>
        {def.type === "textarea" ? (
          <TextArea value={value} rows={def.rows ?? 4} onChange={(v) => set(def.path, v)} invalid={!value.trim()} />
        ) : (
          <TextInput value={value} onChange={(v) => set(def.path, v)} invalid={!value.trim()} />
        )}
      </Field>
    </div>
  );
}

function ArrayEditor({
  def,
  content,
  set,
}: {
  def: ArrayDef;
  content: SiteContent;
  set: (path: string, value: unknown) => void;
}) {
  const items = (getPath(content, def.path) as Record<string, unknown>[]) ?? [];
  const [open, setOpen] = useState<number | null>(0);

  const update = (next: Record<string, unknown>[]) => set(def.path, next);

  return (
    <Card title={def.title} description={def.description} className="mt-4 bg-bone/50">
      {items.length === 0 ? (
        <EmptyState
          title={`No ${def.singular}s yet`}
          body={`Add your first ${def.singular} to show it on the website.`}
          action={
            <AdminBtn variant="primary" size="sm" onClick={() => update([...items, def.factory()])}>
              + Add {def.singular}
            </AdminBtn>
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => {
            const expanded = open === i;
            return (
              <li key={String(item.id ?? i)} className="overflow-hidden rounded-xl border border-mist bg-white">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : i)}
                    aria-expanded={expanded}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="font-display text-[0.7rem] font-bold text-charcoal/35">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate font-display text-[0.88rem] font-bold text-navy">
                      {String(item[def.labelKey] ?? `Untitled ${def.singular}`) || `Untitled ${def.singular}`}
                    </span>
                    <span className={cn("ml-auto text-charcoal/40 transition-transform", expanded && "rotate-180")}>
                      ▾
                    </span>
                  </button>
                  <AdminBtn
                    size="sm"
                    variant="ghost"
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...items];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      update(next);
                    }}
                  >
                    ↑
                  </AdminBtn>
                  <AdminBtn
                    size="sm"
                    variant="ghost"
                    title="Move down"
                    disabled={i === items.length - 1}
                    onClick={() => {
                      const next = [...items];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      update(next);
                    }}
                  >
                    ↓
                  </AdminBtn>
                  <AdminBtn
                    size="sm"
                    variant="ghost"
                    title={`Delete ${def.singular}`}
                    onClick={() => {
                      if (window.confirm(`Delete this ${def.singular}? This change goes live immediately.`)) {
                        update(items.filter((_, idx) => idx !== i));
                        setOpen(null);
                      }
                    }}
                  >
                    ✕
                  </AdminBtn>
                </div>
                {expanded && (
                  <div className="grid gap-4 border-t border-mist bg-bone/40 p-4 sm:grid-cols-2">
                    {def.fields.map((f) => (
                      <FieldRenderer
                        key={f.path}
                        def={{ ...f, path: `${def.path}.${i}.${f.path}` }}
                        content={content}
                        set={set}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && (
        <div className="mt-3">
          <AdminBtn variant="outline" size="sm" onClick={() => update([...items, def.factory()])}>
            + Add {def.singular}
          </AdminBtn>
        </div>
      )}
    </Card>
  );
}

export function ContentEditor({ toolbar }: { toolbar?: ReactNode }) {
  const { content, updateContent } = useStore();
  const [activeId, setActiveId] = useState(GROUPS[0].id);
  const [query, setQuery] = useState("");

  const set = (path: string, value: unknown) => updateContent((c) => setPath(c, path, value));

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return GROUPS;
    return GROUPS.map((g) => {
      const groupHit = g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
      const fields = (g.fields ?? []).filter((f) => groupHit || f.label.toLowerCase().includes(q));
      const arrays = (g.arrays ?? []).filter((a) => groupHit || a.title.toLowerCase().includes(q));
      return { ...g, fields, arrays };
    }).filter((g) => (g.fields?.length ?? 0) > 0 || (g.arrays?.length ?? 0) > 0);
  }, [q]);

  const active = filtered.find((g) => g.id === activeId) ?? filtered[0];

  return (
    <div>
      <PageHeader
        title="Website Content"
        description="Edit every word and image on the public website. Changes are saved and published automatically."
      >
        {toolbar}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search sections and fields…" />
        {q && (
          <span className="text-[0.8rem] text-charcoal/55">
            {filtered.length} section{filtered.length === 1 ? "" : "s"} match “{query}”
          </span>
        )}
      </div>

      {!active ? (
        <EmptyState
          icon="🔍"
          title="No fields match your search"
          body="Try a different word, such as “hero”, “founder”, “footer” or “image”."
          action={
            <AdminBtn variant="outline" size="sm" onClick={() => setQuery("")}>
              Clear search
            </AdminBtn>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
          <nav aria-label="Content sections" className="lg:sticky lg:top-6 lg:self-start">
            <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {filtered.map((group) => (
                <li key={group.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setActiveId(group.id)}
                    className={cn(
                      "w-full rounded-lg px-3.5 py-2.5 text-left font-display text-[0.83rem] font-semibold whitespace-nowrap transition-colors lg:whitespace-normal",
                      group.id === active.id
                        ? "bg-navy text-white"
                        : "text-charcoal/65 hover:bg-mist/70 hover:text-navy",
                    )}
                  >
                    {group.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <Card title={active.title} description={active.description}>
              <div className="grid gap-4 sm:grid-cols-2">
                {(active.fields ?? []).map((f) => (
                  <FieldRenderer key={f.path} def={f} content={content} set={set} />
                ))}
              </div>
            </Card>
            {(active.arrays ?? []).map((a) => (
              <ArrayEditor key={a.path} def={a} content={content} set={set} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
