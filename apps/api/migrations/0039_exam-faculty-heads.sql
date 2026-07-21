-- CNK theo khoa (K1…K8): 1 tài khoản dùng cho mọi ngành/môn thuộc khoa đó
CREATE TABLE IF NOT EXISTS `exam_faculty_heads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`faculty_code` text NOT NULL,
	`faculty_name` text,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `exam_faculty_heads_user_fac_uq`
	ON `exam_faculty_heads` (`user_id`, `faculty_code`);
