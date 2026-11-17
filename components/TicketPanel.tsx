"use client";

import { Circle, CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";
import { Avatar, RichText } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useDay } from "@/lib/useDay";
import { useWorld } from "@/lib/world/store";

export function TicketPanel() {
  const day = useDay();
  const { t, l } = useT();
  const lastRun = useWorld((s) => s.lastRun);
  const [view, setView] = useState<"ticket" | "data">("ticket");
  if (!day) return null;
  const { ticket, people } = day;

  const status = (fn: string) => {
    const rs = lastRun?.ok ? lastRun.results.filter((r) => r.fn === fn) : [];
    if (!rs.length) return "unknown";
    return rs.every((r) => r.passed) ? "pass" : "fail";
  };

  const rows = ticket.data.csv.trim().split("\n");
  const header = rows[0].split(",");
  const body = rows.slice(1, 13).map((r) => r.split(","));

  return (
    <section aria-label={t("ticket")} className="flex h-full min-h-0 flex-col">
      <div role="tablist" className="flex gap-1 border-b border-line p-2">
        {(["ticket", "data"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`min-h-[40px] flex-1 rounded-full px-3 text-sm ${view === v ? "bg-raised-2 text-ink" : "text-muted hover:text-ink"}`}
          >
            {v === "ticket" ? t("ticket") : t("data")}
          </button>
        ))}
      </div>

      {view === "ticket" ? (
        <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div>
            <p className="font-mono text-xs text-accent">{ticket.key}</p>
            <h2 className="mt-1 text-xl leading-snug font-medium tracking-tight">{l(ticket.title)}</h2>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Avatar person={people.manager} size={22} />
              <span>{l(people.manager.name)}</span>
            </div>
          </div>
          <RichText text={l(ticket.body)} className="text-[15px] leading-relaxed text-ink/90" />
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted">{t("functions")}</h3>
            <ul className="space-y-2">
              {ticket.functions.map((f) => {
                const s = status(f.name);
                return (
                  <li key={f.name} className="rounded-[14px] border border-line bg-raised p-3">
                    <p className="code-ltr flex items-center gap-2 font-mono text-[13px]">
                      {s === "pass" ? (
                        <CircleCheck size={15} className="text-good" aria-label="passing" />
                      ) : s === "fail" ? (
                        <CircleX size={15} className="text-bad" aria-label="failing" />
                      ) : (
                        <Circle size={15} className="text-muted" aria-label="not run" />
                      )}
                      <span className="truncate">{f.signature}</span>
                    </p>
                    <p className="mt-1.5 text-sm leading-snug text-muted">{l(f.summary)}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <div className="scroll-thin min-h-0 flex-1 overflow-auto px-4 py-4">
          <p className="code-ltr mb-2 font-mono text-xs text-muted">{ticket.data.fileName}</p>
          <div className="code-ltr overflow-x-auto rounded-[12px] border border-line">
            <table className="w-full font-mono text-[12.5px]">
              <thead className="bg-raised text-muted">
                <tr>
                  {header.map((h) => (
                    <th key={h} className="px-3 py-2 text-start font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    {r.map((c, j) => (
                      <td key={j} className={`px-3 py-1.5 whitespace-nowrap ${c.trim() === "ERR" ? "text-bad" : "text-ink/85"}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">{t("rowsOf", { n: body.length, total: rows.length - 1 })}</p>
        </div>
      )}
    </section>
  );
}
