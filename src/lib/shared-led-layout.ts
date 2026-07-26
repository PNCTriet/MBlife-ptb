import type { LedId } from "@/lib/display-copy";
import { clamp } from "@/lib/display-layout";

/**
 * Shared by wait + employee scenes so LED N has the exact same size/position
 * on both screens. Each LED keeps its OWN width — LEDs are allowed to differ
 * in size from one another, but LED1-in-wait must equal LED1-in-employee, etc.
 *
 * The 4 physical LED strips all share the SAME real-world height, only their
 * length (width) differs. Since each strip's PNG keeps its own native aspect
 * ratio (see `LED_ASPECT_BY_ID`) and on-screen height = width / aspect, the
 * default widths below are solved so every strip renders at an EQUAL height:
 * width_i = K * aspect_i for a shared constant K (anchored on LED2 = 60%).
 */
export const SHARED_LED_LAYOUT_KEY = "mb-life-shared-led-v6";

export type TextAlign = "left" | "center" | "right";

export type SharedLedSlot = {
  x: number;
  y: number;
  /** Width as % of stage — independent per LED. */
  width: number;
  fontSize: number;
  align: TextAlign;
  /** CSS color for employee TipTap text (wait slogans keep rainbow CSS). */
  color: string;
  /** Text block position inside the LED frame (%). */
  textOffsetX: number;
  textOffsetY: number;
};

export type SharedLedLayout = {
  slots: Record<LedId, SharedLedSlot>;
};

export const LED_SLOT_LABELS: Record<LedId, string> = {
  led1: "LED 1",
  led2: "LED 2",
  led3: "LED 3",
  led4: "LED 4",
};

export const DEFAULT_SHARED_LED_LAYOUT: SharedLedLayout = {
  slots: {
    led1: {
      x: 3,
      y: 10,
      width: 52.6,
      fontSize: 2.55,
      align: "center",
      color: "#ffffff",
      textOffsetX: 50,
      textOffsetY: 50,
    },
    led2: {
      x: 16,
      y: 27,
      width: 60,
      fontSize: 2.3,
      align: "center",
      color: "#ffffff",
      textOffsetX: 50,
      textOffsetY: 50,
    },
    led3: {
      x: 3,
      y: 46,
      width: 37.46,
      fontSize: 1.9,
      align: "center",
      color: "#ffffff",
      textOffsetX: 50,
      textOffsetY: 50,
    },
    led4: {
      x: 28,
      y: 66,
      width: 67.96,
      fontSize: 1.75,
      align: "center",
      color: "#ffffff",
      textOffsetX: 50,
      textOffsetY: 50,
    },
  },
};

export function cloneDefaultSharedLedLayout(): SharedLedLayout {
  return structuredClone(DEFAULT_SHARED_LED_LAYOUT);
}

function isSlot(value: unknown): value is SharedLedSlot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SharedLedSlot>;
  return (
    Number.isFinite(item.x) &&
    Number.isFinite(item.y) &&
    Number.isFinite(item.width) &&
    Number.isFinite(item.fontSize) &&
    Number.isFinite(item.textOffsetX) &&
    Number.isFinite(item.textOffsetY) &&
    typeof item.color === "string" &&
    (item.align === "left" || item.align === "center" || item.align === "right")
  );
}

export function isSharedLedLayout(value: unknown): value is SharedLedLayout {
  if (!value || typeof value !== "object") return false;
  const layout = value as Partial<SharedLedLayout>;
  if (!layout.slots) return false;
  return (["led1", "led2", "led3", "led4"] as LedId[]).every((id) =>
    isSlot(layout.slots?.[id])
  );
}

export function loadSharedLedLayout(): SharedLedLayout {
  if (typeof window === "undefined") return cloneDefaultSharedLedLayout();

  try {
    const saved = window.localStorage.getItem(SHARED_LED_LAYOUT_KEY);
    if (!saved) return cloneDefaultSharedLedLayout();
    const parsed: unknown = JSON.parse(saved);
    return isSharedLedLayout(parsed)
      ? parsed
      : cloneDefaultSharedLedLayout();
  } catch {
    return cloneDefaultSharedLedLayout();
  }
}

export function saveSharedLedLayout(layout: SharedLedLayout): void {
  window.localStorage.setItem(SHARED_LED_LAYOUT_KEY, JSON.stringify(layout));
}

export const SHARED_LED_LAYOUT_EVENT = "mb-life-shared-led-layout";

/** Keep wait backgrounds + employee text layers on the same layout while editing. */
export function publishSharedLedLayout(layout: SharedLedLayout): void {
  if (typeof window === "undefined") return;
  // Defer outside the current render/commit — dispatching synchronously
  // from inside a setState updater can hit React's "Cannot update a
  // component while rendering a different component" guard.
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<SharedLedLayout>(SHARED_LED_LAYOUT_EVENT, {
        detail: layout,
      })
    );
  }, 0);
}

export { clamp };
