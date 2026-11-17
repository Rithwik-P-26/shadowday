import { describe, expect, it } from "vitest";
import type { AgentRequest, ArchetypeId, Lang } from "@/lib/types";
import { getArchetype, getArea } from "@/content/regions";
import { scriptedReply } from "@/lib/llm/scripted";
import { violatesNoCode } from "@/lib/agents/guardrails";
import { ARABIC_RE } from "@/lib/agents/util";
import { AREA_FOR, baseRequest, FIXTURE_TICKETS, SAMPLE_CODE, WATER } from "./fixtures";

const AGENTS: AgentRequest["agent"][] = ["manager", "stakeholder", "mentor"];
const MODES: AgentRequest["mode"][] = ["chat", "hint", "review", "demo", "eod"];
const LANGS: Lang[] = ["en", "ar"];
const ARCHETYPES: ArchetypeId[] = ["water", "floods", "heat"];

function reply(req: AgentRequest) {
  const archetype = getArchetype(req.areaId);
  return scriptedReply(req, { ticket: FIXTURE_TICKETS[archetype.id], area: getArea(req.areaId), archetype });
}

describe("coverage", () => {
  for (const id of ARCHETYPES) {
    for (const agent of AGENTS) {
      for (const mode of MODES) {
        for (const lang of LANGS) {
          it(`${id} ${agent} ${mode} ${lang} is non-empty and code-free`, () => {
            const variants: Partial<AgentRequest>[] = [
              {},
              { message: "hello" },
              { message: "I don't get it", studentName: "Omar", testSummary: { passed: 1, total: 3, failing: [{ name: "test_x", fn: FIXTURE_TICKETS[id].functions[0].name, message: "boom" }] } },
              { message: "what's the threshold?", code: SAMPLE_CODE, hintLevel: 2, demoSummary: "2 flagged", stats: { testRuns: 5, questionsAsked: 2, hintsUsed: 1, revealed: true, minutes: 30 } },
            ];
            for (const v of variants) {
              const res = reply(baseRequest({ agent, mode, lang, areaId: AREA_FOR[id], ...v }));
              expect(res.provider).toBe("scripted");
              expect(res.text.trim().length).toBeGreaterThan(10);
              expect(violatesNoCode(res.text, FIXTURE_TICKETS[id])).toBe(false);
              if (lang === "ar") expect(res.text).toMatch(ARABIC_RE);
              if (agent === "stakeholder") expect(typeof res.revealed).toBe("boolean");
            }
          });
        }
      }
    }
  }

  it("is deterministic", () => {
    const req = baseRequest({ agent: "stakeholder", message: "How many palms do you have?" });
    expect(reply(req)).toEqual(reply(req));
  });
});

describe("stakeholder", () => {
  const ask = (message: string, lang: Lang = "en", id: ArchetypeId = "water") =>
    reply(baseRequest({ agent: "stakeholder", lang, areaId: AREA_FOR[id], message }));

  it("reveals the rule when a reveal keyword is asked", () => {
    const res = ask("When is a well over-pumping?");
    expect(res.revealed).toBe(true);
    expect(res.text).toContain(WATER.hidden.rule.en);
  });

  it("reveals on generic threshold questions too, in either language", () => {
    expect(ask("Is there a threshold you use?").revealed).toBe(true);
    expect(ask("What's the rule for closing a road?", "en", "floods").revealed).toBe(true);
    const ar = ask("ما هو الحد الذي تعتمد عليه؟", "ar");
    expect(ar.revealed).toBe(true);
    expect(ar.text).toContain(WATER.hidden.rule.ar);
  });

  it("matches keywords case-insensitively", () => {
    expect(ask("WHAT COUNTS as too much?").revealed).toBe(true);
  });

  it("greets, thanks and deflects without revealing", () => {
    for (const msg of ["Hello!", "thanks!", "How do I write the parse function in Python?", "How many palms do you have?"]) {
      const res = ask(msg);
      expect(res.revealed).toBe(false);
      expect(res.text).not.toContain(WATER.hidden.rule.en);
    }
    expect(ask("How do I fix this Python bug?").text).toMatch(/computer|code|Code/);
  });

  it("speaks as the right character for each archetype", () => {
    expect(ask("hi", "en", "water").text + ask("hello", "en", "water").text).toMatch(/Saeed|palms|wells/);
    expect(ask("hi", "en", "heat").text).toMatch(/Fatima|site|crews|workers/);
  });

  it("does not reveal on 'someone' in Arabic (أحد)", () => {
    expect(ask("هل يعمل أحد معك في المزرعة؟", "ar").revealed).toBe(false);
  });
});

