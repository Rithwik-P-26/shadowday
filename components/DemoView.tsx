"use client";

import { Flag, Loader2, Play, Sunset } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, RichText } from "@/components/ui";
import { askAgent } from "@/lib/agentClient";
import { useT } from "@/lib/i18n";
import { runDemo } from "@/lib/runner/client";
import type { DemoResult } from "@/lib/types";
import { useDay } from "@/lib/useDay";
import { useWorld } from "@/lib/world/store";

export function DemoChart({ demo }: { demo: DemoResult }) {
  const max = Math.max(1, ...demo.series.map((p) => p.value));
  const n = demo.series.length;
  const W = Math.max(320, n * 38);
  const H = 220;
  const pad = { l: 8, r: 8, t: 14, b: 44 };
  const bw = (W - pad.l - pad.r) / n;
  const every = n > 14 ? 2 : 1;
  return (
    <div className="code-ltr scroll-thin overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[320px]" role="img" aria-label={demo.title}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * (1 - f)} y2={pad.t + (H - pad.t - pad.b) * (1 - f)} stroke="rgba(255,255,255,0.07)" />
        ))}
        {demo.series.map((p, i) => {
          const h = ((H - pad.t - pad.b) * p.value) / max;
          const x = pad.l + i * bw + bw * 0.15;
          const y = H - pad.b - h;
          return (
            <g key={p.label}>
              <rect x={x} y={y} width={bw * 0.7} height={Math.max(1, h)} rx={4} fill={p.flagged ? "#ff8a80" : "#93f1f7"} opacity={p.flagged ? 1 : 0.55}>
                <title>
                  {p.label}: {p.value} {demo.unit}
                  {p.flagged ? " (flagged)" : ""}
                </title>
              </rect>
              {i % every === 0 && (
                <text x={x + bw * 0.35} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="#999" fontFamily="var(--font-jetbrains)">
                  {p.label.length > 10 ? p.label.slice(0, 9) + "…" : p.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="rgba(255,255,255,0.2)" />
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
  const finish = useWorld((s) => s.finish);
  const [busy, setBusy] = useState<"idle" | "running" | "noting" | "wrapping">("idle");
  const [error, setError] = useState<string | null>(null);
  if (!day) return null;
  const { ticket, people } = day;

  const run = async () => {
    setBusy("running");
    setError(null);
    const w = useWorld.getState();
    const res = await runDemo(w.code, ticket.demo, ticket.data.csv);
    if ("error" in res) {
      setError(`${res.error.type}: ${res.error.message}`);
      setBusy("idle");
      return;
    }
    setDemo(res);
    setBusy("noting");
    const note = await askAgent({
      agent: "manager",
      mode: "demo",
      lang,
      areaId: day.session.areaId,
      studentName: day.session.name || undefined,
      history: [],
      demoSummary: res.summary[lang],
    });
    setDemoNote(note.text);
    useWorld.getState().addMessage("manager", { from: "manager", text: note.text, provider: note.provider });
    setBusy("idle");
  };

  const wrap = async () => {
    setBusy("wrapping");
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
    finish(res.text);
    router.push("/report");
  };

  const flaggedCount = demo?.series.filter((p) => p.flagged).length ?? 0;

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted">{t("phase_demo")}</p>
        <h1 className="mt-2 text-2xl leading-tight font-medium tracking-tight lg:text-[32px]">{t("demoTitle")}</h1>
        <p className="mt-2 text-muted">{t("demoLead", { file: ticket.data.fileName })}</p>

        {!demo && (
          <button type="button" className="btn btn-primary mt-6" disabled={busy !== "idle"} onClick={() => void run()}>
            {busy === "running" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden className="rtl:-scale-x-100" />}
            {t("runDemo")}
          </button>
        )}
        {error && (
          <div className="code-ltr mt-4 rounded-[12px] border border-bad/40 bg-bad/10 p-3 text-sm">
            <p className="font-medium text-bad">{t("demoFailed")}</p>
            <p className="mt-1 font-mono text-[13px]">{error}</p>
          </div>
        )}

        {demo && (
          <div className="mt-6 rounded-[18px] border border-line bg-surface p-4 lg:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{demo.title}</p>
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

        {(demoNote || busy === "noting") && (
          <div className="mt-6 flex gap-3">
            <Avatar person={people.manager} size={36} />
            <div className="rounded-[18px] rounded-ss-[6px] bg-raised-2 px-4 py-3 text-[15px] leading-relaxed">
              {demoNote ? <RichText text={demoNote} /> : <Loader2 size={16} className="animate-spin text-muted" aria-label="…" />}
            </div>
          </div>
        )}

        {demo && demoNote && (
          <button type="button" className="btn btn-primary mt-8 w-full sm:w-auto" disabled={busy !== "idle"} onClick={() => void wrap()}>
            {busy === "wrapping" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sunset size={16} aria-hidden />}
            {busy === "wrapping" ? t("wrapping") : t("wrapUp")}
          </button>
        )}
      </div>
    </div>
  );
}
