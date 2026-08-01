-- Phục hồi bảng danh mục lớp thi cho các DB cũ đã đánh dấu migration 0042
-- nhưng thực tế chưa tạo đủ bảng phân hệ đề thi.
CREATE TABLE IF NOT EXISTS `exam_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`major_id` integer,
	`faculty_id` integer,
	`cohort` text,
	`description` text
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `exam_classes_code_unique`
	ON `exam_classes` (`code`);
