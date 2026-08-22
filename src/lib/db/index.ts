import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { getDatabasePath } from "@/lib/db/paths";
import * as schema from "@/lib/db/schema";

let client: Client | undefined;
let database: LibSQLDatabase<typeof schema> | undefined;

export function getDb() {
  if (!database) {
    const dbPath = getDatabasePath();
    client = createClient({ url: `file:${dbPath}` });
    database = drizzle(client, { schema });
  }

  return database;
}

export type Database = ReturnType<typeof getDb>;
