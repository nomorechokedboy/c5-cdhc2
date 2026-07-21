-- Mã định vị, phân cấp 1–5, nhật ký tăng/giảm & điều chỉnh vật tư

ALTER TABLE `buildings` ADD `manager_code` text;--> statement-breakpoint
ALTER TABLE `buildings` ADD `area` text;--> statement-breakpoint

ALTER TABLE `floors` ADD `code` text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `floors_code_unique` ON `floors` (`code`);--> statement-breakpoint

ALTER TABLE `rooms` ADD `manager_code` text;--> statement-breakpoint

ALTER TABLE `room_assets` ADD `code` text;--> statement-breakpoint
ALTER TABLE `room_assets` ADD `grade` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `room_assets` ADD `manufacture_year` integer;--> statement-breakpoint
ALTER TABLE `room_assets` ADD `usage_year` integer;--> statement-breakpoint
ALTER TABLE `room_assets` ADD `install_address` text;--> statement-breakpoint

-- Backfill mã tạm cho dữ liệu cũ
UPDATE `room_assets` SET `code` = 'VT-' || `id` WHERE `code` IS NULL OR `code` = '';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `room_assets_code_unique` ON `room_assets` (`code`);--> statement-breakpoint

CREATE TABLE `asset_movement_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer NOT NULL,
	`movement_type` text NOT NULL,
	`executed_at` text NOT NULL,
	`executing_unit` text,
	`install_address` text,
	`asset_code` text,
	`asset_name` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`quantity_before` integer DEFAULT 0 NOT NULL,
	`quantity_after` integer DEFAULT 0 NOT NULL,
	`grade` integer DEFAULT 1 NOT NULL,
	`manufacture_year` integer,
	`usage_year` integer,
	`reason_code` text,
	`reason_other` text,
	`decision_date` text,
	`decision_number` text,
	`signer` text,
	`performer` text,
	`explanation` text,
	`note` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
