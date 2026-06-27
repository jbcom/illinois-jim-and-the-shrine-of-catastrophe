import { fileURLToPath, URL } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "@sim": fileURLToPath(new URL("./src/sim", import.meta.url)),
  "@engine": fileURLToPath(new URL("./src/engine", import.meta.url)),
  "@render": fileURLToPath(new URL("./src/render", import.meta.url)),
  "@ui": fileURLToPath(new URL("./src/ui", import.meta.url)),
  "@audio": fileURLToPath(new URL("./src/audio", import.meta.url)),
  "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        // Fast, node-based: sim purity + determinism + pure logic.
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        // Real Chromium: render, audio graph, visual screenshots.
        resolve: { alias },
        test: {
          name: "browser",
          include: ["tests/browser/**/*.test.ts", "tests/visual/**/*.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
