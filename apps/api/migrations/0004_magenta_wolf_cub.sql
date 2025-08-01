ALTER TABLE `classes` ADD `graduatedAt` text;--> statement-breakpoint
ALTER TABLE `classes` ADD `status` text DEFAULT 'ongoing';--> statement-breakpoint
ALTER TABLE `classes` ADD `unitId` integer DEFAULT 7 NOT NULL REFERENCES units(id);