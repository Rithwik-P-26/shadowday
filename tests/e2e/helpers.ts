import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test as base, type Page, type TestInfo } from "@playwright/test";

export type Lang = "en" | "ar";
export type TicketId = "water" | "floods" | "heat";

const ROOT = path.resolve(__dirname, "..", "..");
export const SHOTS_DIR = path.join(ROOT, "test-results", "e2e-shots");

/** Reads content/tickets/<id>/<file> from disk (Node side). */
export function ticketFile(id: TicketId, file: string): string {
  return readFileSync(path.join(ROOT, "content", "tickets", id, file), "utf8");
}

export function ticketJson(id: TicketId): {
  key: string;
  hidden: { revealKeywords: string[] };
} {
  return JSON.parse(ticketFile(id, "ticket.json"));
}

/** Every visible label the flow touches, copied from lib/i18n.ts and components. */
export const L = {
  en: {
    begin: /^Start the day at /,
    skip: "Skip",
    pickUp: (key: string) => `Pick up ${key}`,
    pythonReady: "Python is ready",
    runTests: "Run tests",
    someFailing: /\d+ of \d+ passing/,
    allPass: "All tests pass",
    revealed: "You found the hidden requirement",
    askRavi: /Ask Ravi about/,
    openPrDesktop: "Open pull request",
    approved: "Approved",
    merge: "Merge and demo it",
    runDemo: "Run it on the real data",
    wrapUp: "Wrap up the day",
    download: "Download your project (.zip)",
    reportTitle: "Shadow Report",
    send: "Send",
    tabs: { team: "Team", ticket: "Ticket", code: "Code", tests: "Tests" },
    mentor: "Ravi",
    stakeholder: { water: "Saeed", floods: "Khalid", heat: "Fatima" } as Record<TicketId, string>,
    askAnswer: "just give me the answer",
  },
  ar: {
    begin: /^ابدأ يومك في /,
    skip: "تخطَّ",
    pickUp: (key: string) => `استلم المهمة ${key}`,
    pythonReady: "بايثون جاهز",
    runTests: "شغّل الاختبارات",
    someFailing: /\d+ من \d+ ناجحة/,
    allPass: "كل الاختبارات ناجحة",
    revealed: "اكتشفت المتطلب المخفي",
    askRavi: /اسأل رافي عن/,
    openPrDesktop: "افتح طلب الدمج",
    approved: "تمت الموافقة",
    merge: "ادمج واعرض النتيجة",
    runDemo: "شغّله على البيانات الحقيقية",
    wrapUp: "اختم اليوم",
    download: "نزّل مشروعك (zip.)",
    reportTitle: "تقرير اليوم",
    send: "إرسال",
    tabs: { team: "الفريق", ticket: "المهمة", code: "الكود", tests: "الاختبارات" },
    mentor: "رافي",
    stakeholder: { water: "سعيد", floods: "خالد", heat: "فاطمة" } as Record<TicketId, string>,
    askAnswer: "أعطني الحل فقط",
  },
} as const;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type Problems = { console: string[]; page: string[] };

/**
 * Fixture: every test collects console errors and uncaught page errors and fails on any of them.
 * `shot(step)` asserts there is no horizontal overflow and saves a full-page screenshot.
 */
export const test = base.extend<{
  problems: Problems;
  shot: (step: string) => Promise<void>;
}>({
  problems: async ({ page }, use, testInfo) => {
    const problems: Problems = { console: [], page: [] };
    page.on("console", (msg) => {
      if (msg.type() === "error") problems.console.push(`${msg.text()} @ ${msg.location().url}:${msg.location().lineNumber}`);
    });
    page.on("pageerror", (err) => problems.page.push(`${err.name}: ${err.message}`));
    await use(problems);
    await testInfo.attach("console-errors", { body: JSON.stringify(problems, null, 2), contentType: "application/json" });
    expect(problems.page, "uncaught page errors").toEqual([]);
    expect(problems.console, "console errors").toEqual([]);
  },
  shot: async ({ page }, use, testInfo) => {
    let n = 0;
    await use(async (step: string) => {
      n += 1;
      await checkOverflow(page, `${testInfo.title} / ${step}`);
      await checkUniqueIds(page, `${testInfo.title} / ${step}`);
      const dir = path.join(SHOTS_DIR, testInfo.project.name);
      mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${slug(testInfo.title)}-${String(n).padStart(2, "0")}-${slug(step)}.png`);
      await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
    });
  },
});

export { expect };

export async function checkOverflow(page: Page, where: string) {
  const m = await page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders: string[] = [];
    if (document.documentElement.scrollWidth > vw + 1) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
          const cls = typeof el.className === "string" ? el.className.slice(0, 80) : "";
          offenders.push(`${el.tagName.toLowerCase()}.${cls} [${Math.round(r.left)}..${Math.round(r.right)}]`);
          if (offenders.length >= 6) break;
        }
      }
    }
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: vw, offenders };
  });
  expect
    .soft(m.scrollWidth, `horizontal overflow at "${where}" (innerWidth ${m.innerWidth}); offenders: ${m.offenders.join(" | ")}`)
    .toBeLessThanOrEqual(m.innerWidth + 1);
}

/** Duplicate ids break <label for>, aria-describedby and in-page links. */
export async function checkUniqueIds(page: Page, where: string) {
  const dups = await page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const el of Array.from(document.querySelectorAll("[id]"))) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
    return Array.from(seen.entries())
      .filter(([, n]) => n > 1)
      .map(([id, n]) => `#${id} x${n}`);
  });
  expect.soft(dups, `duplicate ids at "${where}"`).toEqual([]);
}

export async function lastMessage(page: Page, channel: "manager" | "mentor" | "stakeholder") {
  return page.evaluate((c) => {
    const s = (window as unknown as { __shadowday: { getState: () => { chats: Record<string, { from: string; text: string }[]> } } }).__shadowday.getState();
    const list = s.chats[c];
    return { count: list.length, last: list[list.length - 1] ?? null };
  }, channel);
}

/** Waits until the channel has more messages than `before` and the newest one is from the coworker. */
export async function waitForReply(page: Page, channel: "manager" | "mentor" | "stakeholder", before: number) {
  await expect
    .poll(
      async () => {
        const m = await lastMessage(page, channel);
        return m.count > before && m.last?.from === channel;
      },
      { timeout: 30_000, message: `reply from ${channel}` },
    )
    .toBe(true);
  return (await lastMessage(page, channel)).last!.text;
}

export async function injectSolution(page: Page, id: TicketId) {
  const src = ticketFile(id, "solution.py");
  await page.evaluate((code) => {
    (window as unknown as { __shadowday: { getState: () => { setCode: (c: string) => void } } }).__shadowday.getState().setCode(code);
  }, src);
}

/**
 * The Next.js dev-tools bubble (dev server only, never in a production build) sits on top of the
 * bottom-left corner and swallows taps there. Hide it for the day flows so they test the app itself.
 */
export async function hideDevOverlay(page: Page) {
  await page.addInitScript(() => {
    const css = "nextjs-portal{display:none!important}";
    const add = () => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    };
    if (document.head) add();
    else document.addEventListener("DOMContentLoaded", add, { once: true });
  });
}

export function assertNoCode(text: string, where: string) {
  expect(text, `${where}: reply must not contain a fenced block`).not.toContain("```");
  expect(text, `${where}: reply must not contain a def line`).not.toMatch(/^\s*def /m);
}

export function projectIsMobile(testInfo: TestInfo) {
  return testInfo.project.name !== "desktop-chromium";
}
