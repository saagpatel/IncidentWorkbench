import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;
const cacheDir = process.env.VITE_CACHE_DIR;
const defaultDevServerPort = 1420;
const defaultHmrPort = 1421;
const parsedDevServerPort = Number.parseInt(
  process.env.VITE_DEV_SERVER_PORT ?? `${defaultDevServerPort}`,
  10,
);
const devServerPort = Number.isNaN(parsedDevServerPort)
  ? defaultDevServerPort
  : parsedDevServerPort;
const parsedHmrPort = Number.parseInt(
  process.env.VITE_HMR_PORT ?? `${devServerPort + 1}`,
  10,
);
const hmrPort = Number.isNaN(parsedHmrPort) ? defaultHmrPort : parsedHmrPort;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  cacheDir: cacheDir || "node_modules/.vite",
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query", "axios", "zustand"],
          "chart-vendor": ["recharts", "html2canvas"],
          "tauri-vendor": [
            "@tauri-apps/api",
            "@tauri-apps/plugin-shell",
            "@tauri-apps/plugin-stronghold",
          ],
        },
      },
    },
  },
  server: {
    port: devServerPort,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: hmrPort } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
