-- CNK chỉ duyệt đề thuộc ngành được gán
CREATE TABLE IF NOT EXISTS `exam_major_heads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`major_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`username` text,
	`display_name` text,
	`note` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `exam_major_heads_user_major_uq`
	ON `exam_major_heads` (`user_id`, `major_id`);
CREATE INDEX IF NOT EXISTS `exam_major_heads_user_idx`
	ON `exam_major_heads` (`user_id`);
CREATE INDEX IF NOT EXISTS `exam_major_heads_major_idx`
	ON `exam_major_heads` (`major_id`);
