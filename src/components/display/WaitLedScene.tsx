"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  GROUP_WAIT_LEDS,
  LED_ASPECT_BY_ID,
  LED_FLARE_BY_ID,
  type WaitLedId,
} from "@/lib/display-copy";
import {
  clamp,
  cloneDefaultSharedLedLayout,
  DEFAULT_TEXT_BOX_HEIGHT,
  DEFAULT_TEXT_BOX_WIDTH,
  LED_SLOT_LABELS,
  loadSharedLedLayout,
  publishSharedLedLayout,
  saveSharedLedLayout,
  SHARED_LED_LAYOUT_EVENT,
  slotHeightPct,
  type SharedLedLayout,
  type SharedLedSlot,
  type TextAlign,
} from "@/lib/shared-led-layout";
import {
  cloneDefaultWaitCopy,
  loadWaitCopy,
  saveWaitCopy,
  type WaitCopyMap,
} from "@/lib/wait-copy";
import {
  LedRichTextEditor,
  LedTextFitBox,
  LedTextToolbar,
} from "@/components/display/LedRichText";
import { LedVideo } from "@/components/display/LedVideo";

type Props = {
  visible: boolean;
  onEditModeChange?: (editing: boolean) => void;
};

type InteractionMode =
  | "drag"
  | "resize"
  | "resize-x"
  | "resize-y"
  | "text-drag"
  | "text-resize";

type Interaction = {
  mode: InteractionMode;
  id: WaitLedId;
  pointerId: number;
  startX: number;
  startY: number;
  initialSlot: SharedLedSlot;
};

/**
 * Wait slogans use fixed type sizes instead of the shared slot value: LED1/3
 * carry the headline lines, LED2/4 the supporting ones. Employee reveal still
 * uses `slot.fontSize`, so resizing there stays independent.
 */
const WAIT_FONT_SIZE_VW: Record<WaitLedId, number> = {
  led1: 3.76,
  led2: 3.76,
  led3: 3.76,
  led4: 3.76,
};

/** Soft glow dots over each LED strip — same layout on all 4. */
const LED_PARTICLES = [
  { x: "5%", y: "40%", size: "2.5px", delay: "0.2s", duration: "4.4s" },
  { x: "12%", y: "62%", size: "2px", delay: "0.7s", duration: "5.1s" },
  { x: "20%", y: "32%", size: "3px", delay: "1.4s", duration: "3.8s" },
  { x: "28%", y: "58%", size: "2px", delay: "0.9s", duration: "4.6s" },
  { x: "36%", y: "38%", size: "3.5px", delay: "2.1s", duration: "4.2s" },
  { x: "44%", y: "68%", size: "2px", delay: "0.3s", duration: "5s" },
  { x: "52%", y: "28%", size: "3px", delay: "1.8s", duration: "3.7s" },
  { x: "58%", y: "55%", size: "2.5px", delay: "2.6s", duration: "4.9s" },
  { x: "65%", y: "42%", size: "3px", delay: "1.1s", duration: "4.3s" },
  { x: "72%", y: "65%", size: "2px", delay: "3.1s", duration: "3.5s" },
  { x: "78%", y: "35%", size: "3.5px", delay: "0.5s", duration: "5.2s" },
  { x: "84%", y: "58%", size: "2px", delay: "2s", duration: "4s" },
  { x: "90%", y: "40%", size: "3px", delay: "2.8s", duration: "4.8s" },
  { x: "94%", y: "70%", size: "2px", delay: "0.4s", duration: "3.9s" },
  { x: "97%", y: "48%", size: "2.5px", delay: "1.6s", duration: "4.5s" },
] as const;

