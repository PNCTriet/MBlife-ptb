import type { WaitLedId } from "@/lib/display-copy";
import { clamp } from "@/lib/display-layout";

/** v2 — width-only layout; height always follows native LED aspect ratio. */
export const WAIT_LAYOUT_STORAGE_KEY = "mb-life-wait-layout-v2";

export type WaitElementLayout = {
  x: number;
  y: number;
  /** Width as % of stage. Height is derived from native LED aspect ratio. */
  width: number;
  fontSize: number;
};

export type WaitLayout = Record<WaitLedId, WaitElementLayout>;

export const WAIT_ELEMENT_LABELS: Record<WaitLedId, string> = {
  led1: "LED 1 — Thập kỷ rực rỡ",
  led2: "LED 2 — Trọn vẹn tin yêu",
  led3: "LED 3 — Không ngừng tiến bước",
  led4: "LED 4 — DỰNG XÂY HẠNH PHÚC",
};

/** Defaults approximate the artboard: left cascade + bottom-right bar. */
export const DEFAULT_WAIT_LAYOUT: WaitLayout = {
  led1: { x: 6, y: 16, width: 44, fontSize: 2.4 },
  led2: { x: 14, y: 36, width: 42, fontSize: 2.4 },
  led3: { x: 6, y: 56, width: 34, fontSize: 2.1 },
  led4: { x: 52, y: 70, width: 40, fontSize: 2.3 },
};

export function cloneDefaultWaitLayout(): WaitLayout {
  return structuredClone(DEFAULT_WAIT_LAYOUT);
}

export function isWaitLayout(value: unknown): value is WaitLayout {
  if (!value || typeof value !== "object") return false;

  return (Object.keys(DEFAULT_WAIT_LAYOUT) as WaitLedId[]).every((id) => {
    const item = (value as Partial<WaitLayout>)[id];
    return (
      item != null &&
      Number.isFinite(item.x) &&
      Number.isFinite(item.y) &&
      Number.isFinite(item.width) &&
      Number.isFinite(item.fontSize)
    );
  });
}

export function loadWaitLayout(): WaitLayout {
  if (typeof window === "undefined") return cloneDefaultWaitLayout();

  try {
    const saved = window.localStorage.getItem(WAIT_LAYOUT_STORAGE_KEY);
    if (!saved) return cloneDefaultWaitLayout();
    const parsed: unknown = JSON.parse(saved);
    return isWaitLayout(parsed) ? parsed : cloneDefaultWaitLayout();
  } catch {
    return cloneDefaultWaitLayout();
  }
}

export function saveWaitLayout(layout: WaitLayout): void {
  window.localStorage.setItem(WAIT_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export { clamp };