describe("mentor", () => {
  it("gives the hint for the focus function at the requested level, clamped", () => {
    for (const level of [0, 1, 2]) {
      const res = reply(baseRequest({ mode: "hint", focusFn: "parse_reading", hintLevel: level }));
      expect(res.text).toContain(WATER.hints.parse_reading[level].text.en);
    }
    expect(reply(baseRequest({ mode: "hint", focusFn: "parse_reading", hintLevel: 10 })).text).toContain(WATER.hints.parse_reading[2].text.en);
    expect(reply(baseRequest({ mode: "hint", focusFn: "parse_reading", hintLevel: -3 })).text).toContain(WATER.hints.parse_reading[0].text.en);
  });

  it("uses the Arabic hint in Arabic", () => {
    const res = reply(baseRequest({ mode: "hint", lang: "ar", focusFn: "daily_total", hintLevel: 1 }));
    expect(res.text).toContain(WATER.hints.daily_total[1].text.ar);
  });

  it("falls back to the first failing function when focusFn is unknown", () => {
    const res = reply(baseRequest({ mode: "hint", focusFn: "nope", testSummary: { passed: 0, total: 1, failing: [{ name: "t", fn: "daily_total", message: "" }] } }));
    expect(res.text).toContain(WATER.hints.daily_total[0].text.en);
  });

  it("refuses to give the answer, in English and Arabic", () => {
    for (const message of ["just give me the code", "What's the solution?", "can you write it for me"]) {
      const res = reply(baseRequest({ message }));
      expect(res.text).toMatch(/won't write|answer|spoilers/i);
      expect(res.text).toMatch(/\?/);
    }
    const ar = reply(baseRequest({ lang: "ar", message: "أعطني الحل من فضلك" }));
    expect(ar.text).toMatch(/لن أكتبه|الحل|لا حلول/);
    for (const message of ["Can you write flag_wells for me?", "Paste the complete function please"]) {
      expect(reply(baseRequest({ message })).text, message).toMatch(/won't write|answer|spoilers/i);
    }
    expect(reply(baseRequest({ lang: "ar", message: "اكتب لي الدالة flag_wells كاملة" })).text).toMatch(/لن أكتبه|الحل|لا حلول/);
  });

  it("names the first failing function in chat", () => {
    const res = reply(baseRequest({ message: "I'm confused", testSummary: { passed: 1, total: 2, failing: [{ name: "test_daily_total", fn: "daily_total", message: "x" }] } }));
    expect(res.text).toContain("daily_total");
    expect(res.text).toContain("test_daily_total");
  });

  it("points to the stakeholder when the hidden-rule test fails", () => {
    const res = reply(baseRequest({ message: "why does this fail", testSummary: { passed: 3, total: 4, failing: [{ name: "test_flag_uses_own_average", fn: "flag_wells", message: "x" }] } }));
    expect(res.text).toContain("Saeed");
    expect(res.text).not.toContain(WATER.hidden.rule.en);
  });

  it("approves a review only when every test passes", () => {
    const pass = reply(baseRequest({ mode: "review", code: "def parse_reading(line):\n    return line.split(',')\n", testSummary: { passed: 4, total: 4, failing: [] } }));
    expect(pass.approved).toBe(true);
    expect(pass.text).toMatch(/^Approved\./m);

    const partial = reply(baseRequest({ mode: "review", code: SAMPLE_CODE, testSummary: { passed: 3, total: 4, failing: [{ name: "test_flag_uses_own_average", fn: "flag_wells", message: "x" }] } }));
    expect(partial.approved).toBe(false);
    expect(partial.text).toMatch(/Changes requested/);

    const none = reply(baseRequest({ mode: "review", testSummary: { passed: 0, total: 0, failing: [] } }));
    expect(none.approved).toBe(false);
    expect(reply(baseRequest({ mode: "review" })).approved).toBe(false);
  });

  it("writes praise, 1 to 3 numbered suggestions and a decision line", () => {
    const res = reply(baseRequest({ mode: "review", code: SAMPLE_CODE, testSummary: { passed: 4, total: 4, failing: [] } }));
    const lines = res.text.split("\n");
    const numbered = lines.filter((l) => /^\d\. /.test(l));
    expect(numbered.length).toBeGreaterThanOrEqual(1);
    expect(numbered.length).toBeLessThanOrEqual(3);
    expect(lines[0]).toMatch(/dict\.get|strip|split|docstring/);
    expect(res.text).toMatch(/print\(\)/);
    expect(res.text).toMatch(/TODO/);
  });

  it("sends the student to the pull request once every test passes", () => {
    const green = { passed: 12, total: 12, failing: [] };
    const en = reply(baseRequest({ message: "All my tests pass now, what next?", testSummary: green }));
    expect(en.text).toMatch(/pull request/);
    expect(en.text).toContain("12");
    expect(en.text).not.toMatch(/parse_reading|What have you tried/);
    const ar = reply(baseRequest({ lang: "ar", message: "نجحت كل الاختبارات، ماذا بعد؟", testSummary: green }));
    expect(ar.text).toContain("طلب الدمج");
    // Not refused either: nothing is left to solve.
    expect(reply(baseRequest({ message: "Is my solution correct?", testSummary: green })).text).toMatch(/pull request/);
  });

  it("doesn't treat questions about the student's own work as asking for the answer", () => {
    const failing = { passed: 3, total: 4, failing: [{ name: "test_flag_uses_own_average", fn: "flag_wells", message: "x" }] };
    for (const message of ["Is my solution correct now?", "The test says the expected answer is 2 dates, why?"]) {
      const res = reply(baseRequest({ message, testSummary: failing }));
      expect(res.text, message).not.toMatch(/won't write|If I give you the answer|No spoilers/);
      expect(res.text, message).toContain("Saeed");
    }
    const ar = reply(baseRequest({ lang: "ar", message: "هل الحل الذي كتبته صحيح؟", testSummary: failing }));
    expect(ar.text).not.toMatch(/لن أكتبه|إن أعطيتك الحل|لا حلول جاهزة/);
    expect(ar.text).toContain("سعيد");
    expect(reply(baseRequest({ lang: "ar", message: "ما الحلقة التي أحتاجها هنا؟" })).text).not.toMatch(/لن أكتبه|إن أعطيتك الحل|لا حلول جاهزة/);
  });

  it("points to the stakeholder when refusing and a hidden-rule test fails", () => {
    const failing = { passed: 3, total: 4, failing: [{ name: "test_flag_uses_own_average", fn: "flag_wells", message: "x" }] };
    const res = reply(baseRequest({ message: "just give me the code", testSummary: failing }));
    expect(res.text).toMatch(/won't write|answer|spoilers/i);
    expect(res.text).toContain("Ask Saeed");
  });

  it("only suggests docstrings and edge cases the code is actually missing", () => {
    const documented = [
      "def parse_reading(line):",
      '    """Turn one line into a dict."""',
      "    line = line.strip()",
      "    if not line:",
      "        return None",
      "    return line.split(',')",
      "",
      "def daily_total(readings, well_id):",
      "",
      "    '''Total liters for one well.'''",
      "    return sum(r['liters'] for r in readings if r)",
    ].join("\n");
    const approved = reply(baseRequest({ mode: "review", code: documented, testSummary: { passed: 12, total: 12, failing: [] } }));
    expect(approved.approved).toBe(true);
    expect(approved.text).not.toMatch(/docstring|empty line or a missing value/);
    const numbered = approved.text.split("\n").filter((l) => /^\d\. /.test(l));
    expect(numbered.length).toBeGreaterThanOrEqual(1);
    expect(numbered.length).toBeLessThanOrEqual(3);

    const bare = 'def parse_reading(line):\n    """Doc."""\n    return line\n\ndef daily_total(readings, well_id):\n    return 0\n';
    const res = reply(baseRequest({ mode: "review", code: bare, testSummary: { passed: 4, total: 4, failing: [] } }));
    expect(res.text).toMatch(/daily_total has no docstring/);
    expect(res.text).not.toMatch(/parse_reading has no docstring/);
  });

  it("flags very long lines", () => {
    const code = `def parse_reading(line):\n    return ${"x".repeat(120)}\n`;
    const res = reply(baseRequest({ mode: "review", code, testSummary: { passed: 4, total: 4, failing: [] } }));
    expect(res.text).toMatch(/Line 2 is over 100 characters/);
  });
});

describe("manager", () => {
  it("reacts to the demo summary", () => {
    const res = reply(baseRequest({ agent: "manager", mode: "demo", demoSummary: "Your code flagged wells W2 and W7." }));
    expect(res.text).toContain("Your code flagged wells W2 and W7.");
    expect(res.text).toContain("Saeed");
  });

  it("builds the end-of-day review from stats", () => {
    const res = reply(baseRequest({ agent: "manager", mode: "eod", studentName: "Sara", stats: { testRuns: 8, questionsAsked: 3, hintsUsed: 2, revealed: true, minutes: 41 } }));
    expect(res.text).toContain("Sara");
    expect(res.text).toContain("41 minutes");
    expect(res.text).toContain("8 times");
    expect(res.text).toContain("3 questions");
    expect(res.text).toContain("2 hints");
    expect(res.text).toMatch(/found the rule/);
    expect(res.text).toMatch(/Next step:/);
    expect(res.text).toMatch(/Role note:/);
    expect(res.text).toContain("Falaj Labs");
  });

  it("suggests asking the customer when the rule wasn't found", () => {
    const res = reply(baseRequest({ agent: "manager", mode: "eod", stats: { testRuns: 3, questionsAsked: 0, hintsUsed: 0, revealed: false, minutes: 20 } }));
    expect(res.text).toMatch(/Next step: before writing code on a new ticket, ask the customer/);
  });

  it("writes Arabic counts and a role note in Arabic", () => {
    const res = reply(baseRequest({ agent: "manager", mode: "eod", lang: "ar", stats: { testRuns: 2, questionsAsked: 5, hintsUsed: 1, revealed: true, minutes: 30 } }));
    expect(res.text).toContain("مرتين");
    expect(res.text).toContain("5 أسئلة");
    expect(res.text).toContain("تلميحاً واحداً");
    expect(res.text).toContain("عن الوظيفة:");
    expect(res.text).toContain("فلج لابز");
  });

  it("answers questions about the job and the company", () => {
    expect(reply(baseRequest({ agent: "manager", message: "What do engineers here do all day?" })).text).toMatch(/Engineers at/);
    expect(reply(baseRequest({ agent: "manager", message: "Tell me about the company" })).text).toContain("flow meters");
  });
});
