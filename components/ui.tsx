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
  return (
    <a href="/" className={`text-[17px] font-medium tracking-tight text-ink ${className}`} aria-label="Shadowday home">
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
      lang={next}
      aria-label={next === "ar" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      {t("langSwitch")}
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
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className={`space-y-2 ${className}`}>
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
