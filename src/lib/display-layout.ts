export const DISPLAY_LAYOUT_STORAGE_KEY = "mb-life-display-layout-v1";

export type DisplayElementId =
  | "thanks"
  | "name"
  | "tenure"
  | "wish"
  | "divider";

export type DisplayElementLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

export type DisplayLayout = Record<DisplayElementId, DisplayElementLayout>;

export const DISPLAY_ELEMENT_LABELS: Record<DisplayElementId, string> = {
  thanks: "Lời cảm ơn",
  name: "Tên nhân viên",
  tenure: "Số ngày đồng hành",
  wish: "Lời chúc riêng",
  divider: "Đường trang trí",
};

export const DEFAULT_DISPLAY_LAYOUT: DisplayLayout = {
  thanks: {
    x: 30,
    y: 29,
    width: 40,
    height: 7,
    fontSize: 2.2,
  },
  name: {
    x: 7,
    y: 37,
    width: 86,
    height: 11,
    fontSize: 5.2,
  },
  tenure: {
    x: 13,
    y: 50,
    width: 74,
    height: 9,
    fontSize: 1.8,
  },
  wish: {
    x: 10,
    y: 60,
    width: 80,
    height: 11,
    fontSize: 1.5,
  },
  divider: {
    x: 39,
    y: 72,
    width: 22,
    height: 2,
    fontSize: 0,
  },
};

export function cloneDefaultDisplayLayout(): DisplayLayout {
  return structuredClone(DEFAULT_DISPLAY_LAYOUT);
}

export function isDisplayLayout(value: unknown): value is DisplayLayout {
  if (!value || typeof value !== "object") return false;

  return (Object.keys(DEFAULT_DISPLAY_LAYOUT) as DisplayElementId[]).every(
    (id) => {
      const item = (value as Partial<DisplayLayout>)[id];
      return (
        item != null &&
        Number.isFinite(item.x) &&
        Number.isFinite(item.y) &&
        Number.isFinite(item.width) &&
        Number.isFinite(item.height) &&
        Number.isFinite(item.fontSize)
      );
    }
  );
}

export function loadDisplayLayout(): DisplayLayout {
  if (typeof window === "undefined") return cloneDefaultDisplayLayout();

  try {
    const saved = window.localStorage.getItem(DISPLAY_LAYOUT_STORAGE_KEY);
    if (!saved) return cloneDefaultDisplayLayout();

    const parsed: unknown = JSON.parse(saved);
    return isDisplayLayout(parsed) ? parsed : cloneDefaultDisplayLayout();
  } catch {
    return cloneDefaultDisplayLayout();
  }
}

export function saveDisplayLayout(layout: DisplayLayout): void {
  window.localStorage.setItem(
    DISPLAY_LAYOUT_STORAGE_KEY,
    JSON.stringify(layout)
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
