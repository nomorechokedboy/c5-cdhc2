ALTER TABLE `students` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `students` ADD `siblings` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `students` ADD `contactPerson` text DEFAULT '{}';--> statement-breakpoint
ALTER TABLE `students` ADD `studentId` text;--> statement-breakpoint
ALTER TABLE `students` ADD `relatedDocumentations` text;--> statement-breakpoint
CREATE UNIQUE INDEX `students_studentId_unique` ON `students` (`studentId`);