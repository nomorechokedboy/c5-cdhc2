-- Danh mục giáo viên theo khoa (unique user_id — không trùng)
CREATE TABLE IF NOT EXISTS `exam_teachers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`faculty_code` text NOT NULL,
	`faculty_name` text,
	`note` text,
	`created_by_user_id` integer,
	`created_by_username` text,
	`created_by_display_name` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `exam_teachers_user_uq` ON `exam_teachers` (`user_id`);
CREATE INDEX IF NOT EXISTS `exam_teachers_faculty_idx` ON `exam_teachers` (`faculty_code`);
