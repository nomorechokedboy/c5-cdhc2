-- Đề thi: gắn lớp khi import + thời gian thi + chữ ký BGH phê duyệt
ALTER TABLE exams ADD COLUMN class_id integer;
ALTER TABLE exams ADD COLUMN class_name text;
ALTER TABLE exams ADD COLUMN duration_minutes integer DEFAULT 60;
ALTER TABLE exams ADD COLUMN approved_by_rank text;
ALTER TABLE exams ADD COLUMN approved_by_position text;
ALTER TABLE exams ADD COLUMN approved_by_signature_url text;
ALTER TABLE exams ADD COLUMN approved_by_title text;

-- User: chữ ký số (ảnh) dùng khi BGH phê duyệt
ALTER TABLE users ADD COLUMN signature_url text;

-- Phiếu bốc: chặn in khi quá 3 ngày từ ngày rút
ALTER TABLE exam_draws ADD COLUMN print_blocked integer NOT NULL DEFAULT 0;
ALTER TABLE exam_draws ADD COLUMN print_blocked_at text;
ALTER TABLE exam_draws ADD COLUMN print_blocked_reason text;

CREATE INDEX IF NOT EXISTS exams_class_idx ON exams (class_id);
CREATE INDEX IF NOT EXISTS exam_draws_print_blocked_idx ON exam_draws (print_blocked);
