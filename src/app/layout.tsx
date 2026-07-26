import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const beVietnam = localFont({
  variable: "--font-body",
  src: [
    {
      path: "../fonts/BeVietnamPro/BeVietnamPro-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/BeVietnamPro/BeVietnamPro-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/BeVietnamPro/BeVietnamPro-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "MB Life — Key Moment",
  description: "Employee recognition display for MB Life event",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="min-h-full font-[family-name:var(--font-body)]">
        {children}
      </body>
    </html>
  );
}
