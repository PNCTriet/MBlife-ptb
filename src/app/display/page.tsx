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
  const [connected, setConnected] = useState(false);
  const [editingLayout, setEditingLayout] = useState(false);

  const applyState = useCallback((row: LiveState) => {
    setLiveState(row);
  }, []);

  useEffect(() => {
    return subscribeLiveState(applyState, setConnected);
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
      <WaitLedScene
        visible={!hasEmployee}
        onEditModeChange={setEditingLayout}
      />

      <EmployeeReveal
        name={liveState.employee_name ?? ""}
        days={liveState.days ?? 0}
        title={liveState.title ?? "Chị"}
        wish={liveState.wish ?? ""}
        visible={hasEmployee}
        onEditModeChange={setEditingLayout}
      />

      <div
        className={`absolute bottom-4 right-4 z-30 flex flex-col items-end gap-1 text-xs text-white/30 ${
          editingLayout ? "hidden" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
          />
          {connected ? "Live" : "Đang kết nối..."}
        </div>
      </div>
    </main>
  );
}
