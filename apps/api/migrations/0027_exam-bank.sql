-- Phân hệ Quản lý đề thi tự luận

CREATE TABLE IF NOT EXISTS `exam_majors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text
);

CREATE TABLE IF NOT EXISTS `exam_subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`credit_hours` integer DEFAULT 0,
	`lesson_hours` integer DEFAULT 0,
	`major_id` integer NOT NULL,
	`description` text
);

CREATE INDEX IF NOT EXISTS `exam_subjects_major_idx` ON `exam_subjects` (`major_id`);

CREATE TABLE IF NOT EXISTS `exam_teaching_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`subject_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`note` text
);

CREATE INDEX IF NOT EXISTS `exam_assign_subject_idx` ON `exam_teaching_assignments` (`subject_id`);
CREATE INDEX IF NOT EXISTS `exam_assign_user_idx` ON `exam_teaching_assignments` (`user_id`);

CREATE TABLE IF NOT EXISTS `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL UNIQUE,
	`title` text NOT NULL,
	`subject_id` integer NOT NULL,
	`status` text NOT NULL DEFAULT 'DRAFT',
	`created_by_user_id` integer,
	`created_by_username` text,
	`created_by_display_name` text,
	`approved_by_user_id` integer,
	`approved_by_username` text,
	`approved_by_display_name` text,
	`approved_at` text,
	`qr_code` text,
	`locked` integer NOT NULL DEFAULT 0,
	`question_file_url` text,
	`question_file_name` text,
	`answer_file_url` text,
	`answer_file_name` text,
	`note` text,
	`return_note` text
);

CREATE INDEX IF NOT EXISTS `exams_subject_idx` ON `exams` (`subject_id`);
CREATE INDEX IF NOT EXISTS `exams_status_idx` ON `exams` (`status`);
CREATE INDEX IF NOT EXISTS `exams_created_by_idx` ON `exams` (`created_by_user_id`);

CREATE TABLE IF NOT EXISTS `exam_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`exam_id` integer NOT NULL,
	`question_number` integer NOT NULL DEFAULT 1,
	`content` text NOT NULL,
	`answer` text,
	`points` integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS `exam_questions_exam_idx` ON `exam_questions` (`exam_id`);

CREATE TABLE IF NOT EXISTS `exam_workflow_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`exam_id` integer NOT NULL,
	`action` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`note` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text
);

CREATE INDEX IF NOT EXISTS `exam_workflow_exam_idx` ON `exam_workflow_logs` (`exam_id`);

CREATE TABLE IF NOT EXISTS `exam_draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`draw_code` text NOT NULL UNIQUE,
	`exam_id` integer NOT NULL,
	`exam_code` text,
	`subject_id` integer,
	`major_id` integer,
	`draw_type` text NOT NULL,
	`class_id` integer,
	`class_name` text,
	`drawn_by_user_id` integer,
	`drawn_by_username` text,
	`drawn_by_display_name` text,
	`drawn_at` text NOT NULL,
	`exam_date` text,
	`exam_time` text,
	`location` text,
	`note` text
);

CREATE INDEX IF NOT EXISTS `exam_draws_exam_idx` ON `exam_draws` (`exam_id`);
CREATE INDEX IF NOT EXISTS `exam_draws_subject_idx` ON `exam_draws` (`subject_id`);
CREATE INDEX IF NOT EXISTS `exam_draws_drawn_at_idx` ON `exam_draws` (`drawn_at`);

CREATE TABLE IF NOT EXISTS `exam_draw_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`draw_id` integer,
	`action` text NOT NULL,
	`summary` text NOT NULL,
	`details` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text
);

CREATE INDEX IF NOT EXISTS `exam_draw_logs_draw_idx` ON `exam_draw_logs` (`draw_id`);
