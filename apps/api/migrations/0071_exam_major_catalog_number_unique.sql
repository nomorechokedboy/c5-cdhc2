-- A catalog number identifies one training programme and must not repeat.
-- NULL values remain allowed for legacy rows that are being repaired.
CREATE UNIQUE INDEX IF NOT EXISTS `exam_majors_catalog_number_unique`
ON `exam_majors` (`catalog_number`);
