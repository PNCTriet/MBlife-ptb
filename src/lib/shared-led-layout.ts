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
export const SHARED_LED_LAYOUT_KEY = "mb-life-shared-led-v10";

/** Older keys — load + migrate forward so reload keeps previously saved layouts. */
const LEGACY_SHARED_LED_KEYS = [
  "mb-life-shared-led-v9",
  "mb-life-shared-led-v8",
  "mb-life-shared-led-v7",
  "mb-life-shared-led-v6",
  "mb-life-shared-led-v5",
  "mb-life-shared-led-v4",
  "mb-life-shared-led-v3",
  "mb-life-shared-led-v2",
  "mb-life-shared-led-v1",
  "mb-life-wait-layout-v2",
  "mb-life-employee-led-layout-v1",
] as const;

const LED_IDS: LedId[] = ["led1", "led2", "led3", "led4"];

export type TextAlign = "left" | "center" | "right";

export type SharedLedSlot = {
  x: number;
  y: number;
  /** Width as % of stage — independent per LED. */
  width: number;
  /** Height as % of stage. `null` keeps the strip's native aspect ratio. */
  height: number | null;
  fontSize: number;
  align: TextAlign;
  /** CSS color for employee TipTap text (wait slogans keep rainbow CSS). */
  color: string;
  /** Text block position inside the LED frame (%). */
  textOffsetX: number;
  textOffsetY: number;
  /** Text box size as % of the LED frame — text auto-fits inside it. */
  textWidth: number;
  textHeight: number;
};

export const DEFAULT_TEXT_BOX_WIDTH = 92;
export const DEFAULT_TEXT_BOX_HEIGHT = 78;

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
      height: null,
      fontSize: 2.55,
      align: "center",
      color: "#ffffff",
      textOffsetX: 50,
      textOffsetY: 50,
      textWidth: DEFAULT_TEXT_BOX_WIDTH,
      textHeight: DEFAULT_TEXT_BOX_HEIGHT,
    },
    led2: {
      x: 16,
      y: 27,
      width: 60,
      height: null,
      fontSize: 2.3,
      align: "center",
      color: "#ffffff",
      textOffsetX: 50,
      textOffsetY: 50,
      textWidth: DEFAULT_TEXT_BOX_WIDTH,
      textHeight: DEFAULT_TEXT_BOX_HEIGHT,
    },
    led3: {
      x: 3,
      y: 46,
      width: 37.46,
      height: null,
      fontSize: 1.9,
      align: "center",
      color: "#ffffff",
      textOffsetX: 50,
      textOffsetY: 50,
      textWidth: DEFAULT_TEXT_BOX_WIDTH,
      textHeight: DEFAULT_TEXT_BOX_HEIGHT,
    },
    led4: {
      x: 28,
      y: 66,
      width: 67.96,
      height: null,
      fontSize: 1.75,
      align: "center",
      color: "#ffffff",
      textOffsetX: 50,
      textOffsetY: 50,
      textWidth: DEFAULT_TEXT_BOX_WIDTH,
      textHeight: DEFAULT_TEXT_BOX_HEIGHT,
    },
  },
};

export function cloneDefaultSharedLedLayout(): SharedLedLayout {
  return structuredClone(DEFAULT_SHARED_LED_LAYOUT);
}

function normalizeAlign(value: unknown): TextAlign {
  return value === "left" || value === "right" ? value : "center";
}

function normalizeSlot(id: LedId, value: unknown): SharedLedSlot {
  const defaults = DEFAULT_SHARED_LED_LAYOUT.slots[id];
  if (!value || typeof value !== "object") return { ...defaults };

  const item = value as Partial<SharedLedSlot>;
  return {
    x: Number.isFinite(item.x) ? Number(item.x) : defaults.x,
    y: Number.isFinite(item.y) ? Number(item.y) : defaults.y,
    width: Number.isFinite(item.width) ? Number(item.width) : defaults.width,
    height: Number.isFinite(item.height) ? Number(item.height) : null,
    fontSize: Number.isFinite(item.fontSize)
      ? Number(item.fontSize)
      : defaults.fontSize,
    align: normalizeAlign(item.align),
    color: typeof item.color === "string" ? item.color : defaults.color,
    textOffsetX: Number.isFinite(item.textOffsetX)
      ? Number(item.textOffsetX)
      : defaults.textOffsetX,
    textOffsetY: Number.isFinite(item.textOffsetY)
      ? Number(item.textOffsetY)
      : defaults.textOffsetY,
    textWidth: Number.isFinite(item.textWidth)
      ? Number(item.textWidth)
      : defaults.textWidth,
    textHeight: Number.isFinite(item.textHeight)
      ? Number(item.textHeight)
      : defaults.textHeight,
  };
}

/**
 * On-screen height of a slot as % of the stage. Slots without an explicit
 * height fall back to the strip's native aspect ratio.
 */
export function slotHeightPct(
  slot: SharedLedSlot,
  aspect: number,
  stage: { width: number; height: number }
): number {
  if (slot.height != null) return slot.height;
  if (aspect <= 0 || stage.height <= 0) return 0;
  return (slot.width * stage.width) / (aspect * stage.height);
}

/**
 * Accept current `{ slots }` shape and older flat `Record<LedId, slot>` shapes.
 * Missing fields fall back to defaults instead of discarding the whole save.
 */
export function normalizeSharedLedLayout(
  value: unknown
): SharedLedLayout | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const source =
    raw.slots && typeof raw.slots === "object"
      ? (raw.slots as Record<string, unknown>)
      : raw;

  const hasAnyLed = LED_IDS.some((id) => source[id] != null);
  if (!hasAnyLed) return null;

  return {
    slots: {
      led1: normalizeSlot("led1", source.led1),
      led2: normalizeSlot("led2", source.led2),
      led3: normalizeSlot("led3", source.led3),
      led4: normalizeSlot("led4", source.led4),
    },
  };
}

export function isSharedLedLayout(value: unknown): value is SharedLedLayout {
  return normalizeSharedLedLayout(value) != null;
}

function readStoredLayout(key: string): SharedLedLayout | null {
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return null;
    return normalizeSharedLedLayout(JSON.parse(saved));
  } catch {
    return null;
  }
}

export function loadSharedLedLayout(): SharedLedLayout {
  if (typeof window === "undefined") return cloneDefaultSharedLedLayout();

  const current = readStoredLayout(SHARED_LED_LAYOUT_KEY);
  if (current) return current;

  for (const key of LEGACY_SHARED_LED_KEYS) {
    const legacy = readStoredLayout(key);
    if (!legacy) continue;
    // Migrate forward so the next reload hits the canonical key.
    saveSharedLedLayout(legacy);
    return legacy;
  }

  return cloneDefaultSharedLedLayout();
}

export function saveSharedLedLayout(layout: SharedLedLayout): boolean {
  if (typeof window === "undefined") return false;

  const normalized = normalizeSharedLedLayout(layout);
  if (!normalized) return false;

  try {
    const payload = JSON.stringify(normalized);
    window.localStorage.setItem(SHARED_LED_LAYOUT_KEY, payload);
    return window.localStorage.getItem(SHARED_LED_LAYOUT_KEY) === payload;
  } catch {
    return false;
  }
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
