CREATE TABLE `app_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`schema_version` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
