"use client";

import { CircleAlert, CircleCheck, CircleX, History, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { isRunFresh, useDay } from "@/lib/useDay";
import { useUi, useWorld } from "@/lib/world/store";

/**
 * One state of the test summary, also used for "Setting up Python" in the action bar. It sits in a `truncate`
 * button, but an ellipsis cannot cut into an inline-flex child, so a long label was just chopped (in Arabic at
 * 360px "3 من 12 ناجحة" read as "3 من 2"). Phones show the short form (or only the icon); the colour and icon keep
 * the meaning, and screen readers still get the full label. Wider screens show the full label, which ends in an
 * ellipsis if the bar is still too narrow (the desktop editor pane just above 1024px).
 */
export function SummaryLabel({ icon, short, full, tone }: { icon: React.ReactNode; short: React.ReactNode; full: string; tone: string }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 text-sm ${tone}`}>
      {icon}
      {short != null && (
        <span className="truncate sm:hidden" aria-hidden>
          {short}
        </span>
      )}
      <span className="truncate max-sm:sr-only">{full}</span>
    </span>
  );
}

export function TestSummaryPill() {
  const { t } = useT();
  const run = useWorld((s) => s.lastRun);
  // Subscribes to code and lastRunCode, so the pill turns muted on the first edit after a run (and back on undo).
  const fresh = useWorld(isRunFresh);
  const running = useUi((s) => s.running);
  // The Run button next to it already says "Running…", so phones only show the spinner.
  if (running)
    return <SummaryLabel icon={<Loader2 size={15} className="shrink-0 animate-spin" aria-hidden />} short={null} full={t("running")} tone="text-muted" />;
  if (!run) return null;
  const passed = run.results.filter((r) => r.passed).length;
  const total = run.results.length;
  // The code changed after this run: show its result as history, never as a green light.
  if (!fresh)
    return (
      <SummaryLabel
        icon={<History size={15} aria-hidden className="shrink-0" />}
        short={run.ok ? `${passed}/${total}` : t("errorShort")}
        full={run.ok ? t("lastRunStale", { passed, total }) : t("lastRunStaleError")}
        tone="text-muted"
      />
    );
  if (!run.ok)
    return <SummaryLabel icon={<CircleAlert size={15} aria-hidden className="shrink-0" />} short={t("errorShort")} full={t("codeError")} tone="text-bad" />;
  const all = passed === total && total > 0;
  return (
    <SummaryLabel
      icon={all ? <CircleCheck size={15} aria-hidden className="shrink-0" /> : <CircleX size={15} aria-hidden className="shrink-0" />}
      short={`${passed}/${total}`}
      full={all ? t("allPassing") : t("passedOf", { passed, total })}
      tone={all ? "text-good" : "text-warn"}
    />
  );
}

export function TestPanel() {
  const { t } = useT();
  const day = useDay();
  const run = useWorld((s) => s.lastRun);
  if (!day) return null;

  return (
    <section aria-label={t("tests")} className="scroll-thin h-full min-h-0 overflow-y-auto px-4 py-3">
      {!run && <p className="text-sm text-muted">{t("testsNotRun")}</p>}

      {run && !run.ok && run.error && (
        <div className="code-ltr rounded-[12px] border border-bad/40 bg-bad/10 p-3 text-sm">
          <p className="font-medium text-bad">
            {run.error.type}
            {run.error.line ? ` · ${t("line", { n: run.error.line })}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap font-mono text-[13px] text-ink/90">{run.error.message}</p>
        </div>
      )}

      {run?.ok && (
        <div className="space-y-4">
          {day.ticket.functions.map((f) => {
            const rs = run.results.filter((r) => r.fn === f.name);
            if (rs.length === 0) return null;
            const ok = rs.every((r) => r.passed);
            return (
              <div key={f.name}>
                <p className="code-ltr mb-1.5 flex items-center gap-2 font-mono text-[13px]">
                  <span className={ok ? "text-good" : "text-ink"}>{f.name}</span>
                  <span className="text-muted">
                    {rs.filter((r) => r.passed).length}/{rs.length}
                  </span>
                </p>
                <ul className="space-y-1.5">
                  {rs.map((r) => (
                    <li key={r.name} className="flex gap-2 text-sm">
                      {r.passed ? (
                        <CircleCheck size={16} className="mt-0.5 shrink-0 text-good" role="img" aria-label={t("testPassed")} />
                      ) : (
                        <CircleX size={16} className="mt-0.5 shrink-0 text-bad" role="img" aria-label={t("testFailed")} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="code-ltr font-mono text-[13px] text-muted [overflow-wrap:anywhere]">{r.name}</p>
                        {!r.passed && r.message && <p className="code-ltr mt-0.5 text-[14px] leading-snug text-ink/90">{r.message}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {run?.stdout && (
        <div className="mt-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">{t("output")}</p>
          <pre className="code-ltr scroll-thin max-h-40 overflow-auto rounded-[10px] bg-raised p-3 font-mono text-[12.5px] text-ink/80">{run.stdout}</pre>
        </div>
      )}
    </section>
  );
}
