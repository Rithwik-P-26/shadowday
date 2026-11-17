"use client";

import { ArrowRight, Droplets, Flame, MapPin, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LangToggle, Wordmark } from "@/components/ui";
import { ARCHETYPES, AREAS, getArea, kmToNearestHub } from "@/content/regions";
import { getTicket } from "@/content/tickets";
import { useLangSync, useT } from "@/lib/i18n";
import type { ArchetypeId } from "@/lib/types";
import { useHydrated, useWorld } from "@/lib/world/store";

const ICON: Record<ArchetypeId, React.ReactNode> = {
  water: <Droplets size={16} aria-hidden />,
  floods: <Waves size={16} aria-hidden />,
  heat: <Flame size={16} aria-hidden />,
};

export default function StartPage() {
  useLangSync();
  const hydrated = useHydrated();
  const router = useRouter();
  const { t, l, lang } = useT();
  const session = useWorld((s) => s.session);
  const finishedAt = useWorld((s) => s.finishedAt);
  const start = useWorld((s) => s.start);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const groups = useMemo(() => {
    const order: ArchetypeId[] = ["water", "floods", "heat"];
    return order.map((id) => ({ id, areas: AREAS.filter((a) => a.archetype === id) }));
  }, []);

  const chosen = areaId ? getArea(areaId) : null;
  const company = chosen ? ARCHETYPES[chosen.archetype].company.name : "";

  const begin = () => {
    if (!chosen) return;
    start(name, chosen.id, getTicket(chosen.archetype).starter);
    router.push("/day");
  };

  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
        <Wordmark />
        <LangToggle />
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-40 lg:px-8 lg:pt-10">
        {hydrated && session && !finishedAt && (
          <div className="mb-8 flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-[15px]">
              {ARCHETYPES[getArea(session.areaId).archetype].company.name} · {l(getArea(session.areaId).name)}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => router.push("/day")}>
              {t("resume")} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" />
            </button>
          </div>
        )}

        <h1 className="max-w-3xl text-[34px] leading-[1.05] font-normal tracking-[-0.035em] sm:text-5xl lg:text-[56px]">{t("startTitle")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{t("startLead")}</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {groups.map((g) => {
            const a = ARCHETYPES[g.id];
            return (
              <fieldset key={g.id} className="min-w-0">
                <legend className="mb-1 flex items-center gap-2 text-sm text-accent">
                  {ICON[g.id]} {a.company.name}
                </legend>
                <p className="mb-4 text-[15px] leading-snug text-muted">{l(a.company.tagline)}</p>
                <div className="grid gap-2">
                  {g.areas.map((area) => {
                    const hub = kmToNearestHub(area);
                    const active = area.id === areaId;
                    return (
                      <label
                        key={area.id}
                        className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[16px] border px-4 py-3 transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 ${
                          active ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-line-strong"
                        }`}
                      >
                        <input type="radio" name="area" value={area.id} checked={active} onChange={() => setAreaId(area.id)} className="sr-only" />
                        <MapPin size={16} aria-hidden className={active ? "text-accent" : "text-muted"} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{l(area.name)}</span>
                          <span className="block truncate text-sm text-muted">{l(area.emirate)}</span>
                        </span>
                        <span className="shrink-0 text-end font-mono text-xs text-muted">{lang === "ar" ? `${hub.km} كم` : `${hub.km} km`}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted">
          {lang === "ar"
            ? "المسافة بخط مستقيم إلى أقرب مركز للشركات الناشئة: مدينة دبي للإنترنت أو هب71 في أبوظبي."
            : "Straight-line distance to the nearest startup hub: Dubai Internet City or Hub71 in Abu Dhabi."}
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end lg:px-8">
          <div className="flex-1">
            <label htmlFor="student-name" className="mb-1 block text-sm text-muted">
              {t("yourName")}
            </label>
            <input
              id="student-name"
              value={name}
              maxLength={40}
              autoComplete="given-name"
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-full border border-line bg-raised px-4 text-[16px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none sm:max-w-xs"
              aria-describedby="name-hint"
            />
            <p id="name-hint" className="mt-1 hidden text-xs text-muted sm:block">
              {t("yourNameHint")}
            </p>
          </div>
          <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!chosen} onClick={begin}>
            {chosen ? t("begin", { company }) : t("pickArea")} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </main>
  );
}
