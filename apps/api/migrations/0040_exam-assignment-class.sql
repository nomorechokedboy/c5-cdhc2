-- Phân công giảng dạy: gắn lớp thi (exam_classes)
ALTER TABLE exam_teaching_assignments ADD COLUMN class_id integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS exam_assign_class_idx
	ON exam_teaching_assignments (class_id);--> statement-breakpoint

-- Log: ghi lớp khi phân công / gỡ / sửa
ALTER TABLE exam_teaching_assignment_logs ADD COLUMN class_id integer;--> statement-breakpoint
ALTER TABLE exam_teaching_assignment_logs ADD COLUMN class_code text;--> statement-breakpoint
ALTER TABLE exam_teaching_assignment_logs ADD COLUMN class_name text;
