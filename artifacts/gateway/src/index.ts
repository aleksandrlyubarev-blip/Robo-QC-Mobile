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

app.listen(port, () => {
  console.log(`Gateway listening on port ${port}`);
});
