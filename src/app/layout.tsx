import type { Metadata, Viewport } from "next";
import { Sweep } from "@/components/sweep";
import { body, display, hand } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roll Call",
  description: "Call roll and everyone shoots the same moment. You see it all the next day.",
  appleWebApp: { capable: true, title: "Roll Call", statusBarStyle: "default" },
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
        <Sweep />
      </body>
    </html>
  );
}
