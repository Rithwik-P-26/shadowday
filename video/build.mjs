// Builds demo/shadowday-demo.mp4 from the recorded frames (video/tmp/frames/<id>), the narration
// (video/narration.json -> macOS `say`), and burned-in captions rendered as transparent PNGs.
// Steps:  node video/build.mjs audio   -> narration WAVs + video/tmp/durations.json
//         node video/record.mjs        -> footage (needs the app running on :3000)
//         node video/build.mjs video   -> demo/shadowday-demo.mp4
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const TMP = path.join(HERE, "tmp");
const AUDIO = path.join(HERE, "audio");
const OUTDIR = path.join(ROOT, "demo");
const GAP = 0.5; // silence after each narration line
const VOICE = process.env.SAY_VOICE || "Samantha";
const RATE = process.env.SAY_RATE || "172";
const items = JSON.parse(fs.readFileSync(path.join(HERE, "narration.json"), "utf8"));

const ff = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
const dur = (file) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

function buildAudio() {
  fs.mkdirSync(AUDIO, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
  const out = {};
  for (const it of items) {
    const aiff = path.join(AUDIO, `${it.id}.aiff`);
    const wav = path.join(AUDIO, `${it.id}.wav`);
    execFileSync("say", ["-v", VOICE, "-r", RATE, "-o", aiff, it.text]);
    ff(["-i", aiff, "-ar", "48000", "-ac", "2", wav]);
    fs.unlinkSync(aiff);
    out[it.id] = dur(wav);
  }
  fs.writeFileSync(path.join(TMP, "durations.json"), JSON.stringify(out, null, 2));
  const total = Object.values(out).reduce((a, b) => a + b, 0) + GAP * items.length;
  console.log(`audio ready: ${total.toFixed(1)}s`);
}

/** Split narration into caption chunks of at most ~84 characters, at sentence then comma boundaries. */
function chunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text];
  const out = [];
  for (const s of sentences) {
    if (s.length <= 84) {
      out.push(s);
      continue;
    }
    const parts = s.split(/(?<=,)\s+/);
    let cur = "";
    for (const p of parts) {
      if ((cur + " " + p).trim().length > 84 && cur) {
        out.push(cur.trim());
        cur = p;
      } else cur = (cur + " " + p).trim();
    }
    if (cur) out.push(cur.trim());
  }
  return out;
}

