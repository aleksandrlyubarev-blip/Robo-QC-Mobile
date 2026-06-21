import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/** Thrown on DB access when DATABASE_URL is not set, so the API can answer
 *  with a clear 503 instead of crashing the whole gateway at import time. */
export class DbNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set — start Postgres and configure DATABASE_URL.");
    this.name = "DbNotConfiguredError";
  }
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

type Db = NodePgDatabase<typeof schema>;

let realPool: pg.Pool | null = null;
let realDb: Db | null = null;

function init(): Db {
  if (realDb) return realDb;
  if (!process.env.DATABASE_URL) throw new DbNotConfiguredError();
  realPool = new Pool({ connectionString: process.env.DATABASE_URL });
  realDb = drizzle(realPool, { schema });
  return realDb;
}

export function getPool(): pg.Pool {
  init();
  return realPool as pg.Pool;
}

/**
 * Lazily-initialised Drizzle client. Connecting is deferred until the first
 * query so the gateway can boot (and serve /healthz) without a database; any
 * query made without DATABASE_URL throws DbNotConfiguredError.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = init();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export * from "./schema";
