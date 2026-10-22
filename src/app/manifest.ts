import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Roll Call",
    short_name: "Roll Call",
    description: "Call roll and everyone shoots the same moment. You see it all the next day.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F1",
    theme_color: "#FAF7F1",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
