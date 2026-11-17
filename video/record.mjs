// Records the Shadowday demo footage segment by segment with Chrome's screencast (sharp JPEG frames),
// driving the real app on http://localhost:3000 with live AI coworkers.
// Usage: node video/record.mjs [segmentId ...]   (default: all)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT = path.join(HERE, "tmp", "frames");
const BASE = process.env.SHADOWDAY_URL || "http://localhost:3000";
const CARDS = pathToFileURL(path.join(HERE, "cards", "cards.html")).href;
const W = 1920;
const H = 1080;
const only = new Set(process.argv.slice(2));
const want = (id) => only.size === 0 || only.has(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const audioDur = JSON.parse(fs.readFileSync(path.join(HERE, "tmp", "durations.json"), "utf8"));

/** Start a CDP screencast on a page; returns stop() which writes frames + an ffconcat list. */
async function startRec(page, id, { maxWidth = W, maxHeight = H } = {}) {
  const dir = path.join(OUT, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    try {
      await cdp.send("Page.screencastFrameAck", { sessionId });
    } catch {}
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth, maxHeight, everyNthFrame: 1 });
  const started = Date.now() / 1000;
  return async () => {
    const ended = Date.now() / 1000;
    await cdp.send("Page.stopScreencast").catch(() => {});
    await cdp.detach().catch(() => {});
    if (!frames.length) throw new Error(`no frames for ${id}`);
    // ffconcat with per-frame durations (screencast only emits on change)
    const lines = ["ffconcat version 1.0"];
    const first = Math.max(started, frames[0].t);
    for (let i = 0; i < frames.length; i++) {
      const t0 = i === 0 ? first : frames[i].t;
      const t1 = i + 1 < frames.length ? frames[i + 1].t : ended;
      lines.push(`file '${path.basename(frames[i].file)}'`, `duration ${Math.max(0.001, t1 - t0).toFixed(4)}`);
    }
    lines.push(`file '${path.basename(frames[frames.length - 1].file)}'`);
    fs.writeFileSync(path.join(dir, "list.ffconcat"), lines.join("\n") + "\n");
    console.log(`${id}: ${frames.length} frames, ${(ended - started).toFixed(1)}s (audio ${audioDur[id]?.toFixed(1)}s)`);
  };
}

async function typeSlow(locator, text, delay = 45) {
  await locator.click();
  await locator.pressSequentially(text, { delay });
}

