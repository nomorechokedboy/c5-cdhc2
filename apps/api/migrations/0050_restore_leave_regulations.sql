-- Tiêu chuẩn phép hằng năm mặc định.
-- SQ/QNCN/CNQP/VCQP: dưới 15 năm = 20 ngày; 15-<25 = 25; từ 25 = 30.
INSERT INTO `leave_regulations` (`leave_type`,`object_type`,`min_years`,`max_years`,`base_days`,`label`,`description`,`is_active`)
SELECT 'ANNUAL', v.object_type, v.min_years, v.max_years, v.base_days, v.label, v.description, 1
FROM (
	SELECT 'SQ' object_type, 0 min_years, 15 max_years, 20 base_days, 'Sỹ quan dưới 15 năm công tác' label, 'Tiêu chuẩn phép hằng năm' description UNION ALL
	SELECT 'SQ', 15, 25, 25, 'Sỹ quan từ 15 đến dưới 25 năm', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'SQ', 25, NULL, 30, 'Sỹ quan từ 25 năm trở lên', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'QNCN', 0, 15, 20, 'QNCN dưới 15 năm công tác', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'QNCN', 15, 25, 25, 'QNCN từ 15 đến dưới 25 năm', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'QNCN', 25, NULL, 30, 'QNCN từ 25 năm trở lên', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'CNQP', 0, 15, 20, 'Công nhân QP dưới 15 năm công tác', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'CNQP', 15, 25, 25, 'Công nhân QP từ 15 đến dưới 25 năm', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'CNQP', 25, NULL, 30, 'Công nhân QP từ 25 năm trở lên', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'VCQP', 0, 15, 20, 'Viên chức QP dưới 15 năm công tác', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'VCQP', 15, 25, 25, 'Viên chức QP từ 15 đến dưới 25 năm', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'VCQP', 25, NULL, 30, 'Viên chức QP từ 25 năm trở lên', 'Tiêu chuẩn phép hằng năm' UNION ALL
	SELECT 'HSQBS', 0, NULL, 10, 'Hạ sỹ quan, binh sỹ', 'Tiêu chuẩn 10 ngày phép hằng năm'
) v
WHERE NOT EXISTS (
	SELECT 1 FROM `leave_regulations` r
	WHERE r.`leave_type` = 'ANNUAL' AND r.`object_type` = v.object_type
	  AND COALESCE(r.`min_years`, -1) = COALESCE(v.min_years, -1)
	  AND COALESCE(r.`max_years`, -1) = COALESCE(v.max_years, -1)
);
--> statement-breakpoint
-- MS 01–03 thuộc nhóm nghỉ thêm 10 ngày; MS 04–06 thuộc nhóm 5 ngày.
UPDATE `leave_extra_standards` SET `days` = 10 WHERE `code` IN ('01','02','03');
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `days` = 5 WHERE `code` IN ('04','05','06');
