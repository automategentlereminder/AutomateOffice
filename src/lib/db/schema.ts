import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const appMeta = sqliteTable("app_meta", {
  id: integer("id").primaryKey(),
  schemaVersion: integer("schema_version").notNull(),
  updatedAt: text("updated_at").notNull(),
});
