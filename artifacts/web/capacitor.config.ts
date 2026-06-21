import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor native shell for the Neuron Vision PWA. The React app in this
// package is the single frontend source; Capacitor wraps the Vite production
// build (webDir) into Android/iOS shells without changing the UI.
//
// webDir points at Vite's build output (`vite build` → ./dist). Run
// `pnpm --filter @workspace/web run mobile:build` to build the web app and
// copy it into the native projects. See MOBILE.md for device/tooling setup.
const config: CapacitorConfig = {
  appId: "com.roboqc.neuronvision",
  appName: "Neuron Vision",
  webDir: "dist",
};

export default config;
