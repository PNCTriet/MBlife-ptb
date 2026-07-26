"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  employeeLedDefaultHtml,
  LED_ASPECT_BY_ID,
  LED_STRIPS,
  type LedId,
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
import type { Honorific } from "@/lib/types";
import {
  LedRichTextEditor,
  LedTextFitBox,
  LedTextToolbar,
} from "@/components/display/LedRichText";

type Props = {
  name: string;
  days: number;
  title: Honorific;
  wish: string;
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
  id: LedId;
  pointerId: number;
  startX: number;
  startY: number;
  initialSlot: SharedLedSlot;
};

const LONG_PREVIEW_NAME = "NGUYỄN HOÀNG MINH ANH PHƯƠNG";
const SHORT_PREVIEW_NAME = "AN";
const DEFAULT_PREVIEW_WISH =
  "Chúc mọi nỗ lực của Chị được ghi dấu bằng những thành quả rực rỡ";

type HtmlMap = Record<LedId, string>;

/** A manual html edit is only valid for the exact guest/preview it was made
 * for — tagging it with the employeeKey lets us derive the displayed html
 * SYNCHRONOUSLY during render (no effect-timing race where a stale map
 * briefly renders before a `useEffect` gets a chance to reset it). */
type HtmlOverride = { key: string; map: HtmlMap };

const EMPLOYEE_LED_LABELS: Record<LedId, string> = {
  led1: "LED 1 — Cảm ơn / Thank you",
  led2: "LED 2 — Danh xưng + tên",
  led3: "LED 3 — Số ngày đồng hành",
  led4: "LED 4 — Câu chúc / Message",
};

