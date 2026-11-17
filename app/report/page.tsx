"use client";

import { strToU8, zipSync } from "fflate";
import { ArrowUpRight, Check, Download, Minus, Printer, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { DemoChart } from "@/components/DemoView";
import { Avatar, LangToggle, RichText, Wordmark } from "@/components/ui";
import { FREE_RESOURCES } from "@/content/dayScript";
import { useLangSync, useT } from "@/lib/i18n";
import { useDay } from "@/lib/useDay";
import { useHydrated, useWorld } from "@/lib/world/store";

function runnerScript(file: string) {
  return `"""Run the tests for ${file}:  python3 run_tests.py"""
ns = {}
exec(open("${file}", encoding="utf-8").read(), ns)
exec(open("tests.py", encoding="utf-8").read(), ns)
passed = failed = 0
for name, fn in list(ns.items()):
    if name.startswith("test_") and callable(fn):
        try:
            fn()
            passed += 1
            print("PASS", name)
        except AssertionError as e:
            failed += 1
            print("FAIL", name, "-", e)
print(f"\\n{passed} passed, {failed} failed")
`;
}

export default function ReportPage() {
  useLangSync();
  const hydrated = useHydrated();
  const router = useRouter();
  const day = useDay();
  const { t, l, lang, count } = useT();
  const w = useWorld();

  if (!hydrated) return <div className="h-dvh bg-bg" />;
  if (!day || !w.finishedAt) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg">{t("noReport")}</p>
        <a href="/start" className="btn btn-primary">
          {t("goStart")}
        </a>
      </main>
    );
  }

  const { ticket, area, archetype, people, session } = day;
  const minutes = Math.max(1, Math.round((w.finishedAt - session.startedAt) / 60_000));
  const last = w.runs[w.runs.length - 1];
  const date = new Date(w.finishedAt).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const name = session.name || (lang === "ar" ? "متدرّب" : "Shadow");

  const skills = [
    { done: w.revealed, label: t("skillAsk") },
    { done: w.runs.length > 0, label: w.runs.length > 0 ? `${t("skillTest")} (${count("runs", w.runs.length)})` : t("skillTest") },
    { done: w.hintsUsed > 0, label: w.hintsUsed > 0 ? `${t("skillHelp")} (${count("hints", w.hintsUsed)})` : t("skillHelp") },
    { done: w.merged, label: t("skillShip") },
    { done: !!w.demo, label: t("skillData") },
  ];

  const download = () => {
    const readme = `# ${ticket.key}: ${ticket.title.en}

Built during a Shadowday simulation at **${archetype.company.name}** (${area.name.en}, UAE), ${date}.

${archetype.company.about.en}

## The problem
${archetype.problem.en}

## What I built
${ticket.functions.map((f) => `- \`${f.signature}\`: ${f.summary.en}`).join("\n")}

${w.revealed ? `## The requirement I had to ask for\nThe ticket didn't say exactly what to flag. I asked ${archetype.stakeholder.name.en} (${archetype.stakeholder.role.en}), who told me:\n\n> ${ticket.hidden.rule.en}\n` : ""}
## Result
- Tests: ${last ? `${last.passed}/${last.total} passing` : "not run"} after ${w.runs.length} test runs
- Pull request reviewed by a senior engineer and ${w.merged ? "merged" : "not merged"}
${w.demo ? `- On the full dataset: ${w.demo.summary.en}` : ""}

