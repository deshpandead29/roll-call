import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-display",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

// Excalifont, Latin subset, from @excalidraw/excalidraw (SIL OFL).
const hand = localFont({
  src: "./fonts/excalifont.woff2",
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "Roll Call",
  description: "Call roll and everyone shoots the same moment. You see it all the next day.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F1" },
    { media: "(prefers-color-scheme: dark)", color: "#131217" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${hand.variable}`}>
      <body>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