export default function EmployeeReveal({
  name,
  days,
  title,
  wish,
  visible,
  onEditModeChange,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layout, setLayout] = useState<SharedLedLayout>(
    cloneDefaultSharedLedLayout
  );
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<LedId>("led2");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [dirty, setDirty] = useState(false);
  const [holdingKey, setHoldingKey] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [notice, setNotice] = useState("");
  const [previewName, setPreviewName] = useState(name || "LÊ THỊ NHUNG");
  const [previewDays, setPreviewDays] = useState(days || 3859);
  const [previewTitle, setPreviewTitle] = useState<Honorific>(title || "Chị");
  const [previewWish, setPreviewWish] = useState(wish || DEFAULT_PREVIEW_WISH);
  const [htmlOverride, setHtmlOverride] = useState<HtmlOverride | null>(null);

  // `visible` = there IS a real guest live right now (hasEmployee upstream).
  // Preview data is ONLY for calibrating layout while idle — once a real
  // guest is showing, the LED must always mirror the real props, even if
  // Setup is open, so the on-screen text can never drift from the truth.
  const usingPreview = editMode && !visible;
  const shownName = usingPreview ? previewName : name;
  const shownDays = usingPreview ? previewDays : days;
  const shownTitle = usingPreview ? previewTitle : title;
  const shownWish = usingPreview ? previewWish : wish;
  const showContent = visible || editMode;
  const employeeKey = `${shownTitle}|${shownName}|${shownDays}|${shownWish}`;

  const liveHtml = useMemo(
    () =>
      employeeLedDefaultHtml({
        title: shownTitle,
        name: shownName,
        days: shownDays,
        wish: shownWish,
      }),
    [shownDays, shownName, shownTitle, shownWish]
  );

  // Deferred one frame: localStorage is client-only, so reading it during the
  // hydrating render would mismatch the server output.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLayout(loadSharedLedLayout());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Auto-persist shortly after edits so reload keeps the last arrangement.
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      if (saveSharedLedLayout(layout)) {
        setDirty(false);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dirty, layout]);

  useEffect(() => {
    const onRemote = (event: Event) => {
      const next = (event as CustomEvent<SharedLedLayout>).detail;
      if (!next) return;
      setLayout(next);
    };
    window.addEventListener(SHARED_LED_LAYOUT_EVENT, onRemote);
    return () => window.removeEventListener(SHARED_LED_LAYOUT_EVENT, onRemote);
  }, []);

  // Keep the Setup panel's preview fields mirroring the REAL guest whenever
  // one is live — even if Setup was already open before this guest arrived,
  // or stays open while a new guest replaces the previous one.
  useEffect(() => {
    if (!visible) return;
    setPreviewName(name || "LÊ THỊ NHUNG");
    setPreviewDays(days || 3859);
    setPreviewTitle(title || "Chị");
    setPreviewWish(wish || DEFAULT_PREVIEW_WISH);
  }, [visible, name, days, title, wish]);

  const changeEditMode = useCallback(
    (next: boolean) => {
      setEditMode(next);
      setInteraction(null);
      setHoldingKey(false);
      onEditModeChange?.(next);

      if (next) {
        setPanelCollapsed(false);
        setPreviewName(name || "LÊ THỊ NHUNG");
        setPreviewDays(days || 3859);
        setPreviewTitle(title || "Chị");
        setPreviewWish(wish || DEFAULT_PREVIEW_WISH);
      }
    },
    [days, name, onEditModeChange, title, wish]
  );

  useEffect(() => {
    if (!visible && editMode) changeEditMode(false);
  }, [visible, editMode, changeEditMode]);

  useEffect(() => {
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
        target?.isContentEditable;

      if (event.key === "Escape" && editMode) {
        changeEditMode(false);
        return;
      }

      if (!visible || isTyping || event.repeat || event.key.toLowerCase() !== "e")
        return;

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

  const updateSlot = useCallback((id: LedId, next: SharedLedSlot) => {
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

  const startInteraction = (
    mode: InteractionMode,
    id: LedId,
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
      interaction.mode === "resize-y"
        ? slot.width
        : clamp(slot.width + dx, 5, 200);
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
    if (saveSharedLedLayout(layout)) {
      setDirty(false);
      setNotice("Đã lưu layout LED chung trên máy này");
    } else {
      setNotice(
        "Lưu không thành công — trình duyệt đang chặn lưu (tắt Private mode hoặc cho phép localStorage)"
      );
    }
  };

  const handleReset = () => {
    const defaults = cloneDefaultSharedLedLayout();
    setLayout(defaults);
    saveSharedLedLayout(defaults);
    publishSharedLedLayout(defaults);
    setHtmlOverride(null);
    setDirty(false);
    setSelectedId("led2");
    setNotice("Đã khôi phục layout LED mặc định");
  };

  // Only trust a manual html edit if it was made for THIS exact guest/preview
  // payload (matching employeeKey) — otherwise always fall back to the fresh
  // auto-generated liveHtml. This check runs synchronously during render, so
  // there is never a frame where stale content from a previous guest shows.
  const currentHtml =
    htmlOverride && htmlOverride.key === employeeKey
      ? htmlOverride.map
      : liveHtml;
  const selectedSlot = layout.slots[selectedId];

  return (
    <>
      {/* LED PNG stays on WaitLedScene; this layer only crossfades employee text. */}
      <div
        ref={stageRef}
        className={`absolute inset-0 z-20 overflow-hidden ${
          editMode ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <AnimatePresence>
          {showContent &&
            LED_STRIPS.map((led) => {
              const item = layout.slots[led.id];
              const selected = editMode && selectedId === led.id;
              const freeSized = item.height != null;

              return (
                <motion.div
                  key={led.id}
                  className={`absolute touch-none ${
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: editMode ? 0.15 : 1.5,
                    ease: "easeInOut",
                  }}
                  onPointerDown={(event) =>
                    startInteraction("drag", led.id, event)
                  }
                  onPointerMove={moveInteraction}
                  onPointerUp={endInteraction}
                  onPointerCancel={endInteraction}
                >
                  <div
                    className={`employee-led-text absolute z-[1] ${
                      editMode
                        ? `outline-dashed outline-1 ${
                            selected
                              ? "outline-[#9fe8ff]/80"
                              : "outline-white/25"
                          }`
                        : ""
                    }`}
                    style={{
                      left: `${item.textOffsetX}%`,
                      top: `${item.textOffsetY}%`,
                      width: `${item.textWidth}%`,
                      height: `${item.textHeight}%`,
                      transform: "translate(-50%, -50%)",
                      color: item.color,
                    }}
                    onPointerDown={(event) => {
                      // Keep the click reaching TipTap (for cursor/word
                      // selection) but stop it bubbling into the whole-LED
                      // drag handler. Also select this LED so it becomes
                      // editable right away — fixes lost click-to-edit.
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
                      fitKey={`${currentHtml[led.id]}|${item.fontSize}|${item.textWidth}|${item.textHeight}`}
                    >
                      <LedRichTextEditor
                        key={`${employeeKey}-${led.id}`}
                        html={currentHtml[led.id]}
                        editable={editMode}
                        fontSizeVw={item.fontSize}
                        onHtmlChange={(html) => {
                          setHtmlOverride((current) => {
                            const base =
                              current && current.key === employeeKey
                                ? current.map
                                : liveHtml;
                            return {
                              key: employeeKey,
                              map: { ...base, [led.id]: html },
                            };
                          });
                          setDirty(true);
                        }}
                      />
                    </LedTextFitBox>
                  </div>

                  {editMode && (
                    <>
                      <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-black/85 px-2 py-1 font-sans text-[10px] leading-none tracking-normal text-white">
                        {LED_SLOT_LABELS[led.id]} · w {item.width.toFixed(1)}%
                        {freeSized
                          ? ` · h ${item.height?.toFixed(1)}%`
                          : " · h auto"}
                      </span>
                      <button
                        type="button"
                        aria-label={`Đổi chiều rộng ${EMPLOYEE_LED_LABELS[led.id]}`}
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
                        aria-label={`Đổi chiều cao ${EMPLOYEE_LED_LABELS[led.id]}`}
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
                        aria-label={`Đổi kích thước tự do ${EMPLOYEE_LED_LABELS[led.id]}`}
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
                </motion.div>
              );
            })}
        </AnimatePresence>
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
          {holdingKey ? "Giữ E…" : editMode ? "Editing" : "Setup"}
        </button>
      )}

      {editMode && panelCollapsed && (
        <button
          type="button"
          onClick={() => setPanelCollapsed(false)}
          className="absolute left-4 top-4 z-50 rounded-xl border border-[#e8c96a]/40 bg-[#07101f]/90 px-4 py-2.5 font-sans text-xs font-medium text-[#e8c96a] shadow-xl backdrop-blur-xl"
        >
          Mở công cụ layout
        </button>
      )}

      {editMode && !panelCollapsed && (
        <aside className="absolute left-4 top-4 z-50 max-h-[min(90vh,720px)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/15 bg-[#07101f]/95 p-4 font-sans text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e8c96a]">
                Setup LED nhân viên
              </p>
              <p className="mt-1 text-xs text-white/45">
                Kéo nền LED · núm vàng đổi size nền (góc = tự do) · núm xanh
                đổi khung chữ, chữ tự co theo khung
              </p>
              {visible && (
                <p className="mt-2 rounded-lg border border-[#e8c96a]/30 bg-[#e8c96a]/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-[#f3cd62]">
                  Đang hiển thị khách thật — các trường preview dưới chỉ để
                  xem, không dùng để chỉnh nội dung khách đang lên hình.
                </p>
              )}
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

          <div
            className={`mt-4 grid grid-cols-[70px_1fr] gap-2 ${
              visible ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <select
              aria-label="Danh xưng preview"
              value={previewTitle}
              disabled={visible}
              onChange={(event) =>
                setPreviewTitle(event.target.value as Honorific)
              }
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm outline-none"
            >
              <option className="bg-[#07101f]">Anh</option>
              <option className="bg-[#07101f]">Chị</option>
              <option className="bg-[#07101f]">Mr</option>
              <option className="bg-[#07101f]">Ms</option>
            </select>
            <input
              aria-label="Tên preview"
              value={previewName}
              disabled={visible}
              onChange={(event) => setPreviewName(event.target.value)}
              className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
            <label className="flex items-center text-xs text-white/45">
              Số ngày
            </label>
            <input
              type="number"
              min={0}
              value={previewDays}
              disabled={visible}
              onChange={(event) =>
                setPreviewDays(Number(event.target.value) || 0)
              }
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
            <label className="flex items-center text-xs text-white/45">
              Câu chúc
            </label>
            <textarea
              value={previewWish}
              disabled={visible}
              onChange={(event) => setPreviewWish(event.target.value)}
              rows={2}
              className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
          </div>

          {!visible && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewName(LONG_PREVIEW_NAME)}
                className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60"
              >
                Test tên dài
              </button>
              <button
                type="button"
                onClick={() => setPreviewName(SHORT_PREVIEW_NAME)}
                className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60"
              >
                Test tên ngắn
              </button>
            </div>
          )}

          <p className="mt-3 text-xs text-white/50">
            Đang chọn:{" "}
            <strong className="text-[#f3cd62]">
              {EMPLOYEE_LED_LABELS[selectedId]}
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
            fontSizeVw={selectedSlot.fontSize}
            align={selectedSlot.align}
            color={selectedSlot.color}
            onFontSizeChange={(size) => {
              updateSlot(selectedId, {
                ...selectedSlot,
                fontSize: size,
              });
            }}
            onAlignChange={(align: TextAlign) => {
              updateSlot(selectedId, {
                ...selectedSlot,
                align,
              });
            }}
            onApplyAlignToHtml={(align) => {
              setHtmlOverride((current) => {
                const source =
                  current && current.key === employeeKey
                    ? current.map
                    : liveHtml;
                const next = { ...source };
                next[selectedId] = source[selectedId].replace(
                  /text-align:\s*(left|center|right)/gi,
                  `text-align: ${align}`
                );
                if (!/text-align:/i.test(next[selectedId])) {
                  next[selectedId] = next[selectedId].replace(
                    /<p\b/i,
                    `<p style="text-align: ${align}"`
                  );
                }
                return { key: employeeKey, map: next };
              });
              setDirty(true);
            }}
            onColorChange={(color) => {
              updateSlot(selectedId, { ...selectedSlot, color });
            }}
            onApplyColorToHtml={(color) => {
              setHtmlOverride((current) => {
                const source =
                  current && current.key === employeeKey
                    ? current.map
                    : liveHtml;
                const next = { ...source };
                let html = source[selectedId];
                if (/color:\s*[^;"']+/i.test(html)) {
                  html = html.replace(/color:\s*[^;"']+/gi, `color: ${color}`);
                } else if (/style="/i.test(html)) {
                  html = html.replace(
                    /style="/i,
                    `style="color: ${color}; `
                  );
                } else {
                  html = html.replace(/<p\b/i, `<p style="color: ${color}"`);
                }
                next[selectedId] = html;
                return { key: employeeKey, map: next };
              });
              setDirty(true);
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
