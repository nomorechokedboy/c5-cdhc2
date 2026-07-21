-- Phân công giảng dạy: gắn lớp thi (exam_classes)
ALTER TABLE exam_teaching_assignments ADD COLUMN class_id integer;
CREATE INDEX IF NOT EXISTS exam_assign_class_idx
	ON exam_teaching_assignments (class_id);

-- Log: ghi lớp khi phân công / gỡ / sửa
ALTER TABLE exam_teaching_assignment_logs ADD COLUMN class_id integer;
ALTER TABLE exam_teaching_assignment_logs ADD COLUMN class_code text;
ALTER TABLE exam_teaching_assignment_logs ADD COLUMN class_name text;
