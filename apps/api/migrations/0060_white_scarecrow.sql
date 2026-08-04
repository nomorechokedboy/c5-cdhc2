-- Đồng bộ cả database cũ lẫn database đã cài từ chuỗi migration trước đây:
-- UNIQUE inline của SQLite tạo auto-index và không thể DROP INDEX trực tiếp.
DROP TABLE IF EXISTS `exam_faculties_code_sync`;--> statement-breakpoint
CREATE TABLE `exam_faculties_code_sync` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`major_id` integer,
	`description` text
);--> statement-breakpoint
INSERT INTO `exam_faculties_code_sync` (`id`, `createdAt`, `updatedAt`, `code`, `name`, `major_id`, `description`)
SELECT `id`, `createdAt`, `updatedAt`, `code`, `name`, `major_id`, `description` FROM `exam_faculties`;--> statement-breakpoint
DROP TABLE `exam_faculties`;--> statement-breakpoint
ALTER TABLE `exam_faculties_code_sync` RENAME TO `exam_faculties`;--> statement-breakpoint
CREATE INDEX `exam_faculties_code_idx` ON `exam_faculties` (`code`);
