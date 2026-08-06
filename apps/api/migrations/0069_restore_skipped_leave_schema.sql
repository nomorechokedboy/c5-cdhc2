-- Restore leave migrations that were skipped when the old exam migrations
-- were renumbered from 0042..0047 to 0050..0055 without changing timestamps.
-- This is intentionally a normal forward migration: no startup DDL or
-- migration-table manipulation is required. Every statement is idempotent.

CREATE TABLE IF NOT EXISTS `leave_object_types` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `code` text NOT NULL UNIQUE, `name` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL, `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_units` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `code` text, `name` text NOT NULL, `level` text, `parent_id` integer,
  `is_active` integer DEFAULT 1 NOT NULL, `commander_user_id` integer,
  `commander_name` text, `management_area` text DEFAULT 'cán_bộ' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_extra_standards` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `code` text NOT NULL UNIQUE, `label` text NOT NULL, `days` integer NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL, `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_classes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `unit_id` integer NOT NULL, `name` text NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `leave_classes_unit_name_unique`
  ON `leave_classes` (`unit_id`,`name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_personnel` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `code` text NOT NULL UNIQUE, `full_name` text NOT NULL,
  `enlistment_date` text, `recruitment` text, `object_type` text NOT NULL,
  `rank` text, `position` text, `class_id` integer, `unit_id` integer,
  `unit_name` text, `hometown` text, `permanent_residence` text,
  `user_id` integer, `email` text, `commander_user_id` integer,
  `commander_name` text, `class_name` text,
  `management_area` text DEFAULT 'cán_bộ' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_localities` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `name` text NOT NULL, `level` text NOT NULL, `parent_id` integer, `code` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_regulations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `leave_type` text NOT NULL, `object_type` text, `min_years` integer,
  `max_years` integer, `base_days` integer NOT NULL, `label` text,
  `description` text, `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `leave_type` text NOT NULL, `request_scope` text DEFAULT 'OTHER' NOT NULL,
  `class_id` integer, `class_name` text, `status` text DEFAULT 'PENDING' NOT NULL,
  `personnel_id` integer, `personnel_code` text, `personnel_name` text,
  `object_type` text NOT NULL, `rank` text, `position` text,
  `enlistment_date` text, `unit_id` integer, `unit_name` text,
  `service_years` integer DEFAULT 0 NOT NULL, `base_days` integer DEFAULT 0 NOT NULL,
  `travel_days` integer DEFAULT 0 NOT NULL, `extra_days` integer DEFAULT 0 NOT NULL,
  `extra_reasons` text DEFAULT '[]', `total_days` integer DEFAULT 0 NOT NULL,
  `start_date` text, `end_date` text, `leave_year` text, `locality_id` integer,
  `locality_path` text, `note` text, `proposed_by_user_id` integer,
  `proposed_by_username` text, `proposed_by_display_name` text,
  `proposer_email` text, `commander_user_id` integer, `commander_name` text,
  `admin_note` text, `decided_by_user_id` integer,
  `decided_by_username` text, `decided_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_mail_log` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `request_id` integer, `to_email` text NOT NULL, `subject` text NOT NULL,
  `body` text, `mode` text, `ok` integer DEFAULT 0 NOT NULL, `error` text,
  `preview_url` text, `kind` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_alerts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `user_id` integer NOT NULL, `request_id` integer NOT NULL,
  `kind` text NOT NULL, `title` text NOT NULL, `message` text NOT NULL, `read_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_records` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `request_id` integer NOT NULL, `status` text DEFAULT 'PENDING' NOT NULL,
  `leave_type` text NOT NULL, `personnel_id` integer, `personnel_code` text,
  `personnel_name` text, `object_type` text NOT NULL, `rank` text,
  `position` text, `enlistment_date` text, `unit_id` integer, `unit_name` text,
  `service_years` integer DEFAULT 0 NOT NULL, `base_days` integer DEFAULT 0 NOT NULL,
  `travel_days` integer DEFAULT 0 NOT NULL, `extra_days` integer DEFAULT 0 NOT NULL,
  `extra_reasons` text DEFAULT '[]', `total_days` integer DEFAULT 0 NOT NULL,
  `start_date` text, `end_date` text, `leave_year` text, `locality_id` integer,
  `locality_path` text, `note` text, `admin_note` text,
  `proposed_by_user_id` integer, `proposed_by_username` text,
  `proposed_by_display_name` text, `decided_by_user_id` integer,
  `decided_by_username` text, `decided_at` text, `archived_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `leave_records_request_id_unique`
  ON `leave_records` (`request_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_batches` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `request_id` integer NOT NULL, `personnel_id` integer, `personnel_code` text,
  `personnel_name` text, `object_type` text NOT NULL, `leave_type` text NOT NULL,
  `batch_index` integer DEFAULT 1 NOT NULL, `batch_label` text DEFAULT '' NOT NULL,
  `start_date` text, `end_date` text, `total_days` integer DEFAULT 0 NOT NULL,
  `note` text, `created_by_user_id` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_positions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `name` text NOT NULL UNIQUE, `sort_order` integer DEFAULT 0 NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_audit_logs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `user_id` integer, `action` text NOT NULL, `entity_type` text NOT NULL,
  `entity_id` integer, `details` text
);

--> statement-breakpoint
INSERT OR IGNORE INTO `leave_object_types` (`code`,`name`,`sort_order`) VALUES
  ('SQ','Sĩ quan',1),('QNCN','Quân nhân chuyên nghiệp',2),
  ('CNQP','Công nhân quốc phòng',3),('VCQP','Viên chức quốc phòng',4),
  ('HSQBS','Hạ sĩ quan, binh sĩ',5),('HV','Học viên',6),('KHAC','Khác',7);
--> statement-breakpoint
INSERT OR IGNORE INTO `leave_extra_standards`
  (`code`,`label`,`days`,`sort_order`,`is_active`) VALUES
  ('01','Đóng quân ở đơn vị xa nơi đăng ký nghỉ phép từ 500 km trở lên',10,1,1),
  ('02','Đóng quân ở địa bàn đặc biệt khó khăn, vùng sâu, vùng xa, biên giới cách nơi đăng ký nghỉ phép từ 300 km trở lên',10,2,1),
  ('03','Đóng quân tại các đảo thuộc quần đảo Trường Sa và Nhà giàn DK',10,3,1),
  ('04','Đơn vị đóng quân cách nơi đăng ký nghỉ phép từ 300 km đến dưới 500 km',5,4,1),
  ('05','Đóng quân ở vùng sâu, vùng xa, biên giới cách nơi đăng ký nghỉ phép từ 200 km đến dưới 300 km',5,5,1),
  ('06','Đóng quân tại các đảo được hưởng phụ cấp khu vực',5,6,1);
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `days`=10 WHERE `code` IN ('01','02','03');
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `days`=5 WHERE `code` IN ('04','05','06');
--> statement-breakpoint
INSERT OR IGNORE INTO `leave_regulations`
  (`leave_type`,`object_type`,`min_years`,`max_years`,`base_days`,`label`,`description`,`is_active`)
SELECT 'ANNUAL', v.object_type, v.min_years, v.max_years, v.base_days, v.label, v.description, 1
FROM (
  SELECT 'SQ' object_type,0 min_years,15 max_years,20 base_days,'Sỹ quan dưới 15 năm công tác' label,'Tiêu chuẩn phép hằng năm' description UNION ALL
  SELECT 'SQ',15,25,25,'Sỹ quan từ 15 đến dưới 25 năm','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'SQ',25,NULL,30,'Sỹ quan từ 25 năm trở lên','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'QNCN',0,15,20,'QNCN dưới 15 năm công tác','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'QNCN',15,25,25,'QNCN từ 15 đến dưới 25 năm','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'QNCN',25,NULL,30,'QNCN từ 25 năm trở lên','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'CNQP',0,15,20,'Công nhân QP dưới 15 năm công tác','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'CNQP',15,25,25,'Công nhân QP từ 15 đến dưới 25 năm','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'CNQP',25,NULL,30,'Công nhân QP từ 25 năm trở lên','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'VCQP',0,15,20,'Viên chức QP dưới 15 năm công tác','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'VCQP',15,25,25,'Viên chức QP từ 15 đến dưới 25 năm','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'VCQP',25,NULL,30,'Viên chức QP từ 25 năm trở lên','Tiêu chuẩn phép hằng năm' UNION ALL
  SELECT 'HSQBS',0,NULL,10,'Hạ sỹ quan, binh sỹ','Tiêu chuẩn 10 ngày phép hằng năm'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM `leave_regulations` r
  WHERE r.leave_type='ANNUAL' AND r.object_type=v.object_type
    AND COALESCE(r.min_years,-1)=COALESCE(v.min_years,-1)
    AND COALESCE(r.max_years,-1)=COALESCE(v.max_years,-1)
);
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label`='Đóng quân ở đơn vị xa nơi đăng ký nghỉ phép từ 500 km trở lên',`days`=10,`sort_order`=1,`is_active`=1 WHERE `code`='01';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label`='Đóng quân ở địa bàn đặc biệt khó khăn, vùng sâu, vùng xa, biên giới cách nơi đăng ký nghỉ phép từ 300 km trở lên',`days`=10,`sort_order`=2,`is_active`=1 WHERE `code`='02';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label`='Đóng quân tại các đảo thuộc quần đảo Trường Sa và Nhà giàn DK',`days`=10,`sort_order`=3,`is_active`=1 WHERE `code`='03';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label`='Đơn vị đóng quân cách nơi đăng ký nghỉ phép từ 300 km đến dưới 500 km',`days`=5,`sort_order`=4,`is_active`=1 WHERE `code`='04';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label`='Đóng quân ở vùng sâu, vùng xa, biên giới cách nơi đăng ký nghỉ phép từ 200 km đến dưới 300 km',`days`=5,`sort_order`=5,`is_active`=1 WHERE `code`='05';
--> statement-breakpoint
UPDATE `leave_extra_standards` SET `label`='Đóng quân tại các đảo được hưởng phụ cấp khu vực',`days`=5,`sort_order`=6,`is_active`=1 WHERE `code`='06';
--> statement-breakpoint
INSERT OR IGNORE INTO actions (name, display_name, description) VALUES
  ('create','Tạo','Tạo dữ liệu'),('read','Xem','Xem dữ liệu'),
  ('update','Cập nhật','Cập nhật dữ liệu'),('delete','Xóa','Xóa dữ liệu');
--> statement-breakpoint
INSERT OR IGNORE INTO resources (name, display_name, description) VALUES
  ('actions','Hành vi','Quản lý hành vi'),('resources','Tài nguyên','Quản lý tài nguyên'),
  ('users','Người dùng','Quản lý người dùng'),('permissions','Quyền','Quản lý quyền'),
  ('roles','Vai trò','Quản lý vai trò'),('classes','Lớp','Quản lý lớp'),
  ('students','Học viên','Quản lý học viên'),('units','Đơn vị','Quản lý đơn vị'),
  ('leave_management','Quản lý phép','Phân hệ quản lý nghỉ phép');
--> statement-breakpoint
INSERT OR IGNORE INTO roles (name, description) VALUES
  ('super_admin','Siêu quản trị viên — toàn quyền hệ thống'),
  ('admin','Quản trị viên — toàn quyền quản lý'),
  ('battalion_commander','Chỉ huy tiểu đoàn'),('company_commander','Chỉ huy đại đội'),
  ('viewer','Người xem'),('user_don_vi','Người dùng đơn vị'),
  ('user_nganh','Người dùng ngành'),('exam_lecturer','Giảng viên soạn đề thi'),
  ('exam_dept_head','Chủ nhiệm khoa duyệt đề thi'),('exam_office','Ban Khảo thí'),
  ('leave_admin','Quản trị phép — toàn quyền phân hệ phép'),
  ('leave_commander','Chỉ huy cơ quan — quản lý, đề xuất và duyệt phép trong đơn vị'),
  ('leave_agency','Cơ quan quản lý — quản lý và duyệt phép, không được đề xuất'),
  ('leave_personnel','Quân nhân — tự đề xuất nghỉ phép và xem quy định phép');
--> statement-breakpoint
INSERT OR IGNORE INTO permissions
  (resource_id, action_id, name, display_name, description)
SELECT r.id, a.id, r.name || ':' || a.name,
  a.display_name || ' - ' || r.display_name,
  a.display_name || ' ' || r.display_name
FROM resources r CROSS JOIN actions a;
--> statement-breakpoint
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id FROM roles CROSS JOIN permissions
WHERE roles.name IN ('super_admin','admin','leave_admin');
--> statement-breakpoint
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id FROM roles CROSS JOIN permissions
WHERE roles.name='leave_commander'
  AND permissions.name IN ('leave_management:create','leave_management:read','leave_management:update');
--> statement-breakpoint
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id FROM roles CROSS JOIN permissions
WHERE roles.name='leave_agency'
  AND permissions.name IN ('leave_management:read','leave_management:update');
--> statement-breakpoint
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id FROM roles CROSS JOIN permissions
WHERE roles.name='leave_personnel'
  AND permissions.name IN ('leave_management:create','leave_management:read');
--> statement-breakpoint
UPDATE `leave_records` SET `leave_year`=substr(`start_date`,1,4)
WHERE (`leave_year` IS NULL OR `leave_year`='') AND `start_date` IS NOT NULL;
--> statement-breakpoint
INSERT INTO `leave_batches` (`request_id`,`personnel_id`,`personnel_code`,`personnel_name`,`object_type`,`leave_type`,`batch_index`,`batch_label`,`start_date`,`end_date`,`total_days`,`note`,`created_by_user_id`)
SELECT r.id,r.personnel_id,r.personnel_code,
  CASE WHEN r.request_scope='CLASS' THEN COALESCE(r.class_name,r.personnel_name) ELSE r.personnel_name END,
  r.object_type,r.leave_type,1,
  CASE WHEN r.request_scope='CLASS' THEN 'Đợt nghỉ '||COALESCE(r.class_name,'lớp') ELSE 'Đợt nghỉ theo đơn đã duyệt' END,
  r.start_date,r.end_date,r.total_days,r.note,r.decided_by_user_id
FROM `leave_requests` r
WHERE r.status='APPROVED'
  AND NOT EXISTS (SELECT 1 FROM `leave_batches` b WHERE b.request_id=r.id);
