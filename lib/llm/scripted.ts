import type { AgentRequest, AgentResponse, Archetype, ArchetypeId, Area, Lang, Ticket } from "@/lib/types";
import { ARCHETYPE_FLAVOR, companyName } from "@/lib/agents/flavor";
import {
  effectiveMode,
  failingHiddenRuleFns,
  fill,
  hiddenRuleFns,
  functionNames,
  hintFor,
  isApproved,
  normalizeForMatch,
  pick,
  resolveFocusFn,
  sanitizeName,
  truncate,
} from "@/lib/agents/util";

// Deterministic replies for every agent × mode × language. Used when no LLM key is set, when the
// providers fail, when the client is rate-limited, and when an LLM reply breaks a guardrail.

export interface ScriptedContext {
  ticket: Ticket;
  area: Area;
  archetype: Archetype;
}

type Pool = { en: readonly string[]; ar: readonly string[] };
type Vars = Record<string, string | number>;

function say(pool: Pool, lang: Lang, seed: string, vars: Vars): string {
  return fill(pick(pool[lang], seed), vars);
}

function commaName(req: AgentRequest): string {
  const name = sanitizeName(req.studentName);
  if (!name) return "";
  return req.lang === "ar" ? ` يا ${name}` : `, ${name}`;
}

function baseVars(req: AgentRequest, ctx: ScriptedContext): Vars {
  const { lang } = req;
  return {
    cn: commaName(req),
    area: ctx.area.name[lang],
    company: companyName(ctx.archetype, lang),
    me: ctx.archetype.stakeholder.name[lang],
    stakeholder: ctx.archetype.stakeholder.name[lang],
    key: ctx.ticket.key,
    title: ctx.ticket.title[lang],
  };
}

// ---------- intent detection (works on English or Arabic input in either UI language) ----------

const AR_PREFIXES = ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ل"];

function arabicTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of normalizeForMatch(text).split(/[^\p{L}\p{N}%]+/u)) {
    if (!raw) continue;
    out.add(raw);
    const prefix = AR_PREFIXES.find((p) => raw.startsWith(p) && raw.length - p.length >= 2);
    if (prefix) out.add(raw.slice(prefix.length));
  }
  return out;
}

function hasAnyToken(text: string, stems: readonly string[]): boolean {
  const tokens = arabicTokens(text);
  return stems.some((s) => tokens.has(normalizeForMatch(s)));
}

