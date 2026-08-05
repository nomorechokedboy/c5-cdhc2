ALTER TABLE `exam_majors` ADD COLUMN `catalog_number` text;--> statement-breakpoint
ALTER TABLE `exam_majors` ADD COLUMN `national_major_code` text;--> statement-breakpoint
ALTER TABLE `exam_majors` ADD COLUMN `qualification` text;--> statement-breakpoint
ALTER TABLE `exam_majors` ADD COLUMN `training_duration` text;--> statement-breakpoint
ALTER TABLE `exam_majors` ADD COLUMN `training_form` text;--> statement-breakpoint

UPDATE `exam_majors` SET `name`='Y sĩ đa khoa', `catalog_number`='B.6720101', `national_major_code`='6720101', `qualification`='Cao đẳng', `training_duration`='3 năm', `training_form`='Chính quy' WHERE `code`='B_CDYSDK';--> statement-breakpoint
UPDATE `exam_majors` SET `name`='Dược', `catalog_number`='B.6720201', `national_major_code`='6720201', `qualification`='Cao đẳng', `training_duration`='3 năm', `training_form`='Chính quy' WHERE `code`='B_CDDUOC';--> statement-breakpoint
UPDATE `exam_majors` SET `name`='Điều dưỡng', `catalog_number`='B.6720301', `national_major_code`='6720301', `qualification`='Cao đẳng', `training_duration`='3 năm', `training_form`='Chính quy' WHERE `code`='B_CDDD';--> statement-breakpoint
UPDATE `exam_majors` SET `name`='Y sĩ đa khoa', `catalog_number`='A.6720101', `national_major_code`='6720101', `qualification`='Cao đẳng', `training_duration`='3 năm', `training_form`='Chính quy' WHERE `code`='A_CDYSDK';--> statement-breakpoint
UPDATE `exam_majors` SET `name`='Điều dưỡng', `catalog_number`='A.6720301', `national_major_code`='6720301', `qualification`='Cao đẳng', `training_duration`='3 năm', `training_form`='Chính quy' WHERE `code`='A_CDDD';--> statement-breakpoint
UPDATE `exam_majors` SET `name`='Điều dưỡng', `catalog_number`='A.6720302', `national_major_code`='6720301', `qualification`='Cao đẳng', `training_duration`='3 năm', `training_form`='Liên thông' WHERE `code`='A_LTDD';--> statement-breakpoint
UPDATE `exam_majors` SET `name`='Y sĩ đa khoa', `catalog_number`='A.5720101', `national_major_code`='5720101', `qualification`='Trung cấp', `training_duration`='2,5 năm', `training_form`='Chính quy' WHERE `code`='A_TCYSDK';--> statement-breakpoint

INSERT OR IGNORE INTO `exam_majors` (`code`,`name`,`system_id`,`level_code`,`short_code`,`catalog_number`,`national_major_code`,`qualification`,`training_duration`,`training_form`,`description`)
SELECT 'A_TCKTCBMA','Kỹ thuật chế biến món ăn',`id`,'TC','KTCBMA','A.5810207','5810207','Trung cấp','2 năm','Chính quy','Danh mục ngành đào tạo chính thức' FROM `exam_systems` WHERE `letter`='A';--> statement-breakpoint
INSERT OR IGNORE INTO `exam_majors` (`code`,`name`,`system_id`,`level_code`,`short_code`,`catalog_number`,`national_major_code`,`qualification`,`training_duration`,`training_form`,`description`)
SELECT 'A_CLKTCBMA','Kỹ thuật chế biến món ăn',`id`,'TC','KTCBMA','A.5810208','5810207','Trung cấp','1 năm','Chuyển loại','Danh mục ngành đào tạo chính thức' FROM `exam_systems` WHERE `letter`='A';--> statement-breakpoint
INSERT OR IGNORE INTO `exam_majors` (`code`,`name`,`system_id`,`level_code`,`short_code`,`catalog_number`,`national_major_code`,`qualification`,`training_duration`,`training_form`,`description`)
SELECT 'A_TCTCNH','Tài chính – Ngân hàng',`id`,'TC','TCNH','A.5340202','5340202','Trung cấp','2 năm','Chính quy','Danh mục ngành đào tạo chính thức' FROM `exam_systems` WHERE `letter`='A';--> statement-breakpoint
INSERT OR IGNORE INTO `exam_majors` (`code`,`name`,`system_id`,`level_code`,`short_code`,`catalog_number`,`national_major_code`,`qualification`,`training_duration`,`training_form`,`description`)
SELECT 'A_SCNYDD','Nhân viên quân y đại đội',`id`,'SC','NYDD','A.6720100','6720100','Sơ cấp','6 tháng','Chính quy','Danh mục ngành đào tạo chính thức' FROM `exam_systems` WHERE `letter`='A';
