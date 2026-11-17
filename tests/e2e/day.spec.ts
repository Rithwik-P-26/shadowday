import { unzipSync, strFromU8 } from "fflate";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import {
  assertNoCode,
  expect,
  hideDevOverlay,
  injectSolution,
  L,
  lastMessage,
  test,
  ticketFile,
  ticketJson,
  waitForReply,
  type Lang,
  type TicketId,
} from "./helpers";

type Shot = (step: string) => Promise<void>;

interface DayCase {
  id: TicketId;
  area: { en: string; ar: string };
  question: { en: string; ar: string };
}

const CASES: Record<TicketId, DayCase> = {
  water: {
    id: "water",
    area: { en: "Liwa", ar: "ليوا" },
    question: { en: "What counts as over-pumping? Is there a threshold I should use?", ar: "ماذا يعني الضخ الزائد؟ ما القاعدة؟" },
  },
  floods: {
    id: "floods",
    area: { en: "Dibba Al Fujairah", ar: "دبا الفجيرة" },
    question: { en: "When should we close a road? What is the rule?", ar: "متى نغلق الطريق؟ ما القاعدة؟" },
  },
  heat: {
    id: "heat",
    area: { en: "Ruwais", ar: "الرويس" },
    question: { en: "When is it unsafe for the crew to keep working outside?", ar: "متى يكون العمل في الخارج غير آمن؟" },
  },
};

const NAMES: Record<TicketId, string> = { water: "Aisha", floods: "Hamdan", heat: "Noura" };

function mustUseKeyword(c: DayCase, lang: Lang) {
  const kws = ticketJson(c.id).hidden.revealKeywords;
  const q = c.question[lang].toLowerCase();
  expect(
    kws.some((k) => q.includes(k.toLowerCase())),
    `test setup: question "${c.question[lang]}" must contain one of ${c.id}'s revealKeywords`,
  ).toBe(true);
}

async function expectDir(page: Page, lang: Lang) {
  await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

async function startDay(page: Page, shot: Shot, c: DayCase, lang: Lang, name: string) {
  const t = L[lang];
  await page.goto("/start");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shot("start");
  if (lang === "ar") {
    await page.getByText("العربية", { exact: true }).click();
    await expectDir(page, "ar");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("من أين تبدأ يومك؟");
    await shot("start-arabic");
  } else {
    await expectDir(page, "en");
  }
  await page.getByText(c.area[lang], { exact: true }).click();
  await expect(page.getByRole("radio", { name: new RegExp(c.area[lang]) })).toBeChecked();
  await page.locator("#student-name").fill(name);
  const begin = page.getByRole("button", { name: t.begin });
  await expect(begin).toBeEnabled();
  await shot("start-area-picked");
  await begin.click();
  await page.waitForURL("**/day");
}

async function standup(page: Page, shot: Shot, lang: Lang, key: string) {
  const t = L[lang];
  await expectDir(page, lang);
  const skip = page.getByRole("button", { name: t.skip, exact: true });
  await expect(skip).toBeVisible();
  await shot("standup");
  await skip.click();
  const pick = page.getByRole("button", { name: t.pickUp(key) });
  await expect(pick).toBeEnabled();
  // Let Python finish booting so the screenshot shows the ready state (and the first run is not the boot).
  await expect(page.getByText(t.pythonReady)).toBeVisible({ timeout: 90_000 });
  await shot("standup-done");
  await pick.click();
}

async function sendChat(page: Page, text: string) {
  const input = page.locator("#chat-input:visible");
  await input.fill(text);
  await input.press("Enter");
}

async function runTests(page: Page, lang: Lang, expectAll: boolean) {
  const t = L[lang];
  const runBtn = page.getByRole("button", { name: t.runTests, exact: true });
  await expect(runBtn).toBeEnabled({ timeout: 30_000 });
  const before = await page.evaluate(
    () => (window as unknown as { __shadowday: { getState: () => { runs: unknown[] } } }).__shadowday.getState().runs.length,
  );
  await runBtn.click();
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __shadowday: { getState: () => { runs: unknown[] } } }).__shadowday.getState().runs.length),
      { timeout: 90_000, message: "test run to finish" },
    )
    .toBeGreaterThan(before);
  // On phones the hidden desktop panes are still in the DOM: only look at what is on screen.
  if (expectAll) await expect(page.getByText(t.allPass).filter({ visible: true }).first()).toBeVisible();
  else await expect(page.getByText(t.someFailing).filter({ visible: true }).first()).toBeVisible();
}

