import type { LedId } from "@/lib/display-copy";
import { clamp } from "@/lib/display-layout";

export const EMPLOYEE_LED_LAYOUT_KEY = "mb-life-employee-led-layout-v1";

export type TextAlign = "left" | "center" | "right";

export type EmployeeLedElementLayout = {
  x: number;
  y: number;
  /** Width % of stage — height follows native LED aspect. */
  width: number;
  /** Base font size in vw for this LED strip. */
  fontSize: number;
  align: TextAlign;
};

export type EmployeeLedLayout = Record<LedId, EmployeeLedElementLayout>;

export const EMPLOYEE_LED_LABELS: Record<LedId, string> = {
  led1: "LED 1 — Cảm ơn / Thank you",
  led2: "LED 2 — Danh xưng + tên",
  led3: "LED 3 — Số ngày đồng hành",
  led4: "LED 4 — Câu chúc / Message",
};

/** Stagger close to the design mock (left cascade + bottom-right wish). */
export const DEFAULT_EMPLOYEE_LED_LAYOUT: EmployeeLedLayout = {
  led1: { x: 8, y: 14, width: 36, fontSize: 2.6, align: "center" },
  led2: { x: 28, y: 32, width: 48, fontSize: 2.4, align: "center" },
  led3: { x: 6, y: 52, width: 42, fontSize: 1.7, align: "center" },
  led4: { x: 48, y: 72, width: 44, fontSize: 1.35, align: "center" },
};

export function cloneDefaultEmployeeLedLayout(): EmployeeLedLayout {
  return structuredClone(DEFAULT_EMPLOYEE_LED_LAYOUT);
}

export function isEmployeeLedLayout(
  value: unknown
): value is EmployeeLedLayout {
  if (!value || typeof value !== "object") return false;

  return (Object.keys(DEFAULT_EMPLOYEE_LED_LAYOUT) as LedId[]).every((id) => {
    const item = (value as Partial<EmployeeLedLayout>)[id];
    return (
      item != null &&
      Number.isFinite(item.x) &&
      Number.isFinite(item.y) &&
      Number.isFinite(item.width) &&
      Number.isFinite(item.fontSize) &&
      (item.align === "left" ||
        item.align === "center" ||
        item.align === "right")
    );
  });
}

export function loadEmployeeLedLayout(): EmployeeLedLayout {
  if (typeof window === "undefined") return cloneDefaultEmployeeLedLayout();

  try {
    const saved = window.localStorage.getItem(EMPLOYEE_LED_LAYOUT_KEY);
    if (!saved) return cloneDefaultEmployeeLedLayout();
    const parsed: unknown = JSON.parse(saved);
    return isEmployeeLedLayout(parsed)
      ? parsed
      : cloneDefaultEmployeeLedLayout();
  } catch {
    return cloneDefaultEmployeeLedLayout();
  }
}

export function saveEmployeeLedLayout(layout: EmployeeLedLayout): void {
  window.localStorage.setItem(
    EMPLOYEE_LED_LAYOUT_KEY,
    JSON.stringify(layout)
  );
}

export { clamp };