## Run it
\`\`\`
python3 run_tests.py
\`\`\`

The data in \`${ticket.data.fileName}\` is realistic but made up for this exercise. ${archetype.company.name} is a fictional company.
`;
    const zip = zipSync({
      [`shadowday-${ticket.key.toLowerCase()}/README.md`]: strToU8(readme),
      [`shadowday-${ticket.key.toLowerCase()}/${ticket.fileName}`]: strToU8(w.code),
      [`shadowday-${ticket.key.toLowerCase()}/tests.py`]: strToU8(ticket.tests),
      [`shadowday-${ticket.key.toLowerCase()}/${ticket.data.fileName}`]: strToU8(ticket.data.csv),
      [`shadowday-${ticket.key.toLowerCase()}/run_tests.py`]: strToU8(runnerScript(ticket.fileName)),
    });
    const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `shadowday-${ticket.key.toLowerCase()}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <main className="min-h-dvh">
      <header className="no-print mx-auto flex h-16 max-w-5xl items-center justify-between px-4 lg:px-8">
        <Wordmark />
        <LangToggle />
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-6 pb-20 lg:px-8 lg:pt-10">
        <p className="font-mono text-sm text-accent">{t("reportTitle")}</p>
        <h1 className="mt-3 text-[38px] leading-[1.02] font-normal tracking-[-0.04em] [overflow-wrap:anywhere] sm:text-6xl">{name}</h1>
        {/* Each part is isolated so a Latin company name can't pull the Arabic date's numbers out of place. */}
        <p className="mt-3 text-lg text-muted">
          <bdi>{l(area.name)}</bdi> · <bdi>{l(area.emirate)}</bdi> · <bdi>{archetype.company.name}</bdi> · <bdi className="whitespace-nowrap">{date}</bdi> ·{" "}
          <bdi>{count("minutes", minutes)}</bdi>
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="print-card min-w-0 rounded-[24px] border border-line bg-surface p-5 lg:p-6">
            <h2 className="text-sm text-muted">{t("shipped")}</h2>
            <p className="mt-3 text-xl leading-snug font-medium tracking-tight">
              <span className="font-mono text-accent">{ticket.key}</span> {l(ticket.title)}
            </p>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[14px] bg-raised p-3">
                <dt className="text-xs text-muted">{t("tests")}</dt>
                <dd className="mt-1 font-mono text-lg">{last ? `${last.passed}/${last.total}` : "–"}</dd>
              </div>
              <div className="rounded-[14px] bg-raised p-3">
                <dt className="text-xs text-muted">{lang === "ar" ? "مرات التشغيل" : "Test runs"}</dt>
                <dd className="mt-1 font-mono text-lg">{w.runs.length}</dd>
              </div>
              <div className="rounded-[14px] bg-raised p-3">
                <dt className="text-xs text-muted">{t("prShort")}</dt>
                <dd className="mt-1 text-lg">{w.merged ? (lang === "ar" ? "دُمج" : "Merged") : "–"}</dd>
              </div>
            </dl>
            {w.demo && (
              <div className="mt-5">
                <DemoChart demo={w.demo} />
                <p className="mt-2 text-sm text-muted">{l(w.demo.summary)}</p>
              </div>
            )}
          </section>

          <section className="print-card min-w-0 rounded-[24px] border border-line bg-surface p-5 lg:p-6">
            <h2 className="text-sm text-muted">{t("skills")}</h2>
            <ul className="mt-4 space-y-3">
              {skills.map((s) => (
                <li key={s.label} className="flex items-start gap-3 text-[15px]">
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-good text-black" : "bg-raised-2 text-muted"}`}
                  >
                    {s.done ? <Check size={14} role="img" aria-label={t("skillDone")} /> : <Minus size={14} role="img" aria-label={t("skillNotDone")} />}
                  </span>
                  <span className={s.done ? "" : "text-muted"}>{s.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {ticket.conceptTags.map((c) => (
                <span key={c.en} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                  {l(c)}
                </span>
              ))}
            </div>
          </section>

          <section className="print-card min-w-0 rounded-[24px] border border-line bg-surface p-5 lg:col-span-2 lg:p-6">
            <div className="flex items-center gap-3">
              <Avatar person={people.manager} size={36} />
              <h2 className="font-medium">{t("managerNote")}</h2>
            </div>
            <RichText text={w.eod ?? ""} className="mt-4 max-w-3xl text-[16px] leading-relaxed text-ink/90" />
          </section>

          <section className="print-card min-w-0 rounded-[24px] border border-line bg-surface p-5 lg:col-span-2 lg:p-6">
            <h2 className="font-medium">{t("keepGoing")}</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {FREE_RESOURCES.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-h-[56px] items-center justify-between gap-3 rounded-[14px] bg-raised px-4 py-3 transition-transform hover:-translate-y-0.5"
                  >
                    <span>
                      <span className="block text-[15px]">{r.name}</span>
                      <span className="block text-sm text-muted">{r.by}</span>
                    </span>
                    <ArrowUpRight size={18} aria-hidden className="shrink-0 text-muted transition-colors group-hover:text-accent rtl:-scale-x-100" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="no-print mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn btn-primary" onClick={download}>
            <Download size={16} aria-hidden /> {t("download")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            <Printer size={16} aria-hidden /> {t("print")}
          </button>
          <button
            type="button"
            className="btn btn-ghost sm:ms-auto"
            onClick={() => {
              useWorld.getState().reset();
              router.push("/start");
            }}
          >
            <RotateCcw size={16} aria-hidden /> {t("anotherDay")}
          </button>
        </div>
      </div>
    </main>
  );
}
