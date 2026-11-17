"use client";

import { ArrowLeft, Flag, Loader2, Play, RotateCcw, Sunset, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, RichText } from "@/components/ui";
import { DATA_NOTES } from "@/content/tickets/generated";
import { askAgent } from "@/lib/agentClient";
import { tr, useT } from "@/lib/i18n";
import { PYTHON_LOAD_ERROR, runDemo } from "@/lib/runner/client";
import type { ArchetypeId, DemoResult, Lang } from "@/lib/types";
import { useDay } from "@/lib/useDay";
import { useWorld } from "@/lib/world/store";

/** demo.py writes the title and unit in English; Arabic comes from i18n, keyed by ticket. */
export function chartTitle(demo: DemoResult, ticketId: ArchetypeId | undefined, lang: Lang) {
  return lang === "en" || !ticketId ? demo.title : tr(lang, `demoChart_${ticketId}` as const);
}
function chartUnit(demo: DemoResult, ticketId: ArchetypeId | undefined, lang: Lang) {
  return lang === "en" || !ticketId ? demo.unit : tr(lang, `demoUnit_${ticketId}` as const);
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Jul 01" -> "1 يوليو" in Arabic; other labels (times, road names) are data and stay as they are. */
function pointLabel(label: string, lang: Lang) {
  const m = /^([A-Z][a-z]{2}) (\d{1,2})$/.exec(label);
  const month = m ? EN_MONTHS.indexOf(m[1]) : -1;
  if (lang !== "ar" || month < 0) return label;
  const name = new Intl.DateTimeFormat("ar", { month: "long" }).format(new Date(2026, month, 15));
  return `${Number(m![2])} ${name}`;
}

// Labels are drawn at 11 CSS px: the svg is never scaled down, it gets as wide as its box (and scrolls past that).
const FONT = 11;
const CHAR_W = 6.8;
const LINE_H = 13;
const PLOT_H = 162;
const PAD_T = 14;
const PAD_X = 8;

/** Greedy word wrap into at most two lines of maxChars; null if it can't fit. */
function wrap(label: string, maxChars: number): string[] | null {
  if (maxChars < 2) return null;
  const lines: string[] = [];
  let cur = "";
  for (const w of label.split(" ")) {
    if (w.length > maxChars) return null;
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length <= 2 ? lines : null;
}

export function DemoChart({ demo }: { demo: DemoResult }) {
  const day = useDay();
  const { t, lang } = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ticketId = day?.ticket.id;
  const unit = chartUnit(demo, ticketId, lang);
  const max = Math.max(1, ...demo.series.map((p) => p.value));
  const n = Math.max(1, demo.series.length);
  // Bars never get thinner than ~9px; below that the box scrolls sideways.
  const W = Math.max(boxW || 640, n * 9 + PAD_X * 2);
  const bw = (W - PAD_X * 2) / n;
  const labels = demo.series.map((p) => pointLabel(p.label, lang));

  // Horizontal labels (wrapped onto two lines if needed) on every 1st, 2nd or 3rd bar; otherwise vertical ones.
  let layout: { mode: "h"; every: number; lines: string[][] } | { mode: "v"; every: number } = { mode: "v", every: Math.max(1, Math.ceil(13 / bw)) };
  for (const every of [1, 2, 3]) {
    const maxChars = Math.floor((bw * every - 6) / CHAR_W);
    const lines = labels.map((s) => wrap(s, maxChars));
    if (lines.every((x) => x !== null)) {
      layout = { mode: "h", every, lines: lines as string[][] };
      break;
    }
  }
  const longest = Math.max(...labels.map((s) => s.length)) * CHAR_W;
  const padB = layout.mode === "h" ? 10 + Math.max(...layout.lines.map((x) => x.length)) * LINE_H : Math.ceil(longest) + 14;
  const H = PAD_T + PLOT_H + padB;
  const base = PAD_T + PLOT_H;

  return (
    <div ref={boxRef} className="code-ltr scroll-thin overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: boxW && W > boxW ? W : "100%" }}
        className="block h-auto"
        role="img"
        aria-label={chartTitle(demo, ticketId, lang)}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD_X} x2={W - PAD_X} y1={PAD_T + PLOT_H * (1 - f)} y2={PAD_T + PLOT_H * (1 - f)} stroke="rgba(255,255,255,0.07)" />
        ))}
        {demo.series.map((p, i) => {
          const h = (PLOT_H * p.value) / max;
          const x = PAD_X + i * bw + bw * 0.15;
          const cx = PAD_X + i * bw + bw / 2;
          return (
            <g key={`${p.label}-${i}`}>
              <rect x={x} y={base - h} width={bw * 0.7} height={Math.max(1, h)} rx={Math.min(4, bw * 0.2)} fill={p.flagged ? "#ff8a80" : "#93f1f7"} opacity={p.flagged ? 1 : 0.55}>
                <title>
                  {`${labels[i]}: ${p.value} ${unit}${p.flagged ? ` (${t("flagged")})` : ""}`}
                </title>
              </rect>
              {i % layout.every === 0 &&
                (layout.mode === "h" ? (
                  <text x={cx} y={base + 16} textAnchor="middle" fontSize={FONT} fill="#999" fontFamily="var(--font-jetbrains)">
                    {layout.lines[i].map((line, j) => (
                      <tspan key={j} x={cx} dy={j === 0 ? 0 : LINE_H}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                ) : (
                  <text
                    transform={`translate(${cx} ${base + 8}) rotate(-90)`}
                    textAnchor="end"
                    dominantBaseline="central"
                    fontSize={FONT}
                    fill="#999"
                    fontFamily="var(--font-jetbrains)"
                  >
                    {labels[i]}
                  </text>
                ))}
            </g>
          );
        })}
        <line x1={PAD_X} x2={W - PAD_X} y1={base} y2={base} stroke="rgba(255,255,255,0.2)" />
      </svg>
    </div>
  );
}

export function DemoView() {
  const day = useDay();
  const router = useRouter();
  const { t, l, lang } = useT();
  const demo = useWorld((s) => s.demo);
  const demoNote = useWorld((s) => s.demoNote);
  const setDemo = useWorld((s) => s.setDemo);
  const setDemoNote = useWorld((s) => s.setDemoNote);
  const reopenWork = useWorld((s) => s.reopenWork);
  const finish = useWorld((s) => s.finish);
  const [busy, setBusy] = useState<"idle" | "running" | "noting" | "wrapping">("idle");
  const [error, setError] = useState<{ message: string; code: boolean } | null>(null);
  // Set when Mariam couldn't be reached: offer a retry instead of saving the offline placeholder.
  const [noteFailed, setNoteFailed] = useState(false);
  const [wrapFailed, setWrapFailed] = useState(false);
  const noteAsked = useRef(false);

  const fetchNote = useCallback(
    async (res: DemoResult) => {
      const s = useWorld.getState().session;
      if (!s) return;
      noteAsked.current = true;
      setNoteFailed(false);
      setBusy("noting");
      const lang = useWorld.getState().lang;
      const note = await askAgent({
        agent: "manager",
        mode: "demo",
        lang,
        areaId: s.areaId,
        studentName: s.name || undefined,
        history: [],
        demoSummary: res.summary[lang],
      });
      setBusy("idle");
      if (note.offline) {
        setNoteFailed(true);
        return;
      }
      setDemoNote(note.text);
      useWorld.getState().addMessage("manager", { from: "manager", text: note.text, provider: note.provider });
    },
    [setDemoNote],
  );

  // A reload while Mariam's note was loading leaves a chart with no note (and no way on): ask her again once.
  useEffect(() => {
    if (demo && !demoNote && !noteAsked.current) void fetchNote(demo);
  }, [demo, demoNote, fetchNote]);

  if (!day) return null;
  const { ticket, people } = day;
  const dataNote = DATA_NOTES[ticket.id];

  const run = async () => {
    setBusy("running");
    setError(null);
    const w = useWorld.getState();
    const res = await runDemo(w.code, ticket.demo, ticket.data.csv);
    if ("error" in res) {
      // Runner problems (Python didn't load, timeout) come localized; errors from the code are shown as code.
      const runner = res.error.type === PYTHON_LOAD_ERROR || res.error.type === "TimeoutError" || res.error.type === "RunnerError";
      setError(runner ? { message: res.error.message, code: false } : { message: `${res.error.type}: ${res.error.message}`, code: true });
      setBusy("idle");
      return;
    }
    noteAsked.current = true;
    setDemo(res);
    await fetchNote(res);
  };

  const wrap = async () => {
    setBusy("wrapping");
    setWrapFailed(false);
    const w = useWorld.getState();
    const res = await askAgent({
      agent: "manager",
      mode: "eod",
      lang,
      areaId: day.session.areaId,
      studentName: day.session.name || undefined,
      history: [],
      demoSummary: w.demo?.summary.en,
      stats: {
        testRuns: w.runs.length,
        questionsAsked: w.questionsAsked,
        hintsUsed: w.hintsUsed,
        revealed: w.revealed,
        minutes: Math.max(1, Math.round((Date.now() - (w.session?.startedAt ?? Date.now())) / 60_000)),
      },
    });
    if (res.offline) {
      setWrapFailed(true);
      setBusy("idle");
      return;
    }
    finish(res.text);
    router.push("/report");
  };

  const flaggedCount = demo?.series.filter((p) => p.flagged).length ?? 0;
  const mariam = l(people.manager.name);

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted">{t("phase_demo")}</p>
        <h1 className="mt-2 text-2xl leading-tight font-medium tracking-tight lg:text-[32px]">{t("demoTitle")}</h1>
        <p className="mt-2 text-muted">{t("demoLead", { file: ticket.data.fileName })}</p>
        {dataNote && <p className="mt-1 text-sm text-muted/80">{l(dataNote)}</p>}

        {!demo && (
          <button type="button" className="btn btn-primary mt-6" disabled={busy !== "idle"} onClick={() => void run()}>
            {busy === "running" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />}
            {t("runDemo")}
          </button>
        )}
        {error && (
          <div className="mt-4 rounded-[12px] border border-bad/40 bg-bad/10 p-3 text-sm" role="alert">
            <p className="font-medium text-bad">{t("demoFailed")}</p>
            <p className={error.code ? "code-ltr mt-1 font-mono text-[13px]" : "mt-1"}>{error.message}</p>
            <button type="button" className="btn btn-ghost mt-3 !min-h-[40px] text-sm" onClick={reopenWork}>
              <ArrowLeft size={16} aria-hidden className="rtl:-scale-x-100" /> {t("backToCode")}
            </button>
          </div>
        )}

        {demo && (
          <div className="mt-6 rounded-[18px] border border-line bg-surface p-4 lg:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{chartTitle(demo, ticket.id, lang)}</p>
              <p className="flex items-center gap-4 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-accent/60" aria-hidden /> {t("notFlagged")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-bad" aria-hidden /> {t("flagged")} ({flaggedCount})
                </span>
              </p>
            </div>
            <div className="mt-4">
              <DemoChart demo={demo} />
            </div>
            <p className="mt-4 flex items-start gap-2 text-[15px]">
              <Flag size={16} className="mt-1 shrink-0 text-bad" aria-hidden /> {l(demo.summary)}
            </p>
          </div>
        )}

        {(demoNote || busy === "noting" || noteFailed) && (
          <div className="mt-6 flex gap-3">
            <Avatar person={people.manager} size={36} />
            <div className="rounded-[18px] rounded-ss-[6px] bg-raised-2 px-4 py-3 text-[15px] leading-relaxed">
              {demoNote ? (
                <RichText text={demoNote} dir="auto" />
              ) : noteFailed ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-start gap-2">
                    <WifiOff size={16} className="mt-1 shrink-0 text-warn" aria-hidden /> {t("reachFailed", { name: mariam })}
                  </span>
                  <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 text-sm" disabled={busy !== "idle"} onClick={() => void fetchNote(demo!)}>
                    <RotateCcw size={14} aria-hidden /> {t("retry")}
                  </button>
                </div>
              ) : (
                <Loader2 size={16} className="animate-spin text-muted" aria-label="…" />
              )}
            </div>
          </div>
        )}

        {/* Screen readers hear the result and Mariam's note once they arrive. */}
        <p className="sr-only" role="status" aria-live="polite">
          {demo ? `${l(demo.summary)} ${demoNote ?? ""}` : ""}
        </p>

        {demo && busy !== "noting" && (
          <div className="mt-8">
            {wrapFailed && (
              <p className="mb-3 flex items-start gap-2 text-sm text-warn" role="alert">
                <WifiOff size={15} className="mt-0.5 shrink-0" aria-hidden /> {t("reachFailed", { name: mariam })}
              </p>
            )}
            <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={busy !== "idle"} onClick={() => void wrap()}>
              {busy === "wrapping" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : wrapFailed ? <RotateCcw size={16} aria-hidden /> : <Sunset size={16} aria-hidden />}
              {busy === "wrapping" ? t("wrapping") : wrapFailed ? t("retry") : t("wrapUp")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
