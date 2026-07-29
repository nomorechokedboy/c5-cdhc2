-- Hierarchy danh mục đào tạo:
--   Loại đào tạo → Hệ → Ngành → Khoa → Môn
-- Mã ngành: A/B + _ + TC|CD|LT + viết tắt ngành (vd B_CDDD)
-- Mã môn: {mã_ngành}_{mã_gốc} (vd B_CDDD_M009K2)

CREATE TABLE IF NOT EXISTS `exam_training_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `exam_systems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`letter` text NOT NULL,
	`training_type_id` integer NOT NULL,
	`description` text
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `exam_systems_type_code_uq`
	ON `exam_systems` (`training_type_id`, `code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_systems_type_idx`
	ON `exam_systems` (`training_type_id`);--> statement-breakpoint

-- Ngành: thêm system_id, short_code (giữ faculty_id cũ tạm — bỏ dùng)
-- SQLite: thêm cột nếu chưa có
-- Lưu ý: rebuild catalog khi import (script seed sẽ xóa/tạo lại danh mục)

-- subjects: faculty_id + base_code
-- faculties: major_id (thay vì unique code toàn cục)

-- Tạo bảng faculty mới nếu cần migrate nặng — script import sẽ TRUNCATE và seed lại.
-- Đảm bảo cột tồn tại cho runtime:

-- exam_majors
-- ALTER không idempotent trên sqlite qua drizzle push; script import dùng raw SQL.

ALTER TABLE `exam_majors` ADD COLUMN `system_id` integer;--> statement-breakpoint
ALTER TABLE `exam_majors` ADD COLUMN `level_code` text;--> statement-breakpoint
ALTER TABLE `exam_majors` ADD COLUMN `short_code` text;--> statement-breakpoint
ALTER TABLE `exam_faculties` ADD COLUMN `major_id` integer;--> statement-breakpoint
ALTER TABLE `exam_subjects` ADD COLUMN `faculty_id` integer;--> statement-breakpoint
ALTER TABLE `exam_subjects` ADD COLUMN `base_code` text;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `exam_majors_system_idx` ON `exam_majors` (`system_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_faculties_major_idx` ON `exam_faculties` (`major_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_subjects_faculty_idx` ON `exam_subjects` (`faculty_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_subjects_base_code_idx` ON `exam_subjects` (`base_code`);
