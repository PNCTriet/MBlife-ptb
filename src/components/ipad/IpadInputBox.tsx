"use client";

type IpadInputBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function IpadInputBox({
  value,
  onChange,
  onFocus,
  inputRef,
}: IpadInputBoxProps) {
  return (
    <div className="ipad-gradient-box ipad-box backdrop-blur-md">
      <p
        className="font-bold tracking-[0.08em] text-white/90"
        style={{ fontSize: "var(--ipad-box-label-size)" }}
      >
        Mã nhân viên
      </p>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        autoComplete="off"
        autoCorrect="off"
        className="mt-[1.4vh] w-full flex-1 bg-transparent text-center font-bold tracking-[0.14em] text-white outline-none placeholder:text-white/20"
        style={{ fontSize: "var(--ipad-box-code-size)" }}
        placeholder=""
      />
    </div>
  );
}

const DEFAULT_ERROR_LINES = ["Mã nhân viên không đúng.", "Vui lòng thử lại."];

export function IpadErrorBox({
  lines = DEFAULT_ERROR_LINES,
  onRetry,
}: {
  lines?: string[];
  onRetry: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="ipad-gradient-box ipad-box backdrop-blur-md transition active:scale-[0.99]"
    >
      <div className="ipad-box-error-text">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </button>
  );
}
