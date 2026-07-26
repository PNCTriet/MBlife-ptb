import Image from "next/image";
import { IpadFullscreenButton } from "@/components/ipad/IpadFullscreenButton";
import "./ipad-layout.css";

type IpadLayoutProps = {
  children: React.ReactNode;
};

export function IpadLayout({ children }: IpadLayoutProps) {
  return (
    <main className="ipad-screen relative h-dvh w-full overflow-hidden">
      <Image
        src="/ipad/Background.png"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      <div className="pointer-events-none absolute inset-0 bg-[#050818]/10" />

      <IpadFullscreenButton />

      <header
        className="absolute z-20"
        style={{
          top: "var(--ipad-logo-top)",
          right: "var(--ipad-logo-right)",
        }}
      >
        <Image
          src="/ipad/Logo.png"
          alt="MB Life — 10 năm"
          width={786}
          height={258}
          className="h-auto w-[var(--ipad-logo-w)]"
          priority
        />
      </header>

      <div className="relative z-10 h-full w-full">{children}</div>
    </main>
  );
}
