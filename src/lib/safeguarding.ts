/**
 * Safeguarding risk screening for the Beyond Now platform.
 *
 * IMPORTANT OPERATIONAL NOTE
 * =========================
 * This keyword screener is a FIRST-PASS triage aid only. It is not a clinical
 * or safeguarding assessment and must never be the sole basis for any decision
 * about a young person's safety. False negatives and false positives are both
 * possible. Every flagged conversation still requires review by a trained
 * safeguarding lead, and no automated system may substitute for that human
 * judgement or for statutory reporting duties.
 */

export type RiskLevel = "none" | "low" | "elevated" | "urgent";

export type RiskCategory =
  | "self-harm"
  | "abuse"
  | "violence"
  | "exploitation"
  | "immediate-danger";

export type RiskAssessment = {
  level: RiskLevel;
  categories: RiskCategory[];
  /** Terms that triggered the flag, for the safeguarding reviewer's context. */
  matched: string[];
};

type CategoryRule = { category: RiskCategory; terms: string[] };

/**
 * Deliberately conservative phrase list. Single high-risk words are avoided to
 * reduce false positives (for example "cut" or "hit" appear in ordinary speech).
 */
const RULES: CategoryRule[] = [
  {
    category: "self-harm",
    terms: [
      "kill myself",
      "end my life",
      "want to die",
      "wanna die",
      "suicidal",
      "suicide",
      "hurt myself",
      "harm myself",
      "cutting myself",
      "cut myself",
      "no reason to live",
      "better off without me",
      "take my own life",
    ],
  },
  {
    category: "abuse",
    terms: [
      "being abused",
      "he hits me",
      "she hits me",
      "they hit me",
      "beats me",
      "beaten by",
      "sexually abused",
      "molested",
      "raped",
      "touching me inappropriately",
      "forced me to",
      "not safe at home",
      "afraid of my",
      "scared of my dad",
      "scared of my mum",
      "scared of my mother",
      "scared of my father",
    ],
  },
  {
    category: "violence",
    terms: [
      "threaten to kill",
      "threatened to kill",
      "he has a knife",
      "she has a knife",
      "gun",
      "stab",
      "beat up",
      "going to hurt",
      "going to kill",
    ],
  },
  {
    category: "exploitation",
    terms: [
      "send nudes",
      "asking for pictures",
      "shared pictures of me",
      "leaked my",
      "blackmailing me",
      "threatening to share",
      "older man",
      "older woman",
      "grooming",
      "meeting someone i met online",
      "meet someone i met online",
    ],
  },
  {
    category: "immediate-danger",
    terms: [
      "right now",
      "tonight",
      "i have taken",
      "i took pills",
      "swallowed pills",
      "hanging myself",
      "on the bridge",
      "on the roof",
      "please help me now",
      "someone is in my house",
      "he is outside my house",
      "she is outside my house",
    ],
  },
];

const URGENT_CATEGORIES: RiskCategory[] = ["self-harm", "immediate-danger"];
const ELEVATED_CATEGORIES: RiskCategory[] = ["abuse", "violence", "exploitation"];

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Screens a message for safeguarding risk. Runs entirely client-side; nothing
 * about the result is transmitted anywhere by this function.
 */
export function assessRisk(text: string): RiskAssessment {
  const value = normalise(text);
  if (!value) return { level: "none", categories: [], matched: [] };

  const categories = new Set<RiskCategory>();
  const matched: string[] = [];

  for (const rule of RULES) {
    for (const term of rule.terms) {
      if (value.includes(term)) {
        categories.add(rule.category);
        matched.push(term);
      }
    }
  }

  const list = [...categories];
  let level: RiskLevel = "none";
  if (list.some((c) => URGENT_CATEGORIES.includes(c))) level = "urgent";
  else if (list.length > 0) level = "elevated";
  else if (list.some((c) => ELEVATED_CATEGORIES.includes(c))) level = "elevated";

  return { level, categories: list, matched };
}

/** Escalation copy shown to the member when a message is flagged urgent. */
export const URGENT_SUPPORT_COPY = {
  title: "Please reach out for immediate help",
  body:
    "What you shared sounds really serious, and you deserve support right now — not later. If you are in immediate danger, please contact emergency services or a trusted adult straight away.",
  lines: [
    "Emergency services (Nigeria): 112 or 199",
    "Lagos State Domestic & Sexual Violence Response Team: 0800 333 333",
    "Surgeon General mental health line: 0809 111 1122",
  ],
  footer:
    "Beyond Now volunteers and staff are not a 24-hour emergency service. A trained safeguarding lead will review your message, but please use the emergency contacts above if you need help right now.",
};

