import { IMAGES, METHOD, NAV_LINKS, PILLARS, RESOURCE_TRACKS, STORIES, WHATSAPP_NUMBER } from "@/lib/site";

export type Status = "published" | "draft";

export type MediaItem = {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
  /** Bytes before the browser resized/re-encoded the asset. */
  originalSize?: number;
  /** Original pixel dimensions before resize. */
  originalWidth?: number;
  originalHeight?: number;
  type: string;
  uploadedAt: string;
};

export type NavLink = { id: string; label: string; href: string };

export type PillarContent = {
  id: string;
  index: string;
  title: string;
  line: string;
  body: string;
  prompts: string[];
};

export type MethodContent = {
  id: string;
  title: string;
  kicker: string;
  body: string;
};

export type StoryContent = {
  id: string;
  category: string;
  title: string;
  who: string;
  teaser: string;
  body: string[];
  lesson: string;
  accent: "sun" | "teal" | "navy";
  image: string;
  imageAlt: string;
  link: string;
  status: Status;
  updatedAt: string;
};

export type ResourceItem = {
  id: string;
  title: string;
  detail: string;
  link: string;
  status: Status;
};

export type ResourceTrackContent = {
  id: string;
  label: string;
  audience: string;
  intro: string;
  status: Status;
  updatedAt: string;
  items: ResourceItem[];
};

export type MemberLibrary = {
  /** Controls whether members can browse resource packs in My Account. */
  enabled: boolean;
  title: string;
  description: string;
  comingSoonTitle: string;
  comingSoonBody: string;
};

export type SiteContent = {
  brand: {
    logoUrl: string;
    wordmarkPrimary: string;
    wordmarkAccent: string;
    tagline: string;
    coreMessage: string;
  };
  nav: { links: NavLink[]; ctaLabel: string };
  hero: {
    badge: string;
    headingLead: string;
    headingAccent: string;
    body: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust: string[];
    quote: string;
    quoteLabel: string;
    imageMain: string;
    imageMainAlt: string;
  };
  about: {
    eyebrow: string;
    headingLead: string;
    headingAccent: string;
    paragraphs: string[];
    founderEyebrow: string;
    founderQuote: string;
    founderName: string;
    imageMain: string;
    imageMainAlt: string;
  };
  pillarsSection: { eyebrow: string; headingLead: string; headingAccent: string; headingTail: string; lead: string };
  pillars: PillarContent[];
  methodSection: { eyebrow: string; headingLead: string; headingAccent: string; lead: string };
  method: MethodContent[];
  storiesSection: { eyebrow: string; headingLead: string; headingAccent: string; lead: string; shareLabel: string };
  stories: StoryContent[];
  library: MemberLibrary;
  resources: ResourceTrackContent[];
  finalCta: {
    eyebrow: string;
    heading: string;
    body: string;
    whatsappLabel: string;
    emailLabel: string;
    accountTitle: string;
    accountBody: string;
    accountCta: string;
    safetyNote: string;
  };
  footer: { blurb: string; quote: string; safeguarding: string; coreMessage: string; tagline: string };
  settings: {
    email: string;
    whatsapp: string;
    whatsappDisplay: string;
    seoTitle: string;
    seoDescription: string;
    favicon: string;
    socials: { id: string; label: string; url: string }[];
  };
};

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const SEED_DATE = "2024-01-01T00:00:00.000Z";

