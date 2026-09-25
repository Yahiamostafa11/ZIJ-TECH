import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: ["./lib/db/schema.ts", "./lib/db/academy.ts"],
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
