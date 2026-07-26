import type { Honorific } from "@/lib/types";

/**
 * Shared LED strip assets (native panel pixel sizes).
 * Wait slogans and employee reveal both mount on these physical LEDs.
 */
export const LED_STRIPS = [
  {
    id: "led1",
    background: "/display/led-1.png",
    video: "/video/led-1.mp4",
    flare: "/display/led-1-flare.png",
    nativeWidth: 1024,
    nativeHeight: 146,
  },
  {
    id: "led2",
    background: "/display/led-2.png",
    video: "/video/led-2.mp4",
    nativeWidth: 1024,
    nativeHeight: 128,
  },
  {
    id: "led3",
    background: "/display/led-3.png",
    video: "/video/led-3.mp4",
    nativeWidth: 1024,
    nativeHeight: 205,
  },
  {
    id: "led4",
    background: "/display/led-4.png",
    video: "/video/led-4.mp4",
    nativeWidth: 1024,
    nativeHeight: 113,
  },
] as const;

export type LedId = (typeof LED_STRIPS)[number]["id"];

/**
 * Each LED strip PNG has its OWN native aspect ratio (widths match at 1024px
 * but heights differ: 146 / 128 / 205 / 113) — never force a shared ratio
 * across all 4, or the backgrounds get stretched/cropped incorrectly.
 */
export const LED_ASPECT_BY_ID: Record<LedId, number> = LED_STRIPS.reduce(
  (acc, led) => {
    acc[led.id] = led.nativeWidth / led.nativeHeight;
    return acc;
  },
  {} as Record<LedId, number>
);

/**
 * Optional prismatic flare overlay per LED (transparent/black PNG, blended with
 * `screen`). Not every strip has one, so callers must handle `undefined`.
 */
export const LED_FLARE_BY_ID: Partial<Record<LedId, string>> =
  LED_STRIPS.reduce<Partial<Record<LedId, string>>>((acc, led) => {
    if ("flare" in led && typeof led.flare === "string") {
      acc[led.id] = led.flare;
    }
    return acc;
  }, {});

export const GROUP_WAIT_LEDS = [
  { ...LED_STRIPS[0], text: "THẬP KỶ RỰC RỠ" },
  { ...LED_STRIPS[1], text: "TRỌN VẸN TIN YÊU" },
  { ...LED_STRIPS[2], text: "KHÔNG NGỪNG TIẾN BƯỚC" },
  { ...LED_STRIPS[3], text: "DỰNG XÂY HẠNH PHÚC" },
] as const;

export type WaitLedId = LedId;
export type WaitLedDefinition = (typeof GROUP_WAIT_LEDS)[number];

export function isEnglishHonorific(title: Honorific): boolean {
  return title === "Mr" || title === "Ms";
}

export function formatDays(days: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.trunc(days)));
}

/** Plain-text payload for the 4 employee LED rows (VI/EN). */
export function employeeLedPlainText(input: {
  title: Honorific;
  name: string;
  days: number;
  wish: string;
}): Record<LedId, string> {
  const en = isEnglishHonorific(input.title);
  const days = formatDays(input.days);
  const name = input.name.trim();
  const wish = input.wish.trim();

  if (en) {
    return {
      led1: "THANK YOU",
      led2: `${input.title}. ${name}`.trim(),
      led3: `for ${days} days of moving forward with us`,
      led4: wish,
    };
  }

  return {
    led1: "CẢM ƠN",
    led2: `${input.title} ${name}`.trim(),
    led3: `Vì ${days} ngày không ngừng tiến bước`,
    led4: wish,
  };
}

/** Default TipTap HTML templates — {{days}} is wrapped for emphasis. */
export function employeeLedDefaultHtml(input: {
  title: Honorific;
  name: string;
  days: number;
  wish: string;
}): Record<LedId, string> {
  const plain = employeeLedPlainText(input);
  const en = isEnglishHonorific(input.title);
  const days = formatDays(input.days);

  // Wrap ONLY the number in <strong>. Size/weight come from CSS
  // (.employee-led-text .ProseMirror strong) — TipTap strips inline
  // font-size styles on <strong>, so putting them in HTML is a no-op.
  const daysHtml = `<strong>${days}</strong>`;
  const tenureHtml = en
    ? `for ${daysHtml} days of moving forward with us`
    : `Vì ${daysHtml} ngày không ngừng tiến bước`;

  return {
    led1: `<p style="text-align: center; color: #ffffff">${escapeHtml(plain.led1.toLocaleUpperCase("vi"))}</p>`,
    led2: `<p style="text-align: center; color: #ffffff">${escapeHtml(plain.led2.toLocaleUpperCase("vi"))}</p>`,
    led3: `<p style="text-align: center; color: #ffffff">${tenureHtml}</p>`,
    led4: `<p style="text-align: center; color: #ffffff">${escapeHtml(plain.led4)}</p>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
