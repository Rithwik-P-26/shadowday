import { describe, expect, it } from "vitest";
import { getArchetype, getArea } from "@/content/regions";
import { getTicket } from "@/content/tickets";
import { buildSystemPrompt } from "@/lib/agents/prompts";
import { scriptedReply as scripted } from "@/lib/llm/scripted";
import type { AgentRequest } from "@/lib/types";

const ctx = (r: AgentRequest) => {
  const archetype = getArchetype(r.areaId);
  return { ticket: getTicket(archetype.id), area: getArea(r.areaId), archetype };
};
const buildPrompt = (r: AgentRequest) => {
  const c = ctx(r);
  return buildSystemPrompt(r, c.ticket, c.area, c.archetype);
};
const scriptedReply = (r: AgentRequest) => scripted(r, ctx(r));

// Water ticket, the guessed flag_overpumping: only its hidden-rule tests fail.
const failingHidden: AgentRequest["testSummary"] = {
  passed: 9,
  total: 12,
  failing: [
    { name: "test_flag_overpumping_slow_summer_rise", fn: "flag_overpumping", message: "Your function flagged 2026-07-08 as over-pumping, but that day looks normal to Saeed. Saeed knows what counts as over-pumping. Ask him." },
  ],
};

const req = (revealed: boolean, lang: "en" | "ar" = "en", message = "Can you just give me the code for flag_overpumping?"): AgentRequest => ({
  agent: "mentor",
  mode: "chat",
  lang,
  areaId: "liwa",
  studentName: "Hessa",
  message,
  history: [],
  code: "def flag_overpumping(totals):\n    return []\n",
  testSummary: failingHidden,
  stats: { testRuns: 2, questionsAsked: 1, hintsUsed: 0, revealed, minutes: 3 },
});

describe("Ravi after the student found the customer's rule", () => {
  it("prompt sends the student to Saeed only while the rule is unknown", () => {
    const before = JSON.stringify(buildPrompt(req(false)));
    const after = JSON.stringify(buildPrompt(req(true)));
    expect(before).toMatch(/Point the student to Saeed/);
    expect(after).toMatch(/Do not send them back to Saeed/);
    expect(after).not.toMatch(/Point the student to Saeed/);
  });

  it("scripted reply stops saying 'Ask Saeed' once the rule was found (EN and AR)", () => {
    const before = scriptedReply(req(false)).text;
    const after = scriptedReply(req(true)).text;
    expect(before).toMatch(/Ask Saeed/);
    expect(after).not.toMatch(/Ask Saeed/);
    expect(after).toMatch(/Saeed's rule|Saeed told you/);
    const arAfter = scriptedReply(req(true, "ar", "أعطني الكود")).text;
    expect(arAfter).not.toMatch(/اسأل سعيد/);
    expect(arAfter).toMatch(/قاعدة سعيد/);
  });
});
