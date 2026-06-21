# Mobile MVP — backend compatibility

How the Neuron Vision mobile app (the React + Vite PWA in `artifacts/web`)
talks to the existing Express gateway. This phase does **not** redesign the
backend: the gateway, Postgres schema, and `data:`-URL capture flow are
unchanged. These notes only cover making the current API reachable from a
phone, emulator, or simulator.

The app runs in three supported configurations:

1. **Demo mode — no backend.** The app probes for a gateway; finding none it
   falls back to seeded in-memory data. Nothing else is required.
2. **Live gateway on the local network** (not only localhost).
3. **Live gateway with `INFERENCE_MOCK=true`** — detections are synthesized in
   the gateway, so the full Analyze → QC → review → report flow runs without a
   GPU. Future real inference uses the same gateway API with `INFERENCE_MOCK`
   unset.

---

## 1. Pick the gateway base URL for your device

The address a device uses for the gateway depends on where it runs. `localhost`
on a phone/emulator means the *device itself*, not your laptop — hence the
table below. The gateway listens on port **3001** and serves the API under
**`/api`**.

| Device                 | Gateway base URL                          |
| ---------------------- | ----------------------------------------- |
| Android emulator       | `http://10.0.2.2:3001/api`                |
| iOS simulator          | `http://localhost:3001/api`               |
| Physical phone (LAN)   | `http://<developer-machine-LAN-IP>:3001/api` |
| Desktop browser (dev)  | `/api` (proxied by Vite — the default)    |

`10.0.2.2` is the Android emulator's alias for the host machine's loopback.
For a physical phone, find your machine's LAN IP (`ipconfig` / `ip addr` /
`ifconfig`, e.g. `192.168.1.42`) and ensure the phone is on the same Wi-Fi.

### Set it in the app

Open the **data-source pill** in the header (`LIVE` / `DEMO`) → **Gateway URL**
→ paste the base URL (include the `/api` suffix) → **Apply**. The value is
stored on the device (`localStorage`) and takes effect immediately — no
rebuild. Clear the field and Apply to return to the default.

The same override can be baked in at build time via `VITE_API_URL`; the
runtime override wins when both are set.

---

## 2. Run the gateway so the device can reach it

```bash
cp .env.example .env     # DATABASE_URL, PORT=3001, INFERENCE_MOCK=true
pnpm db:setup            # Postgres + schema + seed
pnpm dev                 # web (0.0.0.0:5173) + gateway (0.0.0.0:3001)
```

The gateway binds to `0.0.0.0` by default, so it is reachable on your machine's
LAN IP — not just localhost. Restrict it with `HOST=127.0.0.1` if you only want
loopback access. On startup it logs the bound address.

The Vite dev server also listens on all interfaces (`server.host: true`), so a
phone on the same network can load the dev app directly and reach the gateway
through the `/api` proxy. If you load the app from the dev server this way, the
default `/api` base already works and you don't need to set a Gateway URL.

### Firewall

Allow inbound TCP on **3001** (gateway) and, if loading the dev UI on a phone,
**5173** (Vite) from your LAN.

---

## 3. What was made mobile-compatible

Backend changes were limited to what mobile reachability requires:

- **Configurable API base URL** — runtime override on the device (above), plus
  build-time `VITE_API_URL`.
- **LAN binding** — gateway and Vite listen on `0.0.0.0`; `HOST` can restrict
  the gateway.
- **CORS** — reflects any origin in development so mobile browsers and native
  shells (`capacitor://localhost`, `ionic://localhost`, or no `Origin` header)
  connect. Lock down with `CORS_ORIGINS` in production.
- **Large image bodies** — `data:` URL captures are accepted up to
  `JSON_BODY_LIMIT` (default `50mb`).
- **Source probing** — `GET /api/healthz` is unauthenticated and returns
  `{ status: "ok", ... }`; the app uses it to choose live vs demo.

### Explicitly out of scope this phase

No auth, users, cloud sync, upload endpoints, or new inference architecture.
The `data:`-URL capture flow is unchanged. The gateway and Postgres schema are
unchanged.

---

## 4. Troubleshooting

- **App shows DEMO on the phone but the gateway is up.** The device can't reach
  the URL. Re-check the table in §1 (emulator vs simulator vs physical), confirm
  same network, and that the firewall allows port 3001. Tap **Retry** in the
  demo banner after fixing.
- **CORS error in the console.** You set `CORS_ORIGINS` and the device's origin
  isn't listed. Add it, or unset the variable in development.
- **413 Payload Too Large on Analyze.** A capture exceeded `JSON_BODY_LIMIT`.
  Raise it in `.env` and restart the gateway.
- **`localhost` works in the iOS simulator but not the Android emulator.** Use
  `10.0.2.2` for Android — `localhost` there is the emulated device itself.

---

## 5. Native shell (Capacitor)

The native iOS/Android apps are a thin [Capacitor](https://capacitorjs.com)
shell around the **existing** `artifacts/web` build — no screens are rewritten
and the React code imports no Capacitor APIs. The shell loads the production
Vite bundle from `webDir: "dist"`.

- **App name:** Neuron Vision
- **App / package id:** `com.neuronvision.app`
- **Config:** `artifacts/web/capacitor.config.ts`

On device with no reachable gateway the app falls back to **Demo** mode; for
live data set the gateway URL from the in-app data-source menu (§1).

### Requirements

| Target  | Needs                                                                 |
| ------- | --------------------------------------------------------------------- |
| Android | JDK 17+, Android Studio (or the Android SDK + `ANDROID_HOME` set)      |
| iOS     | macOS, Xcode, and CocoaPods (`sudo gem install cocoapods`)            |

The Capacitor CLI is installed with the web workspace; no global install needed.

### Commands

All run from `artifacts/web` (or via `pnpm --filter @workspace/web run <script>`):

```bash
# 1. Add a native platform once (generates android/ or ios/, gitignored)
pnpm cap:add:android
pnpm cap:add:ios          # macOS only

# 2. Build the web bundle and copy it into the native project(s)
pnpm mobile:build         # = vite build && cap sync
#   or, if dist is already built:
pnpm cap:sync

# 3. Open the native IDE to run on a device/emulator
pnpm cap:open:android     # Android Studio
pnpm cap:open:ios         # Xcode (macOS only)
```

The generated `android/` and `ios/` folders are git-ignored — they are
reproducible from `capacitor.config.ts` with the commands above.

### Verified here / blockers

- ✅ `cap add android` scaffolds `android/` and `cap sync` copies the built
  bundle into `android/app/src/main/assets/public` with app id
  `com.neuronvision.app` — verified in this environment (JDK + Gradle present).
- ⚠️ **Building/running** the Android app needs the **Android SDK**
  (`ANDROID_HOME`), which is not installed here — open `android/` in Android
  Studio (which provisions the SDK) or set `ANDROID_HOME` and run
  `./android/gradlew assembleDebug`.
- ⚠️ **iOS** requires **macOS + Xcode**; `cap add ios` cannot run on this Linux
  host. Run the iOS commands on a Mac.
