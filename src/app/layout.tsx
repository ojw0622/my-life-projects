import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Korean glyphs: a clean sans for the interface, a serif for writing.
const plexKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-kr",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const serifKr = Noto_Serif_KR({
  variable: "--font-serif-kr",
  weight: ["400", "600", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "My Life Dashboard",
  description: "자본 · 사유 · 신체 개인 통합 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${plexKr.variable} ${serifKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
