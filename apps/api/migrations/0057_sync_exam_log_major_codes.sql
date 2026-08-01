-- Đồng bộ các bản ghi lịch sử phân công với mã số ngành/môn hiện hành.
UPDATE `exam_teaching_assignment_logs`
SET
	`summary` = replace(
		replace(
			`summary`,
			coalesce(`subject_code`, ''),
			coalesce((SELECT `code` FROM `exam_subjects` WHERE `id` = `subject_id`), `subject_code`, '')
		),
		coalesce(`major_code`, ''),
		coalesce((SELECT `code` FROM `exam_majors` WHERE `id` = `major_id`), `major_code`, '')
	),
	`subject_code` = coalesce(
		(SELECT `code` FROM `exam_subjects` WHERE `id` = `subject_id`),
		`subject_code`
	),
	`major_code` = coalesce(
		(SELECT `code` FROM `exam_majors` WHERE `id` = `major_id`),
		`major_code`
	)
WHERE `major_id` IS NOT NULL OR `subject_id` IS NOT NULL;
