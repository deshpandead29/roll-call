import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";

export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-display",
});

export const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

// Excalifont, Latin subset, from @excalidraw/excalidraw (SIL OFL).
export const hand = localFont({
  src: "./fonts/excalifont.woff2",
  variable: "--font-hand",
});
