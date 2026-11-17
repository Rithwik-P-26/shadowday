"use client";

import { Lightbulb, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar, onTabListKeyDown, RichText, TypingDots } from "@/components/ui";
import { useT } from "@/lib/i18n";
import type { AgentId } from "@/lib/types";
import { useAgents } from "@/lib/useAgents";
import { useUi, useWorld } from "@/lib/world/store";

const ORDER: AgentId[] = ["stakeholder", "mentor", "manager"];

export function ChatPanel() {
  const { day, send, askHint } = useAgents();
  const { t, l, lang } = useT();
  const channel = useUi((s) => s.channel);
  const setChannel = useUi((s) => s.setChannel);
  const typing = useUi((s) => s.typing);
  const tab = useUi((s) => s.tab);
  const chats = useWorld((s) => s.chats);
  const unread = useWorld((s) => s.unread);
  const markRead = useWorld((s) => s.markRead);
  const revealed = useWorld((s) => s.revealed);
  const lastRun = useWorld((s) => s.lastRun);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const uid = useId();
  const tabId = (id: AgentId) => `${uid}-tab-${id}`;
  const panelId = `${uid}-panel`;
  // Screen readers hear each new coworker message once, never the history a channel switch swaps in.
  const [latest, setLatest] = useState("");
  useEffect(
    () =>
      useWorld.subscribe((s, prev) => {
        if (s.chats === prev.chats || !day) return;
        for (const id of ORDER) {
          const seen = new Set(prev.chats[id].map((m) => m.id));
          const fresh = s.chats[id].filter((m) => !seen.has(m.id) && m.from !== "student");
          const m = fresh[fresh.length - 1];
          if (m) setLatest(`${day.people[id].name[lang]}: ${m.text.replaceAll("`", "")}`);
        }
      }),
    [day, lang],
  );

  const messages = chats[channel];
  const channelTyping = !!typing[channel];

  useEffect(() => {
    markRead(channel);
  }, [channel, messages.length, tab, markRead]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, channelTyping, channel]);

  if (!day) return null;
  const person = day.people[channel];

  const failingFn = lastRun?.ok ? lastRun.results.find((r) => !r.passed)?.fn : undefined;
  const hintTargets = failingFn ? [failingFn] : lastRun?.ok === false ? [] : day.ticket.functions.slice(0, 1).map((f) => f.name);

  const submit = () => {
    const text = draft.trim();
    if (!text || typing[channel]) return;
    setDraft("");
    void send(channel, text);
    inputRef.current?.focus();
  };

  return (
    <section aria-label={t("team")} className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label={t("team")}
        className="flex gap-1 border-b border-line p-2"
        onKeyDown={(e) => onTabListKeyDown(e, ORDER, channel, setChannel)}
      >
        {ORDER.map((id) => {
          const p = day.people[id];
          const active = id === channel;
          return (
            <button
              key={id}
              id={tabId(id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => setChannel(id)}
              className={`relative flex min-h-[44px] flex-1 items-center gap-2 rounded-full px-2.5 text-start text-sm transition-colors ${
                active ? "bg-raised-2 text-ink" : "text-muted hover:bg-raised hover:text-ink"
              }`}
            >
              <Avatar person={p} size={26} />
              <span className="min-w-0 truncate">{l(p.name)}</span>
              {unread[id] > 0 && !active && (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-medium text-accent-ink">
                  {unread[id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(channel)} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-line px-4 py-3">
          <div className="flex items-start gap-3">
            <Avatar person={person} size={40} />
            <div className="min-w-0">
              <p className="font-medium leading-tight">{l(person.name)}</p>
              <p className="text-sm leading-snug text-muted">{l(person.role)}</p>
            </div>
          </div>
          {channel === "stakeholder" && revealed && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-good/15 px-2.5 py-1 text-xs text-good">
              <Sparkles size={12} aria-hidden /> {t("revealedBadge")}
            </p>
          )}
        </div>

        <div ref={listRef} className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && <p className="text-sm text-muted">{l(person.bio)}</p>}
          {messages.map((m) => {
            const mine = m.from === "student";
            return (
              <div key={m.id} className={`msg-in flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-[18px] px-3.5 py-2.5 text-[15px] leading-relaxed ${
                    mine ? "rounded-ee-[6px] bg-accent text-accent-ink" : "rounded-es-[6px] bg-raised-2 text-ink"
                  }`}
                >
                  <RichText text={m.text} dir="auto" />
                </div>
              </div>
            );
          })}
          {typing[channel] && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <TypingDots />
              <span>{t("typing", { name: l(person.name) })}</span>
            </div>
          )}
        </div>

        {channel === "mentor" && hintTargets.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {hintTargets.map((fn) => (
              <button
                key={fn}
                type="button"
                disabled={!!typing.mentor}
                onClick={() => void askHint(fn)}
                className="btn btn-ghost !min-h-[38px] !px-3 text-sm"
              >
                <Lightbulb size={15} aria-hidden className="text-warn" />
                {t("askRavi", { fn: "" })}
                <code className="code-ltr font-mono text-[13px]">{fn}</code>
              </button>
            ))}
          </div>
        )}

        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            {t("messagePlaceholder", { name: l(person.name) })}
          </label>
          <textarea
            id="chat-input"
            dir={draft ? "auto" : undefined}
            ref={inputRef}
            value={draft}
            rows={1}
            maxLength={600}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t("messagePlaceholder", { name: l(person.name) })}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[22px] border border-line bg-raised px-4 py-2.5 text-[16px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none"
          />
          <button type="submit" className="btn btn-primary !h-11 !w-11 !p-0" disabled={!draft.trim() || !!typing[channel]} aria-label={t("send")}>
            <SendHorizontal size={18} aria-hidden className="rtl:-scale-x-100" />
          </button>
        </form>
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {latest}
      </p>
    </section>
  );
}
