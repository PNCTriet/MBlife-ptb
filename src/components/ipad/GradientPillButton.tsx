"use client";

type GradientPillButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

export function GradientPillButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: GradientPillButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ipad-gradient-btn flex items-center justify-center rounded-full font-bold tracking-[0.22em] text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      style={{
        width: "var(--ipad-btn-w)",
        minWidth: "var(--ipad-btn-min-w)",
        maxWidth: "var(--ipad-btn-max-w)",
        height: "var(--ipad-btn-h)",
        fontSize: "var(--ipad-btn-text)",
      }}
    >
      {children}
    </button>
  );
}
