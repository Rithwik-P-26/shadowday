import { unzipSync, strFromU8 } from "fflate";
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import {
  appendToCode,
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

async function talkToMentor(page: Page, lang: Lang, viaKeyboard = false) {
  const t = L[lang];
  const mentorTab = page.getByRole("tab", { name: new RegExp(t.mentor) });
  if (viaKeyboard) {
    // The Team tablist is a real tablist: the arrow key in reading direction moves from the customer to Ravi.
    await page.getByRole("tablist", { name: t.tabs.team }).getByRole("tab", { selected: true }).focus();
    await page.keyboard.press(lang === "ar" ? "ArrowLeft" : "ArrowRight");
    await expect(mentorTab).toBeFocused();
  } else {
    await mentorTab.click();
  }
  await expect(mentorTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: t.tabs.team }).getByRole("tabpanel")).toBeVisible();
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

/**
 * Open PR only counts a run of the code that is in the editor now: an edit after the green run locks it again
 * (with a hint), and putting back exactly the tested code unlocks it without another run.
 */
async function expectEditLocksPr(page: Page, pr: Locator, id: TicketId, lang: Lang, desktop: boolean) {
  const t = L[lang];
  const summary = testSummaryButton(page, lang);
  await expect(pr).toBeEnabled();
  await expect(summary).toContainText(t.allPass);
  // Desktop shows Ravi's chat (the last channel used) next to the editor: no hint chip while everything passes.
  if (desktop) await expect(page.getByRole("button", { name: t.askRavi })).toHaveCount(0);
  await appendToCode(page, "\n# tidy up later\n");
  await expect(pr).toBeDisabled();
  await expect(page.getByText(t.codeChanged).filter({ visible: true }).first()).toBeVisible();
  // The green run is history now: the summary is muted and the ticket's ticks go neutral.
  await expect(summary).toContainText(t.lastRunStale);
  await expect(summary).not.toContainText(t.allPass);
  if (desktop) {
    await expect(page.getByRole("img", { name: t.fnPassing, exact: true })).toHaveCount(0);
    await expect(page.getByRole("img", { name: t.fnStale, exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: t.askRavi })).toHaveCount(1);
  }
  await injectSolution(page, id);
  await expect(pr).toBeEnabled();
  await expect(summary).toContainText(t.allPass);
  if (desktop) await expect(page.getByRole("img", { name: t.fnPassing, exact: true }).first()).toBeVisible();
}

/** The test summary in the action bar (a button that opens the Tests tab on phones): "Tests: <summary>". */
function testSummaryButton(page: Page, lang: Lang) {
  return page.getByRole("button", { name: new RegExp(`^${L[lang].tabs.tests}:`) });
}

/** The demo chart. The report's skill check marks are role="img" icons too (lucide), so leave those out. */
function chart(page: Page) {
  return page.locator("main svg[role=img]:not(.lucide)");
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
  await expect(chart(page)).toBeVisible({ timeout: 60_000 });
  const wrap = page.getByRole("button", { name: t.wrapUp });
  await expect(wrap).toBeVisible({ timeout: 30_000 });
  await shot("demo-chart");
  await wrap.click();

  await page.waitForURL("**/report", { timeout: 30_000 });
  await expectDir(page, lang);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText(t.reportTitle, { exact: true })).toBeVisible();
  await expect(chart(page)).toBeVisible();
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
      await talkToMentor(page, lang, true);
      await shot("mentor-hint");

      await injectSolution(page, id);
      await runTests(page, lang, true);
      await shot("all-pass");
      const pr = page.getByRole("button", { name: t.openPrDesktop });
      await expectEditLocksPr(page, pr, id, lang, true);
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
  const nav = page.getByRole("navigation", { name: t.workspaceNav, exact: true });
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
  const pr = page.getByRole("button", { name: t.prShort, exact: true });
  await expectEditLocksPr(page, pr, id, lang, false);
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
// 2b) Desktop: when a coworker can't be reached, or the merged code breaks on the real data.
// ---------------------------------------------------------------------------------------------

