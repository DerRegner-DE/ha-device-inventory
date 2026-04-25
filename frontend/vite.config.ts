import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [preact(), tailwindcss()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Local dev: proxy API calls to the uvicorn backend on :3002.
      // In production, nginx inside the add-on container handles this.
      "/api": "http://127.0.0.1:3002",
    },
  },
});
