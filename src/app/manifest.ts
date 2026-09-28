import type { MetadataRoute } from "next";

// Makes the site installable as an app on iPhone and Android ("Add to Home Screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YYC Halal Meat Shop",
    short_name: "YYC Halal",
    description: "Order fresh halal meat for pickup in Calgary.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f1",
    theme_color: "#0b6b3a",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