/**
 * The first /api/agent call for each listed "agent:mode" gets an empty 200 (askAgent treats that like a dropped
 * connection, and it leaves no console error). Every later call goes through to the server.
 */
async function dropFirstReply(page: Page, keys: string[]) {
  const pending = new Set(keys);
  await page.route("**/api/agent", async (route) => {
    let body: { agent?: string; mode?: string } = {};
    try {
      body = route.request().postDataJSON() ?? {};
    } catch {
      // not JSON: let the server answer it
    }
    if (pending.delete(`${body.agent}:${body.mode}`)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    await route.continue();
  });
}

async function storeSnapshot(page: Page) {
  return page.evaluate(() => {
    const s = (
      window as unknown as {
        __shadowday: {
          getState: () => {
            phase: string;
            merged: boolean;
            review: { approved: boolean } | null;
            demoNote: string | null;
            eod: string | null;
            chats: Record<string, { from: string; text: string }[]>;
          };
        };
      }
    ).__shadowday.getState();
    return { phase: s.phase, merged: s.merged, review: s.review, demoNote: s.demoNote, eod: s.eod, mentorTexts: s.chats.mentor.map((m) => m.text) };
  });
}

test.describe("recovery paths", () => {
  test.skip(({ isMobile }) => isMobile, "desktop project only");

  test("retry when a coworker can't be reached, and go back to the code when the demo fails", async ({ page, shot, problems }) => {
    void problems;
    const id: TicketId = "water";
    const c = CASES[id];
    const lang: Lang = "en";
    const t = L[lang];
    const name = NAMES[id];
    await hideDevOverlay(page);
    await dropFirstReply(page, ["mentor:review", "manager:demo", "manager:eod"]);

    await startDay(page, shot, c, lang, name);
    await standup(page, shot, lang, ticketJson(id).key);
    await injectSolution(page, id);
    await runTests(page, lang, true);
    const pr = page.getByRole("button", { name: t.openPrDesktop });
    await pr.click();

    // 1) Ravi's review doesn't arrive: nothing is saved as a review, and Try again asks him again.
    await expect(page.getByText(t.reachFailed(t.mentor))).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: t.merge })).toHaveCount(0);
    let s = await storeSnapshot(page);
    expect(s.review, "a failed review request is not saved as a review").toBeNull();
    expect(s.mentorTexts.some((x) => x.startsWith("My connection dropped")), "no offline placeholder in Ravi's chat").toBe(false);
    await shot("review-unreachable");
    await page.getByRole("button", { name: t.retry }).click();
    await expect(page.getByText(t.approved, { exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: t.merge }).click();

    // 2) The merged code breaks on the full dataset: the error offers a way back to the editor.
    await appendToCode(page, "\nraise ValueError('only breaks on the full dataset')\n");
    await page.getByRole("button", { name: t.runDemo }).click();
    const alert = page.getByRole("alert").filter({ hasText: t.demoFailed });
    await expect(alert).toBeVisible({ timeout: 60_000 });
    await expect(alert).toContainText("ValueError");
    await shot("demo-failed");
    await alert.getByRole("button", { name: t.backToCode }).click();
    await expect(page.getByRole("button", { name: t.runTests, exact: true })).toBeVisible();
    s = await storeSnapshot(page);
    expect(s).toMatchObject({ phase: "work", merged: false, review: null });
    // The merged code was never tested as it is now, so the PR stays locked until a fresh green run.
    await expect(pr).toBeDisabled();
    await expect(page.getByText(t.codeChanged)).toBeVisible();
    await expect(testSummaryButton(page, lang)).toContainText(t.lastRunStale);
    await shot("back-to-code");

    // 3) Fix, re-run, re-open the PR, merge and demo again. Mariam's note and the wrap-up fail once each.
    await injectSolution(page, id);
    await runTests(page, lang, true);
    await pr.click();
    await expect(page.getByText(t.approved, { exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: t.merge }).click();
    await page.getByRole("button", { name: t.runDemo }).click();
    await expect(chart(page)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(t.reachFailed(t.manager))).toBeVisible({ timeout: 30_000 });
    expect((await storeSnapshot(page)).demoNote, "a failed demo note is not saved").toBeNull();
    await shot("demo-note-unreachable");
    await page.getByRole("button", { name: t.retry }).click();
    await expect.poll(async () => (await storeSnapshot(page)).demoNote, { timeout: 30_000 }).not.toBeNull();
    await expect(page.getByText(t.reachFailed(t.manager))).toHaveCount(0);

    await page.getByRole("button", { name: t.wrapUp }).click();
    await expect(page.getByRole("alert").filter({ hasText: t.reachFailed(t.manager) })).toBeVisible({ timeout: 30_000 });
    expect((await storeSnapshot(page)).eod, "a failed wrap-up is not saved as the end-of-day note").toBeNull();
    await expect(page).toHaveURL(/\/day$/);
    await shot("wrap-up-unreachable");
    await page.getByRole("button", { name: t.retry }).click();
    await page.waitForURL("**/report", { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    s = await storeSnapshot(page);
    expect(s.eod, "the end-of-day note is the real reply").toBeTruthy();
    expect(s.eod!.startsWith("Looks like the connection dropped"), "not the offline placeholder").toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// 2c) Desktop: the keyboard shortcut runs the tests.
// ---------------------------------------------------------------------------------------------

async function runsAndCode(page: Page) {
  return page.evaluate(() => {
    const s = (window as unknown as { __shadowday: { getState: () => { runs: unknown[]; code: string } } }).__shadowday.getState();
    return { runs: s.runs.length, code: s.code };
  });
}

test.describe("keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "desktop project only");

  test("Cmd+Enter and Ctrl+Enter in the editor run the tests and leave the code alone", async ({ page, shot, problems }) => {
    void problems;
    // CodeMirror reads navigator.platform once, when it loads, to decide whether Mod is Cmd or Ctrl.
    // Pin it per page load so both shortcuts are checked on any host.
    await page.addInitScript(() => {
      try {
        const p = sessionStorage.getItem("e2e-platform");
        if (p) Object.defineProperty(Navigator.prototype, "platform", { get: () => p, configurable: true });
      } catch {
        // about:blank and opaque origins have no sessionStorage
      }
    });
    await hideDevOverlay(page);
    await startDay(page, shot, CASES.water, "en", NAMES.water);
    await standup(page, shot, "en", ticketJson("water").key);

    for (const [platform, combo] of [
      ["MacIntel", "Meta+Enter"],
      ["Win32", "Control+Enter"],
    ] as const) {
      await page.evaluate((p) => sessionStorage.setItem("e2e-platform", p), platform);
      await page.reload();
      const editor = page.locator(".cm-content");
      await expect(editor).toBeVisible();
      const before = await runsAndCode(page);
      await editor.click();
      await page.keyboard.press(combo);
      await expect
        .poll(async () => (await runsAndCode(page)).runs, { timeout: 120_000, message: `${combo} runs the tests` })
        .toBeGreaterThan(before.runs);
      expect((await runsAndCode(page)).code, `${combo} must not change the code`).toBe(before.code);
      await expect(page.getByText(L.en.someFailing).filter({ visible: true }).first()).toBeVisible();
    }
    await shot("keyboard-run");
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

  test("reload mid-day keeps the day and Python still runs", async ({ page, shot, problems, isMobile }, testInfo) => {
    // Playwright's WebKit build crashes ("Page crashed") on goto after pushState + reload; it reproduces on a bare
    // page with no app code, so it is an engine bug, not Shadowday's. Re-enable once Playwright's WebKit is fixed.
    test.fixme(testInfo.project.name === "iphone-15", "Playwright WebKit crashes on goto after pushState + reload");
    void problems;
    // The dev-tools bubble is left visible here on purpose, so this test's screenshots show where it sits.
    const c = CASES.heat;
    await startDay(page, shot, c, "en", "Noura");
    await standup(page, shot, "en", ticketJson("heat").key);
    await page.reload();
    if (isMobile) await page.getByRole("navigation", { name: L.en.workspaceNav, exact: true }).getByRole("button", { name: L.en.tabs.code }).click();
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
