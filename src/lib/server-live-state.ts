import type { LiveState } from "@/lib/types";

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

// Shared across requests while the Next.js process is running
let liveState: LiveState = { ...IDLE_STATE };

export function getServerLiveState(): LiveState {
  return liveState;
}

export function setServerLiveState(next: LiveState): LiveState {
  liveState = next;
  return liveState;
}

export function resetServerLiveState(): LiveState {
  liveState = {
    ...IDLE_STATE,
    updated_at: new Date().toISOString(),
  };
  return liveState;
}
