-- Thời gian giảng dạy trên phân công (GV – môn – lớp)
ALTER TABLE exam_teaching_assignments ADD COLUMN teaching_start text;
ALTER TABLE exam_teaching_assignments ADD COLUMN teaching_end text;