export default function WaitLedScene({ visible, onEditModeChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layout, setLayout] = useState<SharedLedLayout>(
    cloneDefaultSharedLedLayout
  );
  const [copy, setCopy] = useState<WaitCopyMap>(cloneDefaultWaitCopy);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<WaitLedId>("led1");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [dirty, setDirty] = useState(false);
  const [holdingKey, setHoldingKey] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [notice, setNotice] = useState("");

  // Deferred one frame: localStorage is client-only, so reading it during the
  // hydrating render would mismatch the server output.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLayout(loadSharedLedLayout());
      setCopy(loadWaitCopy());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Auto-persist shortly after edits so reload keeps the last arrangement
  // even if the operator forgets to press Save.
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      const layoutOk = saveSharedLedLayout(layout);
      const copyOk = saveWaitCopy(copy);
      if (layoutOk && copyOk) {
        setDirty(false);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dirty, layout, copy]);

  useEffect(() => {
    const onRemote = (event: Event) => {
      const next = (event as CustomEvent<SharedLedLayout>).detail;
      if (!next) return;
      setLayout(next);
    };
    window.addEventListener(SHARED_LED_LAYOUT_EVENT, onRemote);
    return () => window.removeEventListener(SHARED_LED_LAYOUT_EVENT, onRemote);
  }, []);

  const changeEditMode = useCallback(
    (next: boolean) => {
      setEditMode(next);
      setInteraction(null);
      setHoldingKey(false);
      onEditModeChange?.(next);
      if (next) setPanelCollapsed(false);
    },
    [onEditModeChange]
  );

  useEffect(() => {
    if (!visible && editMode) changeEditMode(false);
  }, [visible, editMode, changeEditMode]);

  useEffect(() => {
    if (!visible) return;

    const clearHold = () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      setHoldingKey(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        Boolean(target?.isContentEditable);

      if (event.key === "Escape" && editMode) {
        changeEditMode(false);
        return;
      }

      if (isTyping || event.repeat || event.key.toLowerCase() !== "e") return;

      setHoldingKey(true);
      holdTimerRef.current = setTimeout(() => {
        changeEditMode(!editMode);
        holdTimerRef.current = null;
      }, 2000);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "e") clearHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearHold);

    return () => {
      clearHold();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearHold);
    };
  }, [changeEditMode, editMode, visible]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  const updateSlot = useCallback((id: WaitLedId, next: SharedLedSlot) => {
    setLayout((current) => {
      const updated = {
        ...current,
        slots: { ...current.slots, [id]: next },
      };
      publishSharedLedLayout(updated);
      return updated;
    });
    setDirty(true);
  }, []);

  const updateCopy = useCallback((id: WaitLedId, html: string) => {
    setCopy((current) => ({ ...current, [id]: html }));
    setDirty(true);
  }, []);

  const startInteraction = (
    mode: InteractionMode,
    id: WaitLedId,
    event: ReactPointerEvent<HTMLElement>
  ) => {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(id);
    setInteraction({
      mode,
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialSlot: { ...layout.slots[id] },
    });
  };

  const moveInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = ((event.clientX - interaction.startX) / rect.width) * 100;
    const dy = ((event.clientY - interaction.startY) / rect.height) * 100;
    const slot = interaction.initialSlot;
    // Height at gesture start: the stage cannot resize mid-drag, so deriving
    // it from the snapshot slot matches the on-screen frame.
    const frameHeight = slotHeightPct(
      slot,
      LED_ASPECT_BY_ID[interaction.id],
      rect
    );

    if (interaction.mode === "drag") {
      updateSlot(interaction.id, {
        ...slot,
        x: slot.x + dx,
        y: slot.y + dy,
      });
      return;
    }

    // Text gestures work in frame-local %, so they stay put when the LED moves.
    const localDx = slot.width > 0 ? (dx / slot.width) * 100 : 0;
    const localDy = frameHeight > 0 ? (dy / frameHeight) * 100 : 0;

    if (interaction.mode === "text-drag") {
      updateSlot(interaction.id, {
        ...slot,
        textOffsetX: clamp(slot.textOffsetX + localDx, 8, 92),
        textOffsetY: clamp(slot.textOffsetY + localDy, 8, 92),
      });
      return;
    }

    if (interaction.mode === "text-resize") {
      // The box is centred on its anchor, so the dragged corner moves twice
      // as fast as the box edge grows.
      updateSlot(interaction.id, {
        ...slot,
        textWidth: clamp(slot.textWidth + localDx * 2, 10, 140),
        textHeight: clamp(slot.textHeight + localDy * 2, 10, 140),
      });
      return;
    }

    const width =
      interaction.mode === "resize-y" ? slot.width : clamp(slot.width + dx, 5, 200);
    // The width-only handle keeps `height` as-is so an auto-aspect LED stays
    // proportional; the other handles pin an explicit height.
    const height =
      interaction.mode === "resize-x"
        ? slot.height
        : clamp(frameHeight + dy, 2, 200);
    const scale = slot.width > 0 ? width / slot.width : 1;

    updateSlot(interaction.id, {
      ...slot,
      width,
      height,
      fontSize: clamp(slot.fontSize * scale, 0.8, 6),
    });
  };

  const endInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    setInteraction(null);
  };

  const handleSave = () => {
    const layoutOk = saveSharedLedLayout(layout);
    const copyOk = saveWaitCopy(copy);
    if (layoutOk && copyOk) {
      setDirty(false);
      setNotice("Đã lưu layout + chữ LED chờ trên máy này");
    } else {
      setNotice(
        "Lưu không thành công — trình duyệt đang chặn lưu (tắt Private mode hoặc cho phép localStorage)"
      );
    }
  };

  const handleReset = () => {
    const defaults = cloneDefaultSharedLedLayout();
    const defaultCopy = cloneDefaultWaitCopy();
    setLayout(defaults);
    setCopy(defaultCopy);
    saveSharedLedLayout(defaults);
    saveWaitCopy(defaultCopy);
    publishSharedLedLayout(defaults);
    setDirty(false);
    setSelectedId("led1");
    setNotice("Đã khôi phục layout + chữ LED chờ mặc định");
  };

  const showWaitText = visible || editMode;
  const selectedSlot = layout.slots[selectedId];

  return (
    <>
      {/* Backgrounds stay mounted; only slogan text fades when switching to employee. */}
      <div
        ref={stageRef}
        className={`absolute inset-0 z-10 overflow-hidden ${
          editMode ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {GROUP_WAIT_LEDS.map((led) => {
          const item = layout.slots[led.id];
          const selected = editMode && selectedId === led.id;
          const freeSized = item.height != null;

          return (
            <div
              key={led.id}
              data-led-frame
              className={`absolute touch-none overflow-visible ${
                editMode
                  ? `cursor-move outline outline-1 ${
                      selected
                        ? "outline-[#f3cd62] outline-offset-2"
                        : "outline-white/25 outline-offset-1"
                    }`
                  : ""
              }`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                ...(freeSized
                  ? { height: `${item.height}%` }
                  : {
                      aspectRatio: `${led.nativeWidth} / ${led.nativeHeight}`,
                    }),
              }}
              onPointerDown={(event) => startInteraction("drag", led.id, event)}
              onPointerMove={moveInteraction}
              onPointerUp={endInteraction}
              onPointerCancel={endInteraction}
            >
              {/* Background only — clipped. Text is a sibling so it won't get crop-cut. */}
              <div className="wait-led pointer-events-none absolute inset-0 overflow-hidden !bg-black !p-0">
                <LedVideo
                  src={led.video}
                  poster={led.background}
                  className={`absolute inset-0 h-full w-full ${
                    freeSized ? "object-fill" : "object-cover"
                  }`}
                />
                {/* Prismatic flare overlay — animated light-leak (screen blend). */}
                {LED_FLARE_BY_ID[led.id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={LED_FLARE_BY_ID[led.id] as string}
                    alt=""
                    aria-hidden="true"
                    width={led.nativeWidth}
                    height={led.nativeHeight}
                    className="wait-led-flare absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {/* Subtle chasing-light sweep — all 4 strips in sync. */}
                <div className="wait-led-shine" aria-hidden="true" />
                {/* Soft glowing particles over the LED background. */}
                <div className="wait-led-particles" aria-hidden="true">
                  {LED_PARTICLES.map((p, i) => (
                    <span
                      key={i}
                      className="wait-led-particle"
                      style={{
                        left: p.x,
                        top: p.y,
                        width: p.size,
                        height: p.size,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div
                className={`wait-led-text absolute z-[1] transition-opacity duration-[1500ms] ease-in-out ${
                  editMode
                    ? `outline-dashed outline-1 ${
                        selected ? "outline-[#9fe8ff]/80" : "outline-white/25"
                      }`
                    : ""
                }`}
                style={{
                  left: `${item.textOffsetX}%`,
                  top: `${item.textOffsetY}%`,
                  width: `${item.textWidth}%`,
                  height: `${item.textHeight}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: showWaitText ? 1 : 0,
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  if (editMode && selectedId !== led.id) {
                    setSelectedId(led.id);
                  }
                }}
              >
                {editMode && (
                  <>
                    <button
                      type="button"
                      data-text-drag
                      aria-label="Kéo vị trí chữ"
                      title="Kéo vị trí khung chữ"
                      className="absolute -left-3 -top-3 z-[2] h-4 w-4 cursor-grab rounded-sm border border-black/40 bg-white/90 shadow active:cursor-grabbing"
                      onPointerDown={(event) =>
                        startInteraction("text-drag", led.id, event)
                      }
                      onPointerMove={moveInteraction}
                      onPointerUp={endInteraction}
                      onPointerCancel={endInteraction}
                    />
                    <button
                      type="button"
                      data-text-resize
                      aria-label="Đổi kích thước khung chữ"
                      title="Kéo để đổi kích thước khung chữ"
                      className="absolute -bottom-2.5 -right-2.5 z-[2] h-4 w-4 cursor-nwse-resize rounded-sm border border-black/40 bg-[#9fe8ff] shadow"
                      onPointerDown={(event) =>
                        startInteraction("text-resize", led.id, event)
                      }
                      onPointerMove={moveInteraction}
                      onPointerUp={endInteraction}
                      onPointerCancel={endInteraction}
                    />
                  </>
                )}
                <LedTextFitBox
                  fitKey={`${copy[led.id]}|${WAIT_FONT_SIZE_VW[led.id]}|${item.textWidth}|${item.textHeight}`}
                >
                  <LedRichTextEditor
                    html={copy[led.id]}
                    editable={editMode}
                    fontSizeVw={WAIT_FONT_SIZE_VW[led.id]}
                    onHtmlChange={(html) => updateCopy(led.id, html)}
                  />
                </LedTextFitBox>
              </div>

              {editMode && (
                <>
                  <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-black/85 px-2 py-1 font-sans text-[10px] leading-none tracking-normal text-white">
                    {LED_SLOT_LABELS[led.id]} · w {item.width.toFixed(1)}%
                    {freeSized ? ` · h ${item.height?.toFixed(1)}%` : " · h auto"}
                  </span>
                  <button
                    type="button"
                    aria-label={`Đổi chiều rộng ${LED_SLOT_LABELS[led.id]}`}
                    title="Kéo đổi chiều rộng (giữ tỉ lệ nếu chiều cao đang auto)"
                    className="absolute -right-2 top-1/2 h-6 w-3.5 -translate-y-1/2 cursor-ew-resize rounded-sm border border-black/40 bg-[#f3cd62] shadow-lg"
                    onPointerDown={(event) =>
                      startInteraction("resize-x", led.id, event)
                    }
                    onPointerMove={moveInteraction}
                    onPointerUp={endInteraction}
                    onPointerCancel={endInteraction}
                  />
                  <button
                    type="button"
                    aria-label={`Đổi chiều cao ${LED_SLOT_LABELS[led.id]}`}
                    title="Kéo đổi chiều cao"
                    className="absolute -bottom-2 left-1/2 h-3.5 w-6 -translate-x-1/2 cursor-ns-resize rounded-sm border border-black/40 bg-[#f3cd62] shadow-lg"
                    onPointerDown={(event) =>
                      startInteraction("resize-y", led.id, event)
                    }
                    onPointerMove={moveInteraction}
                    onPointerUp={endInteraction}
                    onPointerCancel={endInteraction}
                  />
                  <button
                    type="button"
                    aria-label={`Đổi kích thước tự do ${LED_SLOT_LABELS[led.id]}`}
                    title="Kéo đổi rộng + cao tự do"
                    className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-sm border border-black/40 bg-[#f3cd62] shadow-lg"
                    onPointerDown={(event) =>
                      startInteraction("resize", led.id, event)
                    }
                    onPointerMove={moveInteraction}
                    onPointerUp={endInteraction}
                    onPointerCancel={endInteraction}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {visible && (
        <button
          type="button"
          className={`absolute right-4 top-4 z-50 rounded-full border px-3 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md transition ${
            editMode
              ? "border-[#f3cd62]/60 bg-[#f3cd62]/15 text-[#f3cd62]"
              : "border-white/10 bg-black/20 text-white/25 hover:border-white/25 hover:text-white/60"
          }`}
          title="Double-click hoặc giữ phím E trong 2 giây"
          onDoubleClick={() => changeEditMode(!editMode)}
        >
          {holdingKey ? "Giữ E…" : editMode ? "Editing wait" : "Setup"}
        </button>
      )}

      {editMode && panelCollapsed && (
        <button
          type="button"
          onClick={() => setPanelCollapsed(false)}
          className="absolute left-4 top-4 z-50 rounded-xl border border-[#e8c96a]/40 bg-[#07101f]/90 px-4 py-2.5 font-sans text-xs font-medium text-[#e8c96a] shadow-xl backdrop-blur-xl"
        >
          Mở công cụ LED chờ
        </button>
      )}

      {editMode && !panelCollapsed && (
        <aside className="absolute left-4 top-4 z-50 max-h-[min(90vh,720px)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/15 bg-[#07101f]/95 p-4 font-sans text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e8c96a]">
                Layout LED chờ
              </p>
              <p className="mt-1 text-xs text-white/45">
                Kéo nền · núm vàng đổi size nền (góc = tự do) · núm xanh đổi
                khung chữ, chữ tự co theo khung
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPanelCollapsed(true)}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60"
              >
                Thu gọn
              </button>
              <button
                type="button"
                onClick={() => changeEditMode(false)}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60"
              >
                Đóng
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-white/50">
            Đang chọn:{" "}
            <strong className="text-[#f3cd62]">
              {LED_SLOT_LABELS[selectedId]}
            </strong>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/45">
            <span>
              Nền {selectedSlot.width.toFixed(1)}% ×{" "}
              {selectedSlot.height != null
                ? `${selectedSlot.height.toFixed(1)}%`
                : "auto"}{" "}
              · khung chữ {selectedSlot.textWidth.toFixed(0)}% ×{" "}
              {selectedSlot.textHeight.toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={() =>
                updateSlot(selectedId, { ...selectedSlot, height: null })
              }
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Cao tự động
            </button>
            <button
              type="button"
              onClick={() =>
                updateSlot(selectedId, {
                  ...selectedSlot,
                  textWidth: DEFAULT_TEXT_BOX_WIDTH,
                  textHeight: DEFAULT_TEXT_BOX_HEIGHT,
                  textOffsetX: 50,
                  textOffsetY: 50,
                })
              }
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Reset khung chữ
            </button>
          </div>

          <LedTextToolbar
            fontSizeVw={WAIT_FONT_SIZE_VW[selectedId]}
            align={selectedSlot.align}
            color={selectedSlot.color}
            onAlignChange={(align: TextAlign) => {
              updateSlot(selectedId, {
                ...selectedSlot,
                align,
              });
            }}
            onApplyAlignToHtml={(align) => {
              setCopy((current) => {
                let html = current[selectedId];
                if (/text-align:\s*(left|center|right)/i.test(html)) {
                  html = html.replace(
                    /text-align:\s*(left|center|right)/gi,
                    `text-align: ${align}`
                  );
                } else {
                  html = html.replace(
                    /<p\b/i,
                    `<p style="text-align: ${align}"`
                  );
                }
                return { ...current, [selectedId]: html };
              });
              setDirty(true);
            }}
            onColorChange={(color) => {
              updateSlot(selectedId, { ...selectedSlot, color });
            }}
            onApplyColorToHtml={(color) => {
              // Wait slogans keep rainbow CSS — color is stored for slot
              // parity with employee layout but does not paint over rainbow.
              updateSlot(selectedId, { ...selectedSlot, color });
            }}
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-white/15 px-3 py-2.5 text-sm text-white/65"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-[#d9b84f] px-3 py-2.5 text-sm font-semibold text-[#08101d]"
            >
              {dirty ? "Save *" : "Save"}
            </button>
          </div>
        </aside>
      )}

      {notice && (
        <div className="absolute bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/15 bg-black/80 px-5 py-2.5 font-sans text-xs text-white">
          {notice}
        </div>
      )}
    </>
  );
}
