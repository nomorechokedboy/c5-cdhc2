CREATE TABLE `__new_exam_subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`credit_hours` integer DEFAULT 0,
	`lesson_hours` integer DEFAULT 0,
	`major_id` integer,
	`description` text,
	`faculty_id` integer,
	`base_code` text
);--> statement-breakpoint
INSERT INTO `__new_exam_subjects` (
	`id`,
	`createdAt`,
	`updatedAt`,
	`code`,
	`name`,
	`credit_hours`,
	`lesson_hours`,
	`major_id`,
	`description`,
	`faculty_id`,
	`base_code`
)
SELECT
	`id`,
	`createdAt`,
	`updatedAt`,
	`code`,
	`name`,
	`credit_hours`,
	`lesson_hours`,
	`major_id`,
	`description`,
	`faculty_id`,
	`base_code`
FROM `exam_subjects`;--> statement-breakpoint
DROP TABLE `exam_subjects`;--> statement-breakpoint
ALTER TABLE `__new_exam_subjects` RENAME TO `exam_subjects`;--> statement-breakpoint
CREATE INDEX `exam_subjects_major_idx` ON `exam_subjects` (`major_id`);--> statement-breakpoint
CREATE INDEX `exam_subjects_faculty_idx` ON `exam_subjects` (`faculty_id`);--> statement-breakpoint
CREATE INDEX `exam_subjects_base_code_idx` ON `exam_subjects` (`base_code`);
