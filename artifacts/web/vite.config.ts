import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// The gateway exposes its REST API under /api. During development we proxy
// to it so the SPA can use same-origin relative URLs in every environment.
const GATEWAY_TARGET = process.env["GATEWAY_URL"] || "http://localhost:3001";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Neuron Vision — Checker / Display",
        short_name: "Neuron Vision",
        description: "Robo-QC mobile inspection: capture, analyze and review PCB quality.",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: GATEWAY_TARGET,
        changeOrigin: true,
      },
    },
  },
});
