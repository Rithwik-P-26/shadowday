import type { Archetype, Ticket } from "@/lib/types";
import { functionNames, normalizeForMatch } from "@/lib/agents/util";

/** Appended by the stakeholder LLM when its reply states the hidden rule. Never shown to the student. */
export const REVEAL_MARKER = "[[REVEALED]]";

const MARKER_RE = /\[\[\s*revealed\s*\]\]/gi;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** An assignment, including tuple targets, subscripts and augmented forms: `total = 0`, `a, b = x`, `t[d] += n`. */
const ASSIGN_RE = /^[A-Za-z_][\w.]*(?:\[[^\]\n]*\])*(?:\s*,\s*[A-Za-z_][\w.]*(?:\[[^\]\n]*\])*)*\s*(?:[+\-*/%]|\/\/)?=(?!=)\s*\S/;
/** `for x in y: body`, `if x: body`: a whole statement on one line. Case-sensitive on purpose: prose starts "If …". */
/** "for r in", but not prose like "(for example in July)". */
const FOR_VAR = String.raw`for\s+(?!(?:example|instance|each|every|all|any|some|the|a|an|this|that|one|both|me|you|us|them)\b)\w+(?:\s*,\s*\w+)*\s+in`;
const ONE_LINER_RE = /^(?:for\s+\w+(?:\s*,\s*\w+)*\s+in\s+.+|if\s+.+|elif\s+.+|while\s+.+|else|try|with\s+.+)\s*:\s*([^\s#].*)$/;
const COMPREHENSION_RE = new RegExp(String.raw`[[({][^[\](){}\n]*\b${FOR_VAR}\b[^\n]*[\])}]`);
const LAMBDA_RE = /\blambda\b[\w\s,]*:/;
/** A loop with its body mid-sentence: "Something like for r in readings: totals[r['date']] += …". */
const INLINE_LOOP_RE = new RegExp(String.raw`\b${FOR_VAR}\s+[\w.[\]()'"]+\s*:\s*[^\n]*?[=()[\]]`);

/** True for a one-liner whose body is code, not prose ("if it's empty: give back None" is prose). */
function isOneLiner(t: string): boolean {
  const m = t.match(ONE_LINER_RE);
  return !!m && /[=()[\]]|\b(return|continue|break|pass|append)\b/.test(m[1]);
}

/** One line that reads like a Python statement rather than prose. Case-sensitive on purpose: prose starts "If …". */
function looksLikePython(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^def\s+\w+/.test(t)) return true;
  if (/^for\s+.+\s+in\s+.+:\s*(#.*)?$/.test(t)) return true;
  if (/^(if|elif|while|with)\s+.+:\s*(#.*)?$/.test(t)) return true;
  if (/^(else|try|finally)\s*:\s*$/.test(t) || /^except\b.*:\s*$/.test(t)) return true;
  if (/^return(\s|$)/.test(t)) return true;
  if (/^(break|continue|pass)$/.test(t)) return true;
  if (/^(import\s+\w|from\s+[\w.]+\s+import\s)/.test(t)) return true;
  if (ASSIGN_RE.test(t)) return true;
  // receiver.method(args) as a statement: `flagged.append(day)`
  if (/^[a-z_]\w*(?:\[[^\]\n]*\])?(?:\.\w+)+\([^()\n]*\S[^()\n]*\)$/.test(t)) return true;
  if (/^[ \t]+\S/.test(line) && line.includes(" = ")) return true;
  return false;
}

/** Drop a list marker ("1.", "2)", "-", "*", "•") and backticks around the whole line, keeping the indentation inside. */
function unwrapLine(line: string): string {
  let out = line.replace(/^(\s*)(?:\d+[.)]|[-*•])\s+/, "$1");
  const m = out.match(/^\s*`([^`]+)`[\s.,;:]*$/);
  if (m) out = m[1];
  return out;
}

/** A complete statement or a solution-sized expression, not an identifier like `split()` or `dict.get(date, 0)`. */
function codeSpanWeight(span: string): number {
  const t = span.trim();
  if (!t || /^[\w.]+(\(\s*\))?$/.test(t)) return 0;
  if (COMPREHENSION_RE.test(t) || LAMBDA_RE.test(t) || isOneLiner(t)) return 2;
  if (/^(return|yield|raise|del|assert)\s+\S/.test(t) || /^(import|from)\s+\w/.test(t) || /^def\s+\w/.test(t)) return 2;
  if (/^(for|while|if|elif|with)\s.+:\s*$/.test(t) || ASSIGN_RE.test(t)) return 2;
  if (t.length > 25 && /[-+*/%<>]|\b(and|or|not)\b/.test(t)) return 1;
  return 0;
}

/**
 * True when a reply contains code the student could paste: a fenced block, a definition of one of the
 * ticket's functions, a statement in inline backticks (`return dates[i]`), a one-line loop or comprehension,
 * or two or more lines that look like Python statements (also inside numbered or bulleted lists).
 * Inline mentions such as `split()`, dict.get or sorted are fine.
 */
export function violatesNoCode(text: string, ticket: Ticket): boolean {
  if (!text) return false;
  if (text.includes("```")) return true;
  for (const name of functionNames(ticket)) {
    if (new RegExp(`\\bdef\\s+${escapeRe(name)}\\b`).test(text)) return true;
  }
  let codeLines = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = unwrapLine(raw);
    const t = line.trim();
    if (isOneLiner(t) || COMPREHENSION_RE.test(line) || LAMBDA_RE.test(line) || INLINE_LOOP_RE.test(line)) return true;
    let spans = 0;
    for (const m of raw.matchAll(/`([^`\n]+)`/g)) spans += codeSpanWeight(m[1]);
    codeLines += Math.max(looksLikePython(line) ? 1 : 0, spans);
    if (codeLines >= 2) return true;
  }
  return false;
}

/** Remove every reveal marker (any spacing or case) and tidy the whitespace it leaves behind. */
export function stripMarker(text: string): string {
  return text
    .replace(MARKER_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function hasMarker(text: string): boolean {
  return /\[\[\s*revealed\s*\]\]/i.test(text);
}

// Reveal markers that are also everyday phrases ("7 days", "3 hours", "3 pm", "in a row") or that only restate the
// public half of the rule ("20 mm or more" when the ticket already says "roughly 20 mm") don't prove a disclosure on
// their own: "I'm on the farm 7 days a week" isn't the rule. They count only in pairs, as in the rule itself
// ("three hours in a row"). Matching is on normalizeForMatch() output.
const NUMBER_WORD =
  "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|واحد|اثنين|اثنتين|ثلاث|ثلاثه|اربع|اربعه|خمس|خمسه|ست|سته|سبع|سبعه|ثماني|ثمانيه|تسع|تسعه|عشر|عشره|عشرين";
const UNIT = "days?|hours?|weeks?|minutes?|nights?|pm|am|ايام|يوم|ساعات|ساعه|اسابيع|دقائق|ليال";
const EVERYDAY_MARKER_RE = new RegExp(
  `^(?:(?:${NUMBER_WORD})\\s*(?:${UNIT})|(?:ال)?(?:ايام|ساعات)\\s+(?:ال)?(?:${NUMBER_WORD})|(?:ال)?(?:ثانيه|ثالثه|رابعه)\\s+(?:عصرا|ظهرا|صباحا|مساء))$`,
);
const EVERYDAY_PHRASES = new Set(["in a row", "on end", "متتاليه", "علي التوالي"]);
const RESTATEMENT_FILLER_RE = /\b(?:or more|or above|at least|of rain)\b|او اكثر|علي الاقل|من المطر/g;

function containsWord(hay: string, needle: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(needle)}($|[^\\p{L}\\p{N}])`, "u").test(hay);
}

function isWeakMarker(needle: string, publicNorm: string): boolean {
  if (EVERYDAY_MARKER_RE.test(needle) || EVERYDAY_PHRASES.has(needle)) return true;
  const core = needle.replace(RESTATEMENT_FILLER_RE, " ").replace(/\s+/g, " ").trim();
  return core !== needle && core.length > 0 && containsWord(publicNorm, core);
}

/**
 * A stakeholder reply disclosed the hidden rule if it carries the [[REVEALED]] marker, or one of the ticket's
 * specific reveal markers (or two of its everyday ones). Markers the student could already read in `publicText`
 * (ticket body, problem statement) or typed themselves in `studentText` prove nothing and are ignored.
 */
export function detectReveal(text: string, ticket: Ticket, publicText = "", studentText = ""): boolean {
  if (!text) return false;
  if (hasMarker(text)) return true;
  const hay = normalizeForMatch(text);
  const pub = normalizeForMatch(publicText);
  const asked = normalizeForMatch(studentText);
  const weak = new Set<string>();
  for (const m of ticket.hidden?.revealMarkers ?? []) {
    const needle = normalizeForMatch(m ?? "").trim();
    if (!needle || !hay.includes(needle) || pub.includes(needle) || asked.includes(needle)) continue;
    if (!isWeakMarker(needle, pub)) return true;
    weak.add(needle);
  }
  return weak.size >= 2;
}

/** Text every student can already see: a reveal marker found here can't prove the rule was disclosed. */
export function publicContext(ticket: Ticket, archetype: Archetype): string {
  return [ticket.body?.en, ticket.body?.ar, ticket.title?.en, ticket.title?.ar, archetype.problem.en, archetype.problem.ar].join("\n");
}
