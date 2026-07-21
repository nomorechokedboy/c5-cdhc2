-- Số đề từ import + kho đề đã in (printed)

-- exams.paper_number (chạy tay nếu chưa có):
-- ALTER TABLE exams ADD COLUMN paper_number integer;
CREATE INDEX IF NOT EXISTS `exams_paper_number_idx` ON `exams` (`paper_number`);
CREATE INDEX IF NOT EXISTS `exams_subject_paper_idx` ON `exams` (`subject_id`, `paper_number`);

-- exam_draws: paper_number + printed*
-- ALTER TABLE exam_draws ADD COLUMN paper_number integer;
-- ALTER TABLE exam_draws ADD COLUMN printed_at text;
-- ALTER TABLE exam_draws ADD COLUMN printed_by_user_id integer;
-- ALTER TABLE exam_draws ADD COLUMN printed_by_username text;
CREATE INDEX IF NOT EXISTS `exam_draws_paper_idx` ON `exam_draws` (`paper_number`);
CREATE INDEX IF NOT EXISTS `exam_draws_printed_idx` ON `exam_draws` (`printed_at`);
