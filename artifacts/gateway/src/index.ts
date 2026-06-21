import "./lib/env";
import app from "./app";

// Default to 3001 for local development; docker-compose and production set
// PORT explicitly. Keeping a default here means `pnpm dev:gateway` works
// out of the box and stays consistent with the Vite proxy target.
const rawPort = process.env["PORT"] ?? "3001";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Bind to all interfaces by default so the gateway is reachable from phones and
// emulators on the local network, not just localhost. Set HOST to restrict it
// (e.g. 127.0.0.1) when you only want loopback access. See MOBILE.md for how a
// device addresses the gateway (Android emulator, iOS simulator, physical phone).
const host = process.env["HOST"] ?? "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Gateway listening on http://${host}:${port}`);
  if (host === "0.0.0.0") {
    console.log(
      "Reachable on this machine's LAN IP — phones/emulators can connect (see MOBILE.md).",
    );
  }
});
