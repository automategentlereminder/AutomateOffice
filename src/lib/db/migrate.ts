import path from "node:path";

import { migrate } from "drizzle-orm/libsql/migrator";

import { getDb } from "@/lib/db";

let migrationPromise: Promise<void> | undefined;

export function runMigrations() {
  if (!migrationPromise) {
    migrationPromise = migrate(getDb(), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
  }

  return migrationPromise;
}
