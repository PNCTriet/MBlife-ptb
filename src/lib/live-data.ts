import type { Employee, LiveState } from "./types";
import { normalizeEmployeeCode } from "./employees";
import {
  clearLocalLiveState,
  getLocalEmployees,
  isLocalMode,
  subscribeLocalLiveState,
  updateLocalLiveState,
} from "./local-store";
import { createBrowserClient } from "./supabase/client";

export { isLocalMode };

function stateTimestamp(state: LiveState): number {
  const raw = state.triggered_at || state.updated_at;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

/** Only forward newer states so a late fetch cannot overwrite a fresher realtime event. */
function createOrderedStateHandler(onState: (state: LiveState) => void) {
  let latestMs = -1;

  return (state: LiveState) => {
    const ms = stateTimestamp(state);
    if (ms < latestMs) return;
    latestMs = ms;
    onState(state);
  };
}

export async function fetchEmployees(): Promise<Employee[]> {
  if (isLocalMode()) return getLocalEmployees();

  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, code, name, days, title, wish")
    .order("code");

  if (error) throw error;

  return ((data as Employee[]) ?? []).map((employee) => ({
    ...employee,
    code: normalizeEmployeeCode(employee.code),
    name: employee.name?.trim() ?? "",
    wish: employee.wish?.trim() ?? "",
  }));
}

export async function presentEmployee(employee: Employee): Promise<void> {
  const name = employee.name?.trim() ?? "";
  const wish = employee.wish?.trim() ?? "";
  if (!employee.id || !name || !employee.title) {
    throw new Error("Dữ liệu nhân viên thiếu tên hoặc danh xưng.");
  }
  if (!Number.isFinite(employee.days) || employee.days < 0) {
    throw new Error("Số ngày đồng hành không hợp lệ.");
  }

  if (isLocalMode()) {
    await updateLocalLiveState({ ...employee, name, wish });
    return;
  }

  const now = new Date().toISOString();
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("live_state")
    .update({
      employee_id: employee.id,
      employee_name: name,
      days: employee.days,
      title: employee.title,
      wish,
      triggered_at: now,
      updated_at: now,
    })
    .eq("id", 1);

  if (error) {
    throw new Error(
      `Không cập nhật được live_state: ${error.message}. Kiểm tra đã chạy migration days/wish (005) và honorific Mr/Ms (007).`
    );
  }
}

export async function clearLiveState(): Promise<void> {
  if (isLocalMode()) {
    await clearLocalLiveState();
    return;
  }

  const now = new Date().toISOString();
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("live_state")
    .update({
      employee_id: null,
      employee_name: null,
      days: null,
      title: null,
      wish: null,
      triggered_at: now,
      updated_at: now,
    })
    .eq("id", 1);

  if (error) throw error;
}

export function subscribeLiveState(
  onState: (state: LiveState) => void,
  onConnected: (connected: boolean) => void
): () => void {
  if (isLocalMode()) {
    return subscribeLocalLiveState(onState, onConnected);
  }

  const supabase = createBrowserClient();
  const apply = createOrderedStateHandler(onState);
  let cancelled = false;

  supabase
    .from("live_state")
    .select("*")
    .eq("id", 1)
    .single()
    .then(({ data }) => {
      if (!cancelled && data) apply(data as LiveState);
    });

  const channel = supabase
    .channel(`live_state_display_${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "live_state" },
      (payload) => {
        if (!cancelled) apply(payload.new as LiveState);
      }
    )
    .subscribe((status) => {
      if (!cancelled) onConnected(status === "SUBSCRIBED");
    });

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
