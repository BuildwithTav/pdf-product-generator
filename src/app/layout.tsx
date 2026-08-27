import type { Metadata, Viewport } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";

const displayFont = Lora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PDF Product Generator",
  description: "Turn a form into a fully written, fully designed, sellable digital product PDF.",
};

// Without this, mobile browsers fall back to a ~980px desktop-compatibility
// layout width and the user has to pinch-zoom to use the app at all — every
// sm:/md:/lg: responsive class in this codebase (including the mobile
// sidebar) silently does nothing without it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displayFont.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
