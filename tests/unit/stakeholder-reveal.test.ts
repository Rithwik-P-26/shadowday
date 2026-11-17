import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AgentRequest, ArchetypeId, Lang, Ticket } from "@/lib/types";
import { ARCHETYPES, getArea } from "@/content/regions";
import { scriptedReply } from "@/lib/llm/scripted";
import { AREA_FOR, baseRequest } from "./fixtures";

// The scripted customer must give up the hidden rule for the natural follow-up questions the hint ladder pushes
// students toward ("is that the only reason?", "what about the time of day?"), and keep it for greetings, small
// talk and code questions. Run against the real tickets, whose revealKeywords are part of the matching.

const generatedPath = fileURLToPath(new URL("../../content/tickets/generated.ts", import.meta.url));
const hasGenerated = existsSync(generatedPath);

async function loadTickets(): Promise<Record<ArchetypeId, Ticket>> {
  const mod = (await import(/* @vite-ignore */ generatedPath)) as { TICKETS: Record<ArchetypeId, Ticket> };
  return mod.TICKETS;
}

type Case = [ArchetypeId, string];

const REVEAL: Record<Lang, Case[]> = {
  en: [
    // water (Saeed): hint 1 is "What would you compare each day with, and who could tell you?"
    ["water", "What would you compare each day with?"],
    ["water", "Which days should I flag?"],
    ["water", "What makes a day over-pumped?"],
    ["water", "How do I know if a day is bad?"],
    ["water", "Is that the only reason?"],
    ["water", "Anything else I should know?"],
    ["water", "How much pumping is OK?"],
    ["water", "Is it based on the previous week?"],
    ["water", "Which days should be flagged?"],
    ["water", "What worries you about a well?"],
    ["water", "How do you judge your wells?"],
    ["water", "When do you get worried about the pumps?"],
    ["water", "Is there a number I should look for?"],
    ["water", "What should I look for in the data?"],
    // floods (Khalid): hint 1 asks "are you sure one heavy hour is the only reason Khalid would close a road?"
    ["floods", "Is one heavy hour the only reason you'd close a road?"],
    ["floods", "Are there any other conditions?"],
    ["floods", "Is 20mm the only reason?"],
    ["floods", "Is there anything else besides a heavy hour?"],
    ["floods", "What makes you shut a road?"],
    ["floods", "How do you decide on a road?"],
    ["floods", "When exactly?"],
    ["floods", "Which roads should be flagged?"],
    ["floods", "Does it matter if the rain keeps getting heavier?"],
    ["floods", "What if it rains a little for many hours?"],
    // heat (Fatima): hint 1 asks "Is a high feels-like temperature really the only thing that makes outdoor work unsafe?"
    ["heat", "Is 46 the only condition?"],
    ["heat", "Does the time of day matter?"],
    ["heat", "What about the time of day?"],
    ["heat", "Are there any exceptions?"],
    ["heat", "Is heat really the only thing that matters?"],
    ["heat", "What hours can they work outside?"],
    ["heat", "Are there other times workers must stop?"],
    ["heat", "What's the threshold?"],
    ["heat", "Is there anything else besides the temperature?"],
    ["heat", "Good afternoon! Any other condition I should know about?"],
    ["heat", "When must the crew stop?"],
    ["heat", "When must the workers stop?"],
    ["heat", "When can't they work?"],
  ],
  ar: [
    ["water", "بماذا أقارن كل يوم؟"],
    ["water", "ما هي الأيام التي يجب أن أحددها؟"],
    ["water", "كيف أعرف أن المزرعة تضخ كثيراً؟"],
    ["water", "هل هذا هو السبب الوحيد؟"],
    ["water", "هل هناك شيء آخر يجب أن أعرفه؟"],
    ["water", "كيف تحكم على آبارك؟"],
    // hint 1, almost word for word: the future prefix س must not hide "تقارن"
    ["water", "بماذا ستقارن كل يوم، ومن يستطيع أن يخبرك؟"],
    ["water", "ما الأيام التي تقلقك؟"],
    ["water", "ما هو اليوم السيئ؟"],
    ["floods", "هل المطر الغزير هو السبب الوحيد؟"],
    ["floods", "هل هناك شروط أخرى؟"],
    ["floods", "متى بالضبط؟"],
    ["floods", "أي الطرق يجب أن نغلقها؟"],
    ["floods", "كيف تقرر بشأن الطريق؟"],
    ["floods", "ماذا لو استمر المطر يزيد؟"],
    ["floods", "لكل طريق، أي مقياس أحتاج؟"],
    ["heat", "هل هناك شروط أخرى غير الحرارة؟"],
    ["heat", "هل الحرارة هي الشيء الوحيد؟"],
    ["heat", "هل الوقت مهم؟"],
    ["heat", "ماذا عن وقت اليوم؟"],
    ["heat", "هل هناك استثناءات؟"],
    ["heat", "ما هو الحد؟"],
    ["heat", "هل يتوقف العمل في الصيف؟"],
    ["heat", "في أي ساعات يمنع العمل؟"],
  ],
};

