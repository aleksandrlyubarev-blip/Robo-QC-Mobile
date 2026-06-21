import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import type { ServerResponse } from "node:http";

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
        // When the gateway is down, answer with HTTP 200 carrying an explicit
        // "unavailable" payload instead of an error status. Browsers log any
        // 4xx/5xx fetch as a failed resource, so a 200 keeps the console clean
        // during demo fallback; the probe distinguishes this from a real
        // gateway by the body (it never reports status: "ok").
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            const r = res as ServerResponse;
            if (typeof r.writeHead === "function" && !r.headersSent) {
              r.writeHead(200, { "Content-Type": "application/json" });
              r.end(JSON.stringify({ status: "unavailable", gateway: false }));
            }
          });
        },
      },
    },
  },
});
