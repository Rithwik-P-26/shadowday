import type { AgentId, AgentRequest, AgentResponse, Ticket } from "@/lib/types";
import { getArchetype, getArea, MANAGER, MENTOR } from "@/content/regions";
import { getTicket } from "@/content/tickets";
import { generateWithFailover, type FailoverOptions } from "@/lib/llm/failover";
import type { LlmMessage } from "@/lib/llm/providers";
import { emergencyReply, scriptedReply, type ScriptedContext } from "@/lib/llm/scripted";
import { buildSystemPrompt, NO_CODE_RETRY_LINE } from "@/lib/agents/prompts";
import { detectReveal, hasMarker, publicContext, stripMarker, violatesNoCode } from "@/lib/agents/guardrails";
import { clampInt, effectiveMode, isApproved, resolveFocusFn, sanitizeName, truncate, type AgentMode } from "@/lib/agents/util";

export const MAX_MESSAGE_CHARS = 600;
export const MAX_HISTORY = 12;
const MAX_HISTORY_TEXT = 1000;
const MAX_CODE_CHARS = 12_000;
const MAX_DEMO_CHARS = 600;
const MAX_FAILING = 20;

const MAX_TOKENS: Record<AgentMode, number> = { chat: 260, hint: 260, review: 420, demo: 260, eod: 480 };
const TEMPERATURE: Record<AgentId, number> = { stakeholder: 0.7, mentor: 0.4, manager: 0.6 };

export interface RunAgentOptions {
  /** Serve the scripted reply without calling any LLM (e.g. the client is over the rate limit). */
  skipLlm?: boolean;
  /** Override failover settings (tests). */
  failover?: FailoverOptions;
}

