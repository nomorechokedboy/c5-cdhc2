-- Danh mục đào tạo: Khoa + Lớp (tách biệt ngành vật tư / lớp học viên)
-- Ngành đào tạo (exam_majors) thêm faculty_id

CREATE TABLE IF NOT EXISTS `exam_faculties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `exam_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`major_id` integer,
	`faculty_id` integer,
	`cohort` text,
	`description` text
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `exam_classes_major_idx` ON `exam_classes` (`major_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_classes_faculty_idx` ON `exam_classes` (`faculty_id`);--> statement-breakpoint

-- faculty_id trên ngành đào tạo (chạy tay nếu cột chưa có):
ALTER TABLE exam_majors ADD COLUMN faculty_id integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_majors_faculty_idx` ON `exam_majors` (`faculty_id`);
