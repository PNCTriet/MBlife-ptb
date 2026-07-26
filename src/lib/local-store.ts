import { LOCAL_EMPLOYEES } from "@/data/local-employees";
import type { Employee, LiveState } from "./types";

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

const POLL_MS = 500;

function stateTimestamp(state: LiveState): number {
  const raw = state.triggered_at || state.updated_at;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

export function isLocalMode(): boolean {
  if (process.env.NEXT_PUBLIC_USE_LOCAL_DATA === "true") return true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return (
    !url ||
    !key ||
    url.includes("your-project") ||
    key === "your-anon-key"
  );
}

export function getLocalEmployees(): Employee[] {
  return LOCAL_EMPLOYEES;
}

export async function updateLocalLiveState(employee: Employee): Promise<void> {
  const res = await fetch("/api/live-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employee_id: employee.id,
      employee_name: employee.name,
      days: employee.days,
      title: employee.title,
      wish: employee.wish,
      triggered_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to update live state");
  }
}

export async function clearLocalLiveState(): Promise<void> {
  const now = new Date().toISOString();
  const res = await fetch("/api/live-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employee_id: null,
      employee_name: null,
      days: null,
      title: null,
      wish: null,
      triggered_at: now,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to clear live state");
  }
}

export function subscribeLocalLiveState(
  onState: (state: LiveState) => void,
  onConnected: (connected: boolean) => void
): () => void {
  let cancelled = false;
  let latestMs = -1;

  const poll = async () => {
    try {
      const res = await fetch("/api/live-state", { cache: "no-store" });
      if (!res.ok) throw new Error("poll failed");

      const state = (await res.json()) as LiveState;
      onConnected(true);

      const ms = stateTimestamp(state);
      if (ms < latestMs) return;
      latestMs = ms;
      onState(state);
    } catch {
      onConnected(false);
      if (latestMs < 0) onState(IDLE_STATE);
    }
  };

  void poll();
  const timer = window.setInterval(() => {
    if (!cancelled) void poll();
  }, POLL_MS);

  return () => {
    cancelled = true;
    window.clearInterval(timer);
    onConnected(false);
  };
}
