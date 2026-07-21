-- Chữ ký Chủ nhiệm khoa khi duyệt bước 1 (chèn vào footer bộ đề)
ALTER TABLE exams ADD COLUMN dept_head_user_id integer;
ALTER TABLE exams ADD COLUMN dept_head_username text;
ALTER TABLE exams ADD COLUMN dept_head_display_name text;
ALTER TABLE exams ADD COLUMN dept_head_rank text;
ALTER TABLE exams ADD COLUMN dept_head_signature_url text;
ALTER TABLE exams ADD COLUMN dept_head_approved_at text;