async function talkToStakeholder(page: Page, c: DayCase, lang: Lang) {
  const t = L[lang];
  mustUseKeyword(c, lang);
  await expect(page.getByRole("tab", { name: new RegExp(t.stakeholder[c.id]) })).toHaveAttribute("aria-selected", "true");
  const before = (await lastMessage(page, "stakeholder")).count;
  await sendChat(page, c.question[lang]);
  await waitForReply(page, "stakeholder", before);
  await expect(page.getByText(t.revealed).filter({ visible: true })).toBeVisible();
}

async function talkToMentor(page: Page, lang: Lang) {
  const t = L[lang];
  await page.getByRole("tab", { name: new RegExp(t.mentor) }).click();
  await expect(page.getByRole("tab", { name: new RegExp(t.mentor) })).toHaveAttribute("aria-selected", "true");
  let before = (await lastMessage(page, "mentor")).count;
  await sendChat(page, t.askAnswer);
  const refusal = await waitForReply(page, "mentor", before);
  assertNoCode(refusal, "mentor refusal");
  // The reply is on screen, too.
  await expect(page.getByText(refusal.slice(0, 40), { exact: false }).filter({ visible: true }).last()).toBeVisible();

  const hintBtn = page.getByRole("button", { name: t.askRavi });
  await expect(hintBtn).toBeEnabled();
  before = (await lastMessage(page, "mentor")).count;
  await hintBtn.click();
  const hint = await waitForReply(page, "mentor", before);
  assertNoCode(hint, "mentor hint");
}

async function reviewDemoReport(page: Page, shot: Shot, c: DayCase, lang: Lang, name: string) {
  const t = L[lang];
  await expect(page.getByText(t.approved, { exact: true })).toBeVisible({ timeout: 30_000 });
  await shot("review-approved");
  await page.getByRole("button", { name: t.merge }).click();

  const runDemo = page.getByRole("button", { name: t.runDemo });
  await expect(runDemo).toBeVisible();
  await shot("demo-start");
  await runDemo.click();
  await expect(page.locator("main svg[role=img]")).toBeVisible({ timeout: 60_000 });
  const wrap = page.getByRole("button", { name: t.wrapUp });
  await expect(wrap).toBeVisible({ timeout: 30_000 });
  await shot("demo-chart");
  await wrap.click();

  await page.waitForURL("**/report", { timeout: 30_000 });
  await expectDir(page, lang);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText(t.reportTitle, { exact: true })).toBeVisible();
  await expect(page.locator("main svg[role=img]")).toBeVisible();
  await shot("report");

  const key = ticketJson(c.id).key;
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: t.download }).click()]);
  expect(download.suggestedFilename()).toBe(`shadowday-${key.toLowerCase()}.zip`);
  const file = await download.path();
  const zip = unzipSync(new Uint8Array(readFileSync(file)));
  const names = Object.keys(zip);
  const dir = `shadowday-${key.toLowerCase()}/`;
  expect(names).toEqual(expect.arrayContaining([`${dir}README.md`, `${dir}tests.py`, `${dir}run_tests.py`]));
  const solution = ticketFile(c.id, "solution.py");
  const codeFile = names.find((n) => n.endsWith(".py") && !n.endsWith("tests.py") && !n.endsWith("run_tests.py"));
  expect(codeFile, "zip contains the student's code file").toBeTruthy();
  expect(strFromU8(zip[codeFile!])).toBe(solution);
}

// ---------------------------------------------------------------------------------------------
// 1) Desktop: a full English day for every archetype.
// ---------------------------------------------------------------------------------------------

test.describe("desktop full day", () => {
  test.skip(({ isMobile }) => isMobile, "desktop project only");

  for (const id of ["water", "floods", "heat"] as const) {
    test(`${id} day in English`, async ({ page, shot, problems }) => {
      void problems;
      const c = CASES[id];
      const lang: Lang = "en";
      const t = L[lang];
      const key = ticketJson(id).key;
      const name = NAMES[id];

      await hideDevOverlay(page);
      await startDay(page, shot, c, lang, name);
      await standup(page, shot, lang, key);

      await expect(page.getByRole("button", { name: t.runTests, exact: true })).toBeVisible();
      await shot("work-start");
      await runTests(page, lang, false);
      await shot("tests-failing");

      await talkToStakeholder(page, c, lang);
      await shot("stakeholder-revealed");
      await talkToMentor(page, lang);
      await shot("mentor-hint");

      await injectSolution(page, id);
      await runTests(page, lang, true);
      await shot("all-pass");
      const pr = page.getByRole("button", { name: t.openPrDesktop });
      await expect(pr).toBeEnabled();
      await pr.click();

      await reviewDemoReport(page, shot, c, lang, name);
    });
  }
});

