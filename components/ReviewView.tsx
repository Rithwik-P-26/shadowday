"use client";

import { ArrowLeft, CircleCheck, GitMerge, GitPullRequest, Loader2, MessageSquareWarning, RotateCcw, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, RichText } from "@/components/ui";
import { askAgent } from "@/lib/agentClient";
import { hunks, lineDiff } from "@/lib/diff";
import { useT } from "@/lib/i18n";
import { testSummary, useDay } from "@/lib/useDay";
import { useWorld } from "@/lib/world/store";

export function ReviewView() {
  const day = useDay();
  const { t, l, lang, count } = useT();
  const code = useWorld((s) => s.code);
  const review = useWorld((s) => s.review);
  const setReview = useWorld((s) => s.setReview);
  const setPhase = useWorld((s) => s.setPhase);
  const setMerged = useWorld((s) => s.setMerged);
  const asked = useRef(false);
  // The review request never got a real answer (offline, aborted): offer a retry instead of saving a fake review.
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const stale = review && review.code !== code;

  useEffect(() => {
    if (!day || asked.current || (review && !stale)) return;
    asked.current = true;
    const w = useWorld.getState();
    void askAgent({
      agent: "mentor",
      mode: "review",
      lang,
      areaId: day.session.areaId,
      studentName: day.session.name || undefined,
      history: [],
      code: w.code,
      // Only a run of exactly this code counts: an older green run must not get edited code approved.
      testSummary: testSummary({ fresh: true }),
    }).then((res) => {
      if (res.offline) {
        setFailed(true);
        return;
      }
      setReview({ text: res.text, approved: !!res.approved, provider: res.provider, code: w.code });
      useWorld.getState().addMessage("mentor", { from: "mentor", text: res.text, provider: res.provider });
    });
  }, [day, review, stale, lang, setReview, attempt]);

  const diff = useMemo(() => (day ? hunks(lineDiff(day.ticket.starter, code)) : []), [day, code]);
  if (!day) return null;
  const { ticket, people } = day;
  const added = diff.filter((d) => d.kind === "add").length;
  const removed = diff.filter((d) => d.kind === "del").length;
  const loading = !failed && (!review || stale);

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-good/15 px-3 py-1 text-sm text-good">
            <GitPullRequest size={15} aria-hidden /> {t("prOpen")}
          </span>
          <p className="text-sm text-muted">{t("prTitle")}</p>
        </div>
        <h1 className="mt-3 text-2xl leading-tight font-medium tracking-tight lg:text-[32px]">
          <span className="font-mono text-accent">{ticket.key}</span> {l(ticket.title)}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)]">
          <div className="min-w-0 rounded-[18px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 text-sm">
              <span className="code-ltr font-mono">{ticket.fileName}</span>
              <span className="code-ltr font-mono">
                <span className="text-good">+{added}</span> <span className="text-bad">−{removed}</span>
              </span>
            </div>
            <div className="code-ltr scroll-thin max-h-[60vh] overflow-auto py-2 font-mono text-[12.5px] leading-6">
              {diff.map((d, i) =>
                d.kind === "gap" ? (
                  <div key={i} className="bg-white/[0.03] px-4 text-muted">
                    {/* The diff box is always left-to-right; isolate the label so Arabic keeps "4 أسطر دون تغيير" in its own order. */}
                    ⋯ <span dir={lang === "ar" ? "rtl" : "ltr"}>{count("unchangedLines", d.count)}</span>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`flex whitespace-pre ${d.kind === "add" ? "bg-good/10 text-ink" : d.kind === "del" ? "bg-bad/10 text-ink/60 line-through decoration-bad/40" : "text-ink/60"}`}
                  >
                    {/* Full muted grey: about 5.7:1 even on the green "added" rows (muted/60 was under 3:1). */}
                    <span className="w-12 shrink-0 select-none pe-3 text-end text-muted">{d.kind !== "del" ? d.n : ""}</span>
                    <span className={`w-4 shrink-0 select-none ${d.kind === "add" ? "text-good" : d.kind === "del" ? "text-bad" : ""}`}>
                      {d.kind === "add" ? "+" : d.kind === "del" ? "−" : " "}
                    </span>
                    <span className="pe-4">{d.text}</span>
                  </div>
                ),
              )}
            </div>
          </div>

          <aside className="h-fit rounded-[18px] border border-line bg-surface p-4" aria-live="polite">
            <div className="flex items-center gap-3">
              <Avatar person={people.mentor} size={36} />
              <div>
                <p className="font-medium">{l(people.mentor.name)}</p>
                <p className="text-sm text-muted">{l(people.mentor.role)}</p>
              </div>
            </div>
            {loading ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Loader2 size={15} className="animate-spin" aria-hidden /> {t("reviewing")}
              </p>
            ) : failed ? (
              <>
                <p className="mt-4 flex items-start gap-2 text-[15px] leading-relaxed text-ink/90">
                  <WifiOff size={16} className="mt-1 shrink-0 text-warn" aria-hidden /> {t("reachFailed", { name: l(people.mentor.name) })}
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => {
                      asked.current = false;
                      setFailed(false);
                      setAttempt((a) => a + 1);
                    }}
                  >
                    <RotateCcw size={16} aria-hidden /> {t("retry")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost w-full"
                    onClick={() => {
                      asked.current = false;
                      setPhase("work");
                    }}
                  >
                    <ArrowLeft size={16} aria-hidden className="rtl:-scale-x-100" /> {t("backToCode")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <RichText text={review!.text} dir="auto" className="mt-4 text-[15px] leading-relaxed text-ink/90" />
                <p
                  className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                    review!.approved ? "bg-good/15 text-good" : "bg-warn/15 text-warn"
                  }`}
                >
                  {review!.approved ? <CircleCheck size={15} aria-hidden /> : <MessageSquareWarning size={15} aria-hidden />}
                  {review!.approved ? t("approved") : t("changesRequested")}
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  {review!.approved && (
                    <button type="button" className="btn btn-good w-full" onClick={setMerged}>
                      <GitMerge size={16} aria-hidden /> {t("merge")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost w-full"
                    onClick={() => {
                      asked.current = false;
                      setPhase("work");
                    }}
                  >
                    <ArrowLeft size={16} aria-hidden className="rtl:-scale-x-100" /> {t("backToCode")}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
