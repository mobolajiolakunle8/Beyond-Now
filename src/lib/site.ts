/**
 * Default (seed) copy for the public website. Everything here is editable in
 * the admin dashboard; these values only apply until the first cloud save.
 */

export const WHATSAPP_NUMBER = "2348065653384";

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "What We Do", href: "#pillars" },
  { label: "Stories", href: "#stories" },
  { label: "Contact", href: "#contact" },
] as const;

export const IMAGES = {
  heroMain:
    "https://images.pexels.com/photos/20679915/pexels-photo-20679915.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=1750",
  about:
    "https://images.pexels.com/photos/8419636/pexels-photo-8419636.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=1500",
  storyResult:
    "https://images.pexels.com/photos/5905480/pexels-photo-5905480.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800",
  storyBoundary:
    "https://images.pexels.com/photos/7395447/pexels-photo-7395447.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800",
  storyComic:
    "https://images.pexels.com/photos/17528002/pexels-photo-17528002.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800",
} as const;

export const PILLARS = [
  {
    id: "relationships",
    index: "01",
    title: "Beyond Relationships",
    line: "Friendship, crushes, peer pressure and boundaries — without shame.",
    body: "Young people are learning how to belong while also learning how to say no. We create honest language for loyalty, rejection, dating, pressure and respect, so that a difficult friendship season becomes a lesson instead of a wound.",
    prompts: [
      "How do I handle a friend who keeps crossing my boundaries?",
      "What does a healthy relationship actually look like at my age?",
      "How do I say no without losing people?",
    ],
  },
  {
    id: "emotions",
    index: "02",
    title: "Beyond Emotions",
    line: "Naming what you feel is the first act of strength.",
    body: "Anger, anxiety, sadness, shame and hope all show up uninvited. We teach emotional literacy and simple regulation tools, and we normalise asking for help — because a feeling that can be named can be managed.",
    prompts: [
      "Why do I feel so much all at once?",
      "What do I do when anxiety shows up before an exam?",
      "Who is safe to talk to when I am not okay?",
    ],
  },
  {
    id: "academics",
    index: "03",
    title: "Beyond Academics",
    line: "A grade is information about a week — not a verdict on a life.",
    body: "Pressure, comparison and one bad result can rewrite how a young person sees themselves. We help students build study systems, recover from failure, handle family expectations and separate performance from worth.",
    prompts: [
      "I failed a subject I used to be good at. What now?",
      "How do I study when I feel too tired to start?",
      "What if my results disappoint the people I love?",
    ],
  },
  {
    id: "choices",
    index: "04",
    title: "Beyond Choices",
    line: "Identity, values and decisions that outlast the moment.",
    body: "Course selection, career pressure, faith, body image, online identity and the fear of choosing wrong. We offer frameworks — not instructions — so a young person can make a decision they can still stand behind in five years.",
    prompts: [
      "How do I choose a path when everyone expects something different?",
      "What if I make the wrong choice?",
      "Who am I when nobody is watching?",
    ],
  },
] as const;

export const METHOD = [
  {
    id: "pause",
    title: "Pause",
    kicker: "Stop the spiral",
    body: "Nothing good is decided in a panic. Create a small gap between what happened and what you do next — a breath, a walk, a night's sleep, a message to someone safe.",
  },
  {
    id: "understand",
    title: "Understand",
    kicker: "Get the full picture",
    body: "Every situation has facts, feelings and fears — and they are not the same thing. Separate what is true, what is imagined and what is borrowed from other people's opinions.",
  },
  {
    id: "choose",
    title: "Choose",
    kicker: "Decide on your values",
    body: "A good choice is not the one that avoids all discomfort; it is the one that agrees with who you are trying to become. Pick the option you would still respect in a year.",
  },
  {
    id: "move",
    title: "Move",
    kicker: "Take the next small step",
    body: "Momentum beats perfection. One conversation, one apology, one application, one ask for help. Then review, adjust and keep walking — because today is not the whole story.",
  },
] as const;

