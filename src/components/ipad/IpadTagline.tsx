import Image from "next/image";

type IpadTaglineProps = {
  variant?: "welcome" | "form";
};

export function IpadTagline({ variant = "welcome" }: IpadTaglineProps) {
  const width =
    variant === "form"
      ? "var(--ipad-compact-tagline-w)"
      : "var(--ipad-hero-tagline-w)";
  const maxWidth =
    variant === "form" ? "var(--ipad-compact-tagline-max-w)" : "none";

  return (
    <div className="flex justify-center">
      <Image
        src="/ipad/Tagline.png"
        alt="Tiến bước rực rỡ — Vạn dặm thăng hoa"
        width={1444}
        height={928}
        priority
        className="h-auto"
        style={{ width, maxWidth }}
      />
    </div>
  );
}
