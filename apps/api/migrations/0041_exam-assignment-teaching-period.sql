-- Thời gian giảng dạy trên phân công (GV – môn – lớp)
ALTER TABLE exam_teaching_assignments ADD COLUMN teaching_start text;--> statement-breakpoint
ALTER TABLE exam_teaching_assignments ADD COLUMN teaching_end text;
