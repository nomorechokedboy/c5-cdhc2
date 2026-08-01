-- Phục hồi các bảng vận hành đề thi bị thiếu trên DB legacy.
CREATE TABLE IF NOT EXISTS `exam_teaching_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`subject_id` integer NOT NULL,
	`class_id` integer,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`note` text,
	`teaching_start` text,
	`teaching_end` text,
	`assigned_by_user_id` integer,
	`assigned_by_username` text,
	`assigned_by_display_name` text
);--> statement-breakpoint

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
	`class_id` integer,
	`class_code` text,
	`class_name` text,
	`teacher_user_id` integer,
	`teacher_username` text,
	`teacher_display_name` text,
	`note` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`summary` text NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `exam_major_heads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`major_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`note` text
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`subject_id` integer NOT NULL,
	`paper_number` integer,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_by_user_id` integer,
	`created_by_username` text,
	`created_by_display_name` text,
	`approved_by_user_id` integer,
	`approved_by_username` text,
	`approved_by_display_name` text,
	`approved_at` text,
	`approved_by_rank` text,
	`approved_by_position` text,
	`approved_by_signature_url` text,
	`approved_by_title` text,
	`dept_head_user_id` integer,
	`dept_head_username` text,
	`dept_head_display_name` text,
	`dept_head_rank` text,
	`dept_head_signature_url` text,
	`dept_head_approved_at` text,
	`qr_code` text,
	`locked` integer DEFAULT false NOT NULL,
	`class_id` integer,
	`class_name` text,
	`duration_minutes` integer DEFAULT 60,
	`question_file_url` text,
	`question_file_name` text,
	`answer_file_url` text,
	`answer_file_name` text,
	`note` text,
	`return_note` text
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `exams_code_unique` ON `exams` (`code`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `exam_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`exam_id` integer NOT NULL,
	`question_number` integer DEFAULT 1 NOT NULL,
	`content` text NOT NULL,
	`answer` text,
	`points` integer DEFAULT 1 NOT NULL
);--> statement-breakpoint

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
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `exam_draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`draw_code` text NOT NULL,
	`exam_id` integer NOT NULL,
	`exam_code` text,
	`paper_number` integer,
	`subject_id` integer,
	`major_id` integer,
	`draw_type` text NOT NULL,
	`class_id` integer,
	`class_name` text,
	`drawn_by_user_id` integer,
	`drawn_by_username` text,
	`drawn_by_display_name` text,
	`drawn_at` text NOT NULL,
	`printed_at` text,
	`printed_by_user_id` integer,
	`printed_by_username` text,
	`print_blocked` integer DEFAULT false NOT NULL,
	`print_blocked_at` text,
	`print_blocked_reason` text,
	`exam_date` text,
	`exam_time` text,
	`location` text,
	`note` text
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `exam_draws_draw_code_unique` ON `exam_draws` (`draw_code`);--> statement-breakpoint

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
