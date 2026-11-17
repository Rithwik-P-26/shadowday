"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AgentId, ChatMessage, DemoResult, Lang, Phase, Provider, TestRun } from "@/lib/types";

export interface RunRecord {
  at: number;
  passed: number;
  total: number;
  ok: boolean;
}

export interface Session {
  id: string;
  name: string;
  areaId: string;
  startedAt: number;
}

export interface WorldState {
  lang: Lang;
  session: Session | null;
  phase: Phase;
  standupDone: boolean;
  code: string;
  runs: RunRecord[];
  lastRun: TestRun | null;
  /** The exact code lastRun was produced from, so a green run can't vouch for code edited afterwards. */
  lastRunCode: string | null;
  chats: Record<AgentId, ChatMessage[]>;
  unread: Record<AgentId, number>;
  revealed: boolean;
  revealedAt: number | null;
  questionsAsked: number;
  hintsUsed: number;
  hintLevels: Record<string, number>;
  review: { text: string; approved: boolean; provider: Provider; code: string } | null;
  merged: boolean;
  demo: DemoResult | null;
  demoNote: string | null;
  eod: string | null;
  finishedAt: number | null;

  setLang: (lang: Lang) => void;
  start: (name: string, areaId: string, starter: string) => void;
  reset: () => void;
  setPhase: (phase: Phase) => void;
  finishStandup: () => void;
  setCode: (code: string) => void;
  recordRun: (run: TestRun, code: string) => void;
  addMessage: (channel: AgentId, msg: Omit<ChatMessage, "id" | "at">) => void;
  markRead: (channel: AgentId) => void;
  setRevealed: () => void;
  countQuestion: () => void;
  useHint: (fn: string) => number;
  setReview: (r: WorldState["review"]) => void;
  setMerged: () => void;
  setDemo: (demo: DemoResult, note?: string | null) => void;
  setDemoNote: (note: string) => void;
  /** Leave a failed demo: un-merge and go back to editing, so the student can fix and re-open the PR. */
  reopenWork: () => void;
  finish: (eod: string) => void;
}

const emptyChats = (): Record<AgentId, ChatMessage[]> => ({ manager: [], stakeholder: [], mentor: [] });
const emptyUnread = (): Record<AgentId, number> => ({ manager: 0, stakeholder: 0, mentor: 0 });

const dayDefaults = {
  session: null,
  phase: "standup" as Phase,
  standupDone: false,
  code: "",
  runs: [] as RunRecord[],
  lastRun: null,
  lastRunCode: null,
  chats: emptyChats(),
  unread: emptyUnread(),
  revealed: false,
  revealedAt: null,
  questionsAsked: 0,
  hintsUsed: 0,
  hintLevels: {} as Record<string, number>,
  review: null,
  merged: false,
  demo: null,
  demoNote: null,
  eod: null,
  finishedAt: null,
};

let msgSeq = 0;
const newId = () => `${Date.now().toString(36)}-${(msgSeq++).toString(36)}`;

export const useWorld = create<WorldState>()(
  persist(
    (set, get) => ({
      lang: "en",
      ...dayDefaults,

      setLang: (lang) => set({ lang }),
      start: (name, areaId, starter) =>
        set({
          ...dayDefaults,
          chats: emptyChats(),
          unread: emptyUnread(),
          hintLevels: {},
          runs: [],
          session: { id: newId(), name: name.trim().slice(0, 40), areaId, startedAt: Date.now() },
          code: starter,
        }),
      reset: () => set({ ...dayDefaults, chats: emptyChats(), unread: emptyUnread(), hintLevels: {}, runs: [] }),
      setPhase: (phase) => set({ phase }),
      finishStandup: () => set({ standupDone: true, phase: "work" }),
      setCode: (code) => set({ code }),
      recordRun: (run, code) =>
        set((s) => ({
          lastRun: run,
          lastRunCode: code,
          runs: [
            ...s.runs,
            {
              at: Date.now(),
              ok: run.ok,
              total: run.results.length,
              passed: run.results.filter((r) => r.passed).length,
            },
          ],
        })),
      addMessage: (channel, msg) =>
        set((s) => ({
          chats: { ...s.chats, [channel]: [...s.chats[channel], { ...msg, id: newId(), at: Date.now() }] },
        })),
      markRead: (channel) => set((s) => ({ unread: { ...s.unread, [channel]: 0 } })),
      setRevealed: () => {
        if (!get().revealed) set({ revealed: true, revealedAt: Date.now() });
      },
      countQuestion: () => set((s) => ({ questionsAsked: s.questionsAsked + 1 })),
      useHint: (fn) => {
        const level = get().hintLevels[fn] ?? 0;
        set((s) => ({ hintsUsed: s.hintsUsed + 1, hintLevels: { ...s.hintLevels, [fn]: level + 1 } }));
        return level;
      },
      setReview: (review) => set({ review }),
      setMerged: () => set({ merged: true, phase: "demo" }),
      setDemo: (demo, note = null) => set({ demo, demoNote: note }),
      setDemoNote: (demoNote) => set({ demoNote }),
      reopenWork: () => set({ phase: "work", merged: false, review: null, demo: null, demoNote: null }),
      finish: (eod) => set({ eod, finishedAt: Date.now(), phase: "report" }),
    }),
    {
      name: "shadowday-v1",
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          // Private mode or blocked storage: keep state in memory only.
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          };
        }
      }),
    },
  ),
);

/** True once the persisted state has loaded on the client (avoids hydration mismatches). */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useWorld.persist.onFinishHydration(cb),
    () => useWorld.persist.hasHydrated(),
    () => false,
  );
}

/** UI-only state that should not survive a reload. */
export type MobileTab = "team" | "ticket" | "code" | "tests";
export const useUi = create<{
  channel: AgentId;
  tab: MobileTab;
  typing: Partial<Record<AgentId, boolean>>;
  running: boolean;
  setChannel: (c: AgentId) => void;
  setTab: (t: MobileTab) => void;
  setTyping: (c: AgentId, v: boolean) => void;
  setRunning: (v: boolean) => void;
}>()((set) => ({
  channel: "stakeholder",
  tab: "ticket",
  typing: {},
  running: false,
  setChannel: (channel) => set({ channel }),
  setTab: (tab) => set({ tab }),
  setTyping: (c, v) => set((s) => ({ typing: { ...s.typing, [c]: v } })),
  setRunning: (running) => set({ running }),
}));

// Exposed for automated end-to-end checks and the demo-video recorder. Holds only this device's own state.
if (typeof window !== "undefined") {
  (window as unknown as { __shadowday?: typeof useWorld }).__shadowday = useWorld;
}
