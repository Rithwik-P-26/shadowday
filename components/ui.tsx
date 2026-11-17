"use client";

import type { Character, Lang } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { useWorld } from "@/lib/world/store";

export function Avatar({ person, size = 36 }: { person: Pick<Character, "initials" | "color" | "name">; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-black select-none"
      style={{ width: size, height: size, background: person.color, fontSize: size * 0.42 }}
    >
      {person.initials}
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  const { t } = useT();
  return (
    <a href="/" className={`text-[17px] font-medium tracking-tight text-ink ${className}`} aria-label={t("home")}>
      Shadowday
    </a>
  );
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { t, lang } = useT();
  const setLang = useWorld((s) => s.setLang);
  const next: Lang = lang === "en" ? "ar" : "en";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className={`btn btn-ghost !min-h-[40px] !px-3.5 text-sm ${className}`}
    >
      {/* The visible label is the button's name (WCAG 2.5.3), spoken in the language it is written in. */}
      <span lang={next}>{t("langSwitch")}</span>
    </button>
  );
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
    </span>
  );
}

/** Very small text formatter: paragraphs, "- " bullets, numbered lines and `inline code`. */
export function RichText({ text, className = "", dir }: { text: string; className?: string; dir?: "auto" }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div dir={dir} className={`space-y-2 ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*([-•*]|\d+[.)])\s+/.test(l));
        if (isList) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`space-y-1 ps-5 ${ordered ? "list-decimal" : "list-disc"}`}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-•*]|\d+[.)])\s+/, ""))}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {inline(block)}
          </p>
        );
      })}
    </div>
  );
}

function inline(s: string) {
  const parts = s.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="code-ltr rounded-[6px] bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.88em]">
        {p.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/**
 * Arrow-key, Home and End navigation for a role="tablist" (ARIA tabs pattern, automatic activation).
 * Put it on the tablist; its role="tab" children must be in the same order as `ids`.
 */
export function onTabListKeyDown<T extends string>(e: React.KeyboardEvent<HTMLElement>, ids: readonly T[], current: T, select: (id: T) => void) {
  const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
  const i = ids.indexOf(current);
  let next: number;
  if (e.key === "ArrowRight") next = rtl ? i - 1 : i + 1;
  else if (e.key === "ArrowLeft") next = rtl ? i + 1 : i - 1;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = ids.length - 1;
  else return;
  e.preventDefault();
  next = (next + ids.length) % ids.length;
  select(ids[next]);
  e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
}
