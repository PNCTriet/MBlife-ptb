import type { LedId } from "@/lib/display-copy";
import { GROUP_WAIT_LEDS } from "@/lib/display-copy";

export const WAIT_COPY_STORAGE_KEY = "mb-life-wait-copy-v1";

export type WaitCopyMap = Record<LedId, string>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Default TipTap HTML for wait slogans (rainbow color comes from CSS). */
export function waitLedDefaultHtml(): WaitCopyMap {
  return GROUP_WAIT_LEDS.reduce((acc, led) => {
    acc[led.id] = `<p style="text-align: center">${escapeHtml(led.text)}</p>`;
    return acc;
  }, {} as WaitCopyMap);
}

export function cloneDefaultWaitCopy(): WaitCopyMap {
  return structuredClone(waitLedDefaultHtml());
}

export function isWaitCopyMap(value: unknown): value is WaitCopyMap {
  if (!value || typeof value !== "object") return false;
  return (["led1", "led2", "led3", "led4"] as LedId[]).every(
    (id) => typeof (value as Partial<WaitCopyMap>)[id] === "string"
  );
}

export function loadWaitCopy(): WaitCopyMap {
  if (typeof window === "undefined") return cloneDefaultWaitCopy();

  try {
    const saved = window.localStorage.getItem(WAIT_COPY_STORAGE_KEY);
    if (!saved) return cloneDefaultWaitCopy();
    const parsed: unknown = JSON.parse(saved);
    return isWaitCopyMap(parsed) ? parsed : cloneDefaultWaitCopy();
  } catch {
    return cloneDefaultWaitCopy();
  }
}

export function saveWaitCopy(copy: WaitCopyMap): boolean {
  if (typeof window === "undefined") return false;
  if (!isWaitCopyMap(copy)) return false;

  try {
    const payload = JSON.stringify(copy);
    window.localStorage.setItem(WAIT_COPY_STORAGE_KEY, payload);
    return window.localStorage.getItem(WAIT_COPY_STORAGE_KEY) === payload;
  } catch {
    return false;
  }
}
