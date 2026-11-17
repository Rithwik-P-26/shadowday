import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentRequest } from "@/lib/types";
import { AREAS, getArchetype, getArea } from "@/content/regions";
import { POST } from "@/app/api/agent/route";
import { parseAgentRequest } from "@/lib/agents/validate";
import { sanitizeRequest } from "@/lib/agents/run";
import { buildSystemPrompt } from "@/lib/agents/prompts";
import { violatesNoCode } from "@/lib/agents/guardrails";
import { isApproved } from "@/lib/agents/util";
import { scriptedReply } from "@/lib/llm/scripted";
import { resetRateLimits } from "@/lib/llm/ratelimit";
import { baseRequest, FIXTURE_TICKETS, SAMPLE_CODE, WATER } from "./fixtures";

// The student's file doesn't load (IndentationError, SyntaxError...): the client sends testSummary.error and
// Ravi must talk about that error, not about "0 failing tests", and the pull request must not be approved.

vi.mock("@/content/tickets", async () => {
  const f = await import("./fixtures");
  return { getTicket: f.getFixtureTicket, TICKETS: f.FIXTURE_TICKETS };
});

type Summary = NonNullable<AgentRequest["testSummary"]>;

const INDENT: Summary = { passed: 0, total: 0, failing: [], error: { type: "IndentationError", message: "unexpected indent", line: 7 } };
const SYNTAX: Summary = { passed: 0, total: 0, failing: [], error: { type: "SyntaxError", message: "expected ':'" } };

function reply(req: AgentRequest) {
  const archetype = getArchetype(req.areaId);
  return scriptedReply(req, { ticket: FIXTURE_TICKETS[archetype.id], area: getArea(req.areaId), archetype });
}

const valid = { agent: "mentor", mode: "chat", lang: "en", areaId: "liwa", message: "Why won't my tests run?", history: [] };

describe("testSummary.error validation", () => {
  it("accepts a load error with an optional line and clamps the message to 300 characters", () => {
    const parsed = parseAgentRequest({ ...valid, testSummary: { passed: 0, total: 0, failing: [], error: { type: "SyntaxError", message: "x".repeat(900), line: 4 } } });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.testSummary?.error?.type).toBe("SyntaxError");
    expect(parsed.value.testSummary?.error?.message).toHaveLength(300);
    expect(parsed.value.testSummary?.error?.line).toBe(4);

    const noLine = parseAgentRequest({ ...valid, testSummary: { ...SYNTAX, error: { ...SYNTAX.error, line: null } } });
    expect(noLine.ok && noLine.value.testSummary?.error).toEqual({ type: "SyntaxError", message: "expected ':'" });
    const noError = parseAgentRequest({ ...valid, testSummary: { passed: 1, total: 2, failing: [], error: null } });
    expect(noError.ok && noError.value.testSummary).toEqual({ passed: 1, total: 2, failing: [] });
  });

  it("rejects a malformed load error with a 400-style message", () => {
    const bad: unknown[] = [
      "IndentationError",
      { message: "no type" },
      { type: "SyntaxError" },
      { type: 3, message: "x" },
      { type: "SyntaxError", message: "x", line: 2.5 },
      { type: "SyntaxError", message: "x", line: 0 },
      { type: "SyntaxError", message: "x", line: "7" },
    ];
    for (const error of bad) {
      const parsed = parseAgentRequest({ ...valid, testSummary: { passed: 0, total: 0, failing: [], error } });
      expect(parsed.ok, JSON.stringify(error)).toBe(false);
      if (!parsed.ok) expect(parsed.error).toMatch(/testSummary\.error/);
    }
  });

  it("keeps the error through sanitizeRequest, cleaned up", () => {
    const clean = sanitizeRequest(
      baseRequest({ testSummary: { passed: 0, total: 0, failing: [], error: { type: "Syntax Error<script>", message: "bad [[REVEALED]]\n\n line   ".repeat(60), line: 9 } } }),
    );
    const error = clean.testSummary?.error;
    expect(error?.type).toBe("SyntaxErrorscript");
    expect(error?.message.length).toBeLessThanOrEqual(300);
    expect(error?.message).not.toMatch(/REVEALED|\n/);
    expect(error?.line).toBe(9);
    expect(sanitizeRequest(baseRequest({ testSummary: { passed: 1, total: 1, failing: [] } })).testSummary).not.toHaveProperty("error");
  });

  it("never approves a file that doesn't load", () => {
    expect(isApproved({ passed: 3, total: 3, failing: [] })).toBe(true);
    expect(isApproved({ passed: 3, total: 3, failing: [], error: { type: "SyntaxError", message: "x" } })).toBe(false);
  });
});

