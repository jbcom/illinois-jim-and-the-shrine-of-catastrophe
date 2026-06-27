import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";

// On GitHub Pages the app is served from a sub-path
// (https://<owner>.github.io/<repo>/ or the org's custom domain + /<repo>/).
// Capacitor and `vite preview` want a root base, so only apply the sub-path
// for the Pages build via PAGES_BASE.
const base = process.env.PAGES_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    solid(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "robots.txt"],
      manifest: {
        name: "Illinois Jim and the Shrine of Catastrophe",
        short_name: "Illinois Jim",
        description: "A mobile-first 2D arcade adventure.",
        theme_color: "#1a120b",
        background_color: "#1a120b",
        display: "fullscreen",
        orientation: "any",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@sim": fileURLToPath(new URL("./src/sim", import.meta.url)),
      "@engine": fileURLToPath(new URL("./src/engine", import.meta.url)),
      "@render": fileURLToPath(new URL("./src/render", import.meta.url)),
      "@ui": fileURLToPath(new URL("./src/ui", import.meta.url)),
      "@audio": fileURLToPath(new URL("./src/audio", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