const SOLUTION_PARTS = (() => {
  const src = fs.readFileSync(path.join(ROOT, "content/tickets/water/solution.py"), "utf8");
  const starter = fs.readFileSync(path.join(ROOT, "content/tickets/water/starter.py"), "utf8");
  const fnBody = (code, name) => {
    const m = code.match(new RegExp(`def ${name}\\([\\s\\S]*?(?=\\ndef |$)`));
    return m ? m[0].trimEnd() : "";
  };
  const names = ["parse_reading", "daily_totals", "flag_overpumping"];
  // Replace starter functions one at a time with the reference implementation (keeps the starter's header/docstrings).
  const steps = [];
  let cur = starter;
  for (const n of names) {
    const sf = fnBody(cur, n);
    let impl = fnBody(src, n);
    impl = impl.replace(/\n\s*# Saeed:.*\n\s*#.*\n/, "\n");
    // keep the starter's docstring: insert implementation lines after the docstring of the starter function
    const doc = sf.match(/^(def [^\n]+\n\s+"""[\s\S]*?"""\n)/);
    const implBody = impl.replace(/^def [^\n]+\n/, "");
    cur = cur.replace(sf, (doc ? doc[1] : sf.split("\n")[0] + "\n") + implBody);
    steps.push(cur);
  }
  return steps;
})();

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ---------- cards ----------
  if (want("01-hook") || want("02-intro") || want("10-arch") || want("11-close")) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(CARDS + "#blank");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    if (want("01-hook")) {
      await page.goto(CARDS + "#stat1");
      await page.evaluate(() => document.fonts.ready);
      const stop = await startRec(page, "01-hook");
      const each = (audioDur["01-hook"] * 1000) / 3;
      await sleep(each * 0.92);
      await page.evaluate(() => (location.hash = "#stat2"));
      await sleep(each * 1.04);
      await page.evaluate(() => (location.hash = "#stat3"));
      await sleep(each * 1.04 + 400);
      await stop();
    }
    if (want("10-arch")) {
      await page.goto(CARDS + "#arch");
      await sleep(500);
      const stop = await startRec(page, "10-arch");
      await sleep(audioDur["10-arch"] * 1000 + 400);
      await stop();
    }
    if (want("11-close")) {
      await page.goto(CARDS + "#close");
      const stop = await startRec(page, "11-close");
      await sleep(audioDur["11-close"] * 1000 + 1200);
      await stop();
    }
    await ctx.close();
  }

  // ---------- desktop day (Hessa, Liwa) ----------
  const desktopIds = ["02-intro", "03-start", "04-standup", "05-work", "06-review", "07-demo", "08-report"];
  if (desktopIds.some(want)) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(BASE + "/start");
    await page.evaluate(() => localStorage.clear());

    // 02: title card, then the landing page
    {
      await page.goto(CARDS + "#title");
      await page.evaluate(() => document.fonts.ready);
      const stop = await startRec(page, "02-intro");
      await sleep(2600);
      await page.goto(BASE + "/");
      await page.waitForLoadState("networkidle").catch(() => {});
      await sleep(Math.max(1500, audioDur["02-intro"] * 1000 - 2600));
      await page.mouse.wheel(0, 500);
      await sleep(900);
      await stop();
    }

    // 03: pick Liwa
    await page.goto(BASE + "/start");
    await page.waitForSelector("text=Liwa");
    await sleep(800);
    {
      const stop = await startRec(page, "03-start");
      await sleep(1600);
      await page.getByText("Liwa", { exact: true }).click();
      await sleep(900);
      await typeSlow(page.getByLabel(/Your first name/), "Hessa", 110);
      await sleep(700);
      await page.getByRole("button", { name: /Start the day at Falaj Labs/ }).click();
      await page.waitForURL(/\/day/);
      await sleep(1500);
      await stop();
    }

    // 04: standup (lines appear on their own)
    {
      const stop = await startRec(page, "04-standup");
      await page.getByRole("button", { name: /Pick up FLJ-42/ }).waitFor();
      await page.waitForFunction(() => !Array.from(document.querySelectorAll("button")).some((b) => /^Skip$/.test(b.textContent?.trim() || "")), null, { timeout: 30000 });
      await sleep(900);
      await page.getByRole("button", { name: /Pick up FLJ-42/ }).click();
      await sleep(1200);
      await stop();
    }

    // 05: the work
    {
      const stop = await startRec(page, "05-work");
      await page.getByRole("button", { name: /^Run tests/ }).click();
      await page.getByText(/of 12 passing/).waitFor({ timeout: 60000 });
      await sleep(1800);
      const box = page.getByRole("textbox", { name: /Message Saeed/ });
      await typeSlow(box, "What counts as over-pumping for your wells?", 35);
      await box.press("Enter");
      await page.getByText(/You found the hidden requirement/).waitFor({ timeout: 30000 });
      await sleep(3500);
      await page.getByRole("tab", { name: /Ravi/ }).click();
      await sleep(600);
      const box2 = page.getByRole("textbox", { name: /Message Ravi/ });
      await typeSlow(box2, "Can you just give me the code for flag_overpumping?", 35);
      await box2.press("Enter");
      await page.waitForFunction(() => document.querySelectorAll('[aria-live] .msg-in, [role="log"] .msg-in').length > 0, null, { timeout: 30000 }).catch(() => {});
      await sleep(4200);
      for (const step of SOLUTION_PARTS) {
        await page.evaluate((code) => window.__shadowday.getState().setCode(code), step);
        await sleep(1100);
      }
      await page.getByRole("button", { name: /^Run tests/ }).click();
      await page.getByText(/All tests pass/).first().waitFor({ timeout: 60000 });
      await sleep(2200);
      await stop();
    }

    // 06: pull request review
    {
      const stop = await startRec(page, "06-review");
      await page.getByRole("button", { name: /Open pull request/ }).click();
      await page.getByText(/^Approved$/).waitFor({ timeout: 60000 });
      await sleep(3200);
      await stop();
    }

    // 07: demo
    {
      const stop = await startRec(page, "07-demo");
      await page.getByRole("button", { name: /Merge and demo it/ }).click();
      await sleep(700);
      await page.getByRole("button", { name: /Run it on the real data/ }).click();
      await page.locator("svg[role=img]").first().waitFor({ timeout: 60000 });
      await page.getByRole("button", { name: /Wrap up the day/ }).waitFor({ timeout: 60000 });
      await sleep(2500);
      await stop();
    }

    // 08: report
    {
      const stop = await startRec(page, "08-report");
      await page.getByRole("button", { name: /Wrap up the day/ }).click();
      await page.waitForURL(/\/report/, { timeout: 60000 });
      await sleep(2600);
      await page.mouse.wheel(0, 420);
      await sleep(2200);
      await page.mouse.wheel(0, 420);
      await sleep(2000);
      await stop();
    }
    await ctx.close();
  }

  // ---------- phone, Arabic (Ahmed, Dibba) ----------
  if (want("09-mobile")) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    const page = await ctx.newPage();
    await page.goto(BASE + "/start");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /العربية|Switch to Arabic/ }).click();
    await page.getByText("دبا الفجيرة", { exact: true }).click();
    await page.getByLabel(/اسمك الأول/).fill("أحمد");
    await page.getByRole("button", { name: /ابدأ يومك/ }).click();
    await page.waitForURL(/\/day/);
    const skip = page.getByRole("button", { name: /تخطَّ/ });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.getByRole("button", { name: /استلم المهمة/ }).click();
    await sleep(1200);
    const stop = await startRec(page, "09-mobile", { maxWidth: 780, maxHeight: 1688 });
    await sleep(1800);
    await page.getByRole("button", { name: /^الفريق/ }).click();
    await sleep(800);
    const box = page.getByRole("textbox", { name: /اكتب رسالة إلى خالد/ });
    await typeSlow(box, "متى يجب أن نغلق طريق الوادي؟", 60);
    await box.press("Enter");
    await page.getByText(/اكتشفت المتطلب المخفي/).waitFor({ timeout: 30000 });
    await sleep(3800);
    await stop();
    await ctx.close();
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
