CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`alias` text NOT NULL,
	`name` text NOT NULL,
	`level` text NOT NULL,
	`parentId` integer,
	FOREIGN KEY (`parentId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `units_alias_unique` ON `units` (`alias`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_name_unique` ON `units` (`name`);