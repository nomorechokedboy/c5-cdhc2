DROP INDEX `classes_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `class_unit_unique_constraint` ON `classes` (`name`,`unitId`);