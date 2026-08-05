-- Xóa các ngành đào tạo cũ từng bị ẩn vì chưa có mã số.
-- Giữ lại lớp, môn, khoa và lịch sử; chỉ gỡ liên kết tới ngành bị xóa.

DELETE FROM `exam_major_heads`
WHERE `major_id` IN (
	SELECT `id` FROM `exam_majors`
	WHERE `catalog_number` IS NULL OR trim(`catalog_number`) = ''
);--> statement-breakpoint

UPDATE `exam_classes`
SET `major_id` = NULL
WHERE `major_id` IN (
	SELECT `id` FROM `exam_majors`
	WHERE `catalog_number` IS NULL OR trim(`catalog_number`) = ''
);--> statement-breakpoint

UPDATE `exam_draws`
SET `major_id` = NULL
WHERE `major_id` IN (
	SELECT `id` FROM `exam_majors`
	WHERE `catalog_number` IS NULL OR trim(`catalog_number`) = ''
);--> statement-breakpoint

UPDATE `exam_faculties`
SET `major_id` = NULL
WHERE `major_id` IN (
	SELECT `id` FROM `exam_majors`
	WHERE `catalog_number` IS NULL OR trim(`catalog_number`) = ''
);--> statement-breakpoint

UPDATE `exam_subjects`
SET `major_id` = NULL
WHERE `major_id` IN (
	SELECT `id` FROM `exam_majors`
	WHERE `catalog_number` IS NULL OR trim(`catalog_number`) = ''
);--> statement-breakpoint

UPDATE `exam_teaching_assignment_logs`
SET `major_id` = NULL
WHERE `major_id` IN (
	SELECT `id` FROM `exam_majors`
	WHERE `catalog_number` IS NULL OR trim(`catalog_number`) = ''
);--> statement-breakpoint

DELETE FROM `exam_majors`
WHERE `catalog_number` IS NULL OR trim(`catalog_number`) = '';
