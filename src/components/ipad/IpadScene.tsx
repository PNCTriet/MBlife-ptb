"use client";

import { IpadTagline } from "@/components/ipad/IpadTagline";

type IpadSceneProps = {
  variant?: "hero" | "compact";
  hint?: string;
  main?: React.ReactNode;
  mainKind?: "box" | "message";
  footer: React.ReactNode;
};

export function IpadScene({
  variant = "compact",
  hint,
  main,
  mainKind = "box",
  footer,
}: IpadSceneProps) {
  return (
    <section className={`ipad-scene ipad-scene--${variant}`}>
      <div className="ipad-scene-tagline">
        <IpadTagline variant={variant === "hero" ? "welcome" : "form"} />
      </div>

      {variant === "compact" ? (
        <p className={`ipad-scene-hint ${hint ? "" : "ipad-scene-hint--empty"}`}>
          {hint ?? "Nhập mã nhân viên tại đây"}
        </p>
      ) : null}

      {main ? (
        <div
          className={
            mainKind === "message"
              ? "ipad-scene-main ipad-scene-main--message"
              : "ipad-scene-main"
          }
        >
          {mainKind === "message" ? <p>{main}</p> : main}
        </div>
      ) : null}

      <div className="ipad-scene-footer">{footer}</div>
    </section>
  );
}
