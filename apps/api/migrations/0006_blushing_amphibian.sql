PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`alias` text NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`parentId` integer,
	FOREIGN KEY (`parentId`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_units`("id", "createdAt", "updatedAt", "alias", "name", "level", "parentId") SELECT "id", "createdAt", "updatedAt", "alias", "name", "level", "parentId" FROM `units`;--> statement-breakpoint
DROP TABLE `units`;--> statement-breakpoint
ALTER TABLE `__new_units` RENAME TO `units`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `units_alias_unique` ON `units` (`alias`);--> statement-breakpoint
CREATE UNIQUE INDEX `units_name_unique` ON `units` (`name`);