function scriptedOnly(): boolean {
  const v = process.env.SHADOWDAY_SCRIPTED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Remove every [[REVEALED]] marker, including ones nested to survive a single pass. */
function removeMarkers(text: string): string {
  let out = text;
  for (let i = 0; i < 10 && hasMarker(out); i++) out = stripMarker(out);
  return out;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? truncate(removeMarkers(value), max).trim() : "";
}

/** Cap sizes, drop unknown fields and remove any reveal marker the student typed. */
export function sanitizeRequest(req: AgentRequest): AgentRequest {
  const out: AgentRequest = {
    agent: req.agent,
    mode: req.mode,
    lang: req.lang === "ar" ? "ar" : "en",
    areaId: req.areaId,
    history: [],
  };

  const name = sanitizeName(req.studentName);
  if (name) out.studentName = name;
  if (typeof req.message === "string") out.message = cleanText(req.message, MAX_MESSAGE_CHARS);

  let history = (Array.isArray(req.history) ? req.history : [])
    .filter((h) => h && typeof h.text === "string" && typeof h.from === "string")
    .map((h) => ({ from: h.from, text: cleanText(h.text, MAX_HISTORY_TEXT) }))
    .filter((h) => h.text.length > 0);
  // The UI may already include the new message as the last history line: don't send it twice.
  const last = history[history.length - 1];
  if (out.message && last && last.from === "student" && last.text === out.message) history = history.slice(0, -1);
  out.history = history.slice(-MAX_HISTORY);

  if (typeof req.code === "string") out.code = truncate(req.code, MAX_CODE_CHARS);
  if (req.testSummary && typeof req.testSummary === "object") {
    const total = clampInt(req.testSummary.total, 0, 10_000, 0);
    out.testSummary = {
      total,
      passed: Math.min(total, clampInt(req.testSummary.passed, 0, 10_000, 0)),
      failing: (Array.isArray(req.testSummary.failing) ? req.testSummary.failing : []).slice(0, MAX_FAILING).map((f) => ({
        name: truncate(String(f?.name ?? ""), 120),
        fn: truncate(String(f?.fn ?? ""), 80),
        message: truncate(removeMarkers(String(f?.message ?? "")), 300),
      })),
    };
  }
  if (typeof req.focusFn === "string") out.focusFn = truncate(req.focusFn, 80);
  if (req.hintLevel !== undefined) out.hintLevel = clampInt(req.hintLevel, 0, 99, 0);
  if (typeof req.demoSummary === "string") out.demoSummary = cleanText(req.demoSummary, MAX_DEMO_CHARS);
  if (req.stats && typeof req.stats === "object") {
    out.stats = {
      testRuns: clampInt(req.stats.testRuns, 0, 100_000, 0),
      questionsAsked: clampInt(req.stats.questionsAsked, 0, 100_000, 0),
      hintsUsed: clampInt(req.stats.hintsUsed, 0, 100_000, 0),
      revealed: req.stats.revealed === true,
      minutes: clampInt(Math.round(Number(req.stats.minutes)), 0, 100_000, 0),
    };
  }
  return out;
}

/** The student's side of this turn. Non-chat modes get a short stand-in request in the right language. */
function currentTurn(req: AgentRequest, ticket: Ticket): string {
  const ar = req.lang === "ar";
  const msg = req.message?.trim() ?? "";
  const withMsg = (canned: string) => (msg ? `${canned}\n${msg}` : canned);
  switch (effectiveMode(req.agent, req.mode)) {
    case "hint": {
      const fn = resolveFocusFn(req, ticket);
      return withMsg(ar ? `أنا عالق في ${fn}. هل يمكنني الحصول على تلميح؟` : `I'm stuck on ${fn}. Can I have a hint?`);
    }
    case "review":
      return withMsg(ar ? "فتحت طلب دمج. هل يمكنك مراجعته؟" : "I've opened a pull request. Can you review it?");
    case "demo":
      return withMsg(ar ? "شغّلت الكود الخاص بي للتو على مجموعة البيانات الكاملة. ما رأيك؟" : "I just ran my code on the full dataset. What do you think?");
    case "eod":
      return withMsg(ar ? "انتهى يومي. كيف كان أدائي؟" : "That's the end of my day. How did I do?");
    default:
      return msg || (ar ? "(فتح الطالب المحادثة وألقى التحية.)" : "(The student opened the chat and said hello.)");
  }
}

/**
 * History for the LLM: the student's lines become "user", this agent's lines become "assistant",
 * other agents' lines are dropped. Consecutive turns from the same side are merged.
 */
export function buildMessages(req: AgentRequest, ticket: Ticket): LlmMessage[] {
  const raw: LlmMessage[] = [];
  for (const h of req.history) {
    if (h.from === "student") raw.push({ role: "user", content: h.text });
    else if (h.from === req.agent) raw.push({ role: "assistant", content: h.text });
  }
  raw.push({ role: "user", content: currentTurn(req, ticket) });

  const merged: LlmMessage[] = [];
  for (const m of raw) {
    if (!m.content.trim()) continue;
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role) prev.content = `${prev.content}\n\n${m.content}`;
    else merged.push({ ...m });
  }
  return merged;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Light clean-up of model output: no markdown headings or bold, no "Ravi:" speaker prefix. */
function tidy(text: string, speakerNames: string[]): string {
  let out = text.replace(/\r\n/g, "\n");
  for (const n of speakerNames) out = out.replace(new RegExp(`^\\s*${escapeRe(n)}\\s*:\\s*`), "");
  out = out.replace(/^#{1,6}[ \t]+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

async function askLlm(req: AgentRequest, ctx: ScriptedContext, failover?: FailoverOptions): Promise<AgentResponse | null> {
  const { ticket, area, archetype } = ctx;
  const mode = effectiveMode(req.agent, req.mode);
  const system = buildSystemPrompt(req, ticket, area, archetype);
  const params = { messages: buildMessages(req, ticket), maxTokens: MAX_TOKENS[mode], temperature: TEMPERATURE[req.agent] };
  // Every agent is checked: the manager's prompt carries the whole ticket too, so she could be talked into code.

  let result = await generateWithFailover({ system, ...params }, failover);
  if (!result) return null;
  if (violatesNoCode(stripMarker(result.text), ticket)) {
    result = await generateWithFailover({ system: `${system}\n\n${NO_CODE_RETRY_LINE}`, ...params }, failover);
    if (!result || violatesNoCode(stripMarker(result.text), ticket)) return null;
  }

  const character = req.agent === "stakeholder" ? archetype.stakeholder : req.agent === "mentor" ? MENTOR : MANAGER;
  const text = tidy(removeMarkers(result.text), [character.name.en, character.name.ar]);
  if (!text) return null;

  const res: AgentResponse = { text, provider: result.provider };
  if (req.agent === "stakeholder") {
    // Numbers the student typed themselves (a guess, a quote of the ticket) don't prove the rule was disclosed.
    const studentText = [req.message ?? "", ...req.history.filter((h) => h.from === "student").map((h) => h.text)].join("\n");
    res.revealed = detectReveal(result.text, ticket, publicContext(ticket, archetype), studentText);
  }
  if (req.agent === "mentor" && mode === "review") res.approved = isApproved(req.testSummary);
  return res;
}

/**
 * One agent turn. Never throws: any LLM problem (no keys, rate limits, timeouts, a reply that
 * breaks the no-code rule twice) ends in the scripted reply.
 */
export async function runAgent(input: AgentRequest, opts: RunAgentOptions = {}): Promise<AgentResponse> {
  let req: AgentRequest;
  let ctx: ScriptedContext;
  try {
    req = sanitizeRequest(input);
    const area = getArea(req.areaId);
    const archetype = getArchetype(req.areaId);
    const ticket = getTicket(archetype.id);
    if (!ticket) return emergencyReply(req);
    ctx = { ticket, area, archetype };
  } catch {
    return emergencyReply(input);
  }

  const scripted = (): AgentResponse => {
    try {
      return scriptedReply(req, ctx);
    } catch {
      return emergencyReply(req);
    }
  };

  if (opts.skipLlm || scriptedOnly()) return scripted();
  try {
    return (await askLlm(req, ctx, opts.failover)) ?? scripted();
  } catch {
    return scripted();
  }
}
