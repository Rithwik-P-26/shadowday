import type { AgentId, AgentRequest, Hint, Lang, Ticket } from "@/lib/types";

// Small shared helpers for the agent backend: no I/O, no randomness.

export type AgentMode = AgentRequest["mode"];
export type TestSummary = NonNullable<AgentRequest["testSummary"]>;

export const AGENT_IDS: readonly AgentId[] = ["manager", "stakeholder", "mentor"];
export const MODES: readonly AgentMode[] = ["chat", "hint", "review", "demo", "eod"];
export const LANGS: readonly Lang[] = ["en", "ar"];

const SUPPORTED_MODES: Record<AgentId, readonly AgentMode[]> = {
  stakeholder: ["chat"],
  mentor: ["chat", "hint", "review"],
  manager: ["chat", "demo", "eod"],
};

/** Modes an agent doesn't have (e.g. stakeholder + review) behave like chat. */
export function effectiveMode(agent: AgentId, mode: AgentMode): AgentMode {
  return SUPPORTED_MODES[agent].includes(mode) ? mode : "chat";
}

/** The approval rule for a pull request. Computed server-side, never by the LLM. */
export function isApproved(summary: AgentRequest["testSummary"]): boolean {
  return !!summary && summary.total > 0 && summary.passed === summary.total;
}

/** FNV-1a 32-bit. Deterministic variant picking for scripted replies. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pick<T>(items: readonly T[], seed: string): T {
  return items[hashString(seed) % items.length];
}

export function clampInt(n: unknown, min: number, max: number, fallback = min): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Replace {key} placeholders. Unknown keys become empty strings. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : ""));
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

export const ARABIC_RE = /[؀-ۿ]/;

/**
 * Lower-case and fold the spellings that differ between how people type and how content is written:
 * Arabic-Indic digits, the Arabic percent sign, diacritics, tatweel, alef/yeh/teh-marbuta variants.
 */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٪/g, "%")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

/** Keep a display name safe to put inside a system prompt: letters, spaces, a few punctuation marks. */
export function sanitizeName(name: string | undefined): string | undefined {
  if (typeof name !== "string") return undefined;
  const clean = name
    .replace(/[^\p{L}\p{M}\s'.-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)
    .trim();
  return clean || undefined;
}

export function functionNames(ticket: Ticket): string[] {
  return (ticket.functions ?? []).map((f) => f.name);
}

/** The function a hint or chat reply should be about: a known focusFn, else the first failing one, else the first function. */
export function resolveFocusFn(req: Pick<AgentRequest, "focusFn" | "testSummary">, ticket: Ticket): string {
  const known = new Set([...functionNames(ticket), ...Object.keys(ticket.hints ?? {})]);
  if (req.focusFn && known.has(req.focusFn)) return req.focusFn;
  const failing = req.testSummary?.failing?.find((f) => known.has(f.fn));
  if (failing) return failing.fn;
  return functionNames(ticket)[0] ?? Object.keys(ticket.hints ?? {})[0] ?? "your function";
}

/** The next hint in the ladder: index = hints already given, clamped to the last rung. */
export function hintFor(ticket: Ticket, fn: string, hintsGiven: number | undefined): { hint: Hint; index: number; exhausted: boolean } | null {
  const ladder = ticket.hints?.[fn];
  if (!ladder || ladder.length === 0) return null;
  const given = clampInt(hintsGiven ?? 0, 0, 99, 0);
  const index = Math.min(given, ladder.length - 1);
  const hint = ladder.find((h) => h.level === index + 1) ?? ladder[index];
  return { hint, index, exhausted: given >= ladder.length };
}

const HIDDEN_TEST_NAME_RE = /hidden|rule|threshold|customer|stakeholder|business/i;

/**
 * Functions whose tests depend on the stakeholder's hidden rule. Tickets don't name it directly, so infer:
 * a hint that tells the student to ask the stakeholder, or a test whose name says it is about the rule.
 */
export function hiddenRuleFns(ticket: Ticket, stakeholderNames: string[]): Set<string> {
  const names = stakeholderNames.map(normalizeForMatch).filter(Boolean);
  const out = new Set<string>();
  // ticket.json has a hiddenFn field that isn't part of the Ticket type yet; use it if it ever reaches us.
  const explicit = (ticket as Ticket & { hiddenFn?: unknown }).hiddenFn;
  if (typeof explicit === "string" && explicit) out.add(explicit);
  for (const [fn, ladder] of Object.entries(ticket.hints ?? {})) {
    for (const h of ladder ?? []) {
      const text = normalizeForMatch(`${h.text?.en ?? ""} ${h.text?.ar ?? ""}`);
      const asks = /\bask\b/.test(text) || text.includes("اسال");
      if (asks && names.some((n) => text.includes(n))) out.add(fn);
    }
  }
  for (const [test, fn] of Object.entries(ticket.testFn ?? {})) {
    if (HIDDEN_TEST_NAME_RE.test(test)) out.add(fn);
  }
  return out;
}

/**
 * True if `text` contains one of the ticket's reveal markers. Markers that already appear in `publicText`
 * (text the student can read anyway, like the ticket body or the company's problem statement) prove nothing
 * and are ignored.
 */
export function containsRevealMarker(text: string, ticket: Ticket, publicText = ""): boolean {
  const hay = normalizeForMatch(text);
  const known = normalizeForMatch(publicText);
  return (ticket.hidden?.revealMarkers ?? []).some((m) => {
    const needle = normalizeForMatch(m ?? "").trim();
    return needle.length > 0 && hay.includes(needle) && !known.includes(needle);
  });
}

/** Failing tests that look like they need the hidden rule. Returns the distinct function names. */
export function failingHiddenRuleFns(ticket: Ticket, summary: AgentRequest["testSummary"], stakeholderNames: string[]): string[] {
  if (!summary?.failing?.length) return [];
  const hidden = hiddenRuleFns(ticket, stakeholderNames);
  const out: string[] = [];
  for (const f of summary.failing) {
    const related = hidden.has(f.fn) || HIDDEN_TEST_NAME_RE.test(f.name) || containsRevealMarker(f.message ?? "", ticket);
    if (related && f.fn && !out.includes(f.fn)) out.push(f.fn);
  }
  return out;
}

/** Remove reveal-marker substrings (e.g. the threshold) so they can't reach prompts other than the stakeholder's. */
export function redactRevealMarkers(text: string, ticket: Ticket): string {
  let out = text;
  for (const m of ticket.hidden?.revealMarkers ?? []) {
    const needle = (m ?? "").trim();
    if (needle.length < 2) continue;
    out = out.replace(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "…");
  }
  return out;
}
