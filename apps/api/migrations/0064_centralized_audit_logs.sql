CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`module` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer,
	`action` text NOT NULL,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`actor_is_admin` integer DEFAULT 0 NOT NULL,
	`entity_code` text,
	`entity_name` text,
	`parent_code` text,
	`parent_name` text,
	`summary` text NOT NULL,
	`details` text,
	`metadata` text,
	`legacy_source` text,
	`legacy_id` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_logs_module_idx` ON `audit_logs` (`module`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_logs_resource_idx` ON `audit_logs` (`resource_type`,`resource_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_logs_actor_idx` ON `audit_logs` (`actor_user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_logs_created_at_idx` ON `audit_logs` (`createdAt`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `audit_logs_legacy_uq` ON `audit_logs` (`legacy_source`,`legacy_id`);
