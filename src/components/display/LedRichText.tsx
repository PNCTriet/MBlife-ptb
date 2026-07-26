"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

type LedRichTextEditorProps = {
  html: string;
  editable: boolean;
  fontSizeVw: number;
  className?: string;
  onHtmlChange?: (html: string) => void;
};

export function LedRichTextEditor({
  html,
  editable,
  fontSizeVw,
  className = "",
  onHtmlChange,
}: LedRichTextEditorProps) {
  const htmlRef = useRef(html);

  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        underline: false,
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
    ],
    content: html,
    editable,
    editorProps: {
      attributes: {
        class: `led-rich-text outline-none w-full ${className}`,
        style: `font-size: ${fontSizeVw}vw`,
      },
    },
    onUpdate: ({ editor: current }) => {
      const nextHtml = current.getHTML();
      // Skip no-op TipTap normalizations so parent layout isn't marked dirty.
      if (nextHtml !== htmlRef.current) {
        onHtmlChange?.(nextHtml);
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (html !== current) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, html]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dom.style.fontSize = `${fontSizeVw}vw`;
  }, [editor, fontSizeVw]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}

type LedTextFitBoxProps = {
  /** Changes whenever content or size settings change — triggers a remeasure. */
  fitKey: string;
  className?: string;
  children: ReactNode;
};

/**
 * Scales the LED text down until it fits the operator-sized text box. The
 * transform is layout-neutral, so measuring `scrollWidth`/`scrollHeight` of the
 * untransformed content never feeds back into the observer.
 */
export function LedTextFitBox({
  fitKey,
  className = "",
  children,
}: LedTextFitBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;

    const measure = () => {
      const boxWidth = box.clientWidth;
      const boxHeight = box.clientHeight;
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      if (boxWidth <= 0 || boxHeight <= 0) return;
      if (contentWidth <= 0 || contentHeight <= 0) return;

      const next = Math.min(
        1,
        boxWidth / contentWidth,
        boxHeight / contentHeight
      );
      setScale((current) =>
        Math.abs(current - next) < 0.005 ? current : next
      );
    };

    // ResizeObserver fires once on observe, which covers the initial measure
    // without a synchronous setState inside the effect body.
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, [fitKey]);

  return (
    <div
      ref={boxRef}
      className={`flex h-full w-full items-center justify-center overflow-visible ${className}`}
    >
      <div
        ref={contentRef}
        className="w-full"
        style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        {children}
      </div>
    </div>
  );
}

type LedTextToolbarProps = {
  fontSizeVw: number;
  align: "left" | "center" | "right";
  color: string;
  /** Omit when the scene renders a fixed size — hides the size stepper. */
  onFontSizeChange?: (size: number) => void;
  onAlignChange: (align: "left" | "center" | "right") => void;
  onApplyAlignToHtml: (align: "left" | "center" | "right") => void;
  onColorChange: (color: string) => void;
  onApplyColorToHtml: (color: string) => void;
};

const COLOR_PRESETS = [
  { value: "#ffffff", label: "Trắng" },
  { value: "#fff3a0", label: "Vàng nhạt" },
] as const;

/** Controls for the selected LED (works with TipTap content on the strip). */
export function LedTextToolbar({
  fontSizeVw,
  align,
  color,
  onFontSizeChange,
  onAlignChange,
  onApplyAlignToHtml,
  onColorChange,
  onApplyColorToHtml,
}: LedTextToolbarProps) {
  const btn =
    "rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white";
  const active = "border-[#e8c96a]/50 bg-[#e8c96a]/15 text-[#f3cd62]";

  const applyColor = (next: string) => {
    onColorChange(next);
    onApplyColorToHtml(next);
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
        TipTap — chỉnh chữ trên LED đang chọn
      </p>
      <p className="text-[11px] leading-relaxed text-white/40">
        Click vào thanh LED để gõ / bôi đậm (⌘B) · nghiêng (⌘I). Kéo khối chữ
        trong ô để đổi vị trí. Dùng nút dưới để căn lề, màu và size.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["left", "Trái"],
            ["center", "Giữa"],
            ["right", "Phải"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`${btn} ${align === value ? active : ""}`}
            onClick={() => {
              onAlignChange(value);
              onApplyAlignToHtml(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/45">Màu</span>
        <input
          type="color"
          aria-label="Chọn màu chữ"
          value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#ffffff"}
          onChange={(event) => applyColor(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent p-0.5"
        />
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={`${btn} ${color.toLowerCase() === preset.value ? active : ""}`}
            onClick={() => applyColor(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/45">Size</span>
        {onFontSizeChange ? (
          <>
            <button
              type="button"
              className={btn}
              onClick={() => onFontSizeChange(Math.max(0.8, fontSizeVw - 0.15))}
            >
              −
            </button>
            <span className="min-w-[3.5rem] text-center text-xs text-white/80">
              {fontSizeVw.toFixed(2)}vw
            </span>
            <button
              type="button"
              className={btn}
              onClick={() => onFontSizeChange(Math.min(6, fontSizeVw + 0.15))}
            >
              +
            </button>
          </>
        ) : (
          <span className="text-xs text-white/80">
            {fontSizeVw.toFixed(2)}vw (cố định)
          </span>
        )}
      </div>
    </div>
  );
}
