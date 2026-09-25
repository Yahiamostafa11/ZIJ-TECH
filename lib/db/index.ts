import "server-only";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { mysqlPool?: mysql.Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  // `next build` loads page modules without querying them, so the database may
  // be unconfigured there. mysql2 pools connect lazily, so nothing is opened.
  const isBuild = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
  if (!url && !isBuild) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = mysql.createPool({
    uri: url || "mysql://build@localhost/build",
    // Shared hosting caps connections per database user; keep the pool small.
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE) || 5,
    charset: "utf8mb4_unicode_ci",
    timezone: "Z",
  });

  // Store and compare all dates in UTC regardless of the server's time zone.
  pool.pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });

  return pool;
}

// Reuse one pool across hot reloads in development.
const pool = globalForDb.mysqlPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.mysqlPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
