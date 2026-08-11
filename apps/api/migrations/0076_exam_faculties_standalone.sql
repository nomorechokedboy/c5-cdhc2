-- Khoa là danh mục độc lập, không phụ thuộc ngành đào tạo.
-- Gộp các bản ghi khoa trùng mã về bản ghi có id nhỏ nhất trước khi
-- chuyển sang ràng buộc mã khoa duy nhất toàn hệ thống.
UPDATE `exam_faculties` SET `major_id` = NULL;

CREATE TEMP TABLE `exam_faculty_merge` AS
SELECT duplicate.`id` AS `old_id`, MIN(canonical.`id`) AS `canonical_id`
FROM `exam_faculties` AS duplicate
INNER JOIN `exam_faculties` AS canonical
  ON canonical.`code` = duplicate.`code`
 AND canonical.`id` < duplicate.`id`
GROUP BY duplicate.`id`;

UPDATE `exam_subjects`
SET `faculty_id` = (
  SELECT `canonical_id`
  FROM `exam_faculty_merge`
  WHERE `old_id` = `exam_subjects`.`faculty_id`
)
WHERE `faculty_id` IN (SELECT `old_id` FROM `exam_faculty_merge`);

DELETE FROM `exam_faculties`
WHERE `id` IN (SELECT `old_id` FROM `exam_faculty_merge`);

DROP INDEX IF EXISTS `exam_faculties_major_code_unique`;
DROP INDEX IF EXISTS `exam_faculties_code_unique`;
CREATE UNIQUE INDEX `exam_faculties_code_unique`
ON `exam_faculties` (`code`);

DROP TABLE `exam_faculty_merge`;
