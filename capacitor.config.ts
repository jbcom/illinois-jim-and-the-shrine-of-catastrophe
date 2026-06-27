import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jbcom.illinoisjim",
  appName: "Illinois Jim and the Shrine of Catastrophe",
  webDir: "dist",
  android: {
    // Game is rendered on a canvas; let it own the full surface.
    backgroundColor: "#17110b",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
