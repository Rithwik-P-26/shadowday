"use client";

import { useCallback } from "react";
import { askAgent } from "@/lib/agentClient";
import type { AgentId, AgentRequest } from "@/lib/types";
import { isGreenNow, testSummary, useDay } from "@/lib/useDay";
import { useUi, useWorld } from "@/lib/world/store";

/** What the coworkers may know about the day so far (Ravi uses `revealed` to stop sending the student back to the customer). */
function dayStats(): AgentRequest["stats"] {
  const w = useWorld.getState();
  const minutes = w.session ? Math.max(0, Math.round((Date.now() - w.session.startedAt) / 60_000)) : 0;
  return { testRuns: w.runs.length, questionsAsked: w.questionsAsked, hintsUsed: w.hintsUsed, revealed: w.revealed, minutes };
}

/** Sends messages to the AI coworkers and writes their replies into the world state. */
export function useAgents() {
  const day = useDay();

  const base = useCallback((): Pick<AgentRequest, "lang" | "areaId" | "studentName"> | null => {
    const s = useWorld.getState();
    if (!s.session) return null;
    return { lang: s.lang, areaId: s.session.areaId, studentName: s.session.name || undefined };
  }, []);

  const history = (channel: AgentId) =>
    useWorld
      .getState()
      .chats[channel].slice(-12)
      .map((m) => ({ from: m.from, text: m.text }));

  const deliver = (channel: AgentId, text: string, provider?: "groq" | "gemini" | "scripted") => {
    const w = useWorld.getState();
    w.addMessage(channel, { from: channel, text, provider });
    if (useUi.getState().channel !== channel || useUi.getState().tab !== "team") {
      useWorld.setState((s) => ({ unread: { ...s.unread, [channel]: s.unread[channel] + 1 } }));
    }
  };

  const send = useCallback(
    async (channel: AgentId, text: string) => {
      const b = base();
      const clean = text.trim().slice(0, 600);
      if (!b || !clean) return;
      const w = useWorld.getState();
      const past = history(channel);
      w.addMessage(channel, { from: "student", text: clean });
      if (channel === "stakeholder") w.countQuestion();
      useUi.getState().setTyping(channel, true);
      const res = await askAgent({
        ...b,
        agent: channel,
        mode: "chat",
        message: clean,
        history: past,
        code: channel === "mentor" ? w.code : undefined,
        testSummary: channel === "mentor" ? testSummary() : undefined,
        stats: channel === "mentor" ? dayStats() : undefined,
      });
      useUi.getState().setTyping(channel, false);
      deliver(channel, res.text, res.provider);
      if (res.revealed) useWorld.getState().setRevealed();
    },
    [base],
  );

  const askHint = useCallback(
    async (fn: string) => {
      const b = base();
      if (!b) return;
      const w = useWorld.getState();
      // Every test already passes on this exact code: never spend (or count) a hint. The chip is hidden
      // then too; this covers a tap that lands just as a green run finishes.
      if (isGreenNow(w)) return;
      const level = w.useHint(fn);
      const q = b.lang === "ar" ? `هل يمكنك مساعدتي في ${fn}؟` : `Can you help me with ${fn}?`;
      const past = history("mentor");
      w.addMessage("mentor", { from: "student", text: q });
      useUi.getState().setTyping("mentor", true);
      const res = await askAgent({
        ...b,
        agent: "mentor",
        mode: "hint",
        focusFn: fn,
        hintLevel: level,
        history: past,
        code: w.code,
        testSummary: testSummary(),
        stats: dayStats(),
      });
      useUi.getState().setTyping("mentor", false);
      deliver("mentor", res.text, res.provider);
    },
    [base],
  );

  return { day, send, askHint };
}
