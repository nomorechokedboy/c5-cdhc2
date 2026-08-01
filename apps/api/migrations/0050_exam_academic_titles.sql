CREATE TABLE IF NOT EXISTS `exam_academic_titles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`name` text NOT NULL,
	`percentage` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `exam_academic_titles_name_uq`
	ON `exam_academic_titles` (`name`);--> statement-breakpoint

ALTER TABLE `exam_teachers` ADD COLUMN `academic_title_id` integer;--> statement-breakpoint

INSERT OR IGNORE INTO `exam_academic_titles` (`name`, `percentage`, `sort_order`) VALUES
('Giảng viên kiêm nhiệm khác', 0, 10),
('Giám đốc, Hiệu trưởng, Chính ủy', 10, 20),
('Phó Giám đốc, Phó Hiệu trưởng, Phó Chính ủy', 15, 30),
('Trưởng phòng và tương đương', 20, 40),
('Phó Trưởng phòng, Trưởng ban trực thuộc nhà trường và tương đương', 25, 50),
('Chủ nhiệm khoa, Trưởng khoa', 45, 60),
('Chủ nhiệm khoa, Trưởng khoa kiêm Bí thư đảng ủy, Bí thư chi bộ', 50, 70),
('Phó Chủ nhiệm khoa, Phó Trưởng khoa kiêm Bí thư đảng ủy, Bí thư chi bộ', 55, 80),
('Trưởng bộ môn kiêm Bí thư chi bộ', 65, 90),
('Phó Chủ nhiệm khoa, Phó Trưởng khoa', 70, 100),
('Phó Trưởng bộ môn kiêm Bí thư chi bộ', 70, 110),
('Phó Trưởng bộ môn kiêm Phó Bí thư chi bộ', 75, 120),
('Trưởng bộ môn', 80, 130),
('Phó Trưởng bộ môn', 85, 140),
('Giảng viên', 100, 150);--> statement-breakpoint

UPDATE `exam_teachers`
SET `academic_title_id` = (SELECT `id` FROM `exam_academic_titles` WHERE `name` = 'Giảng viên')
WHERE `academic_title_id` IS NULL;
