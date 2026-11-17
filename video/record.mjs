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

// Moments worth a still (seconds from the start of their segment), saved to video/tmp/marks.json for the screenshots.
const recStart = {};
const marks = {};
const mark = (id, name) => (marks[`${id}:${name}`] = +(Date.now() / 1000 - recStart[id]).toFixed(3));

/** Hide the Next.js dev-mode badge (it isn't in production builds) so it doesn't cover the chat box on video. */
async function hideDevBadge(ctx) {
  await ctx.addInitScript(() => {
    const add = () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important}";
      document.head.appendChild(st);
    };
    if (document.head) add();
    else document.addEventListener("DOMContentLoaded", add);
  });
}

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
  recStart[id] = started;
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
    // The repeated last entry is only a terminator; give it one frame so ffmpeg doesn't count the last duration twice.
    lines.push(`file '${path.basename(frames[frames.length - 1].file)}'`, "duration 0.0334");
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

// Hessa's first guess at flag_overpumping (the ticket's naive.py): first two functions done, third guessed.
const NAIVE_STEP = (() => {
  const naive = fs.readFileSync(path.join(ROOT, "content/tickets/water/naive.py"), "utf8");
  const body = naive.slice(naive.indexOf("def flag_overpumping")).split("\n").slice(1).join("\n").trimEnd();
  const out = SOLUTION_PARTS[1].replace(/    # TODO: ask Saeed[^\n]*\n    return None/, body);
  if (out === SOLUTION_PARTS[1]) throw new Error("naive step did not apply");
  return out;
})();

/** Scroll the editor so the given function's def line is at the top. */
async function showFunction(page, name) {
  await page.evaluate((n) => {
    const line = Array.from(document.querySelectorAll(".cm-line")).find((l) => l.textContent?.startsWith(`def ${n}(`));
    line?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, name);
}

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
      // Zoom into the part of the diagram each sentence talks about, so its small text is readable on video.
      const T = audioDur["10-arch"] * 1000;
      const focus = (k, cx, cy) =>
        page.evaluate(
          ([k, cx, cy]) => {
            const img = document.querySelector("img.arch");
            img.style.transformOrigin = "0 0";
            img.style.transition = "transform 1.1s cubic-bezier(.4,0,.2,1)";
            img.style.transform = k === 1 ? "none" : `translate(${800 - k * (cx - 160)}px, ${450 - k * (cy - 90)}px) scale(${k})`;
          },
          [k, cx, cy],
        );
      await sleep(900);
      await focus(1.6, 847, 640); // Python in a Web Worker
      await sleep(T * 0.37 - 900);
      await focus(1.6, 1160, 560); // free failover chain
      await sleep(T * 0.38);
      await focus(1.6, 1160, 652); // no-solution guardrail
      await sleep(T * 0.25 - 600);
      await focus(1, 0, 0);
      await sleep(1400);
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
  const desktopIds = ["02-intro", "03-start", "04-standup", "05a-ticket", "05b-saeed", "05c-ravi", "05d-pass", "06-review", "07-demo", "08-report"];
  if (desktopIds.some(want)) {
    // A 1440x810 laptop layout at 4/3 pixel density: frames are still 1920x1080, but the UI reads larger on video.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3 });
    await hideDevBadge(ctx);
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
      await sleep(2600);
      await page.getByText("Liwa", { exact: true }).click();
      await sleep(2000);
      await typeSlow(page.getByLabel(/Your first name/), "Hessa", 140);
      await sleep(1800);
      await page.getByRole("button", { name: /Start the day at Falaj Labs/ }).click();
      await page.waitForURL(/\/day/);
      await sleep(2200);
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

    // 05a: the ticket, a guess at the third function, and the failing run that says "ask"
    {
      const stop = await startRec(page, "05a-ticket");
      await sleep(2600);
      await page.evaluate((code) => window.__shadowday.getState().setCode(code), NAIVE_STEP);
      await sleep(300);
      await showFunction(page, "flag_overpumping");
      await sleep(2600);
      await page.getByRole("button", { name: /^Run tests/ }).click();
      await page.getByText(/of 12 passing/).first().waitFor({ timeout: 60000 });
      await sleep(1600);
      // Bring the hidden-rule failure ("... Ask him.") into view in the test list.
      await page.getByText(/Ask him\./).first().evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
      await sleep(Math.max(3500, audioDur["05a-ticket"] * 1000 - 8800));
      await stop();
    }

    // 05b: ask the customer
    {
      const stop = await startRec(page, "05b-saeed");
      await sleep(500);
      const box = page.getByRole("textbox", { name: /Message Saeed/ });
      await typeSlow(box, "What counts as over-pumping for your wells?", 30);
      await box.press("Enter");
      await page.getByText(/You found the hidden requirement/).first().waitFor({ timeout: 30000 });
      await sleep(4500);
      await stop();
    }

    // 05c: ask the mentor for the answer
    {
      const stop = await startRec(page, "05c-ravi");
      await page.getByRole("tab", { name: /Ravi/ }).click();
      await sleep(500);
      const box2 = page.getByRole("textbox", { name: /Message Ravi/ });
      await typeSlow(box2, "Can you just give me the code for flag_overpumping?", 30);
      const before = await page.evaluate(() => window.__shadowday.getState().chats.mentor.length);
      await box2.press("Enter");
      await page.waitForFunction((n) => window.__shadowday.getState().chats.mentor.length >= n + 2, before, { timeout: 30000 });
      await sleep(4800);
      await stop();
    }

    // 05d: fix the function with the rule and run the tests again
    {
      const stop = await startRec(page, "05d-pass");
      await sleep(600);
      await page.evaluate((code) => window.__shadowday.getState().setCode(code), SOLUTION_PARTS[2]);
      // CodeMirror redraws after the new document lands; scroll again once it has.
      await sleep(500);
      await showFunction(page, "flag_overpumping");
      await sleep(500);
      await showFunction(page, "flag_overpumping");
      await sleep(1700);
      await page.getByRole("button", { name: /^Run tests/ }).click();
      await page.getByText(/All tests pass/).first().waitFor({ timeout: 60000 });
      await sleep(2600);
      await stop();
    }

    // 06: pull request review
    {
      const stop = await startRec(page, "06-review");
      await sleep(700);
      await page.getByRole("button", { name: /Open pull request/ }).click();
      await page.getByText(/^Approved$/).first().waitFor({ timeout: 60000 });
      await sleep(4600);
      await stop();
    }

    // 07: demo
    {
      const stop = await startRec(page, "07-demo");
      await sleep(500);
      await page.getByRole("button", { name: /Merge and demo it/ }).click();
      await sleep(700);
      await page.getByRole("button", { name: /Run it on the full dataset/ }).click();
      await page.locator("svg[role=img]").first().waitFor({ timeout: 60000 });
      await page.getByRole("button", { name: /Wrap up the day/ }).waitFor({ timeout: 60000 });
      await sleep(3200);
      await stop();
    }

    // 08: report
    {
      const stop = await startRec(page, "08-report");
      await page.getByRole("button", { name: /Wrap up the day/ }).click();
      await page.waitForURL(/\/report/, { timeout: 60000 });
      await sleep(2400);
      mark("08-report", "top");
      await sleep(200);
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
    await hideDevBadge(ctx);
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
    await page.getByText(/اكتشفت المتطلب المخفي/).first().waitFor({ timeout: 30000 });
    await sleep(3800);
    await stop();
    await ctx.close();
  }

  await browser.close();
  const mf = path.join(HERE, "tmp", "marks.json");
  const prev = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")) : {};
  fs.writeFileSync(mf, JSON.stringify({ ...prev, ...marks }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
