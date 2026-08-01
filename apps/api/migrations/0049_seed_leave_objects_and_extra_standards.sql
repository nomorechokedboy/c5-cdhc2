INSERT INTO `leave_object_types` (`code`,`name`,`sort_order`,`is_active`)
SELECT v.code, v.name, v.sort_order, 1 FROM (
	SELECT 'SQ' code, 'Sĩ quan' name, 1 sort_order UNION ALL
	SELECT 'QNCN', 'Quân nhân chuyên nghiệp', 2 UNION ALL
	SELECT 'CNQP', 'Công nhân quốc phòng', 3 UNION ALL
	SELECT 'VCQP', 'Viên chức quốc phòng', 4 UNION ALL
	SELECT 'HSQBS', 'Hạ sĩ quan, binh sĩ', 5 UNION ALL
	SELECT 'HV', 'Học viên', 6 UNION ALL
	SELECT 'KHAC', 'Đối tượng khác', 7
) v
WHERE NOT EXISTS (SELECT 1 FROM `leave_object_types` o WHERE o.`code` = v.code);
--> statement-breakpoint
INSERT INTO `leave_extra_standards` (`code`,`label`,`days`,`sort_order`,`is_active`)
SELECT v.code, v.label, v.days, v.sort_order, 1 FROM (
	SELECT '01' code, 'Đóng quân ở đơn vị xa nơi đăng ký nghỉ phép từ 500 km trở lên' label, 10 days, 1 sort_order UNION ALL
	SELECT '02', 'Đóng quân ở địa bàn đặc biệt khó khăn, vùng sâu, vùng xa, biên giới cách nơi đăng ký nghỉ phép từ 300 km trở lên', 10, 2 UNION ALL
	SELECT '03', 'Đóng quân tại các đảo thuộc quần đảo Trường Sa và Nhà giàn DK', 10, 3 UNION ALL
	SELECT '04', 'Đơn vị đóng quân cách nơi đăng ký nghỉ phép từ 300 km đến dưới 500 km', 5, 4 UNION ALL
	SELECT '05', 'Đóng quân ở vùng sâu, vùng xa, biên giới cách nơi đăng ký nghỉ phép từ 200 km đến dưới 300 km', 5, 5 UNION ALL
	SELECT '06', 'Đóng quân tại các đảo được hưởng phụ cấp khu vực', 5, 6
) v
WHERE NOT EXISTS (SELECT 1 FROM `leave_extra_standards` e WHERE e.`code` = v.code);
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label` = 'Đóng quân ở đơn vị xa nơi đăng ký nghỉ phép từ 500 km trở lên', `days` = 10, `sort_order` = 1, `is_active` = 1 WHERE `code` = '01';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label` = 'Đóng quân ở địa bàn đặc biệt khó khăn, vùng sâu, vùng xa, biên giới cách nơi đăng ký nghỉ phép từ 300 km trở lên', `days` = 10, `sort_order` = 2, `is_active` = 1 WHERE `code` = '02';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label` = 'Đóng quân tại các đảo thuộc quần đảo Trường Sa và Nhà giàn DK', `days` = 10, `sort_order` = 3, `is_active` = 1 WHERE `code` = '03';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label` = 'Đơn vị đóng quân cách nơi đăng ký nghỉ phép từ 300 km đến dưới 500 km', `days` = 5, `sort_order` = 4, `is_active` = 1 WHERE `code` = '04';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label` = 'Đóng quân ở vùng sâu, vùng xa, biên giới cách nơi đăng ký nghỉ phép từ 200 km đến dưới 300 km', `days` = 5, `sort_order` = 5, `is_active` = 1 WHERE `code` = '05';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label` = 'Đóng quân tại các đảo được hưởng phụ cấp khu vực', `days` = 5, `sort_order` = 6, `is_active` = 1 WHERE `code` = '06';
