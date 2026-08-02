CREATE TABLE IF NOT EXISTS `leave_object_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `code` text NOT NULL UNIQUE, `name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL, `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `code` text, `name` text NOT NULL,
	`level` text, `parent_id` integer, `is_active` integer DEFAULT 1 NOT NULL,
	`commander_user_id` integer, `commander_name` text,
	`management_area` text DEFAULT 'cán_bộ' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_extra_standards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `code` text NOT NULL UNIQUE, `label` text NOT NULL,
	`days` integer NOT NULL, `sort_order` integer DEFAULT 0 NOT NULL, `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `unit_id` integer NOT NULL,
	`name` text NOT NULL, `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `leave_classes_unit_name_unique` ON `leave_classes` (`unit_id`,`name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_personnel` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `code` text NOT NULL UNIQUE, `full_name` text NOT NULL,
	`enlistment_date` text, `recruitment` text, `object_type` text NOT NULL, `rank` text, `position` text, `class_id` integer,
	`unit_id` integer, `unit_name` text, `hometown` text, `permanent_residence` text, `user_id` integer,
	`email` text, `commander_user_id` integer, `commander_name` text,
	`class_name` text, `management_area` text DEFAULT 'cán_bộ' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_localities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `name` text NOT NULL, `level` text NOT NULL,
	`parent_id` integer, `code` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_regulations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `leave_type` text NOT NULL, `object_type` text,
	`min_years` integer, `max_years` integer, `base_days` integer NOT NULL, `label` text,
	`description` text, `is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `leave_type` text NOT NULL,
	`request_scope` text DEFAULT 'OTHER' NOT NULL, `class_id` integer, `class_name` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`personnel_id` integer, `personnel_code` text, `personnel_name` text, `object_type` text NOT NULL,
	`rank` text, `position` text, `enlistment_date` text, `unit_id` integer, `unit_name` text,
	`service_years` integer DEFAULT 0 NOT NULL, `base_days` integer DEFAULT 0 NOT NULL,
	`travel_days` integer DEFAULT 0 NOT NULL, `extra_days` integer DEFAULT 0 NOT NULL,
	`extra_reasons` text DEFAULT '[]', `total_days` integer DEFAULT 0 NOT NULL, `start_date` text,
	`end_date` text, `leave_year` text, `locality_id` integer, `locality_path` text, `note` text,
	`proposed_by_user_id` integer, `proposed_by_username` text, `proposed_by_display_name` text,
	`proposer_email` text, `commander_user_id` integer, `commander_name` text, `admin_note` text,
	`decided_by_user_id` integer, `decided_by_username` text, `decided_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_mail_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `request_id` integer, `to_email` text NOT NULL,
	`subject` text NOT NULL, `body` text, `mode` text, `ok` integer DEFAULT 0 NOT NULL, `error` text,
	`preview_url` text, `kind` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `user_id` integer NOT NULL, `request_id` integer NOT NULL,
	`kind` text NOT NULL, `title` text NOT NULL, `message` text NOT NULL, `read_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `request_id` integer NOT NULL, `status` text DEFAULT 'PENDING' NOT NULL,
	`leave_type` text NOT NULL, `personnel_id` integer, `personnel_code` text, `personnel_name` text,
	`object_type` text NOT NULL, `rank` text, `position` text, `enlistment_date` text, `unit_id` integer,
	`unit_name` text, `service_years` integer DEFAULT 0 NOT NULL, `base_days` integer DEFAULT 0 NOT NULL,
	`travel_days` integer DEFAULT 0 NOT NULL, `extra_days` integer DEFAULT 0 NOT NULL,
	`extra_reasons` text DEFAULT '[]', `total_days` integer DEFAULT 0 NOT NULL, `start_date` text,
	`end_date` text, `leave_year` text, `locality_id` integer, `locality_path` text, `note` text,
	`admin_note` text, `proposed_by_user_id` integer, `proposed_by_username` text,
	`proposed_by_display_name` text, `decided_by_user_id` integer, `decided_by_username` text,
	`decided_at` text, `archived_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `leave_records_request_id_unique` ON `leave_records` (`request_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `request_id` integer NOT NULL, `personnel_id` integer,
	`personnel_code` text, `personnel_name` text, `object_type` text NOT NULL, `leave_type` text NOT NULL,
	`batch_index` integer DEFAULT 1 NOT NULL, `batch_label` text DEFAULT '' NOT NULL, `start_date` text,
	`end_date` text, `total_days` integer DEFAULT 0 NOT NULL, `note` text, `created_by_user_id` integer
);
--> statement-breakpoint
INSERT OR IGNORE INTO `leave_object_types` (`code`,`name`,`sort_order`) VALUES
('SQ','Sĩ quan',1),('QNCN','Quân nhân chuyên nghiệp',2),('CNQP','Công nhân quốc phòng',3),
('VCQP','Viên chức quốc phòng',4),('HSQBS','Hạ sĩ quan, binh sĩ',5),('HV','Học viên',6),('KHAC','Khác',7);
--> statement-breakpoint
INSERT OR IGNORE INTO `leave_extra_standards` (`code`,`label`,`days`,`sort_order`) VALUES
('01','Đóng quân xa gia đình',5,1),('02','Gia đình ở vùng đặc biệt khó khăn',5,2),
('03','Có cha mẹ già yếu',5,3),('04','Vợ hoặc chồng công tác xa',5,4),
('05','Có con nhỏ dưới 12 tháng',5,5),('06','Trường hợp đặc biệt khác',5,6);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `name` text NOT NULL UNIQUE,
	`sort_order` integer DEFAULT 0 NOT NULL, `is_active` integer DEFAULT 1 NOT NULL
);
