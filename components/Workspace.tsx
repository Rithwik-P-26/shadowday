"use client";

import type { EditorView } from "@codemirror/view";
import { FileCode2, FlaskConical, GitPullRequest, MessagesSquare, Play, RotateCcw, ScrollText } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { KeyBar } from "@/components/CodeEditor";
import { TestPanel, TestSummaryPill } from "@/components/TestPanel";
import { TicketPanel } from "@/components/TicketPanel";
import { useT } from "@/lib/i18n";
import { runTests } from "@/lib/runner/client";
import { useDay } from "@/lib/useDay";
import { type MobileTab, useUi, useWorld } from "@/lib/world/store";

const CodeEditor = dynamic(() => import("@/components/CodeEditor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-surface" />,
});

export function Workspace() {
  const day = useDay();
  const { t } = useT();
  const code = useWorld((s) => s.code);
  const setCode = useWorld((s) => s.setCode);
  const recordRun = useWorld((s) => s.recordRun);
  const setPhase = useWorld((s) => s.setPhase);
  const lastRun = useWorld((s) => s.lastRun);
  const unread = useWorld((s) => s.unread);
  const running = useUi((s) => s.running);
  const setRunning = useUi((s) => s.setRunning);
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const [file, setFile] = useState<"main" | "tests">("main");
  const editorRef = useRef<EditorView | null>(null);

  const run = useCallback(async () => {
    const d = day;
    if (!d || useUi.getState().running) return;
    setRunning(true);
    const result = await runTests(useWorld.getState().code, d.ticket.tests);
    recordRun(result);
    setRunning(false);
  }, [day, recordRun, setRunning]);

  if (!day) return null;
  const { ticket } = day;
  const allPass = !!lastRun?.ok && lastRun.results.length > 0 && lastRun.results.every((r) => r.passed);
  const unreadTotal = unread.manager + unread.mentor + unread.stakeholder;

  const codeArea = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        {(["main", "tests"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFile(f)}
            className={`code-ltr min-h-[36px] rounded-[10px] px-3 font-mono text-[13px] ${file === f ? "bg-raised-2 text-ink" : "text-muted hover:text-ink"}`}
          >
            {f === "main" ? ticket.fileName : "tests.py"}
            {f === "tests" && <span className="ms-2 font-sans text-[11px] text-muted">{t("readOnly")}</span>}
          </button>
        ))}
        <button
          type="button"
          className="ms-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-[10px] px-2.5 text-sm text-muted hover:text-ink"
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
    <div className="flex items-center gap-3 border-t border-line bg-bg px-3 py-2.5 lg:px-4">
      <button type="button" onClick={() => void run()} disabled={running} className="btn btn-primary">
        <Play size={16} aria-hidden className="rtl:-scale-x-100" /> {running ? t("running") : t("runTests")}
      </button>
      <button
        type="button"
        className="min-w-0 truncate text-start lg:pointer-events-none"
        onClick={() => setTab("tests")}
        aria-label={t("tests")}
      >
        <TestSummaryPill />
      </button>
      <button
        type="button"
        onClick={() => setPhase("review")}
        disabled={!allPass}
        title={allPass ? undefined : t("openPrLocked")}
        className={`btn ms-auto ${allPass ? "btn-good" : "btn-ghost"}`}
      >
        <GitPullRequest size={16} aria-hidden /> <span className="hidden sm:inline">{t("openPr")}</span>
        <span className="sm:hidden">PR</span>
      </button>
    </div>
  );

  const TABS: { id: MobileTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "ticket", label: t("ticket"), icon: <ScrollText size={20} aria-hidden /> },
    { id: "team", label: t("team"), icon: <MessagesSquare size={20} aria-hidden />, badge: tab === "team" ? 0 : unreadTotal },
    { id: "code", label: t("code"), icon: <FileCode2 size={20} aria-hidden /> },
    { id: "tests", label: t("tests"), icon: <FlaskConical size={20} aria-hidden /> },
  ];

  return (
    <>
      {/* Desktop: three panes */}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(300px,24rem)_1fr_minmax(300px,24rem)]">
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

      {/* Phone and tablet: one pane at a time */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="min-h-0 flex-1">
          {tab === "team" && <ChatPanel />}
          {tab === "ticket" && <TicketPanel />}
          {tab === "code" && codeArea}
          {tab === "tests" && <TestPanel />}
        </div>
        {(tab === "code" || tab === "tests") && actionBar}
        <nav className="grid grid-cols-4 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]" aria-label="Workspace">
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
    </>
  );
}
