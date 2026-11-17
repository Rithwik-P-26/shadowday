"use client";

import type { EditorView } from "@codemirror/view";
import { FileCode2, FlaskConical, GitPullRequest, Loader2, MessagesSquare, Play, RotateCcw, ScrollText, TriangleAlert } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { KeyBar } from "@/components/CodeEditor";
import { SummaryLabel, TestPanel, TestSummaryPill } from "@/components/TestPanel";
import { TicketPanel } from "@/components/TicketPanel";
import { tr, useT } from "@/lib/i18n";
import { onRunnerStatus, preloadPython, PYTHON_LOAD_ERROR, runTests } from "@/lib/runner/client";
import type { TestRun } from "@/lib/types";
import { useDay } from "@/lib/useDay";
import { type MobileTab, useUi, useWorld } from "@/lib/world/store";

const CodeEditor = dynamic(() => import("@/components/CodeEditor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-surface" />,
});

// Same breakpoint as Tailwind's `lg`. Only one layout is mounted, so there is exactly one ChatPanel,
// editor and #chat-input.
const DESKTOP_QUERY = "(min-width: 1024px)";
function subscribeDesktop(cb: () => void) {
  const m = window.matchMedia(DESKTOP_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

type PyStatus = "idle" | "loading" | "ready" | "error";

function runAnnouncement(run: TestRun, lang: "en" | "ar") {
  if (!run.ok) return run.error ? `${tr(lang, "codeError")}: ${run.error.message}` : tr(lang, "codeError");
  const passed = run.results.filter((r) => r.passed).length;
  const total = run.results.length;
  return passed === total && total > 0 ? tr(lang, "allPassing") : tr(lang, "passedOf", { passed, total });
}

export function Workspace() {
  const day = useDay();
  const { t } = useT();
  const isDesktop = useIsDesktop();
  const code = useWorld((s) => s.code);
  const setCode = useWorld((s) => s.setCode);
  const recordRun = useWorld((s) => s.recordRun);
  const setPhase = useWorld((s) => s.setPhase);
  const lastRun = useWorld((s) => s.lastRun);
  const lastRunCode = useWorld((s) => s.lastRunCode);
  const unread = useWorld((s) => s.unread);
  const running = useUi((s) => s.running);
  const setRunning = useUi((s) => s.setRunning);
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const [file, setFile] = useState<"main" | "tests">("main");
  const [py, setPy] = useState<PyStatus>("idle");
  const [announce, setAnnounce] = useState("");
  const editorRef = useRef<EditorView | null>(null);

  // Show Python's load state here too, and start loading it if the standup didn't (e.g. after a reload).
  useEffect(() => {
    const off = onRunnerStatus(setPy);
    preloadPython().catch(() => {});
    return off;
  }, []);

  const run = useCallback(async () => {
    const d = day;
    if (!d || useUi.getState().running) return;
    setRunning(true);
    setAnnounce("");
    const ran = useWorld.getState().code;
    const result = await runTests(ran, d.ticket.tests);
    setRunning(false);
    // Python itself didn't load: that says nothing about the student's code, so it is not a test run.
    if (result.error?.type === PYTHON_LOAD_ERROR) return;
    recordRun(result, ran);
    setAnnounce(runAnnouncement(result, useWorld.getState().lang));
  }, [day, recordRun, setRunning]);

  if (!day) return null;
  const { ticket } = day;
  const lastAllPass = !!lastRun?.ok && lastRun.results.length > 0 && lastRun.results.every((r) => r.passed);
  const fresh = lastRunCode === code;
  const allPass = lastAllPass && fresh;
  const changedSinceGreen = lastAllPass && !fresh && !running;
  const unreadTotal = unread.manager + unread.mentor + unread.stakeholder;

  const codeArea = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        {(["main", "tests"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFile(f)}
            className={`code-ltr min-h-[36px] whitespace-nowrap rounded-[10px] px-3 font-mono text-[13px] ${file === f ? "bg-raised-2 text-ink" : "text-muted hover:text-ink"}`}
          >
            {f === "main" ? ticket.fileName : "tests.py"}
            {f === "tests" && <span className="ms-2 font-sans text-[11px] text-muted">{t("readOnly")}</span>}
          </button>
        ))}
        <button
          type="button"
          aria-label={t("resetCode")}
          className="ms-auto inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2.5 text-sm text-muted hover:text-ink"
          onClick={() => {
            if (window.confirm(t("resetConfirm"))) setCode(ticket.starter);
          }}
        >
          <RotateCcw size={14} aria-hidden /> <span className="hidden sm:inline">{t("resetCode")}</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-surface">
        {file === "main" ? (
          <CodeEditor value={code} onChange={setCode} onRun={run} editorRef={editorRef} label={ticket.fileName} />
        ) : (
          <CodeEditor value={ticket.tests} readOnly label="tests.py" />
        )}
      </div>
      {file === "main" && <KeyBar editorRef={editorRef} />}
    </div>
  );

  const actionBar = (
    <div className="border-t border-line bg-bg">
      {py === "error" && !running && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-2.5 text-sm text-warn lg:px-4" role="alert">
          <TriangleAlert size={15} aria-hidden className="shrink-0" />
          <span className="min-w-0 flex-1">{t("pythonError")}</span>
          <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 text-sm whitespace-nowrap" onClick={() => void preloadPython().catch(() => {})}>
            {t("retry")}
          </button>
        </div>
      )}
      {changedSinceGreen && py !== "error" && <p className="px-3 pt-2.5 text-sm text-warn lg:px-4">{t("codeChanged")}</p>}
      <div className="flex items-center gap-3 px-3 py-2.5 lg:px-4">
        <button type="button" onClick={() => void run()} disabled={running} className="btn btn-primary whitespace-nowrap">
          <Play size={16} aria-hidden /> {running ? t("running") : t("runTests")}
        </button>
        <button type="button" className="min-w-0 truncate text-start lg:pointer-events-none" onClick={() => setTab("tests")}>
          <span className="sr-only">{t("tests")}: </span>
          {running && py === "loading" ? (
            <SummaryLabel
              icon={<Loader2 size={15} className="shrink-0 animate-spin" aria-hidden />}
              short={t("pythonLoadingShort")}
              full={t("pythonLoading")}
              tone="text-muted"
            />
          ) : (
            <TestSummaryPill />
          )}
        </button>
        <button
          type="button"
          onClick={() => setPhase("review")}
          disabled={!allPass}
          title={allPass ? undefined : changedSinceGreen ? t("codeChanged") : t("openPrLocked")}
          className={`btn ms-auto whitespace-nowrap ${allPass ? "btn-good" : "btn-ghost"}`}
        >
          <GitPullRequest size={16} aria-hidden /> <span className="hidden sm:inline">{t("openPr")}</span>
          <span className="sm:hidden">{t("prShort")}</span>
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-[clamp(280px,24vw,24rem)_minmax(0,1fr)_clamp(280px,24vw,24rem)]">
        <div className="min-h-0 border-e border-line">
          <ChatPanel />
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-[3]">{codeArea}</div>
          <div className="min-h-0 flex-[2] border-t border-line">
            <TestPanel />
          </div>
          {actionBar}
        </div>
        <div className="min-h-0 border-s border-line">
          <TicketPanel />
        </div>
      </div>
    );
  }

  const TABS: { id: MobileTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "ticket", label: t("ticket"), icon: <ScrollText size={20} aria-hidden /> },
    { id: "team", label: t("team"), icon: <MessagesSquare size={20} aria-hidden />, badge: tab === "team" ? 0 : unreadTotal },
    { id: "code", label: t("code"), icon: <FileCode2 size={20} aria-hidden /> },
    { id: "tests", label: t("tests"), icon: <FlaskConical size={20} aria-hidden /> },
  ];

  // Phone and tablet: one pane at a time.
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
        {tab === "team" && <ChatPanel />}
        {tab === "ticket" && <TicketPanel />}
        {tab === "code" && codeArea}
        {tab === "tests" && <TestPanel />}
      </div>
      {(tab === "code" || tab === "tests") && actionBar}
      <nav className="grid grid-cols-4 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]" aria-label={t("workspaceNav")}>
        {TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            aria-current={tab === x.id ? "page" : undefined}
            className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[12px] ${tab === x.id ? "text-accent" : "text-muted"}`}
          >
            {x.icon}
            {x.label}
            {!!x.badge && (
              <span className="absolute top-1.5 start-[calc(50%+6px)] inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-ink">
                {x.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
