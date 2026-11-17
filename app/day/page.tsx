"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DemoView } from "@/components/DemoView";
import { ReviewView } from "@/components/ReviewView";
import { StandupView } from "@/components/StandupView";
import { MobilePhaseLine, TopBar } from "@/components/TopBar";
import { Workspace } from "@/components/Workspace";
import { useLangSync } from "@/lib/i18n";
import { useHydrated, useWorld } from "@/lib/world/store";

export default function DayPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const session = useWorld((s) => s.session);
  const phase = useWorld((s) => s.phase);
  useLangSync();

  useEffect(() => {
    if (!hydrated) return;
    if (!session) router.replace("/start");
    else if (phase === "report") router.replace("/report");
  }, [hydrated, session, phase, router]);

  if (!hydrated || !session) return <div className="h-dvh bg-bg" />;

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <MobilePhaseLine />
      {phase === "standup" && <StandupView />}
      {phase === "work" && <Workspace />}
      {phase === "review" && <ReviewView />}
      {phase === "demo" && <DemoView />}
    </main>
  );
}
