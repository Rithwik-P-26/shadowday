"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { LangToggle, Wordmark } from "@/components/ui";
import { useT } from "@/lib/i18n";
import type { Phase } from "@/lib/types";
import { useDay } from "@/lib/useDay";
import { useWorld } from "@/lib/world/store";

const PHASES: Phase[] = ["standup", "work", "review", "demo", "report"];

/**
 * iOS Safari never shrinks the layout viewport (or 100dvh) for the on-screen keyboard, so the bottom bars of the
 * /day shell would sit under it. While the keyboard is up, publish the visible height and offset as --app-h and
 * --app-top (used in globals.css); otherwise leave them unset so the shell stays at 100dvh. Android Chrome resizes
 * the layout itself (interactive-widget=resizes-content in app/layout.tsx), so this stays unset there.
 */
function useKeyboardViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement.style;
    const clear = () => {
      root.removeProperty("--app-h");
      root.removeProperty("--app-top");
    };
    const update = () => {
      // Compare with the layout viewport (clientHeight leaves out scrollbars, as the visual viewport does).
      // Pinch zoom also shrinks the visual viewport: only follow it at 1x, when the gap is the keyboard.
      if (Math.abs(vv.scale - 1) < 0.01 && document.documentElement.clientHeight - vv.height > 1) {
        root.setProperty("--app-h", `${vv.height}px`);
        root.setProperty("--app-top", `${vv.pageTop}px`);
      } else clear();
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      clear();
    };
  }, []);
}

export function TopBar() {
  const day = useDay();
  const { t, l, count } = useT();
  useKeyboardViewport();
  const phase = useWorld((s) => s.phase);
  const startedAt = useWorld((s) => s.session?.startedAt ?? Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const minutes = Math.max(0, Math.round((now - startedAt) / 60_000));
  const current = PHASES.indexOf(phase);

  return (
    <header data-day-topbar className="no-print flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg px-4 lg:h-16 lg:px-6">
      <Wordmark />
      {day && (
        <span className="hidden truncate text-sm text-muted md:inline">
          {day.archetype.company.name} · {l(day.area.name)}
        </span>
      )}
      <nav aria-label={t("dayProgress")} className="mx-auto hidden items-center gap-1 lg:flex">
        {PHASES.map((p, i) => (
          <span
            key={p}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
              i === current ? "bg-raised-2 text-ink" : i < current ? "text-good" : "text-muted"
            }`}
            aria-current={i === current ? "step" : undefined}
          >
            {i < current ? <Check size={14} aria-hidden /> : <span className="font-mono text-xs opacity-70">{i + 1}</span>}
            {t(`phase_${p}` as const)}
          </span>
        ))}
      </nav>
      <span className="ms-auto font-mono text-xs text-muted lg:ms-0 lg:text-sm" title={t("timeInDay")}>
        {count("minutes", minutes)}
      </span>
      <LangToggle />
    </header>
  );
}

/** Compact progress line for phones and tablets. */
export function MobilePhaseLine() {
  const { t } = useT();
  const phase = useWorld((s) => s.phase);
  const current = PHASES.indexOf(phase);
  return (
    <div role="group" aria-label={t("dayProgress")} className="no-print flex items-center gap-2 border-b border-line px-4 py-2 lg:hidden">
      <div className="flex flex-1 gap-1">
        {PHASES.map((p, i) => (
          <span key={p} className={`h-1 flex-1 rounded-full ${i <= current ? "bg-accent" : "bg-white/10"}`} />
        ))}
      </div>
      <span className="text-xs text-muted">{t(`phase_${phase}` as const)}</span>
    </div>
  );
}
