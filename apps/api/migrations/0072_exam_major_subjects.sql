-- Ngành học nhiều môn từ nhiều khoa; môn học dùng chung giữa các ngành.
CREATE TABLE IF NOT EXISTS `exam_major_subjects` (
	`major_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	CONSTRAINT `exam_major_subjects_unique` UNIQUE (`major_id`, `subject_id`)
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `exam_major_subjects_major_idx`
	ON `exam_major_subjects` (`major_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_major_subjects_subject_idx`
	ON `exam_major_subjects` (`subject_id`);--> statement-breakpoint

-- Khoa là danh mục dùng chung: gộp các bản ghi trùng mã từ dữ liệu cũ.
UPDATE `exam_subjects`
SET `faculty_id` = (
	SELECT MIN(f2.id)
	FROM `exam_faculties` f1
	JOIN `exam_faculties` f2 ON f2.code = f1.code
	WHERE f1.id = `exam_subjects`.`faculty_id`
);--> statement-breakpoint

DELETE FROM `exam_faculties`
WHERE `id` NOT IN (
	SELECT MIN(`id`) FROM `exam_faculties` GROUP BY `code`
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `exam_faculties_code_unique`
	ON `exam_faculties` (`code`);--> statement-breakpoint

-- Chuyển quan hệ một-ngành cũ sang quan hệ nhiều-nhiều.
INSERT OR IGNORE INTO `exam_major_subjects` (`major_id`, `subject_id`)
SELECT `major_id`, `id`
FROM `exam_subjects`
WHERE `major_id` IS NOT NULL;
