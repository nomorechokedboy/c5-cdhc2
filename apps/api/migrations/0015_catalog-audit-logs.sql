CREATE TABLE `catalog_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`actor_is_admin` integer DEFAULT 0 NOT NULL,
	`entity_id` integer,
	`entity_code` text,
	`entity_name` text,
	`parent_code` text,
	`parent_name` text,
	`summary` text NOT NULL,
	`details` text
);
