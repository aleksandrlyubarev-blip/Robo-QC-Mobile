import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor native shell for Neuron Vision.
 *
 * The shell wraps the existing React + Vite app unchanged: it loads the
 * production web bundle from `webDir` (the Vite output). No screens are
 * rewritten and no Capacitor APIs are imported by the React code.
 *
 * Data source on device:
 *  - With no reachable gateway the app falls back to Demo mode automatically.
 *  - For live data, set the gateway URL at runtime from the in-app data-source
 *    menu (e.g. http://10.0.2.2:3001/api on the Android emulator). See MOBILE.md.
 */
const config: CapacitorConfig = {
  appId: "com.neuronvision.app",
  appName: "Neuron Vision",
  webDir: "dist",
};

export default config;
