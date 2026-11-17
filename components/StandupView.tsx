"use client";

import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, TypingDots } from "@/components/ui";
import { mentorHello, stakeholderHello, standupLines } from "@/content/dayScript";
import { useT } from "@/lib/i18n";
import { onRunnerStatus, preloadPython } from "@/lib/runner/client";
import { useDay } from "@/lib/useDay";
import { useUi, useWorld } from "@/lib/world/store";

export function StandupView() {
  const day = useDay();
  const { t, l, lang } = useT();
  const finishStandup = useWorld((s) => s.finishStandup);
  const [shown, setShown] = useState(1);
  const [py, setPy] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const lines = useMemo(
    () => (day ? standupLines(lang, { name: day.session.name, area: day.area, archetype: day.archetype, ticket: day.ticket }) : []),
    [day, lang],
  );

  useEffect(() => {
    const off = onRunnerStatus(setPy);
    preloadPython().catch(() => {});
    return off;
  }, []);

  useEffect(() => {
    if (shown >= lines.length) return;
    const id = setTimeout(() => setShown((s) => s + 1), 1600);
    return () => clearTimeout(id);
  }, [shown, lines.length]);

  if (!day) return null;
  const { people, ticket } = day;
  const done = shown >= lines.length;

  const begin = () => {
    const w = useWorld.getState();
    lines.forEach((text) => w.addMessage("manager", { from: "manager", text }));
    w.addMessage("stakeholder", { from: "stakeholder", text: stakeholderHello(lang, day.archetype.id, day.session.name) });
    w.addMessage("mentor", { from: "mentor", text: mentorHello(lang, day.session.name) });
    useWorld.setState((s) => ({ unread: { ...s.unread, stakeholder: 1, mentor: 1 } }));
    useUi.getState().setChannel("stakeholder");
    useUi.getState().setTab("ticket");
    finishStandup();
  };

  return (
    <div className="scroll-thin flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-8 lg:py-12">
      <div className="w-full max-w-2xl">
        <p className="text-sm text-muted">{t("standupTitle")} · {day.archetype.company.name}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {(["manager", "mentor", "stakeholder"] as const).map((id) => (
            <div key={id} className="flex flex-col items-center gap-2 rounded-[18px] border border-line bg-surface px-2 py-4 text-center">
              <Avatar person={people[id]} size={48} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l(people[id].name)}</p>
                <p className="line-clamp-2 text-xs leading-snug text-muted">{l(people[id].role)}</p>
              </div>
            </div>
          ))}
        </div>

        <ol className="mt-6 space-y-3" aria-live="polite">
          {lines.slice(0, shown).map((text, i) => (
            <li key={i} className="msg-in flex gap-3">
              <Avatar person={people.manager} size={32} />
              <p className="rounded-[18px] rounded-ss-[6px] bg-raised-2 px-4 py-3 text-[15px] leading-relaxed">{text}</p>
            </li>
          ))}
          {!done && (
            <li className="flex items-center gap-3 ps-11 text-sm text-muted">
              <TypingDots />
              <button type="button" className="-my-3 min-h-[44px] px-2 underline-offset-4 hover:underline" onClick={() => setShown(lines.length)}>
                {t("skip")}
              </button>
            </li>
          )}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!done} onClick={begin}>
            {t("pickUpTicket", { key: ticket.key })} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" />
          </button>
          <span className="flex items-center gap-2 text-sm text-muted">
            {py === "ready" ? (
              <span className="h-2 w-2 rounded-full bg-good" aria-hidden />
            ) : py === "error" ? (
              <TriangleAlert size={14} className="text-warn" aria-hidden />
            ) : (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            )}
            {py === "ready" ? t("pythonReady") : py === "error" ? t("pythonError") : t("pythonLoading")}
            {py === "error" && (
              <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 text-sm" onClick={() => void preloadPython().catch(() => {})}>
                {t("retry")}
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