const KEEP: Record<Lang, Case[]> = {
  en: [
    ["water", "Hello Saeed!"],
    ["water", "How many palms do you have?"],
    ["water", "Where exactly is your farm?"],
    ["water", "How do I write the parse function in Python?"],
    ["floods", "Hi Khalid"],
    ["floods", "How long have you worked for the municipality?"],
    ["floods", "What's your favourite wadi?"],
    ["floods", "Thank you!"],
    ["heat", "Good afternoon Fatima"],
    ["heat", "How many workers do you have?"],
    ["heat", "What are you building?"],
    ["heat", "Can you check my Python function?"],
    ["heat", "How many months has the project been running?"],
  ],
  ar: [
    ["water", "السلام عليكم"],
    ["water", "كم نخلة عندك؟"],
    ["water", "أين تقع مزرعتك؟"],
    ["water", "كيف أكتب الدالة في بايثون؟"],
    ["water", "متى بدأت الزراعة؟"],
    ["floods", "مرحبا خالد"],
    ["floods", "هل تحب عملك؟"],
    ["floods", "شكراً جزيلاً"],
    ["heat", "صباح الخير"],
    ["heat", "كم عاملاً في موقعك؟"],
    ["heat", "ماذا تبنون في الموقع؟"],
    ["heat", "ما تاريخ هذه المنطقة؟"],
  ],
};

describe.skipIf(!hasGenerated)("scripted stakeholder: when the hidden rule comes out (real tickets)", () => {
  const ask = (tickets: Record<ArchetypeId, Ticket>, id: ArchetypeId, lang: Lang, message: string) =>
    scriptedReply(baseRequest({ agent: "stakeholder", lang, areaId: AREA_FOR[id], message }), {
      ticket: tickets[id],
      area: getArea(AREA_FOR[id]),
      archetype: ARCHETYPES[id],
    });

  for (const lang of ["en", "ar"] as const) {
    it(`reveals on natural rule and follow-up questions (${lang})`, async () => {
      const tickets = await loadTickets();
      expect(REVEAL[lang].length).toBeGreaterThanOrEqual(10);
      for (const [id, message] of REVEAL[lang]) {
        const res = ask(tickets, id, lang, message);
        expect(res.revealed, `${id}: ${message}`).toBe(true);
        expect(res.text, `${id}: ${message}`).toContain(tickets[id].hidden.rule[lang]);
      }
    });

    it(`keeps the rule for greetings, small talk and code questions (${lang})`, async () => {
      const tickets = await loadTickets();
      expect(KEEP[lang].length).toBeGreaterThanOrEqual(6);
      for (const [id, message] of KEEP[lang]) {
        const res = ask(tickets, id, lang, message);
        expect(res.revealed, `${id}: ${message}`).toBe(false);
        expect(res.text, `${id}: ${message}`).not.toContain(tickets[id].hidden.rule[lang]);
      }
    });
  }

  it("answers a second question in a row even when the keywords miss it", async () => {
    const tickets = await loadTickets();
    for (const lang of ["en", "ar"] as const) {
      const [first, second] = lang === "en" ? ["How many palms do you have?", "Where exactly is your farm?"] : ["كم نخلة عندك؟", "أين تقع مزرعتك؟"];
      const req = (history: AgentRequest["history"]) =>
        scriptedReply(baseRequest({ agent: "stakeholder", lang, areaId: AREA_FOR.water, message: second, history }), {
          ticket: tickets.water,
          area: getArea(AREA_FOR.water),
          archetype: ARCHETYPES.water,
        });
      const smallTalk = ask(tickets, "water", lang, first).text;
      const again = req([{ from: "student", text: first }, { from: "stakeholder", text: smallTalk }]);
      expect(again.revealed, lang).toBe(true);
      expect(again.text).toContain(tickets.water.hidden.rule[lang]);
      // not after a greeting, and not again once the rule has been given
      expect(req([{ from: "student", text: lang === "en" ? "Hi Saeed" : "السلام عليكم" }]).revealed, lang).toBe(false);
      expect(req([{ from: "student", text: first }, { from: "stakeholder", text: again.text }]).revealed, lang).toBe(false);
    }
  });

  it("Saeed has the two wells the ticket and the data have", async () => {
    const tickets = await loadTickets();
    const all = ["en", "ar"].flatMap((lang) =>
      ["How many palms do you have?", "Tell me about your farm", "What's the weather like?", "Do you like farming?", "Who dug the well?"].map(
        (m) => ask(tickets, "water", lang as Lang, m).text,
      ),
    );
    expect(all.join("\n")).not.toMatch(/four wells|أربعة آبار/);
  });
});
