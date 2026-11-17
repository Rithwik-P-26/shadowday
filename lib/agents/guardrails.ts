import type { Archetype, Ticket } from "@/lib/types";
import { containsRevealMarker, functionNames } from "@/lib/agents/util";

/** Appended by the stakeholder LLM when its reply states the hidden rule. Never shown to the student. */
export const REVEAL_MARKER = "[[REVEALED]]";

const MARKER_RE = /\[\[\s*revealed\s*\]\]/gi;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One line that reads like a Python statement rather than prose. Case-sensitive on purpose: prose starts "If …". */
function looksLikePython(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^def\s+\w+/.test(t)) return true;
  if (/^for\s+.+\s+in\s+.+:\s*(#.*)?$/.test(t)) return true;
  if (/^(if|elif|while)\s+.+:\s*(#.*)?$/.test(t)) return true;
  if (/^else\s*:\s*$/.test(t)) return true;
  if (/^return(\s|$)/.test(t)) return true;
  if (/^(import\s+\w|from\s+[\w.]+\s+import\s)/.test(t)) return true;
  if (/^[ \t]+\S/.test(line) && line.includes(" = ")) return true;
  return false;
}

/**
 * True when a reply contains code the student could paste: a fenced block, a definition of one of the
 * ticket's functions, or two or more lines that look like Python statements. Inline mentions such as
 * split(), dict.get or sorted are fine.
 */
export function violatesNoCode(text: string, ticket: Ticket): boolean {
  if (!text) return false;
  if (text.includes("```")) return true;
  for (const name of functionNames(ticket)) {
    if (new RegExp(`\\bdef\\s+${escapeRe(name)}\\b`).test(text)) return true;
  }
  let codeLines = 0;
  for (const line of text.split(/\r?\n/)) {
    if (looksLikePython(line) && ++codeLines >= 2) return true;
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

/**
 * A stakeholder reply disclosed the hidden rule if it carries the marker or any of the ticket's reveal markers.
 * Pass `publicText` (ticket body, problem statement) so a marker the student could already read doesn't count.
 */
export function detectReveal(text: string, ticket: Ticket, publicText = ""): boolean {
  if (!text) return false;
  return hasMarker(text) || containsRevealMarker(text, ticket, publicText);
}

/** Text every student can already see: a reveal marker found here can't prove the rule was disclosed. */
export function publicContext(ticket: Ticket, archetype: Archetype): string {
  return [ticket.body?.en, ticket.body?.ar, ticket.title?.en, ticket.title?.ar, archetype.problem.en, archetype.problem.ar].join("\n");
}