function hasAnyPhrase(text: string, phrases: readonly string[]): boolean {
  const hay = normalizeForMatch(text);
  return phrases.some((p) => {
    const needle = normalizeForMatch(p).trim();
    return needle.length > 0 && hay.includes(needle);
  });
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const AR_START = /^[؀-ۿ]/;
// Arabic attaches small words to the next one: و / ف ("and"), ب / ك / ل ("with", "like", "for"), س (future),
// and the article ال, which becomes لل after ل ("للحد"). A keyword may also carry a pronoun suffix ("إغلاقها").
// Text is already normalized (ة → ه), so "ه" covers both the suffix and a feminine ending.
const AR_SUFFIX = "(?:ه|ها|هم|هما|هن|ك|كم|كما|ي|نا|ني|ون|ين|ان|ات)?";
const NOT_WORD_BEFORE = "(?<![\\p{L}\\p{N}])";
const NOT_WORD_AFTER = "(?![\\p{L}\\p{N}])";
const keywordRes = new Map<string, RegExp | null>();

/**
 * A whole-word pattern for one ticket keyword: "break" doesn't match "breakfast", "close" doesn't match "closer".
 * English keywords may take a plural "s"/"es"; Arabic ones may take a clitic prefix and a pronoun suffix.
 */
function keywordRe(keyword: string): RegExp | null {
  const cached = keywordRes.get(keyword);
  if (cached !== undefined) return cached;
  const needle = normalizeForMatch(keyword).trim();
  let re: RegExp | null = null;
  if (needle) {
    let body: string;
    if (AR_START.test(needle)) {
      const rest = needle.startsWith("ال") ? needle.slice(2) : null;
      const prefix = rest !== null ? "[وف]?(?:[بك]?ال|لل)" : "[وف]?(?:[بكلس]|[بك]?ال|لل)?";
      body = prefix + escapeRe(rest ?? needle).replace(/\s+/g, "\\s+") + AR_SUFFIX;
    } else {
      body = escapeRe(needle).replace(/\s+/g, "\\s+") + (/[a-z]$/.test(needle) ? "(?:s|es)?" : "");
    }
    re = new RegExp(NOT_WORD_BEFORE + body + NOT_WORD_AFTER, "u");
  }
  keywordRes.set(keyword, re);
  return re;
}

/** True if any keyword appears in the text as a whole word (or whole phrase). */
export function hasAnyKeyword(text: string, keywords: readonly string[]): boolean {
  const hay = normalizeForMatch(text);
  return keywords.some((k) => keywordRe(k)?.test(hay) ?? false);
}

const REVEAL_EN =
  /\b(thresholds?|cut-?offs?|cut off|what counts|counts? as|when (do|does|should|would|will|must|can|can[’']?t|cannot|need to|have to|has to) (you|i|we|it|they|the crews?|crews?|(the )?workers|the site) (flag|close|stop|alert|warn|worry|shut|pull|call|be flagged)|when (can[’']?t|cannot|can not|shouldn[’']?t|mustn[’']?t|must not|should not) (you|i|we|they|the crews?|crews?|(the )?workers) work|when to (flag|close|stop|alert|warn|worry)|rules?|limits?|criteria|criterion|how (much|high|hot|long|hard) is too|too (much|high|hot|hard|long)|dangerous|unsafe)\b/i;
// The follow-up questions the hint ladder pushes students toward: "is that the only reason?", "anything else?",
// "any other condition?", "what about the time of day?", "when exactly?", "which days should be flagged?".
const REVEAL_FOLLOWUP_EN = new RegExp(
  "\\b(?:" +
  [
    "conditions?",
    "exceptions?",
    "only (thing|things|reason|reasons|factor|condition|rule|case|criteri(on|a)|trigger|sign|danger|time)",
    "(anything|something) (else|more|besides|apart from|other than)",
    "what else (matters|counts|should|do i|do we|makes|could|can|is there)",
    "is (that|this|it) (all|everything)",
    "other (reasons?|conditions?|rules?|factors?|cases?|criteria|triggers?|situations?|exceptions?|limits?|times|hours|days)",
    "other things? (that )?(matter|count|make|could|can|you)",
    "when exactly|exactly when|exactly (what|how much|how many|which)",
    "time of (the )?(day|year)",
    "(what|which|other|certain|specific) (times|hours)",
    "which (days?|roads?|readings?|hours|times|dates)",
    "flag(s|ged|ging)?",
    "compar(e|es|ed|ing|ison)",
    "(how|when) (do|does|can|could|would|will|should) (i|we|you|they) (know|tell|judge|decide|spot|recogni[sz]e)",
    "decide (when|which|if|whether)",
    "how (much|many|high|hot|heavy|long)\\b[^?.!]{0,40}\\b(ok|okay|fine|allowed|acceptable|normal|safe|too)",
    "(does|do|would|will|could|can) [^?.!]{0,40}\\bmatters?",
    "what (else )?matters",
    "what (worries|scares|concerns) you|worr(y|ies|ied|ying)",
    "numbers? (i|we) (should|need to|must|have to)",
    "(should|do|must|need to|have to) (i|we|you) (look|watch) (out )?for",
    "look(ing)? for in the (data|readings|numbers)",
    // "what would make you call / close / stop...", "at what point...", "when is a day considered bad?"
    "what (would|will|could|should|does|do) (make|get) you",
    "at what (point|level|number|amount|temperature|time)",
    "considered",
    "(not|isn[’']?t|aren[’']?t|no longer|never) safe|safe (to|enough)",
    "max|maximum|minimum|too many",
    "(always|ever|really) (bad|a problem|dangerous|unsafe|too much|ok|okay|fine|safe)",
    "(high|higher|big|bigger|large|larger|low|lower|huge) (numbers?|readings?|values?|amounts?)",
    "(becomes?|counts? as|turns? into|is it|is that|it[’']?s) (a |an )?(problem|issue|emergency)",
    "(alert|warn|notify) (you|me|us|them|the)",
    "(send|sends|sending|give|gives|raise|issue|trigger)( out)? (an |the |a )?(alerts?|warnings?|alarms?)",
  ]
    .map((p) => `(?:${p})`)
    .join("|") +
  ")\\b",
  "i",
);
const REVEAL_AR_STEMS = [
  "حد", "حدود", "قاعدة", "قواعد", "معيار", "معايير", "عتبة", "يعتبر", "تعتبر", "يحتسب", "خطر", "خطير", "خطيرة", "مسموح",
  // follow-ups: conditions, exceptions, "the only", flag / compare / decide, "exactly", worry
  "شرط", "شروط", "استثناء", "استثناءات", "وحيد", "وحيدة", "أحدد", "أحددها", "نحدد", "نحددها", "تحدد", "تحددها", "يحدد", "حدد",
  "أقارن", "نقارن", "تقارن", "يقارن", "مقارنة", "بالضبط", "تقرر", "أقرر", "نقرر", "يقلقك", "تقلق", "يقلقني", "يهم",
  // the future prefix س isn't stripped, so hint 1's "بماذا ستقارن كل يوم" needs its own forms
  "ستقارن", "سنقارن", "سأقارن", "ستحدد", "سنحدد", "سأحدد", "ستقرر", "سنقرر", "سأقرر", "تقلقك", "السيئ", "السيء", "السيئة",
  // maximum / minimum, "when do I warn you", alerts and alarms
  "أقصى", "أدنى", "أنبهك", "ننبهك", "تنبهني", "أنبه", "ننبه", "أحذرك", "نحذرك", "تحذرني", "تنبيه", "تنبيها", "تحذير", "إنذار",
];
const REVEAL_AR_PHRASES = [
  "كيف أعرف", "كيف نعرف", "كيف أحكم", "كيف تحكم", "كيف نحكم",
  "شيء آخر", "أشياء أخرى", "سبب آخر", "أسباب أخرى", "عامل آخر", "شروط أخرى", "قواعد أخرى",
  "هل هذا كل", "هذا كل شيء", "هذا فقط", "فقط هذا", "غير ذلك",
  "أي الأيام", "أي يوم", "أي الطرق", "أي طريق", "أي الساعات", "أي الأوقات", "أي القراءات",
  "وقت اليوم", "الوقت مهم", "هل الوقت", "التاريخ مهم", "هل التاريخ", "أوقات أخرى", "ساعات أخرى",
  "متى يجب", "متى يكون", "متى تكون", "متى يصبح", "متى تصبح", "متى تعتبر", "متى يعتبر", "متى أحدد", "متى نحدد",
  "متى تقلق", "متى توقف", "متى نوقف", "متى يتوقف", "متى أغلق", "متى نغلق", "متى تغلق", "متى يغلق",
  "ما الذي يجعل", "ماذا يجعل", "أكثر من اللازم", "كثير جدا",
  "أي ساعات", "أي أيام", "أي مقياس", "اليوم السيئ", "يوم سيء",
  "غير آمن", "دائما سيء", "دائما سيئ", "دائما خطر", "عند أي", "في أي لحظة", "إلى أي حد", "ما الذي يدفعك",
];

/** Each customer's own vocabulary for the part of the job their hidden rule is about. */
const ARCHETYPE_REVEAL: Record<ArchetypeId, { en: RegExp; ar: readonly string[] }> = {
  water: {
    en: /\b(over-?pump\w*|pump(s|ed|ing)? too (much|hard)|too much (water|pumping)|bad (pumping |pump |water |well )?(days?|nights?|weeks?)|(pump\w*|water|wells?|numbers?|readings?|amounts?|lit(er|re)s?) (is |are |was |gets? )?(always |ever |really )?(bad|wrong|worrying)|(call|warn|alert|ring|phone|tell|contact) (the |your )?(pump )?operators?|(turn|switch|shut)(s|ed|ing)? (it |them |the pumps? |the wells? )?(off|down)|previous (days?|week)|(last|past) (week|few days)|week before|days? before|spikes?|baseline|how much pumping|percent(age)?)\b/i,
    ar: [
      "يضخ كثيرا", "تضخ كثيرا", "ضخ كثير", "زائد", "الأسبوع الماضي", "الأسبوع السابق", "الأيام السابقة", "الأيام التي قبله", "يوم سيئ", "نسبة", "بالمئة",
      // "is a big number always bad?", "what is normal?", "when do you call the pump operator / switch the pump off?"
      "سيئ", "سيء", "طبيعي", "رقم كبير", "الرقم الكبير", "رقم عال", "الرقم العالي", "مشغل", "تتصل", "تطفئ", "أطفئ", "نطفئ", "إطفاء", "أوقف المضخة", "توقف المضخة",
    ],
  },
  floods: {
    en: /\b(shut\w*|clos(e|es|ed|ing|ure|ures)|re-?open\w*|stays? open|keep (it|them|the roads?) open|stay away|keep (people|cars|drivers|traffic) (out|away|off)|block(s|ed|ing)?|barriers?|how (heavy|deep|bad|strong)|heavy rain|(a lot|lots) of rain|rain(s|ed|ing)? (a lot|heavily|hard|really hard)|(one|a single|single|each|every|per) hour|(roads?|wadis?) (is |are |gets? |get )?(flood(ed|s|ing)?|under ?water)|build(s|ing)? up|storm (is )?(building|builds|growing)|getting (heavier|worse|wetter)|keeps? (raining|rising|climbing)|rain(fall)? (keeps? )?(climbs?|climbing|rises?|rising|increas\w*|builds?|building)|\d+(\.\d+)?\s?mm|millimet\w*|in a row|(many|several|a few|multiple) hours|hours? after hours?|rains? (a little|lightly|slowly|steadily))\b/i,
    ar: [
      "أغلق", "يغلق", "تغلق", "نغلق", "إغلاق", "أقفل", "تقفل", "نقفل", "إقفال", "يشتد", "تشتد", "يزداد", "يزيد", "استمر المطر", "يستمر المطر", "ملم", "متتالية", "مفتوحا",
      // "is one hour of rain enough?", "what if it rains a lot?", "when does the road flood?"
      "ساعة واحدة", "غزير", "مطر كثير", "أمطرت كثيرا", "تمطر كثيرا", "يغرق", "تغرق", "الغرق", "غرقت",
    ],
  },
  heat: {
    en: /\b(lunch\w*|noon|midday|summer|june|july|august|september|(which|what) months?|seasons?|seasonal|stop(s|ped|ping)?|stop (work|working)|(must|have to|has to|need to|needs to) stop|go (inside|indoors|in)|come (inside|in|indoors)|take (a |their |the )?breaks?|(take|have|get|need) (a )?rest|(to|they|workers|crews?|people|men|everyone|we) rest(s|ing)?|cool(ing)? (off|down)|shade|shelter|(send|bring|call|pull|move)(s|ing)? (the |my |your |all )?(workers|crews?|them|everyone|people|men|team)( back)? (in|inside|indoors|home|off)|(be|stay|go|stand|standing) (outside|outdoors|in the sun)|work(ing)? outside|outdoor work|(what|which) hours|how hot|hottest|too warm|heat ?stroke|humid\w*|feels?[- ]like|46)\b/i,
    ar: [
      "الظهر", "الظهيرة", "الغداء", "الصيف", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أي شهر", "الأشهر", "الشهور", "الموسم", "الساعات", "الأوقات", "يتوقف", "توقف", "يمنع العمل", "ممنوع", "الحرارة المحسوسة",
      // "when do the workers rest / go inside?", "is it too hot to work?", "does humidity matter?"
      "يرتاح", "راحة", "يدخل", "ندخل", "الداخل", "الظل", "لا يعمل", "لا يعملون", "حار جدا", "حر شديد", "شديد الحرارة", "رطوبة",
    ],
  },
};

/**
 * Everyday phrases that contain a rule word without asking about the rule: "since when" / "منذ متى" means "how long",
 * and "close to" / "close by" is about distance, not closing a road.
 */
function withoutInnocentPhrases(message: string): string {
  return message.replace(/\b(since when|close (to|by)|up close)\b/gi, " ").replace(/منذ\s+متى/g, " ");
}

/** A leading "hi" / "good afternoon" says nothing about the rule (and "afternoon" would otherwise look like a time question). */
function withoutGreeting(message: string): string {
  return message.replace(/^\s*(hi|hello|hey|hiya|yo|salam|salaam|assalamu alaikum|marhaba|ahlan|good (morning|afternoon|evening))\b[\s,!.]*/i, "");
}

/**
 * The student is asking about the rule: the ticket's own keywords, a generic "what counts / threshold" question,
 * a natural follow-up ("is that the only reason?", "what about the time of day?"), or the customer's own vocabulary.
 */
export function asksAboutRule(message: string, ticket: Ticket): boolean {
  const msg = withoutInnocentPhrases(withoutGreeting(message));
  if (!msg.trim()) return false;
  if (hasAnyKeyword(msg, ticket.hidden?.revealKeywords ?? [])) return true;
  if (REVEAL_EN.test(msg) || REVEAL_FOLLOWUP_EN.test(msg)) return true;
  if (hasAnyToken(msg, REVEAL_AR_STEMS) || hasAnyPhrase(msg, REVEAL_AR_PHRASES)) return true;
  const own = ARCHETYPE_REVEAL[ticket.id];
  return !!own && (own.en.test(msg) || hasAnyPhrase(msg, own.ar));
}

const GREETING_EN = /^\s*(hi|hello|hey|hiya|yo|salam|salaam|assalamu|marhaba|ahlan|good (morning|afternoon|evening))\b/i;
const GREETING_AR = ["السلام", "مرحبا", "مرحباً", "اهلا", "أهلاً", "هلا", "صباح", "مساء"];
function isGreeting(message: string): boolean {
  if (message.trim().length > 40) return false;
  return GREETING_EN.test(message) || GREETING_AR.some((g) => normalizeForMatch(message).trim().startsWith(normalizeForMatch(g)));
}

const THANKS_EN = /\b(thanks|thank you|thx|ty|shukran|cheers)\b/i;
function isThanks(message: string): boolean {
  return message.trim().length <= 60 && (THANKS_EN.test(message) || hasAnyPhrase(message, ["شكرا", "مشكور", "يعطيك العافية"]));
}

const CODE_EN = /\b(code|coding|python|function|functions|bug|tests?|variable|loop|error|def|return|csv|parse|program|script|syntax)\b/i;
function isCodeQuestion(message: string): boolean {
  return CODE_EN.test(message) || hasAnyToken(message, ["كود", "برمجة", "البرمجة", "دالة", "اختبار", "الاختبار", "خطأ", "متغير", "بايثون", "برنامج"]);
}

// Requests for the answer, not questions about the student's own work: "is my solution correct?" or
// "the test says the expected answer is 2" must not be refused.
const ANSWER_EN =
  /\b((give|tell|show|send|write|paste) me (the |your |a )?(answer|solution|code|full code|whole code|complete code|correct code|working code)|what('?s| is) the (answer|solution|correct code)|(can|could|will|would) you (just )?solve (it|this|them)|solve (it|this|them) for me|just tell me|write (it|this|that) for me|write (the|this|my|that) (\w+ )?(function|code) for me|write (the )?\w+_\w+(\(\))?( function)? for me|(the )?(complete|full|whole|entire|finished) (function|code|solution)|do it for me|the full code|the whole code|copy paste|paste the code|write the code|give me the code|tell me the code)\b/i;
const ANSWER_AR = [
  "اعطني الحل", "أعطني الحل", "عطني الحل", "قل لي الحل", "ما هو الحل", "اعطني الجواب", "أعطني الجواب",
  "أعطني الإجابة", "قل لي الجواب", "حل لي", "حلها لي", "حله لي", "حلها بدلا", "أعطني الكود", "اعطني الكود", "اكتب الكود",
  "اكتب لي الكود", "اكتبه لي", "اكتبها لي", "قل لي الكود", "الكود كامل", "الكود الكامل", "اكتب لي الدالة", "اكتب الدالة",
  "الدالة كاملة", "اكتب لي الحل", "اكتب الحل",
];
export function asksForAnswer(message: string): boolean {
  return ANSWER_EN.test(message) || hasAnyPhrase(message, ANSWER_AR);
}

const COMPANY_EN = /\b(company|startup|start-up|founders?|team|customers?|clients?|product|what do (you|we) (do|make|build))\b/i;
const JOB_EN = /\b(job|jobs|career|role|engineers?|day to day|day-to-day|work like|salary|study|university|college|degree|skills?|intern|internship)\b/i;

// ---------- stakeholder ----------

interface StakeholderLines {
  revealIntro: Pool;
  revealOutro: Pool;
  greet: Pool;
  thanks: Pool;
  codeDeflect: Pool;
  smallTalk: Pool;
}

const STAKEHOLDER: Record<ArchetypeId, StakeholderLines> = {
  water: {
    revealIntro: {
      en: [
        "Now you are asking the right question. On my farm the rule is simple.",
        "Good, this is what matters to me. Here is how I know a well is working too hard.",
        "Thirty years of farming taught me this, so write it down.",
      ],
      ar: [
        "الآن تسأل السؤال الصحيح. في مزرعتي القاعدة بسيطة.",
        "جيد، هذا ما يهمني. هكذا أعرف أن البئر تعمل فوق طاقتها.",
        "علّمتني ثلاثون سنة من الزراعة هذا، فاكتبه عندك.",
      ],
    },
    revealOutro: {
      en: ["Does that answer your question?", "Ask me again if any part is not clear."],
      ar: ["هل هذا يجيب عن سؤالك؟", "اسألني مرة أخرى إن لم يكن أي جزء واضحاً."],
    },
    greet: {
      en: [
        "Salaam{cn}! I'm {me}. Ask me anything about my wells and my palms.",
        "Ahlan{cn}. The palms are thirsty this week. What do you want to know about my farm in {area}?",
      ],
      ar: [
        "السلام عليكم{cn}! أنا {me}. اسألني ما تشاء عن آباري ونخيلي.",
        "أهلاً{cn}. النخيل عطشى هذا الأسبوع. ماذا تريد أن تعرف عن مزرعتي في {area}؟",
      ],
    },
    thanks: {
      en: ["You're welcome. Come back if you need to know more about the farm.", "Anytime. My door, and my phone, are always open."],
      ar: ["عفواً. ارجع إليّ إذا احتجت أن تعرف المزيد عن المزرعة.", "في أي وقت. بابي وهاتفي مفتوحان دائماً."],
    },
    codeDeflect: {
      en: [
        "I'm not a computer person. Ask me about the farm: what do you need to know?",
        "Code is your world, wells are mine. Ask me something specific about how I run my pumps.",
        "I don't understand the computer side. But if you want to know what worries me about a well, just ask.",
      ],
      ar: [
        "أنا لست خبيراً في الحاسوب. اسألني عن المزرعة: ماذا تحتاج أن تعرف؟",
        "البرمجة عالمك، والآبار عالمي. اسألني سؤالاً محدداً عن طريقة تشغيل المضخات.",
        "لا أفهم الجانب التقني. لكن إن أردت أن تعرف ما الذي يقلقني بشأن البئر، فاسألني.",
      ],
    },
    smallTalk: {
      en: [
        "My farm in {area} has two wells and about two thousand palms. In summer the pumps run through the night. What exactly do you need to know for your work?",
        "My father dug the first well here by hand. Today I watch the meters on my phone, thanks to {company}. If it's for your report, ask me how I judge my wells and I'll answer straight.",
        "The water has been getting saltier, and the palms show it in their leaves. That is why I signed up with {company}. What do you want to know about my wells?",
      ],
      ar: [
        "مزرعتي في {area} فيها بئران ونحو ألفي نخلة. في الصيف تعمل المضخات طوال الليل. ماذا تحتاج أن تعرف بالضبط لعملك؟",
        "حفر أبي أول بئر هنا بيديه. اليوم أتابع العدادات من هاتفي بفضل {company}. إن كان سؤالك من أجل التقرير، فاسألني كيف أحكم على آباري وسأجيبك بوضوح.",
        "المياه تزداد ملوحة، ويظهر ذلك على سعف النخيل. لهذا اشتركت مع {company}. ماذا تريد أن تعرف عن آباري؟",
      ],
    },
  },
  floods: {
    revealIntro: {
      en: [
        "That is exactly what I need you to get right. When I decide to close a road, this is the rule.",
        "Listen carefully, because people's safety depends on this one.",
        "Good question. My crews follow this rule.",
      ],
      ar: [
        "هذا بالضبط ما أريدك أن تفهمه جيداً. عندما أقرر إغلاق طريق، هذه هي القاعدة.",
        "اسمع جيداً، فسلامة الناس تعتمد على هذا.",
        "سؤال جيد. فرقي تتبع هذه القاعدة.",
      ],
    },
    revealOutro: {
      en: ["Is that clear?", "Better an early alert than a car in the wadi."],
      ar: ["هل هذا واضح؟", "تنبيه مبكر أفضل من سيارة عالقة في الوادي."],
    },
    greet: {
      en: [
        "Salaam{cn}. {me} here, I look after the roads around {area}. What do you need from me?",
        "Hello{cn}. Clear skies today, which is when we prepare. Ask me anything about the wadi roads.",
      ],
      ar: [
        "السلام عليكم{cn}. معك {me}، أهتم بالطرق حول {area}. ماذا تحتاج مني؟",
        "مرحباً{cn}. السماء صافية اليوم، وهذا وقت الاستعداد. اسألني ما تشاء عن طرق الأودية.",
      ],
    },
    thanks: {
      en: ["Anytime. Just make sure the alerts go out on time.", "You're welcome. Call me if anything about the roads is unclear."],
      ar: ["في أي وقت. فقط تأكد أن التنبيهات تصل في وقتها.", "عفواً. اتصل بي إن كان أي شيء عن الطرق غير واضح."],
    },
    codeDeflect: {
      en: [
        "I'm not a computer person. Ask me about the roads and the rain: what do you need to know?",
        "I don't know about code. I know wadis. Ask me something specific about how I decide on a road.",
        "That's a question for your engineers. Ask me about the storms, the gauges, or my road crews.",
      ],
      ar: [
        "أنا لست خبيراً في الحاسوب. اسألني عن الطرق والأمطار: ماذا تحتاج أن تعرف؟",
        "لا أعرف البرمجة، لكني أعرف الأودية. اسألني سؤالاً محدداً عن طريقة قراري بشأن الطريق.",
        "هذا سؤال لمهندسيكم. اسألني عن العواصف أو مقاييس المطر أو فرق الطرق.",
      ],
    },
    smallTalk: {
      en: [
        "The roads around {area} cross three big wadis. When it rains hard in the mountains, the water comes down fast, sometimes before it even rains in town. What do you need to know?",
        "In April 2024 we had rain like nobody here had seen. My crews worked two days without sleep. Ask me how I decide on a road and I'll tell you.",
        "I get the gauge readings from {company} on my phone. I need them to warn me early, not late. What exactly do you want to know?",
      ],
      ar: [
        "الطرق حول {area} تعبر ثلاثة أودية كبيرة. عندما تمطر بغزارة في الجبال تنزل المياه بسرعة، أحياناً قبل أن تمطر في البلدة. ماذا تحتاج أن تعرف؟",
        "في أبريل 2024 جاءنا مطر لم يرَ أحد هنا مثله. عملت فرقي يومين بلا نوم. اسألني كيف أقرر بشأن الطريق وسأخبرك.",
        "تصلني قراءات المقاييس من {company} على هاتفي. أحتاجها أن تنبّهني مبكراً لا متأخراً. ماذا تريد أن تعرف بالضبط؟",
      ],
    },
  },
  heat: {
    revealIntro: {
      en: [
        "This is the most important thing on my site, so listen.",
        "Good, you asked. The rule I enforce is this.",
        "I will not bend on this one.",
      ],
      ar: ["هذا أهم شيء في موقعي، فاستمع جيداً.", "جيد أنك سألت. القاعدة التي أطبّقها هي هذه.", "لن أتهاون في هذه القاعدة."],
    },
    revealOutro: {
      en: ["Is that clear?", "My workers go home safe every day. That's the job."],
      ar: ["هل هذا واضح؟", "عمّالي يعودون إلى بيوتهم سالمين كل يوم. هذه هي المهمة."],
    },
    greet: {
      en: [
        "Hello{cn}. {me}, site safety. I have two hundred workers outside today, so let's be quick. What do you need?",
        "Marhaba{cn}. It's already hot on site. Ask me anything about keeping the crews safe.",
      ],
      ar: [
        "مرحباً{cn}. أنا {me}، مسؤولة السلامة. لدي مئتا عامل في الخارج اليوم، فلنكن سريعين. ماذا تحتاج؟",
        "أهلاً{cn}. الجو حار في الموقع منذ الصباح. اسألني ما تشاء عن سلامة العمال.",
      ],
    },
    thanks: {
      en: ["You're welcome. Keep my workers safe and we'll get along fine.", "Anytime. Safety questions are never a bother."],
      ar: ["عفواً. احمِ عمّالي وسنكون على وفاق.", "في أي وقت. أسئلة السلامة لا تزعجني أبداً."],
    },
    codeDeflect: {
      en: [
        "I'm not a computer person. Ask me about the site and the workers: what do you need to know?",
        "I don't follow the code part. Ask me something specific about how I run safety on site.",
        "That sounds like a question for Ravi. I can tell you how my site works, so ask me about that.",
      ],
      ar: [
        "أنا لست خبيرة في الحاسوب. اسألني عن الموقع والعمال: ماذا تحتاج أن تعرف؟",
        "لا أفهم جانب البرمجة. اسألني سؤالاً محدداً عن طريقة إدارتي للسلامة في الموقع.",
        "هذا يبدو سؤالاً لرافي. أستطيع أن أخبرك كيف يعمل موقعي، فاسألني عن ذلك.",
      ],
    },
    smallTalk: {
      en: [
        "We start at five in the morning to beat the sun. By ten the air near the coast is already heavy and wet. What do you need to know for your work?",
        "Every summer there is the midday break, by law. But the hours around it can be dangerous too. Ask me about my safety rules and I'll answer.",
        "The {company} sensors sit on poles around my site. I check them more than I check my messages. What exactly do you want to know?",
      ],
      ar: [
        "نبدأ العمل في الخامسة صباحاً لنسبق الشمس. وبحلول العاشرة يصبح الهواء قرب الساحل ثقيلاً ورطباً. ماذا تحتاج أن تعرف لعملك؟",
        "في كل صيف هناك استراحة منتصف النهار بحكم القانون. لكن الساعات حولها قد تكون خطرة أيضاً. اسألني عن قواعد السلامة عندي وسأجيبك.",
        "حساسات {company} مثبتة على أعمدة حول موقعي. أتابعها أكثر مما أتابع رسائلي. ماذا تريد أن تعرف بالضبط؟",
      ],
    },
  },
};

const QUESTION_START_EN = /^\s*(what|which|when|how|why|where|who|is|are|do|does|did|can|could|should|would|will|must|any|anything)\b/i;
const QUESTION_START_AR = ["ما", "ماذا", "متى", "كيف", "هل", "أي", "لماذا", "كم", "أين", "بماذا", "بم"];
function isQuestion(message: string): boolean {
  if (/[?؟]/.test(message)) return true;
  const msg = withoutGreeting(message);
  const first = normalizeForMatch(msg).trim().split(/\s+/)[0] ?? "";
  return QUESTION_START_EN.test(msg) || QUESTION_START_AR.some((w) => normalizeForMatch(w) === first);
}

/** A question about the customer's world: not a greeting, a thank-you or a code question. */
function isOnTopicQuestion(message: string): boolean {
  return !!message.trim() && isQuestion(message) && !isGreeting(message) && !isThanks(message) && !isCodeQuestion(message);
}

/**
 * The student's last question got small talk and they're asking again in other words: answer this time,
 * so rephrasings the keyword lists miss don't loop forever.
 */
function isSecondTry(req: AgentRequest, rule: string): boolean {
  if (!isOnTopicQuestion(req.message ?? "")) return false;
  if (req.history.some((h) => h.from === "stakeholder" && h.text.includes(rule))) return false;
  const previous = [...req.history].reverse().find((h) => h.from === "student");
  return !!previous && isOnTopicQuestion(previous.text);
}

function stakeholderReply(req: AgentRequest, ctx: ScriptedContext): AgentResponse {
  const { lang } = req;
  const msg = req.message ?? "";
  const seed = msg || `${req.agent}:${req.mode}:${req.history.length}`;
  const lines = STAKEHOLDER[ctx.archetype.id];
  const vars = baseVars(req, ctx);

  const rule = (ctx.ticket.hidden.rule[lang] || ctx.ticket.hidden.rule.en).trim();
  if (asksAboutRule(msg, ctx.ticket) || isSecondTry(req, rule)) {
    const text = `${say(lines.revealIntro, lang, seed, vars)} ${rule} ${say(lines.revealOutro, lang, `${seed}#o`, vars)}`;
    return { text, provider: "scripted", revealed: true };
  }
  let pool: Pool;
  if (!msg.trim() || isGreeting(msg)) pool = lines.greet;
  else if (isThanks(msg)) pool = lines.thanks;
  else if (isCodeQuestion(msg)) pool = lines.codeDeflect;
  else pool = lines.smallTalk;
  return { text: say(pool, lang, seed, vars), provider: "scripted", revealed: false };
}

// ---------- mentor ----------

const MENTOR_LINES = {
  greet: {
    en: [
      "Hey{cn}, I'm Ravi. Ask me anything when you're stuck, though I'll mostly answer with questions.",
      "Hi{cn}! Good to have you on the team. What are you looking at right now?",
    ],
    ar: ["أهلاً{cn}، أنا رافي. اسألني متى ما علقت، لكني سأجيبك غالباً بأسئلة.", "مرحباً{cn}! سعيد بانضمامك إلى الفريق. على ماذا تعمل الآن؟"],
  },
  thanks: {
    en: ["Anytime. Run the tests again and tell me what changed.", "Happy to help. Ping me when the next test turns green."],
    ar: ["في أي وقت. شغّل الاختبارات مرة أخرى وأخبرني بما تغيّر.", "يسعدني ذلك. أخبرني عندما ينجح الاختبار التالي."],
  },
  refuse: {
    en: [
      "I won't write it for you, but I'll get you there. What should {fn} return for the simplest possible input?",
      "If I give you the answer, you lose the best part of today. Look at the first failing test: what does it expect, and what do you return?",
      "No spoilers! Let's break it down instead. What is the very first thing {fn} needs to do with its input?",
    ],
    ar: [
      "لن أكتبه بدلاً منك، لكني سأساعدك لتصل إليه. ماذا يجب أن تُرجع {fn} لأبسط مدخل ممكن؟",
      "إن أعطيتك الحل فستفوتك أجمل لحظة اليوم. انظر إلى أول اختبار فاشل: ماذا يتوقع، وماذا تُرجع أنت؟",
      "لا حلول جاهزة! لنقسّم المشكلة بدلاً من ذلك. ما أول شيء يجب أن تفعله {fn} بالمدخلات؟",
    ],
  },
  socratic: {
    en: [
      "Good question. What have you tried so far in {fn}, and what did the test output tell you?",
      "Let's think it through. If you ran {fn} by hand on one line of the data, what would each step produce?",
      "Try printing the input and the value {fn} returns for one failing case. What's different from what the test expects?",
      "What's the smallest input that breaks {fn}? Start there and work outward.",
    ],
    ar: [
      "سؤال جيد. ماذا جرّبت حتى الآن في {fn}، وماذا قالت لك نتيجة الاختبار؟",
      "لنفكر معاً. لو نفّذت {fn} بيدك على سطر واحد من البيانات، ماذا ستُنتج كل خطوة؟",
      "جرّب أن تطبع المدخل والقيمة التي تُرجعها {fn} لحالة فاشلة واحدة. ما الفرق عمّا يتوقعه الاختبار؟",
      "ما أصغر مدخل يُفشل {fn}؟ ابدأ منه ثم توسّع.",
    ],
  },
  allGreen: {
    en: [
      "Everything is green{cn}! All {total} tests pass. Open a pull request and I'll review it.",
      "All {total} tests pass, nice work{cn}. Open a pull request when you're ready and I'll take a look.",
    ],
    ar: [
      "كل شيء ناجح{cn}! جميع الاختبارات ناجحة ({total}). افتح طلب الدمج وسأراجعه.",
      "جميع الاختبارات ناجحة ({total})، عمل رائع{cn}. افتح طلب الدمج عندما تكون جاهزاً وسأراجعه.",
    ],
  },
  failingPrefix: { en: ["I see {test} is still failing on {fn}."], ar: ["أرى أن الاختبار {test} ما زال يفشل في {fn}."] },
  hiddenPointer: {
    en: ["One more thing: a test on {hfn} checks a rule that isn't written in the ticket. Ask {stakeholder} about it."],
    ar: ["شيء آخر: أحد اختبارات {hfn} يتحقق من قاعدة غير مكتوبة في المهمة. اسأل {stakeholder} عنها."],
  },
  hintIntro: [
    { en: ["Here's a nudge for {fn}."], ar: ["إليك تلميحاً صغيراً بخصوص {fn}."] },
    { en: ["Let's go one step deeper on {fn}."], ar: ["لنتعمق خطوة أخرى في {fn}."] },
    { en: ["Last hint for {fn}, then it's over to you."], ar: ["هذا آخر تلميح بخصوص {fn}، وبعده الأمر لك."] },
  ] as Pool[],
  hintOutro: {
    en: ["Try it, then run the tests again.", "What would that change in your code?", "Give it a go and tell me what the tests say."],
    ar: ["جرّبه، ثم شغّل الاختبارات مرة أخرى.", "ماذا سيغيّر ذلك في الكود الخاص بك؟", "حاول وأخبرني بما تقوله الاختبارات."],
  },
  hintExhausted: {
    en: ["You've already had every hint for {fn}, so here's the last one again. After that, trace one failing test by hand."],
    ar: ["لقد حصلت على كل التلميحات الخاصة بـ {fn}، فإليك الأخير مرة أخرى. بعد ذلك تتبّع اختباراً فاشلاً واحداً بيدك."],
  },
  noHint: {
    en: ["Let's look at {fn} together. Which test is failing, and what input does it pass in? Walk through your function line by line with that input."],
    ar: ["لننظر إلى {fn} معاً. أي اختبار يفشل، وما المدخل الذي يمرره؟ تتبّع دالتك سطراً بسطر بهذا المدخل."],
  },
} satisfies Record<string, Pool | Pool[]>;

// The student's file doesn't load (no test could run): Ravi names the error and its line and asks one question about it.
type LoadError = NonNullable<NonNullable<AgentRequest["testSummary"]>["error"]>;
type LoadErrorKind = "indent" | "syntax" | "name" | "other";

const LOAD_ERROR_LINES = {
  lead: {
    en: ["Before any test can run, Python has to load {file}, and right now it stops{atline} with this error: {etype}."],
    ar: ["قبل أن يعمل أي اختبار، يجب أن يحمّل بايثون الملف {file}، لكنه يتوقف الآن{atline} بهذا الخطأ: {etype}."],
  },
  message: { en: ['The message says: "{emsg}".'], ar: ["رسالة الخطأ تقول: «{emsg}»."] },
  refuse: { en: ["I won't write the fix for you, but you can find it."], ar: ["لن أكتب الإصلاح بدلاً منك، لكنك تستطيع أن تجده."] },
  hintNote: {
    en: ["Before the hint: {file} doesn't load yet ({etype}{atline}), so no test can run until that's fixed."],
    ar: ["قبل التلميح: الملف {file} لا يُحمَّل بعد (خطأ {etype}{atline})، فلن يعمل أي اختبار قبل إصلاحه."],
  },
  question: {
    indent: {
      en: ["Look at line {line} and the line just above it. Should they start at the same depth, or should one sit further in? Why?"],
      ar: ["انظر إلى السطر {line} والسطر الذي فوقه مباشرة. هل يجب أن يبدآ من العمق نفسه، أم يجب أن يكون أحدهما أبعد إلى الداخل؟ ولماذا؟"],
    },
    syntax: {
      en: ["What was Python expecting to see on line {line} that isn't there? Check the end of the line above it too, since Python sometimes notices a problem one line late."],
      ar: ["ما الذي كان بايثون يتوقع أن يراه في السطر {line} ولم يجده؟ تحقّق أيضاً من نهاية السطر الذي فوقه، فأحياناً يلاحظ بايثون المشكلة متأخراً بسطر."],
    },
    name: {
      en: ["Which name does Python say it doesn't know on line {line}, and where did you expect it to be defined?"],
      ar: ["أي اسم يقول بايثون إنه لا يعرفه في السطر {line}، وأين توقعت أن يكون معرّفاً؟"],
    },
    other: {
      en: ["In your own words, what is that message telling you, and what does line {line} do?"],
      ar: ["بكلماتك أنت، ماذا تخبرك هذه الرسالة، وماذا يفعل السطر {line}؟"],
    },
  },
  // the same questions when Python gave no line number
  questionNoLine: {
    indent: {
      en: ["Which line starts at a different depth than you meant? Compare each line with the one just above it."],
      ar: ["أي سطر يبدأ من عمق مختلف عمّا قصدت؟ قارن كل سطر بالسطر الذي فوقه مباشرة."],
    },
    syntax: {
      en: ["What was Python expecting to see that isn't there? Read the line the editor marks, and the line above it."],
      ar: ["ما الذي كان بايثون يتوقع أن يراه ولم يجده؟ اقرأ السطر الذي يشير إليه المحرر والسطر الذي فوقه."],
    },
    name: {
      en: ["Which name does Python say it doesn't know, and where did you expect it to be defined?"],
      ar: ["أي اسم يقول بايثون إنه لا يعرفه، وأين توقعت أن يكون معرّفاً؟"],
    },
    other: {
      en: ["In your own words, what is that message telling you, and which part of your code could cause it?"],
      ar: ["بكلماتك أنت، ماذا تخبرك هذه الرسالة، وأي جزء من الكود قد يسببها؟"],
    },
  },
} satisfies Record<string, Pool | Record<LoadErrorKind, Pool>>;

function loadErrorKind(type: string): LoadErrorKind {
  if (/^(IndentationError|TabError)$/.test(type)) return "indent";
  if (/^SyntaxError$/.test(type)) return "syntax";
  if (/^(NameError|UnboundLocalError)$/.test(type)) return "name";
  return "other";
}

function loadErrorVars(error: LoadError, lang: Lang, ctx: ScriptedContext): Vars {
  const atline = error.line ? (lang === "ar" ? ` في السطر ${error.line}` : ` on line ${error.line}`) : "";
  return { file: ctx.ticket.fileName, etype: error.type, line: error.line ?? "", atline };
}

/** "Python stops on line 7 with this error: IndentationError. The message says ... Should line 7 ...?" */
function loadErrorText(error: LoadError, lang: Lang, seed: string, vars: Vars): string {
  const kind = loadErrorKind(error.type);
  const parts = [say(LOAD_ERROR_LINES.lead, lang, seed, vars)];
  // Python's own message, on one line and short; it is about the student's code, never a fix.
  const emsg = truncate(error.message.replace(/\s+/g, " ").trim(), 120);
  if (emsg) parts.push(say(LOAD_ERROR_LINES.message, lang, seed, { ...vars, emsg }));
  parts.push(say((error.line ? LOAD_ERROR_LINES.question : LOAD_ERROR_LINES.questionNoLine)[kind], lang, seed, vars));
  return parts.join(" ");
}

function stakeholderNames(ctx: ScriptedContext): string[] {
  return [ctx.archetype.stakeholder.name.en, ctx.archetype.stakeholder.name.ar];
}

function mentorChat(req: AgentRequest, ctx: ScriptedContext): AgentResponse {
  const { lang } = req;
  const msg = req.message ?? "";
  const seed = msg || `mentor:${req.history.length}`;
  const firstFailing = req.testSummary?.failing?.[0];
  const fn = resolveFocusFn(req, ctx.ticket);
  const vars: Vars = { ...baseVars(req, ctx), fn };

  const allGreen = isApproved(req.testSummary);
  const hidden = failingHiddenRuleFns(ctx.ticket, req.testSummary, stakeholderNames(ctx));
  const pointer = hidden.length ? ` ${say(MENTOR_LINES.hiddenPointer, lang, seed, { ...vars, hfn: hidden[0] })}` : "";

  // The file doesn't load, so there are no failing tests to talk about: talk about the error instead.
  const loadError = req.testSummary?.error;
  if (loadError && msg.trim() && !isGreeting(msg) && !isThanks(msg)) {
    const errVars = { ...vars, ...loadErrorVars(loadError, lang, ctx) };
    const refuse = asksForAnswer(msg) ? `${say(LOAD_ERROR_LINES.refuse, lang, seed, errVars)} ` : "";
    return { text: refuse + loadErrorText(loadError, lang, seed, errVars), provider: "scripted" };
  }

  if (!allGreen && asksForAnswer(msg)) return { text: say(MENTOR_LINES.refuse, lang, seed, vars) + pointer, provider: "scripted" };
  if (!msg.trim() || isGreeting(msg)) return { text: say(MENTOR_LINES.greet, lang, seed, vars), provider: "scripted" };
  if (isThanks(msg)) return { text: say(MENTOR_LINES.thanks, lang, seed, vars), provider: "scripted" };
  // Nothing left to debug: send them to the pull request instead of asking about the first function.
  if (allGreen) return { text: say(MENTOR_LINES.allGreen, lang, seed, { ...vars, total: req.testSummary?.total ?? 0 }), provider: "scripted" };

  const parts: string[] = [];
  if (firstFailing?.fn) parts.push(say(MENTOR_LINES.failingPrefix, lang, seed, { ...vars, test: firstFailing.name, fn: firstFailing.fn }));
  parts.push(say(MENTOR_LINES.socratic, lang, seed, firstFailing?.fn ? { ...vars, fn: firstFailing.fn } : vars));
  return { text: parts.join(" ") + pointer, provider: "scripted" };
}

function mentorHint(req: AgentRequest, ctx: ScriptedContext): AgentResponse {
  const { lang } = req;
  const fn = resolveFocusFn(req, ctx.ticket);
  const seed = `${fn}:${req.hintLevel ?? 0}:${req.message ?? ""}`;
  const vars: Vars = { ...baseVars(req, ctx), fn };
  const found = hintFor(ctx.ticket, fn, req.hintLevel);
  // A file that doesn't load comes first: no test can run until it does.
  const loadError = req.testSummary?.error;
  const note = loadError ? say(LOAD_ERROR_LINES.hintNote, lang, seed, { ...vars, ...loadErrorVars(loadError, lang, ctx) }) : "";
  if (!found) return { text: [note, say(MENTOR_LINES.noHint, lang, seed, vars)].filter(Boolean).join(" "), provider: "scripted" };

  const hintText = (found.hint.text[lang] || found.hint.text.en).trim();
  const intro = found.exhausted ? MENTOR_LINES.hintExhausted : MENTOR_LINES.hintIntro[Math.min(found.index, 2)];
  const parts = [say(intro, lang, seed, vars), hintText, say(MENTOR_LINES.hintOutro, lang, seed, vars)];
  if (note) parts.unshift(note);

  const hidden = failingHiddenRuleFns(ctx.ticket, req.testSummary, stakeholderNames(ctx));
  const hintMentionsStakeholder = stakeholderNames(ctx).some((n) => normalizeForMatch(hintText).includes(normalizeForMatch(n)));
  if (hidden.includes(fn) && !hintMentionsStakeholder) parts.push(say(MENTOR_LINES.hiddenPointer, lang, seed, { ...vars, hfn: fn }));
  // Level-3 hints are often a numbered list of steps: keep them on their own lines.
  return { text: parts.join(hintText.includes("\n") ? "\n" : " "), provider: "scripted" };
}

const REVIEW = {
  praise: {
    get: { en: "Nice use of dict.get to handle missing keys.", ar: "استخدام موفّق لـ dict.get للتعامل مع المفاتيح الناقصة." },
    try: {
      en: "Good call using try/except around the conversion, so one bad line won't crash the whole run.",
      ar: "قرار جيد أن تستخدم try/except حول التحويل، فلن يوقف سطرٌ خاطئ البرنامج كله.",
    },
    strip: { en: "I like that you call strip() on the input before using it.", ar: "أعجبني أنك تستدعي strip() لتنظيف المدخلات قبل استخدامها." },
    split: { en: "Clean use of split() to break each line into fields.", ar: "استخدام واضح لـ split() لتقسيم كل سطر إلى حقول." },
    sorted: { en: "Good use of sorted() to keep the output in a predictable order.", ar: "استخدام جيد لـ sorted() لإبقاء النتيجة بترتيب ثابت." },
    comprehension: { en: "That list comprehension is tidy and easy to read.", ar: "الـ list comprehension التي كتبتها مرتبة وسهلة القراءة." },
    docstring: {
      en: "Thanks for the docstring; it tells the next engineer exactly what the function does.",
      ar: "شكراً على الـ docstring، فهي تخبر المهندس التالي بما تفعله الدالة بالضبط.",
    },
    progress: {
      en: "{passed} of {total} tests are already passing, and {fn} is laid out clearly.",
      ar: "{passed} من {total} اختبارات ناجحة بالفعل، والدالة {fn} مكتوبة بترتيب واضح.",
    },
    fallback: {
      en: "Thanks for opening the pull request{cn}. It's easy to follow how {fn} is laid out.",
      ar: "شكراً على فتح طلب الدمج{cn}. من السهل متابعة طريقة كتابة {fn}.",
    },
  },
  failingOne: {
    en: "{test} still fails. What input does it use, and what does {fn} return for it?",
    ar: "الاختبار {test} ما زال يفشل. ما المدخل الذي يستخدمه، وماذا تُرجع {fn} له؟",
  },
  failingMany: {
    en: "{count} tests still fail, starting with {test}. What input does it use, and what does {fn} return for it?",
    ar: "ما زالت بعض الاختبارات تفشل ({count})، أولها {test}. ما المدخل الذي يستخدمه، وماذا تُرجع {fn} له؟",
  },
  hidden: {
    en: "{hfn} depends on a rule that isn't in the ticket. Ask {stakeholder} about it before you guess.",
    ar: "{hfn} تعتمد على قاعدة غير موجودة في المهمة. اسأل {stakeholder} عنها قبل أن تخمّن.",
  },
  print: {
    en: "Remove the leftover print() calls before merging; they clutter the output.",
    ar: "احذف استدعاءات print() المتبقية قبل الدمج، فهي تملأ المخرجات بلا داعٍ.",
  },
  todo: { en: "There's still a TODO comment in the file. Finish it or delete it.", ar: "ما زال في الملف تعليق TODO. أكمله أو احذفه." },
  long: {
    en: "Line {line} is over 100 characters long. Splitting it would make it easier to read.",
    ar: "السطر {line} أطول من 100 حرف. تقسيمه سيجعله أسهل في القراءة.",
  },
  shortName: {
    en: "The variable {var} is a single letter. A descriptive name would tell a teammate what it holds.",
    ar: "اسم المتغير {var} حرف واحد فقط. اسم أوضح سيخبر زميلك بما يحمله.",
  },
  edge: {
    en: "What happens with an empty line or a missing value? A quick check for that would make this sturdier.",
    ar: "ماذا يحدث مع سطر فارغ أو قيمة ناقصة؟ تحقّق بسيط من ذلك سيجعل الكود أمتن.",
  },
  docs: {
    en: "{dfn} has no docstring yet. A one-line docstring would tell the next engineer what it returns.",
    ar: "الدالة {dfn} ليس لها docstring بعد. سطر واحد يشرح ما تُرجعه سيساعد المهندس التالي.",
  },
  ruleComment: {
    en: "Add a short comment in {hfn} with {stakeholder}'s rule in plain words, so the next engineer knows where the numbers come from.",
    ar: "أضف تعليقاً قصيراً في {hfn} يشرح قاعدة {stakeholder} بكلمات بسيطة، ليعرف المهندس التالي من أين جاءت الأرقام.",
  },
  constant: {
    en: "If {stakeholder} changes the rule next month, how many lines would you have to edit? A named constant for each number at the top of the file would make that a one-line change.",
    ar: "لو تغيّرت قاعدة {stakeholder} الشهر القادم، فكم سطراً ستعدّل؟ ثابت باسم واضح لكل رقم في أعلى الملف سيجعل التعديل سطراً واحداً.",
  },
  reflect: {
    en: "Which test was the hardest to make pass, and what did it teach you about {stakeholder}'s data?",
    ar: "أي اختبار كان الأصعب، وماذا علّمك عن بيانات {stakeholder}؟",
  },
  approved: {
    en: "Approved. All {total} tests pass, so merge when you're ready{cn}.",
    ar: "تمت الموافقة. جميع الاختبارات ناجحة ({total})، يمكنك الدمج متى كنت مستعداً{cn}.",
  },
  changes: {
    en: "Changes requested: {passed} of {total} tests pass. Fix the failing ones and send it back to me.",
    ar: "مطلوب تعديلات: {passed} من {total} اختبارات ناجحة. أصلح الاختبارات الفاشلة ثم أرسله لي مرة أخرى.",
  },
  noTests: {
    en: "Changes requested: I don't see any test results yet. Run the tests, then send it back to me.",
    ar: "مطلوب تعديلات: لا أرى أي نتائج اختبارات بعد. شغّل الاختبارات ثم أرسله لي مرة أخرى.",
  },
  loadError: {
    en: "Changes requested: {file} doesn't load yet, so no test could run. Fix the {etype}, run the tests, then send it back to me.",
    ar: "مطلوب تعديلات: الملف {file} لا يُحمَّل بعد، لذلك لم يعمل أي اختبار. أصلح خطأ {etype}، وشغّل الاختبارات، ثم أرسله لي مرة أخرى.",
  },
};

function praiseKey(code: string): keyof typeof REVIEW.praise | null {
  if (/\.get\s*\(/.test(code)) return "get";
  if (/^\s*try\s*:/m.test(code)) return "try";
  if (/\.strip\s*\(/.test(code)) return "strip";
  if (/\.split\s*\(/.test(code)) return "split";
  if (/\bsorted\s*\(/.test(code)) return "sorted";
  if (/\[[^\]\n]+\bfor\b[^\]\n]+\bin\b[^\]\n]+\]/.test(code)) return "comprehension";
  if (/"""|'''/.test(code)) return "docstring";
  return null;
}

/** The first function whose body doesn't start with a docstring (any string literal), or null. */
function missingDocstring(code: string): string | null {
  const m = code.match(/^[ \t]*def[ \t]+(\w+)[^\n]*:[ \t]*(?:#[^\n]*)?\r?\n(?:[ \t]*\r?\n)*[ \t]*(?![rRuUbBfF]{0,2}["'])\S/m);
  return m ? m[1] : null;
}

/** The code already deals with blank lines, missing values or glitches. */
function handlesEdgeCases(code: string): boolean {
  return /\.strip\s*\(|==\s*(""|'')|\bnot\s+\w+\s*:|\bis None\b|\bERR\b|\btry\s*:/.test(code);
}

/** Comments and string contents don't count as variable names. */
function singleLetterVar(code: string): string | null {
  const m = code.match(/^[ \t]*([a-zA-Z])[ \t]*=[^=]/m);
  return m ? m[1] : null;
}

function mentorReview(req: AgentRequest, ctx: ScriptedContext): AgentResponse {
  const { lang } = req;
  const ts = req.testSummary;
  const approved = isApproved(ts);
  const code = req.code ?? "";
  const failing = ts?.failing ?? [];
  const failingFns = new Set(failing.map((f) => f.fn));
  const okFn = functionNames(ctx.ticket).find((n) => !failingFns.has(n)) ?? resolveFocusFn(req, ctx.ticket);
  const vars: Vars = { ...baseVars(req, ctx), passed: ts?.passed ?? 0, total: ts?.total ?? 0, fn: okFn };
  const t = (l: { en: string; ar: string }, extra: Vars = {}) => fill(l[lang], { ...vars, ...extra });

  const loadError = ts?.error;
  const key = praiseKey(code) ?? (ts && ts.passed > 0 && !approved && !loadError ? "progress" : "fallback");
  const praise = t(REVIEW.praise[key]);

  const suggestions: string[] = [];
  // A file that doesn't load comes first: nothing else can be checked until it does.
  const errVars = loadError ? loadErrorVars(loadError, lang, ctx) : {};
  if (loadError) suggestions.push(loadErrorText(loadError, lang, `review:${loadError.type}`, { ...vars, ...errVars }));
  if (failing.length) {
    const first = failing[0];
    suggestions.push(t(failing.length === 1 ? REVIEW.failingOne : REVIEW.failingMany, { test: first.name, fn: first.fn, count: failing.length }));
  }
  const hidden = failingHiddenRuleFns(ctx.ticket, ts, stakeholderNames(ctx));
  if (hidden.length) suggestions.push(t(REVIEW.hidden, { hfn: hidden[0] }));
  if (/\bprint\s*\(/.test(code)) suggestions.push(t(REVIEW.print));
  if (/\bTODO\b/.test(code)) suggestions.push(t(REVIEW.todo));
  const longLine = code.split(/\r?\n/).findIndex((l) => l.length > 100);
  if (longLine >= 0) suggestions.push(t(REVIEW.long, { line: longLine + 1 }));
  const v = singleLetterVar(code);
  if (v) suggestions.push(t(REVIEW.shortName, { var: v }));
  // Only suggest what the code is actually missing: the starter already has docstrings, and an approved PR
  // has passed the blank-line and glitch tests.
  if (!approved && code.trim() && !handlesEdgeCases(code)) suggestions.push(t(REVIEW.edge));
  const undocumented = missingDocstring(code);
  if (undocumented) suggestions.push(t(REVIEW.docs, { dfn: undocumented }));
  if (code.trim()) {
    const ruleFn = [...hiddenRuleFns(ctx.ticket, stakeholderNames(ctx))][0] ?? functionNames(ctx.ticket).at(-1) ?? okFn;
    if (!/(^|\s)#/m.test(code)) suggestions.push(t(REVIEW.ruleComment, { hfn: ruleFn }));
    if (!/^[A-Z][A-Z0-9_]*\s*=/m.test(code)) suggestions.push(t(REVIEW.constant));
  }
  if (!suggestions.length) suggestions.push(t(REVIEW.reflect));

  const picked = suggestions.slice(0, 3).map((s, i) => `${i + 1}. ${s}`);
  const decision = approved
    ? t(REVIEW.approved)
    : loadError
      ? t(REVIEW.loadError, errVars)
      : ts && ts.total > 0
        ? t(REVIEW.changes)
        : t(REVIEW.noTests);
  return { text: [praise, ...picked, decision].join("\n"), provider: "scripted", approved };
}

// ---------- manager ----------

const MANAGER_LINES = {
  greet: {
    en: [
      "Good morning{cn}! Welcome to {company}. Your ticket today is {key}: {title}. Ravi can help with the code, and {stakeholder} can tell you what the customer needs.",
      "Hi{cn}, glad you're here. Quick standup: you're on {key}, {title}. Any blockers so far?",
    ],
    ar: [
      "صباح الخير{cn}! أهلاً بك في {company}. مهمتك اليوم هي {key}: {title}. رافي سيساعدك في الكود، ويمكنك أن تسأل {stakeholder} عمّا يحتاجه العميل.",
      "مرحباً{cn}، سعيدة بوجودك. اجتماع سريع: أنت تعمل على {key}، {title}. هل هناك ما يعيقك حتى الآن؟",
    ],
  },
  thanks: {
    en: ["Anytime{cn}. Shout if you get stuck.", "Happy to help. Keep going, you're doing well."],
    ar: ["في أي وقت{cn}. أخبرني إن واجهتك مشكلة.", "يسعدني ذلك. واصل، أنت تقوم بعمل جيد."],
  },
  company: {
    en: ["{about} {problem} That's why your ticket matters today."],
    ar: ["{about} {problem} لهذا السبب مهمتك اليوم مهمة."],
  },
  job: {
    en: ["{role} Most of the job is what you're doing today: reading a vague ticket, asking the customer questions, and making small changes that pass tests."],
    ar: ["{role} ومعظم العمل هو ما تفعله اليوم: قراءة مهمة غامضة، وسؤال العميل، وإجراء تعديلات صغيرة تنجح في الاختبارات."],
  },
  standup: {
    en: [
      "Quick standup: what are you working on, and is anything blocking you? If the ticket feels vague, that's normal here; ask {stakeholder} what's missing.",
      "Your focus today is {key}. Get the tests green, then we'll run your code on the full dataset for {area}.",
      "At a startup this size everyone talks to customers. Don't be shy about messaging {stakeholder}, and ask Ravi when the code fights back.",
    ],
    ar: [
      "اجتماع سريع: على ماذا تعمل، وهل هناك ما يعيقك؟ إن بدت المهمة غامضة فهذا طبيعي هنا؛ اسأل {stakeholder} عمّا ينقصها.",
      "تركيزك اليوم على {key}. اجعل الاختبارات كلها ناجحة، ثم سنشغّل الكود على مجموعة البيانات الكاملة من {area}.",
      "في شركة ناشئة بهذا الحجم يتحدث الجميع مع العملاء. لا تتردد في مراسلة {stakeholder}، واسأل رافي عندما يصعب عليك الكود.",
    ],
  },
  demoLead: {
    en: ["I just watched your code run on the full dataset for {area}.", "Your code just ran on the full {area} dataset."],
    ar: ["شاهدت للتو الكود الخاص بك يعمل على مجموعة البيانات الكاملة من {area}.", "الكود الخاص بك عمل للتو على مجموعة البيانات الكاملة من {area}."],
  },
  demoNoSummary: { en: ["It ran from start to finish."], ar: ["وقد عمل من البداية إلى النهاية."] },
  demoWhy: { en: ["This matters to {stakeholder} because {why}."], ar: ["هذا مهم بالنسبة إلى {stakeholder} لأن {why}."] },
  demoClose: {
    en: ["Nice work{cn}.", "That's what shipping real work feels like{cn}."],
    ar: ["عمل رائع{cn}.", "هكذا يبدو إنجاز عمل حقيقي{cn}."],
  },
} satisfies Record<string, Pool>;

function managerChat(req: AgentRequest, ctx: ScriptedContext): AgentResponse {
  const { lang } = req;
  const msg = req.message ?? "";
  const seed = msg || `manager:${req.history.length}`;
  const vars: Vars = {
    ...baseVars(req, ctx),
    about: ctx.archetype.company.about[lang],
    problem: ctx.archetype.problem[lang],
    role: fill(ARCHETYPE_FLAVOR[ctx.archetype.id].roleNote[lang], { company: companyName(ctx.archetype, lang) }),
  };
  let pool: Pool;
  if (!msg.trim() || isGreeting(msg)) pool = MANAGER_LINES.greet;
  else if (isThanks(msg)) pool = MANAGER_LINES.thanks;
  else if (JOB_EN.test(msg) || hasAnyToken(msg, ["وظيفة", "مهنة", "مهندس", "مهندسين", "المهندسون", "جامعة", "دراسة", "مهارات", "عمل"])) pool = MANAGER_LINES.job;
  else if (COMPANY_EN.test(msg) || hasAnyToken(msg, ["شركة", "الشركة", "فريق", "عملاء", "العملاء", "منتج"])) pool = MANAGER_LINES.company;
  else pool = MANAGER_LINES.standup;
  return { text: say(pool, lang, seed, vars), provider: "scripted" };
}

function managerDemo(req: AgentRequest, ctx: ScriptedContext): AgentResponse {
  const { lang } = req;
  const summary = (req.demoSummary ?? "").trim();
  const seed = summary || "demo";
  const vars: Vars = { ...baseVars(req, ctx), why: ARCHETYPE_FLAVOR[ctx.archetype.id].why[lang] };
  const parts = [
    say(MANAGER_LINES.demoLead, lang, seed, vars),
    summary || say(MANAGER_LINES.demoNoSummary, lang, seed, vars),
    say(MANAGER_LINES.demoWhy, lang, seed, vars),
    say(MANAGER_LINES.demoClose, lang, seed, vars),
  ];
  return { text: parts.join(" "), provider: "scripted" };
}

/** English count with a plural noun. */
function enCount(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Arabic counted noun: 1, 2, 3–10 and 11+ take different forms. */
function arCount(n: number, forms: { one: string; two: string; few: string; many: string }): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

function managerEod(req: AgentRequest, ctx: ScriptedContext): AgentResponse {
  const { lang } = req;
  const s = req.stats ?? { testRuns: 0, questionsAsked: 0, hintsUsed: 0, revealed: false, minutes: 0 };
  const runs = Math.max(0, Math.trunc(s.testRuns));
  const q = Math.max(0, Math.trunc(s.questionsAsked));
  const h = Math.max(0, Math.trunc(s.hintsUsed));
  const minutes = Math.max(1, Math.round(s.minutes));
  const sh = ctx.archetype.stakeholder.name[lang];
  const company = companyName(ctx.archetype, lang);
  const role = fill(ARCHETYPE_FLAVOR[ctx.archetype.id].roleNote[lang], { company });
  const cn = commaName(req);
  const lines: string[] = [];

  if (lang === "en") {
    lines.push(`Here's my end-of-day review${cn}.`);
    if (runs === 0) lines.push("1. You didn't run the tests today. Running them early and often is the fastest way to find out what's wrong.");
    else {
      const comment =
        runs <= 2
          ? "Running them more often would have shown you problems sooner."
          : runs <= 15
            ? "That steady loop of change, run, check is how engineers work every day."
            : "That's a lot of runs; next time, pause to read the failure message before you change code.";
      lines.push(`1. In ${enCount(minutes, "minute", "minutes")} you ran the tests ${enCount(runs, "time", "times")}. ${comment}`);
    }
    if (s.revealed) {
      const asked = q > 0 ? enCount(q, "question", "questions") : "the right question";
      lines.push(`2. You asked ${sh} ${asked} and found the rule that wasn't written in the ticket. Asking the customer is the most important skill on this team.`);
    } else if (q > 0) {
      lines.push(`2. You asked ${sh} ${enCount(q, "question", "questions")}, but the rule that wasn't in the ticket never came up. Asking what counts, before you code, is a habit worth building.`);
    } else {
      lines.push(`2. You didn't ask ${sh} anything today, so the rule that wasn't in the ticket stayed hidden. Customers know things tickets don't.`);
    }
    if (h === 0) lines.push("3. You didn't use any hints. Great independence, though asking Ravi early is fine too.");
    else if (h <= 3) lines.push(`3. You used ${enCount(h, "hint", "hints")} from Ravi and did the rest yourself.`);
    else lines.push(`3. You used ${h} hints. That's fine on day one; next time, try tracing the code by hand for a minute before asking.`);
    const next = !s.revealed
      ? "Next step: before writing code on a new ticket, ask the customer what counts and write their answer down."
      : h > 3
        ? "Next step: when you're stuck, trace one failing test by hand before asking for a hint."
        : runs <= 2
          ? "Next step: run the tests after every small change."
          : "Next step: try another area tomorrow and see how the same skills solve a different local problem.";
    lines.push(next, `Role note: ${role}`);
  } else {
    lines.push(`إليك مراجعتي لنهاية اليوم${cn}.`);
    if (runs === 0) lines.push("1. لم تشغّل الاختبارات اليوم. تشغيلها مبكراً وباستمرار هو أسرع طريقة لمعرفة الخطأ.");
    else {
      const comment =
        runs <= 2
          ? "تشغيلها أكثر كان سيكشف لك المشكلات أسرع."
          : runs <= 15
            ? "هذه الدورة الثابتة من التعديل والتشغيل والتحقق هي طريقة عمل المهندسين كل يوم."
            : "هذا عدد كبير؛ في المرة القادمة توقّف لقراءة رسالة الخطأ قبل تعديل الكود.";
      const times = arCount(runs, { one: "مرة واحدة", two: "مرتين", few: "مرات", many: "مرة" });
      const mins = arCount(minutes, { one: "دقيقة واحدة", two: "دقيقتين", few: "دقائق", many: "دقيقة" });
      lines.push(`1. شغّلت الاختبارات ${times} خلال ${mins}. ${comment}`);
    }
    const qText = arCount(q, { one: "سؤالاً واحداً", two: "سؤالين", few: "أسئلة", many: "سؤالاً" });
    if (s.revealed) {
      lines.push(`2. سألت ${sh} ${q > 0 ? qText : "السؤال الصحيح"} واكتشفت القاعدة التي لم تُكتب في المهمة. سؤال العميل هو أهم مهارة في هذا الفريق.`);
    } else if (q > 0) {
      lines.push(`2. سألت ${sh} ${qText}، لكن القاعدة غير المكتوبة في المهمة لم تظهر. سؤال العميل عن المعايير قبل كتابة الكود عادة تستحق أن تبنيها.`);
    } else {
      lines.push(`2. لم تسأل ${sh} أي سؤال اليوم، فبقيت القاعدة غير المكتوبة في المهمة مخفية. العملاء يعرفون أشياء لا تذكرها المهام.`);
    }
    if (h === 0) lines.push("3. لم تستخدم أي تلميح. استقلالية رائعة، مع أن سؤال رافي مبكراً أمر جيد أيضاً.");
    else if (h <= 3) lines.push(`3. استخدمت ${arCount(h, { one: "تلميحاً واحداً", two: "تلميحين", few: "تلميحات", many: "تلميحاً" })} من رافي وأكملت الباقي بنفسك.`);
    else lines.push(`3. استخدمت ${arCount(h, { one: "تلميحاً واحداً", two: "تلميحين", few: "تلميحات", many: "تلميحاً" })}. هذا مقبول في اليوم الأول؛ في المرة القادمة تتبّع الكود بيدك لدقيقة قبل أن تسأل.`);
    const next = !s.revealed
      ? "الخطوة التالية: قبل كتابة الكود في أي مهمة جديدة، اسأل العميل عن المعايير ودوّن إجابته."
      : h > 3
        ? "الخطوة التالية: عندما تعلق، تتبّع اختباراً فاشلاً واحداً بيدك قبل طلب تلميح."
        : runs <= 2
          ? "الخطوة التالية: شغّل الاختبارات بعد كل تعديل صغير."
          : "الخطوة التالية: جرّب منطقة أخرى غداً وانظر كيف تحل المهارات نفسها مشكلة محلية مختلفة.";
    lines.push(next, `عن الوظيفة: ${role}`);
  }
  return { text: lines.join("\n"), provider: "scripted" };
}

// ---------- entry point ----------

/** A complete scripted reply for any agent, mode and language. Never throws for a well-formed request. */
export function scriptedReply(req: AgentRequest, ctx: ScriptedContext): AgentResponse {
  const mode = effectiveMode(req.agent, req.mode);
  if (req.agent === "stakeholder") return stakeholderReply(req, ctx);
  if (req.agent === "mentor") {
    if (mode === "hint") return mentorHint(req, ctx);
    if (mode === "review") return mentorReview(req, ctx);
    return mentorChat(req, ctx);
  }
  if (mode === "demo") return managerDemo(req, ctx);
  if (mode === "eod") return managerEod(req, ctx);
  return managerChat(req, ctx);
}

/** Used only if the ticket itself can't be loaded. */
export function emergencyReply(req: Pick<AgentRequest, "agent" | "lang" | "mode">): AgentResponse {
  const text =
    req.lang === "ar"
      ? "عذراً، لا أستطيع الرد الآن. حاول مرة أخرى بعد قليل."
      : "Sorry, I can't answer right now. Try again in a moment.";
  const res: AgentResponse = { text, provider: "scripted" };
  if (req.agent === "stakeholder") res.revealed = false;
  if (req.agent === "mentor" && req.mode === "review") res.approved = false;
  return res;
}
