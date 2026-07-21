-- Log phân công môn học + người phân công trên assignment

ALTER TABLE exam_teaching_assignments ADD COLUMN assigned_by_user_id integer;
ALTER TABLE exam_teaching_assignments ADD COLUMN assigned_by_username text;
ALTER TABLE exam_teaching_assignments ADD COLUMN assigned_by_display_name text;

CREATE TABLE IF NOT EXISTS `exam_teaching_assignment_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`action` text NOT NULL,
	`subject_id` integer,
	`subject_code` text,
	`subject_name` text,
	`major_id` integer,
	`major_code` text,
	`faculty_id` integer,
	`faculty_code` text,
	`teacher_user_id` integer,
	`teacher_username` text,
	`teacher_display_name` text,
	`note` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`summary` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `exam_assign_log_subject_idx`
	ON `exam_teaching_assignment_logs` (`subject_id`);
CREATE INDEX IF NOT EXISTS `exam_assign_log_teacher_idx`
	ON `exam_teaching_assignment_logs` (`teacher_user_id`);