// ---------------------------------------------------------------------------------------------
// 2) Phones: the water day in English through the bottom tab bar, the floods day in Arabic.
// ---------------------------------------------------------------------------------------------

async function mobileDay(page: Page, shot: Shot, id: TicketId, lang: Lang) {
  const c = CASES[id];
  const t = L[lang];
  const key = ticketJson(id).key;
  const name = lang === "ar" ? "حمدان" : NAMES[id];
  const nav = page.getByRole("navigation", { name: "Workspace" });
  const tab = (label: string) => nav.getByRole("button", { name: label, exact: false });

  await hideDevOverlay(page);
  await startDay(page, shot, c, lang, name);
  await standup(page, shot, lang, key);

  // Lands on the Ticket tab.
  await expect(nav).toBeVisible();
  await expect(tab(t.tabs.ticket)).toHaveAttribute("aria-current", "page");
  await shot("work-ticket-tab");

  await tab(t.tabs.code).click();
  await expect(page.locator(".cm-content:visible")).toBeVisible();
  await shot("work-code-tab");
  await runTests(page, lang, false);
  await tab(t.tabs.tests).click();
  await expect(tab(t.tabs.tests)).toHaveAttribute("aria-current", "page");
  await shot("tests-tab-failing");

  await tab(t.tabs.team).click();
  await expect(page.locator("#chat-input:visible")).toBeVisible();
  await shot("team-tab");
  await talkToStakeholder(page, c, lang);
  await shot("stakeholder-revealed");
  await talkToMentor(page, lang);
  await shot("mentor-hint");

  await injectSolution(page, id);
  await tab(t.tabs.code).click();
  await shot("code-with-solution");
  await runTests(page, lang, true);
  await shot("all-pass");
  const pr = page.getByRole("button", { name: "PR", exact: true });
  await expect(pr).toBeEnabled();
  await pr.click();

  await reviewDemoReport(page, shot, c, lang, name);
}

test.describe("phone day", () => {
  test.skip(({ isMobile }) => !isMobile, "phone projects only");

  test("water day in English with the tab bar", async ({ page, shot, problems }) => {
    void problems;
    await mobileDay(page, shot, "water", "en");
  });

  test("floods day in Arabic", async ({ page, shot, problems }) => {
    void problems;
    await mobileDay(page, shot, "floods", "ar");
  });
});

// ---------------------------------------------------------------------------------------------
// 3) Every project: the screens that are not part of the day flows above.
// ---------------------------------------------------------------------------------------------

test.describe("other screens", () => {
  test("report with no finished day, both languages", async ({ page, shot, problems }) => {
    void problems;
    await page.goto("/report");
    await expect(page.getByText("Finish a day first to get your report.")).toBeVisible();
    await shot("report-empty-en");
    await page.goto("/start");
    await page.getByText("العربية", { exact: true }).click();
    await expectDir(page, "ar");
    await page.goto("/report");
    await expect(page.getByText("أنهِ يوماً أولاً لتحصل على تقريرك.")).toBeVisible();
    await expectDir(page, "ar");
    await shot("report-empty-ar");
  });

  test("day without a session sends you to /start", async ({ page, shot, problems }) => {
    void problems;
    await page.goto("/day");
    await page.waitForURL("**/start");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot("redirected-start");
  });

  test("reload mid-day keeps the day and Python still runs", async ({ page, shot, problems, isMobile }) => {
    void problems;
    // The dev-tools bubble is left visible here on purpose, so this test's screenshots show where it sits.
    const c = CASES.heat;
    await startDay(page, shot, c, "en", "Noura");
    await standup(page, shot, "en", ticketJson("heat").key);
    await page.reload();
    if (isMobile) await page.getByRole("navigation", { name: "Workspace" }).getByRole("button", { name: "Code" }).click();
    const runBtn = page.getByRole("button", { name: L.en.runTests, exact: true });
    await expect(runBtn).toBeVisible();
    await shot("work-after-reload");
    // Python has to boot again in the reloaded page.
    await runBtn.click();
    const finished = await expect
      .poll(
        () => page.evaluate(() => (window as unknown as { __shadowday: { getState: () => { runs: unknown[] } } }).__shadowday.getState().runs.length),
        { timeout: 120_000, message: "first test run after a reload" },
      )
      .toBeGreaterThan(0)
      .then(() => true)
      .catch(() => false);
    await shot("tests-after-reload");
    expect(finished, "a test run finishes after reloading /day").toBe(true);
    await expect(page.getByText(L.en.someFailing).filter({ visible: true }).first()).toBeVisible();
    await page.goto("/start");
    await expect(page.getByRole("button", { name: "Resume your day" })).toBeVisible();
    await shot("start-resume-banner");
  });
});
