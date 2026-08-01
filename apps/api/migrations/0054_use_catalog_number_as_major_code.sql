-- Dùng mã số chính thức (A/B + mã ngành) làm mã ngành duy nhất trong hệ thống.
-- Đổi tiền tố mã môn trước khi đổi mã ngành để còn đối chiếu được tiền tố cũ.
UPDATE `exam_subjects`
SET `code` = (
	SELECT `catalog_number` || substr(`exam_subjects`.`code`, length(`exam_majors`.`code`) + 1)
	FROM `exam_majors`
	WHERE `exam_majors`.`id` = `exam_subjects`.`major_id`
)
WHERE EXISTS (
	SELECT 1
	FROM `exam_majors`
	WHERE `exam_majors`.`id` = `exam_subjects`.`major_id`
		AND `exam_majors`.`catalog_number` IS NOT NULL
		AND `exam_majors`.`catalog_number` <> ''
);--> statement-breakpoint

UPDATE `exam_majors`
SET `code` = `catalog_number`
WHERE `catalog_number` IS NOT NULL
	AND `catalog_number` <> ''
	AND `code` <> `catalog_number`;
