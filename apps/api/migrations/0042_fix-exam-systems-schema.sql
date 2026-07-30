-- Đồng bộ exam_systems với schema runtime hiện tại.
-- Migration 0033 từng tạo training_type_id NOT NULL, nhưng mô hình hiện tại
-- chỉ còn Hệ QS/DS và API không còn gửi training_type_id.

CREATE TABLE `__new_exam_systems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`letter` text NOT NULL UNIQUE,
	`description` text
);--> statement-breakpoint

INSERT INTO `__new_exam_systems`
	(`id`, `createdAt`, `updatedAt`, `code`, `name`, `letter`, `description`)
SELECT
	`id`, `createdAt`, `updatedAt`, `code`, `name`, `letter`, `description`
FROM `exam_systems`;--> statement-breakpoint

DROP TABLE `exam_systems`;--> statement-breakpoint

ALTER TABLE `__new_exam_systems` RENAME TO `exam_systems`;
