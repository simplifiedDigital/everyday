import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localBridge } from "./scripts/local-bridge";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
const version = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
).version;
const token = randomBytes(24).toString("hex");
export default defineConfig({
  plugins: [react(), localBridge(token)],
  define: {
    __DEV_TOKEN__: JSON.stringify(token),
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      ignored: [
        "**/.venv/**",
        "**/.cache/**",
        "**/build/**",
        "**/src-tauri/**",
      ],
    },
  },
  clearScreen: false,
});