export const DEFAULT_CONTENT: SiteContent = {
  brand: {
    logoUrl: "",
    wordmarkPrimary: "BEYOND",
    wordmarkAccent: "NOW",
    tagline: "Understand · Choose · Move Forward",
    coreMessage: "Today Is Not The Whole Story.",
  },
  nav: {
    links: NAV_LINKS.map((l) => ({ id: l.href, label: l.label, href: l.href })),
    ctaLabel: "Talk to Beyond Now",
  },
  hero: {
    badge: "Guidance for teenagers & young people",
    headingLead: "There Is Always Something",
    headingAccent: "Beyond Now",
    body: "A friendship that broke. A result that disappointed everyone. A feeling you cannot name. Whatever today is carrying, it is a chapter — not the ending. We help you pause, understand what is really happening, and take the next honest step.",
    ctaPrimary: "Talk to Us on WhatsApp",
    ctaSecondary: "Create a free account",
    trust: ["Free to talk", "Confidential", "No judgement"],
    quote: "You don't have to figure growing up out alone.",
    quoteLabel: "Our promise to you",
    imageMain: IMAGES.heroMain,
    imageMainAlt: "A group of African teenagers laughing together outdoors in the late afternoon sun",
  },
  about: {
    eyebrow: "Who we are",
    headingLead: "We exist because growing up is",
    headingAccent: "rarely explained",
    paragraphs: [
      "Beyond Now is a youth-focused advocacy, guidance and storytelling platform. We sit with teenagers in the seasons adults tend to rush past — the friendship that turned cold, the result that changed how a family looks at a child, the identity question nobody wants to answer honestly.",
      "We are not here to lecture. We give young people language, frameworks and a safe person to think out loud with — so a hard week becomes information instead of identity.",
    ],
    founderEyebrow: "The founder's vision",
    founderQuote:
      "I have watched too many brilliant young people make permanent conclusions about themselves from temporary situations. Beyond Now exists to stand in that gap — to be the calm, honest voice in the room until they can hear their own again.",
    founderName: "Founder, Beyond Now",
    imageMain: IMAGES.about,
    imageMainAlt: "A mentor listening attentively to a student in a school corridor",
  },
  pillarsSection: {
    eyebrow: "What we do",
    headingLead: "Four pillars. One",
    headingAccent: "honest",
    headingTail: "conversation at a time.",
    lead: "The four areas where young people tell us they feel most stuck. Open any pillar to see the questions we sit with.",
  },
  pillars: PILLARS.map((p) => ({ ...p, prompts: [...p.prompts] })),
  methodSection: {
    eyebrow: "The Beyond Now Method",
    headingLead: "Pause. Understand. Choose.",
    headingAccent: "Move.",
    lead: "Four steps we return to in every conversation, classroom session and mentoring circle. Simple enough for a fifteen-year-old at midnight. Strong enough to hold a hard season.",
  },
  method: METHOD.map((m) => ({ ...m })),
  storiesSection: {
    eyebrow: "Beyond Now stories",
    headingLead: "Real situations, told",
    headingAccent: "honestly",
    lead: "Comics, scenarios and letters drawn from real life — names changed, dignity intact.",
    shareLabel: "Share your story",
  },
  stories: STORIES.map((s) => ({
    ...s,
    body: [...s.body],
    link: "",
    status: "published" as Status,
    updatedAt: SEED_DATE,
  })),
  library: {
    enabled: false,
    title: "The Beyond Now Library",
    description: "Practical guidance packs you can save, return to, and use in your own time.",
    comingSoonTitle: "The Library is coming soon.",
    comingSoonBody: "Our practical guidance packs are being prepared with care. Check back soon — your saved resources and library access will appear here.",
  },
  resources: RESOURCE_TRACKS.map((t) => ({
    id: t.id,
    label: t.label,
    audience: t.audience,
    intro: t.intro,
    status: "published" as Status,
    updatedAt: SEED_DATE,
    items: t.items.map((item, i) => ({
      id: `${t.id}-${i}`,
      title: item.title,
      detail: item.detail,
      link: "",
      status: "published" as Status,
    })),
  })),
  finalCta: {
    eyebrow: "The next step",
    heading: "What happens next matters.",
    body: "Not next term. Not when things get worse. Next — as in today. Tell us what is going on and a real person will help you think it through.",
    whatsappLabel: "Open 24/7 · WhatsApp chat, no appointment needed",
    emailLabel: "For schools, partnerships and press enquiries",
    accountTitle: "Inside your free account",
    accountBody: "Private messaging with the team, practical guidance packs you can save, and your own progress — synced across every device.",
    accountCta: "Create a free account",
    safetyNote:
      "If you are in immediate danger, please contact emergency services or tell a trusted adult right now. Beyond Now offers guidance and support, and we will always help you reach the right professional care.",
  },
  footer: {
    blurb:
      "A youth-focused advocacy, guidance and storytelling platform helping teenagers navigate relationships, emotions, academics, identity and life choices.",
    quote: "You don't have to figure growing up out alone.",
    safeguarding:
      "Beyond Now offers guidance, mentoring and storytelling — not medical, psychiatric or legal advice. Conversations are private; we only involve a parent, school or professional when a young person asks us to or when someone is at risk of serious harm.",
    coreMessage: "Today Is Not The Whole Story.",
    tagline: "Understand. Choose. Move Forward.",
  },
  settings: {
    email: "beyondnow.ng@gmail.com",
    whatsapp: WHATSAPP_NUMBER,
    whatsappDisplay: "+234 806 565 3384",
    seoTitle: "BEYOND NOW — Today Is Not The Whole Story",
    seoDescription:
      "BEYOND NOW is a youth-focused advocacy, guidance and storytelling platform helping teenagers navigate relationships, emotions, academics, identity and life choices. Understand. Choose. Move Forward.",
    favicon: "",
    socials: [
      { id: "s1", label: "Instagram", url: "https://instagram.com/beyondnow.ng" },
      { id: "s2", label: "X (Twitter)", url: "https://x.com/beyondnow_ng" },
      { id: "s3", label: "LinkedIn", url: "https://linkedin.com/company/beyondnow" },
      { id: "s4", label: "TikTok", url: "https://tiktok.com/@beyondnow.ng" },
    ],
  },
};

export function cloneContent<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Overlays a saved document onto the defaults. Keys that no longer exist in
 * the schema are dropped; keys added since the save fall back to defaults.
 */
export function mergeContent(base: SiteContent, saved: unknown): SiteContent {
  if (!saved || typeof saved !== "object") return cloneContent(base);
  const merge = (a: unknown, b: unknown): unknown => {
    if (Array.isArray(a)) return Array.isArray(b) ? b : a;
    if (a && typeof a === "object") {
      if (!b || typeof b !== "object" || Array.isArray(b)) return a;
      const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
      for (const key of Object.keys(a as Record<string, unknown>)) {
        out[key] = merge((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
      }
      return out;
    }
    return b === undefined ? a : b;
  };
  return merge(cloneContent(base), saved) as SiteContent;
}

/* ---------- path helpers used by the schema-driven editor ---------- */

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = cloneContent(obj) as Record<string, unknown>;
  let cursor: Record<string, unknown> = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    cursor[key] = Array.isArray(cursor[key])
      ? [...(cursor[key] as unknown[])]
      : { ...(cursor[key] as Record<string, unknown>) };
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone as T;
}
