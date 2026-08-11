-- Mã khoa được phép lặp giữa các ngành nhưng duy nhất trong từng ngành.
DROP INDEX IF EXISTS `exam_faculties_code_unique`;
DROP INDEX IF EXISTS `exam_faculties_code_idx`;
CREATE UNIQUE INDEX IF NOT EXISTS `exam_faculties_major_code_unique`
ON `exam_faculties` (`major_id`, `code`);
