ALTER TABLE `leave_units` ADD `level` text;
--> statement-breakpoint
ALTER TABLE `leave_units` ADD `commander_user_id` integer;
--> statement-breakpoint
ALTER TABLE `leave_units` ADD `commander_name` text;
--> statement-breakpoint
ALTER TABLE `leave_units` ADD `management_area` text DEFAULT 'cán_bộ' NOT NULL;
--> statement-breakpoint
ALTER TABLE `leave_personnel` ADD `class_name` text;
--> statement-breakpoint
ALTER TABLE `leave_personnel` ADD `management_area` text DEFAULT 'cán_bộ' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`unit_id` integer NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `leave_classes_unit_name_unique` ON `leave_classes` (`unit_id`, `name`);
--> statement-breakpoint
ALTER TABLE `leave_personnel` ADD `class_id` integer;
--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `request_scope` text DEFAULT 'OTHER' NOT NULL;
--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `class_id` integer;
--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `class_name` text;
