import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AgentRequest, ArchetypeId, Lang, Ticket } from "@/lib/types";
import { ARCHETYPES, getArea } from "@/content/regions";
import { buildSystemPrompt } from "@/lib/agents/prompts";
import { scriptedReply } from "@/lib/llm/scripted";
import { detectReveal, publicContext, violatesNoCode } from "@/lib/agents/guardrails";
import { ARABIC_RE, hiddenRuleFns } from "@/lib/agents/util";
import { AREA_FOR, baseRequest } from "./fixtures";

// The same isolation and coverage checks as the fixture tests, run against the real tickets once
// content/tickets/generated.ts exists. Skipped until then.

const generatedPath = fileURLToPath(new URL("../../content/tickets/generated.ts", import.meta.url));
const hasGenerated = existsSync(generatedPath);
const IDS: ArchetypeId[] = ["water", "floods", "heat"];
const MODES: AgentRequest["mode"][] = ["chat", "hint", "review", "demo", "eod"];
const LANGS: Lang[] = ["en", "ar"];

async function loadTickets(): Promise<Record<ArchetypeId, Ticket>> {
  const mod = (await import(/* @vite-ignore */ generatedPath)) as { TICKETS: Record<ArchetypeId, Ticket> };
  return mod.TICKETS;
}

/** ticket.json carries hiddenFn, which the generated Ticket doesn't. */
function sourceHiddenFn(id: ArchetypeId): string | undefined {
  const path = fileURLToPath(new URL(`../../content/tickets/${id}/ticket.json`, import.meta.url));
  if (!existsSync(path)) return undefined;
  const meta = JSON.parse(readFileSync(path, "utf8")) as { hiddenFn?: string };
  return meta.hiddenFn;
}

describe.skipIf(!hasGenerated)("real tickets (content/tickets/generated.ts)", () => {
  it("only the stakeholder prompt contains each hidden rule", async () => {
    const tickets = await loadTickets();
    for (const id of IDS) {
      const ticket = tickets[id];
      expect(ticket, `ticket ${id}`).toBeTruthy();
      const area = getArea(AREA_FOR[id]);
      const archetype = ARCHETYPES[id];
      for (const lang of LANGS) {
        const stakeholder = buildSystemPrompt(baseRequest({ agent: "stakeholder", lang, areaId: area.id }), ticket, area, archetype);
        expect(stakeholder).toContain(ticket.hidden.rule[lang]);
        for (const agent of ["mentor", "manager"] as const) {
          for (const mode of MODES) {
            for (const fn of Object.keys(ticket.hints)) {
              for (const hintLevel of [0, 1, 2]) {
                const prompt = buildSystemPrompt(baseRequest({ agent, mode, lang, areaId: area.id, focusFn: fn, hintLevel }), ticket, area, archetype);
                expect(prompt, `${id} ${agent} ${mode} ${lang} ${fn} ${hintLevel}`).not.toContain(ticket.hidden.rule.en);
                expect(prompt, `${id} ${agent} ${mode} ${lang} ${fn} ${hintLevel}`).not.toContain(ticket.hidden.rule.ar);
              }
            }
          }
        }
      }
    }
  });

  it("finds the hidden-rule function the ticket author intended", async () => {
    const tickets = await loadTickets();
    for (const id of IDS) {
      const expected = sourceHiddenFn(id);
      if (!expected) continue;
      const names = [ARCHETYPES[id].stakeholder.name.en, ARCHETYPES[id].stakeholder.name.ar];
      expect([...hiddenRuleFns(tickets[id], names)], id).toEqual([expected]);
    }
  });

  it("the rule text itself counts as a reveal, and the public text doesn't", async () => {
    const tickets = await loadTickets();
    for (const id of IDS) {
      const pub = publicContext(tickets[id], ARCHETYPES[id]);
      for (const lang of LANGS) expect(detectReveal(tickets[id].hidden.rule[lang], tickets[id], pub), `${id} ${lang}`).toBe(true);
      expect(detectReveal(pub, tickets[id], pub), id).toBe(false);
    }
  });

  it("the scripted stakeholder reveals on the ticket's own keywords", async () => {
    const tickets = await loadTickets();
    for (const id of IDS) {
      const ctx = { ticket: tickets[id], area: getArea(AREA_FOR[id]), archetype: ARCHETYPES[id] };
      const keyword = tickets[id].hidden.revealKeywords[0];
      const res = scriptedReply(baseRequest({ agent: "stakeholder", areaId: AREA_FOR[id], message: `Can I ask about ${keyword}?` }), ctx);
      expect(res.revealed, id).toBe(true);
      expect(res.text).toContain(tickets[id].hidden.rule.en);
    }
  });

  it("scripted replies cover every agent × mode × language and hint level", async () => {
    const tickets = await loadTickets();
    for (const id of IDS) {
      const ctx = { ticket: tickets[id], area: getArea(AREA_FOR[id]), archetype: ARCHETYPES[id] };
      for (const agent of ["manager", "stakeholder", "mentor"] as const) {
        for (const mode of MODES) {
          for (const lang of LANGS) {
            for (const hintLevel of [0, 1, 2, 3]) {
              for (const focusFn of ctx.ticket.functions.map((f) => f.name)) {
                const res = scriptedReply(baseRequest({ agent, mode, lang, areaId: AREA_FOR[id], message: "hello", hintLevel, focusFn }), ctx);
                expect(res.text.trim().length).toBeGreaterThan(10);
                expect(violatesNoCode(res.text, ctx.ticket), res.text).toBe(false);
                if (lang === "ar") expect(res.text).toMatch(ARABIC_RE);
              }
            }
          }
        }
      }
    }
  });
});