export const STORIES = [
  {
    id: "tunde",
    category: "Scenario",
    title: "The Result That Rearranged Everything",
    who: "Tunde, 16 — SS2",
    teaser: "One physics score turned a confident boy into someone who avoided his friends for three weeks.",
    body: [
      "The result sheet went up on a Friday. By Monday, Tunde had decided he was not intelligent — he had simply stopped trying, because trying and failing in public felt worse than failing quietly.",
      "In a Beyond Now session he was asked one question: is this a verdict, or is this a data point? He wrote down what actually happened — three missed topics, a family crisis in the same month, no study plan — and discovered the story was bigger, and more fixable, than \"I am dull\".",
    ],
    lesson: "A result describes a method, not a mind. Change the method and the next result changes with it.",
    accent: "sun",
    image: IMAGES.storyResult,
    imageAlt: "A teacher pointing at a student's exercise book during a lesson",
  },
  {
    id: "amara",
    category: "Story",
    title: "Saying No To Someone You Love",
    who: "Amara, 17 — SS3",
    teaser: "Her best friend asked for something that felt wrong. Losing the friendship felt worse. Or so she thought.",
    body: [
      "The request came with a threat attached: if you tell, we are done. Amara spent two weeks being compliant and exhausted, performing a friendship that had stopped being safe.",
      "We worked through the difference between loyalty and silence. She practised the sentence until it stopped shaking: \"I care about you, and I am not going to do this.\" The friendship changed shape. She did not disappear.",
    ],
    lesson: "Boundaries do not end real relationships; they reveal which ones were conditional.",
    accent: "teal",
    image: IMAGES.storyBoundary,
    imageAlt: "A group of teenagers in school uniforms sitting together in conversation",
  },
  {
    id: "chidi",
    category: "Comic",
    title: "The Boy Who Stopped Talking",
    who: "Chidi, 15 — JSS3",
    teaser: "A six-panel comic about a boy who said \"I'm fine\" for 40 straight days — and the day he didn't.",
    body: [
      "Panels 1–3: the joke in class, the laugh, the walk home alone. Panel 4: the same hallway, drawn smaller each day. Panel 5: a teacher asks a second question. Panel 6: two sentences, finally spoken out loud.",
      "We use the comic in classrooms because it gives boys a script that does not require them to perform vulnerability before an audience. It has opened more conversations than any lecture we have run.",
    ],
    lesson: "\"I'm fine\" is often a full sentence hiding a paragraph. One honest question can open the door.",
    accent: "navy",
    image: IMAGES.storyComic,
    imageAlt: "Teenage boys standing side by side outdoors in vibrant traditional clothing",
  },
] as const;

export const RESOURCE_TRACKS = [
  {
    id: "young-people",
    label: "For Young People",
    audience: "Ages 13–21",
    intro: "Short, practical tools you can use the same day — no jargon, no preaching, no judgement.",
    items: [
      { title: "The 24-Hour Rule", detail: "A one-page guide to delaying irreversible decisions when emotions are loud." },
      { title: "Feelings Vocabulary Sheet", detail: "40 words for what you feel, so \"I don't know\" becomes something workable." },
      { title: "Study Recovery Plan", detail: "A 14-day reset after a bad result: triage, rebuild, review, repeat." },
      { title: "Boundary Scripts", detail: "Six honest sentences for saying no to friends, pressure and situations." },
      { title: "Who Can I Tell?", detail: "How to test whether an adult is safe before you open up to them." },
    ],
  },
  {
    id: "parents",
    label: "For Parents",
    audience: "Guardians & caregivers",
    intro: "How to stay connected to a teenager who is pulling away — and what to stop doing immediately.",
    items: [
      { title: "The Listening Session", detail: "A 20-minute structure for hearing your child without correcting them mid-sentence." },
      { title: "Results Without Shame", detail: "Language that holds standards high while protecting a young person's self-worth." },
      { title: "Warning Signs Checklist", detail: "What is typical teenage behaviour, and what deserves a closer look." },
      { title: "Starting The Hard Conversation", detail: "Scripts for relationships, body image, faith and identity questions." },
    ],
  },
  {
    id: "schools",
    label: "For Schools & Partners",
    audience: "Teachers, counsellors, NGOs",
    intro: "Programmes and facilitator tools that plug into assemblies, form periods and counselling units.",
    items: [
      { title: "Classroom Story Kits", detail: "Comics and scenarios with facilitated discussion guides for 30–45 minute sessions." },
      { title: "Counsellor's Prompt Bank", detail: "Open questions mapped to relationships, emotions, academics and choices." },
      { title: "Teacher Awareness Briefing", detail: "A 60-minute session on recognising distress and referring safely." },
      { title: "Peer Support Framework", detail: "How to build a supervised, safeguarded peer-mentoring circle in your school." },
    ],
  },
] as const;
