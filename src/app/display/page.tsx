"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { subscribeLiveState } from "@/lib/live-data";
import type { LiveState } from "@/lib/types";
import EmployeeReveal from "@/components/display/EmployeeReveal";
import WaitLedScene from "@/components/display/WaitLedScene";

const IDLE_STATE: LiveState = {
  id: 1,
  employee_id: null,
  employee_name: null,
  days: null,
  title: null,
  wish: null,
  triggered_at: null,
  updated_at: new Date().toISOString(),
};

export default function DisplayPage() {
  const [liveState, setLiveState] = useState<LiveState>(IDLE_STATE);

  const applyState = useCallback((row: LiveState) => {
    setLiveState(row);
  }, []);

  useEffect(() => {
    return subscribeLiveState(applyState, () => {});
  }, [applyState]);

  const hasEmployee = Boolean(
    liveState.employee_name?.trim() &&
      liveState.days != null &&
      liveState.title
  );

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-black"
      style={{} as CSSProperties}
    >
      {/* Physical set (logo / stairs / flares) shows through; software = LED only. */}
      <WaitLedScene visible={!hasEmployee} />

      <EmployeeReveal
        name={liveState.employee_name ?? ""}
        days={liveState.days ?? 0}
        title={liveState.title ?? "Chị"}
        wish={liveState.wish ?? ""}
        visible={hasEmployee}
      />
    </main>
  );
}