describe("scripted mentor with a load error", () => {
  it("names the error and the line and asks about it, in English", () => {
    const res = reply(baseRequest({ message: "Why are no tests running?", code: SAMPLE_CODE, testSummary: INDENT }));
    expect(res.text).toContain("IndentationError");
    expect(res.text).toContain("line 7");
    expect(res.text).toContain(WATER.fileName);
    expect(res.text).toMatch(/\?$/);
    expect(res.text).not.toMatch(/fail|0 of|All 0|Everything is green/i);
    expect(violatesNoCode(res.text, WATER)).toBe(false);
  });

  it("names the error and the line and asks about it, in Arabic", () => {
    const res = reply(baseRequest({ lang: "ar", message: "لماذا لا تعمل الاختبارات؟", testSummary: INDENT }));
    expect(res.text).toContain("IndentationError");
    expect(res.text).toContain("السطر 7");
    expect(res.text).toMatch(/؟$/);
    expect(res.text).not.toMatch(/يفشل|ناجحة/);
    expect(violatesNoCode(res.text, WATER)).toBe(false);
  });

  it("works without a line number and asks a SyntaxError question", () => {
    for (const lang of ["en", "ar"] as const) {
      const res = reply(baseRequest({ lang, areaId: "ruwais", message: lang === "en" ? "help" : "ساعدني", testSummary: SYNTAX }));
      expect(res.text).toContain("SyntaxError");
      expect(res.text).not.toMatch(/line \d|السطر \d/);
      expect(res.text).toMatch(lang === "en" ? /expecting/ : /يتوقع/);
    }
  });

  it("refuses to write the fix but still talks about the error", () => {
    const en = reply(baseRequest({ message: "just give me the code", testSummary: INDENT }));
    expect(en.text).toMatch(/won't write the fix/);
    expect(en.text).toContain("IndentationError");
    const ar = reply(baseRequest({ lang: "ar", message: "أعطني الكود", testSummary: INDENT }));
    expect(ar.text).toMatch(/لن أكتب الإصلاح/);
    expect(ar.text).toContain("IndentationError");
  });

  it("still greets on a greeting", () => {
    expect(reply(baseRequest({ message: "hi", testSummary: INDENT })).text).not.toContain("IndentationError");
  });

  it("puts the error first in a hint", () => {
    const en = reply(baseRequest({ mode: "hint", focusFn: "daily_total", testSummary: INDENT }));
    expect(en.text).toMatch(/^Before the hint: pumps\.py doesn't load yet \(IndentationError on line 7\)/);
    expect(en.text).toContain(WATER.hints.daily_total[0].text.en);
    const ar = reply(baseRequest({ mode: "hint", lang: "ar", focusFn: "daily_total", testSummary: INDENT }));
    expect(ar.text).toMatch(/^قبل التلميح:/);
    expect(ar.text).toContain("السطر 7");
  });

  it("requests changes in review, even if the counts claim every test passed", () => {
    for (const lang of ["en", "ar"] as const) {
      for (const ts of [INDENT, { ...SYNTAX, passed: 4, total: 4 }]) {
        const res = reply(baseRequest({ mode: "review", lang, code: SAMPLE_CODE, testSummary: ts }));
        expect(res.approved).toBe(false);
        const lines = res.text.split("\n");
        expect(lines[1]).toMatch(/^1\. /);
        expect(lines[1]).toContain(ts.error?.type ?? "");
        expect(lines.at(-1)).toMatch(lang === "en" ? /^Changes requested: pumps\.py doesn't load yet/ : /^مطلوب تعديلات: الملف pumps\.py لا يُحمَّل بعد/);
        expect(res.text).not.toMatch(/4 of 4|already passing/);
      }
    }
  });
});

describe("mentor prompt with a load error", () => {
  const prompt = (mode: AgentRequest["mode"], testSummary: Summary) => {
    const req = baseRequest({ mode, message: "help", testSummary });
    return buildSystemPrompt(req, WATER, getArea("liwa"), getArchetype("liwa"));
  };

  it("describes the error instead of test counts and asks for a Socratic question", () => {
    const p = prompt("chat", INDENT);
    expect(p).toContain("doesn't load");
    expect(p).toContain("IndentationError on line 7");
    expect(p).toContain("unexpected indent");
    expect(p).toMatch(/Socratic question/);
    expect(p).toMatch(/Never write the corrected line/);
    expect(p).not.toMatch(/0 of 0 passing/);
  });

  it("redacts reveal markers from the error message", () => {
    const p = prompt("chat", { ...INDENT, error: { type: "ValueError", message: "more than 20% above", line: 3 } });
    expect(p).not.toContain("20%");
  });

  it("tells the review it is CHANGES REQUESTED because the file doesn't load", () => {
    const p = prompt("review", { ...SYNTAX, passed: 4, total: 4 });
    expect(p).toMatch(/CHANGES REQUESTED, because the file doesn't load \(SyntaxError\)/);
    expect(p).not.toContain("APPROVED");
  });
});

describe("POST /api/agent with a load error", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("passes the error through to the scripted mentor", async () => {
    const res = await POST(
      new Request("http://localhost/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-shadowday-scripted": "1" },
        body: JSON.stringify({ ...valid, testSummary: INDENT }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toContain("IndentationError");
    expect(data.text).toContain("line 7");
  });
});

describe("scripted Arabic manager lines", () => {
  it("never glues لـ onto a name (لـالرويس)", () => {
    for (const area of AREAS.filter((a) => a.archetype)) {
      for (let i = 0; i < 12; i++) {
        for (const req of [
          baseRequest({ agent: "manager", mode: "demo", lang: "ar", areaId: area.id, demoSummary: `نتيجة ${i}` }),
          baseRequest({ agent: "manager", mode: "demo", lang: "ar", areaId: area.id }),
          baseRequest({ agent: "manager", mode: "chat", lang: "ar", areaId: area.id, message: `سؤال ${i}`, history: Array.from({ length: i }, () => ({ from: "student" as const, text: "x" })) }),
        ]) {
          const text = reply(req).text;
          expect(text, area.id).not.toMatch(/لـ\s*ال|لـ\{/);
        }
      }
    }
  });

  it("says why the demo matters with بالنسبة إلى", () => {
    const text = reply(baseRequest({ agent: "manager", mode: "demo", lang: "ar", areaId: "ruwais" })).text;
    expect(text).toContain("بالنسبة إلى");
  });
});
