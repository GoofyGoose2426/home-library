import type { MetadataRoute } from "next";

// Lets the app be added to the home screen and open full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Library",
    short_name: "Library",
    description: "Alexandra's private book catalog",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf6ef",
    theme_color: "#c0573e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
