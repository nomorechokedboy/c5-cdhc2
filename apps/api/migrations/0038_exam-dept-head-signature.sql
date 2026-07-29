-- Chữ ký Chủ nhiệm khoa khi duyệt bước 1 (chèn vào footer bộ đề)
ALTER TABLE exams ADD COLUMN dept_head_user_id integer;--> statement-breakpoint
ALTER TABLE exams ADD COLUMN dept_head_username text;--> statement-breakpoint
ALTER TABLE exams ADD COLUMN dept_head_display_name text;--> statement-breakpoint
ALTER TABLE exams ADD COLUMN dept_head_rank text;--> statement-breakpoint
ALTER TABLE exams ADD COLUMN dept_head_signature_url text;--> statement-breakpoint
ALTER TABLE exams ADD COLUMN dept_head_approved_at text;