async function renderCaptions(list) {
  const dir = path.join(TMP, "captions");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.setContent(`<!doctype html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500&display=swap" rel="stylesheet">
    <style>html,body{margin:0;background:transparent;width:1920px;height:1080px}
    #c{position:absolute;left:50%;bottom:54px;transform:translateX(-50%);max-width:1500px;padding:14px 30px;border-radius:18px;
       background:rgba(0,0,0,.78);color:#fff;font:500 40px/1.3 "Schibsted Grotesk",system-ui,sans-serif;text-align:center;letter-spacing:-.01em}</style>
    </head><body><div id="c"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < list.length; i++) {
    await page.evaluate((t) => (document.getElementById("c").textContent = t), list[i].text);
    list[i].png = path.join(dir, `c${String(i).padStart(3, "0")}.png`);
    await page.screenshot({ path: list[i].png, omitBackground: true });
  }
  await browser.close();
}

async function buildVideo() {
  const durations = JSON.parse(fs.readFileSync(path.join(TMP, "durations.json"), "utf8"));
  const segDir = path.join(TMP, "segments");
  fs.rmSync(segDir, { recursive: true, force: true });
  fs.mkdirSync(segDir, { recursive: true });
  fs.mkdirSync(OUTDIR, { recursive: true });

  const segFiles = [];
  const audioParts = [];
  const captions = [];
  let t = 0;
  for (const it of items) {
    const A = durations[it.id];
    const T = +(A + GAP).toFixed(3);
    const frames = path.join(TMP, "frames", it.id, "list.ffconcat");
    if (!fs.existsSync(frames)) throw new Error(`missing footage for ${it.id}; run node video/record.mjs ${it.id}`);
    const raw = path.join(segDir, `${it.id}-raw.mp4`);
    const phone = it.id === "09-mobile";
    const fit = phone
      ? "scale=-2:980,pad=1920:1080:(ow-iw)/2:20:color=black"
      : "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black";
    // ffmpeg's fps filter stretches the last frame by its own (often long) duration, so cut at the recorded length.
    const listed = fs
      .readFileSync(frames, "utf8")
      .split("\n")
      .filter((l) => l.startsWith("duration "))
      .reduce((a, l) => a + Number(l.slice(9)), 0);
    ff(["-f", "concat", "-safe", "0", "-i", frames, "-vf", `${fit},fps=30,format=yuv420p`, "-t", listed.toFixed(3), "-c:v", "libx264", "-crf", "16", "-preset", "fast", raw]);
    const V = dur(raw);
    const seg = path.join(segDir, `${it.id}.mp4`);
    let vf;
    if (V > T) {
      const speed = V / T;
      if (speed > 2.2) console.warn(`! ${it.id}: footage ${V.toFixed(1)}s is ${speed.toFixed(2)}x the narration; consider trimming`);
      vf = `setpts=PTS/${speed.toFixed(5)},fps=30`;
    } else {
      vf = `tpad=stop_mode=clone:stop_duration=${(T - V + 0.1).toFixed(3)},fps=30`;
    }
    ff(["-i", raw, "-vf", vf, "-t", String(T), "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-an", seg]);
    segFiles.push(seg);

    const wav = path.join(AUDIO, `${it.id}.wav`);
    const padded = path.join(segDir, `${it.id}.wav`);
    ff(["-i", wav, "-af", `apad=whole_dur=${T}`, "-ar", "48000", "-ac", "2", padded]);
    audioParts.push(padded);

    const cs = chunks(it.text);
    const total = cs.reduce((a, c) => a + c.length, 0);
    let acc = 0;
    for (const c of cs) {
      const s = t + (acc / total) * A;
      acc += c.length;
      const e = t + (acc / total) * A;
      captions.push({ text: c, s: +s.toFixed(3), e: +(e - 0.002).toFixed(3) });
    }
    console.log(`${it.id}: footage ${V.toFixed(1)}s -> ${T.toFixed(1)}s`);
    t += T;
  }

  const listV = path.join(segDir, "video.txt");
  fs.writeFileSync(listV, segFiles.map((f) => `file '${f}'`).join("\n"));
  const allV = path.join(segDir, "all.mp4");
  ff(["-f", "concat", "-safe", "0", "-i", listV, "-c", "copy", allV]);
  const listA = path.join(segDir, "audio.txt");
  fs.writeFileSync(listA, audioParts.map((f) => `file '${f}'`).join("\n"));
  const allA = path.join(segDir, "all.wav");
  ff(["-f", "concat", "-safe", "0", "-i", listA, "-c", "copy", allA]);

  await renderCaptions(captions);
  const inputs = ["-i", allV];
  captions.forEach((c) => inputs.push("-i", c.png));
  inputs.push("-i", allA);
  let chain = "";
  let last = "0:v";
  captions.forEach((c, i) => {
    const out = i === captions.length - 1 ? "vout" : `v${i}`;
    chain += `[${last}][${i + 1}:v]overlay=0:0:enable='between(t,${c.s},${c.e})'[${out}];`;
    last = out;
  });
  chain = chain.replace(/;$/, "");
  const final = path.join(OUTDIR, "shadowday-demo.mp4");
  ff([
    ...inputs,
    "-filter_complex", chain,
    "-map", "[vout]",
    "-map", `${captions.length + 1}:a`,
    "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    final,
  ]);
  // Captions file too, for YouTube's own subtitles.
  const srt = captions
    .map((c, i) => {
      const f = (x) => {
        const ms = Math.round(x * 1000);
        const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
        const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
        const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
        return `${hh}:${mm}:${ss},${String(ms % 1000).padStart(3, "0")}`;
      };
      return `${i + 1}\n${f(c.s)} --> ${f(c.e)}\n${c.text}\n`;
    })
    .join("\n");
  fs.writeFileSync(path.join(OUTDIR, "shadowday-demo.srt"), srt);
  // YouTube thumbnail: the landing page's share image (the real UI), cropped to 16:9.
  ff(["-i", path.join(ROOT, "public", "share.jpg"), "-vf", "crop=iw:iw*9/16:0:0,scale=1280:720", "-q:v", "2", path.join(OUTDIR, "thumbnail.jpg")]);
  console.log(`done: ${final} (${dur(final).toFixed(1)}s)`);
}

const cmd = process.argv[2];
if (cmd === "audio") buildAudio();
else if (cmd === "video") await buildVideo();
else console.log("usage: node video/build.mjs audio|video");
