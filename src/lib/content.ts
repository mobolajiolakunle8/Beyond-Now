import {
  IMAGES,
  METHOD,
  NAV_LINKS,
  PILLARS,
  RESOURCE_TRACKS,
  STORIES,
  WHATSAPP_NUMBER,
} from "@/lib/site";

export type Status = "published" | "draft";

export type MediaItem = {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
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
  image: string;
  alt: string;
  prompts: string[];
};

export type MethodContent = {
  id: string;
  title: string;
  kicker: string;
  body: string;
  actions: string[];
};

export type StoryContent = {
  id: string;
  format: string;
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
    quote: string;
    quoteLabel: string;
    statValue: string;
    statLabel: string;
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
    ctaLabel: string;
    imageMain: string;
    imageMainAlt: string;
  };
  pillarsSection: { eyebrow: string; headingLead: string; headingAccent: string; headingTail: string; lead: string };
  pillars: PillarContent[];
  methodSection: { eyebrow: string; headingLead: string; headingAccent: string; lead: string; quote: string };
  method: MethodContent[];
  storiesSection: {
    eyebrow: string;
    headingLead: string;
    headingAccent: string;
    lead: string;
    formats: { id: string; label: string; detail: string }[];
    pullQuote: string;
    shareLabel: string;
  };
  stories: StoryContent[];
  resourcesSection: {
    eyebrow: string;
    headingLead: string;
    headingAccent: string;
    headingTail: string;
    lead: string;
    startHere: string[];
  };
  resources: ResourceTrackContent[];
  impact: {
    eyebrow: string;
    headingLead: string;
    headingAccent: string;
    headingTail: string;
    lead: string;
    image: string;
    vision: { id: string; title: string; body: string }[];
    quote: string;
    quoteLabel: string;
  };
  finalCta: {
    eyebrow: string;
    heading: string;
    body: string;
    whatsappLabel: string;
    emailLabel: string;
    safetyNote: string;
    formTitle: string;
    formIntro: string;
    roles: string[];
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

const NOW = "2024-01-01T00:00:00.000Z";

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
    badge: "Youth advocacy · Guidance · Storytelling",
    headingLead: "There Is Always Something",
    headingAccent: "Beyond Now",
    body: "Whatever today is carrying — a friendship that broke, a result that disappointed everyone, a feeling you cannot name, a choice everyone has an opinion about — it is a chapter, not the ending. Beyond Now helps teenagers and young people pause, understand what is really happening, and take the next honest step forward.",
    ctaPrimary: "Explore Beyond Now",
    ctaSecondary: "Talk to Us on WhatsApp",
    quote: "You don't have to figure growing up out alone.",
    quoteLabel: "Our promise to you",
    statValue: "4 + 1",
    statLabel: "Pillars + Method",
    imageMain: IMAGES.heroMain,
    imageMainAlt: "A group of African teenagers laughing together outdoors in the late afternoon sun",
  },
  about: {
    eyebrow: "Who we are",
    headingLead: "We exist because growing up is",
    headingAccent: "rarely explained",
    paragraphs: [
      "Beyond Now is a youth-focused advocacy, guidance and storytelling platform. We sit with teenagers in the seasons adults tend to rush past — the friendship that turned cold, the result that changed how a family looks at a child, the feeling with no name, the identity question nobody wants to answer honestly.",
      "We are not here to lecture young people into better behaviour. We are here to give them language, frameworks and a safe person to think out loud with — so that a hard week becomes information instead of identity, and a bad decision becomes a lesson instead of a label.",
      "Why we exist: because most of the decisions that shape a life are made between the ages of 13 and 21, usually under pressure, usually alone, and usually without a map. We are building the map — and the company to walk it with.",
    ],
    founderEyebrow: "The founder's vision",
    founderQuote:
      "I have watched too many brilliant young people make permanent conclusions about themselves from temporary situations. Beyond Now exists to stand in that gap — to be the calm, honest voice in the room until they can hear their own again.",
    founderName: "Founder, Beyond Now",
    ctaLabel: "See how a session works",
    imageMain: IMAGES.about,
    imageMainAlt: "A mentor listening attentively to a student in a school corridor",
  },
  pillarsSection: {
    eyebrow: "What we do",
    headingLead: "Four pillars. One",
    headingAccent: "honest",
    headingTail: "conversation at a time.",
    lead: "Everything we do sits inside four areas where young people tell us they feel most stuck. Each pillar blends storytelling, practical tools and a safe space to ask the questions they cannot ask at home.",
  },
  pillars: PILLARS.map((p) => ({
    id: p.id,
    index: p.index,
    title: p.title,
    line: p.line,
    body: p.body,
    image: p.image,
    alt: p.alt,
    prompts: [...p.prompts],
  })),
  methodSection: {
    eyebrow: "The Beyond Now Method",
    headingLead: "Pause. Understand. Choose.",
    headingAccent: "Move.",
    lead: "Four steps we return to again and again — in a WhatsApp conversation, a classroom session or a mentoring circle. Simple enough for a fifteen-year-old at midnight. Strong enough to hold a hard season.",
    quote: "You are not required to solve your whole life today. Only the next step.",
  },
  method: METHOD.map((m) => ({
    id: m.key,
    title: m.title,
    kicker: m.kicker,
    body: m.body,
    actions: [...m.actions],
  })),
  storiesSection: {
    eyebrow: "Beyond Now stories",
    headingLead: "Real situations, told",
    headingAccent: "honestly",
    lead: "We turn the situations young people actually face into comics, scenarios and letters — names changed, dignity intact, endings unfinished on purpose. Because a story is the fastest way to feel less alone in one.",
    formats: [
      { id: "fm1", label: "Comics", detail: "Visual stories for hard conversations" },
      { id: "fm2", label: "Scenarios", detail: "Real-life-inspired classroom dilemmas" },
      { id: "fm3", label: "Letters", detail: "Straight talk for one reader at a time" },
    ],
    pullQuote: "Your story might be the sentence somebody else needs to survive this week.",
    shareLabel: "Share your story",
  },
  stories: STORIES.map((s) => ({
    id: s.id,
    format: s.format,
    category: s.format,
    title: s.title,
    who: s.who,
    teaser: s.teaser,
    body: [...s.body],
    lesson: s.lesson,
    accent: s.accent,
    image: s.image,
    imageAlt: s.imageAlt,
    link: "",
    status: "published" as Status,
    updatedAt: NOW,
  })),
  resourcesSection: {
    eyebrow: "Practical guidance",
    headingLead: "Not inspiration.",
    headingAccent: "Instructions",
    headingTail: "you can use today.",
    lead: "Short, honest tools built with educators and counsellors — the kind of thing you can read in five minutes and use the same afternoon. Pick the track that fits where you are standing.",
    startHere: [
      "Name what is actually happening — in one sentence.",
      "Pick one tool from the pack that fits it.",
      "Message us if you get stuck. That is what we are for.",
    ],
  },
  resources: RESOURCE_TRACKS.map((t) => ({
    id: t.id,
    label: t.label,
    audience: t.audience,
    intro: t.intro,
    status: "published" as Status,
    updatedAt: NOW,
    items: t.items.map((item, i) => ({
      id: `${t.id}-${i}`,
      title: item.title,
      detail: item.detail,
      link: "",
      status: "published" as Status,
    })),
  })),
  impact: {
    eyebrow: "Impact & vision",
    headingLead: "We are not building a moment of motivation. We are building a",
    headingAccent: "generation",
    headingTail: "that knows what to do next.",
    lead: "Beyond Now exists for the long haul: to make guidance ordinary, to make asking for help unembarrassing, and to make sure no young person has to reconstruct their life alone.",
    image: IMAGES.horizon,
    vision: [
      {
        id: "v1",
        title: "Guidance",
        body: "Every young person we reach should leave a conversation with one clear, doable next step — not a lecture to memorise.",
      },
      {
        id: "v2",
        title: "Learning",
        body: "We keep building material with teachers, counsellors and young people themselves, so the guidance stays honest and usable.",
      },
      {
        id: "v3",
        title: "Support",
        body: "An open, safe line that answers — because the moment someone decides to speak up should never be the moment nobody replies.",
      },
      {
        id: "v4",
        title: "Long-term growth",
        body: "We measure success in years, not workshops: young people who can self-regulate, choose well and recover from hard seasons.",
      },
    ],
    quote:
      "We are not trying to convince young people that life is easy. We are trying to convince them that it is longer than this week — and that they have a say in how the rest of it goes.",
    quoteLabel: "The Beyond Now charter",
  },
  finalCta: {
    eyebrow: "The next step",
    heading: "What happens next matters.",
    body: "Not next term. Not when things get worse. Next — as in today, this hour, this message. Tell us what is going on and a real person will help you think it through. No forms to qualify, no shame to carry in.",
    whatsappLabel: "Open 24/7 · WhatsApp chat, no appointment needed",
    emailLabel: "For schools, partnerships and press enquiries",
    safetyNote:
      "If you are in immediate danger, please contact emergency services or tell a trusted adult right now. Beyond Now offers guidance and support, and we will always help you reach the right professional care.",
    formTitle: "Talk to Beyond Now",
    formIntro:
      "Fill this in and we'll open a private WhatsApp chat with your message ready to send. You can edit it before it goes.",
    roles: [
      "I'm a young person",
      "I'm a parent or guardian",
      "I'm a teacher or counsellor",
      "I'm a school or organisation",
    ],
  },
  footer: {
    blurb:
      "Beyond Now is a youth-focused advocacy, guidance and storytelling platform helping teenagers navigate relationships, emotions, academics, identity and life choices.",
    quote: "You don't have to figure growing up out alone.",
    safeguarding:
      "Beyond Now offers guidance, mentoring and storytelling — not medical, psychiatric or legal advice. Conversations are treated as private, and we only involve a parent, school or professional when a young person asks us to or when someone is at risk of serious harm. If you or someone else is in immediate danger, please contact your local emergency services or a trusted adult straight away.",
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

/** Fills in any keys added after a visitor's copy was saved. */
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
