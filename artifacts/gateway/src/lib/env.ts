import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load environment from the monorepo root .env (and any local .env), so
// `pnpm dev`/`db:seed` pick up DATABASE_URL regardless of the working dir.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../../../.env") });
config();
