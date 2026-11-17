import type { AgentRequest, ChatFrom } from "@/lib/types";
import { AREAS } from "@/content/regions";
import { AGENT_IDS, LANGS, MODES } from "@/lib/agents/util";

// Hand-written validation for POST /api/agent. Shape and enum checks only; sizes are capped later in runAgent.

export type ParseResult = { ok: true; value: AgentRequest } | { ok: false; error: string };

const FROM: readonly ChatFrom[] = ["student", ...AGENT_IDS];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function optString(body: Record<string, unknown>, key: string): string | undefined | Error {
  const v = body[key];
  if (v === undefined || v === null) return undefined;
  return typeof v === "string" ? v : new Error(`${key} must be a string`);
}

export function parseAgentRequest(body: unknown): ParseResult {
  const fail = (error: string): ParseResult => ({ ok: false, error });
  if (!isObj(body)) return fail("Body must be a JSON object");

  const { agent, mode, lang, areaId } = body;
  if (typeof agent !== "string" || !(AGENT_IDS as readonly string[]).includes(agent)) return fail("agent must be manager, stakeholder or mentor");
  if (typeof mode !== "string" || !(MODES as readonly string[]).includes(mode)) return fail("mode must be chat, hint, review, demo or eod");
  if (typeof lang !== "string" || !(LANGS as readonly string[]).includes(lang)) return fail("lang must be en or ar");
  if (typeof areaId !== "string" || !AREAS.some((a) => a.id === areaId)) return fail("Unknown areaId");

  const req: AgentRequest = {
    agent: agent as AgentRequest["agent"],
    mode: mode as AgentRequest["mode"],
    lang: lang as AgentRequest["lang"],
    areaId,
    history: [],
  };

  for (const key of ["studentName", "message", "code", "focusFn", "demoSummary"] as const) {
    const v = optString(body, key);
    if (v instanceof Error) return fail(v.message);
    if (v !== undefined) req[key] = v;
  }

  if (body.history !== undefined && body.history !== null) {
    if (!Array.isArray(body.history)) return fail("history must be an array");
    for (const h of body.history) {
      if (!isObj(h) || typeof h.from !== "string" || !(FROM as readonly string[]).includes(h.from) || typeof h.text !== "string") {
        return fail("history entries need from (student, manager, stakeholder or mentor) and text");
      }
      req.history.push({ from: h.from as ChatFrom, text: h.text });
    }
  }

  if (body.hintLevel !== undefined && body.hintLevel !== null) {
    if (!isNum(body.hintLevel)) return fail("hintLevel must be a number");
    req.hintLevel = body.hintLevel;
  }

  if (body.testSummary !== undefined && body.testSummary !== null) {
    const ts = body.testSummary;
    if (!isObj(ts) || !isNum(ts.passed) || !isNum(ts.total)) return fail("testSummary needs numeric passed and total");
    const failingRaw = ts.failing ?? [];
    if (!Array.isArray(failingRaw)) return fail("testSummary.failing must be an array");
    const failing: NonNullable<AgentRequest["testSummary"]>["failing"] = [];
    for (const f of failingRaw) {
      if (!isObj(f) || typeof f.name !== "string" || typeof f.fn !== "string") return fail("testSummary.failing entries need name and fn");
      failing.push({ name: f.name, fn: f.fn, message: typeof f.message === "string" ? f.message : "" });
    }
    req.testSummary = { passed: ts.passed, total: ts.total, failing };
  }

  if (body.stats !== undefined && body.stats !== null) {
    const s = body.stats;
    if (!isObj(s)) return fail("stats must be an object");
    for (const k of ["testRuns", "questionsAsked", "hintsUsed", "minutes"] as const) {
      if (s[k] !== undefined && !isNum(s[k])) return fail(`stats.${k} must be a number`);
    }
    if (s.revealed !== undefined && typeof s.revealed !== "boolean") return fail("stats.revealed must be a boolean");
    req.stats = {
      testRuns: (s.testRuns as number | undefined) ?? 0,
      questionsAsked: (s.questionsAsked as number | undefined) ?? 0,
      hintsUsed: (s.hintsUsed as number | undefined) ?? 0,
      revealed: s.revealed === true,
      minutes: (s.minutes as number | undefined) ?? 0,
    };
  }

  return { ok: true, value: req };
}
