import { requireEnv } from "./env.mts";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({ uri: requireEnv("DATABASE_URL") });

try {
  await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
} finally {
  await connection.end();
}
