-- Giữ nhật ký cập nhật khi xóa VT (SL→0): FK CASCADE → SET NULL + snapshot vị trí
PRAGMA foreign_keys=OFF;--> statement-breakpoint

CREATE TABLE `asset_movement_logs_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer,
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
	`building_code` text,
	`building_name` text,
	`room_code` text,
	`room_name` text,
	`floor_name` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint

INSERT INTO `asset_movement_logs_new` (
	`id`, `createdAt`, `updatedAt`, `room_asset_id`, `movement_type`, `executed_at`,
	`executing_unit`, `install_address`, `asset_code`, `asset_name`,
	`quantity`, `quantity_before`, `quantity_after`, `grade`,
	`manufacture_year`, `usage_year`, `reason_code`, `reason_other`,
	`decision_date`, `decision_number`, `signer`, `performer`,
	`explanation`, `note`,
	`building_code`, `building_name`, `room_code`, `room_name`, `floor_name`
)
SELECT
	`id`, `createdAt`, `updatedAt`, `room_asset_id`, `movement_type`, `executed_at`,
	`executing_unit`, `install_address`, `asset_code`, `asset_name`,
	`quantity`, `quantity_before`, `quantity_after`, `grade`,
	`manufacture_year`, `usage_year`, `reason_code`, `reason_other`,
	`decision_date`, `decision_number`, `signer`, `performer`,
	`explanation`, `note`,
	NULL, NULL, NULL, NULL, NULL
FROM `asset_movement_logs`;--> statement-breakpoint

DROP TABLE `asset_movement_logs`;--> statement-breakpoint
ALTER TABLE `asset_movement_logs_new` RENAME TO `asset_movement_logs`;--> statement-breakpoint

-- Backfill snapshot vị trí từ VT còn tồn tại
UPDATE `asset_movement_logs`
SET
	`building_code` = (
		SELECT b.`code` FROM `room_assets` a
		JOIN `rooms` r ON r.`id` = a.`room_id`
		JOIN `floors` f ON f.`id` = r.`floor_id`
		JOIN `buildings` b ON b.`id` = f.`building_id`
		WHERE a.`id` = `asset_movement_logs`.`room_asset_id`
	),
	`building_name` = (
		SELECT b.`name` FROM `room_assets` a
		JOIN `rooms` r ON r.`id` = a.`room_id`
		JOIN `floors` f ON f.`id` = r.`floor_id`
		JOIN `buildings` b ON b.`id` = f.`building_id`
		WHERE a.`id` = `asset_movement_logs`.`room_asset_id`
	),
	`room_code` = (
		SELECT r.`room_code` FROM `room_assets` a
		JOIN `rooms` r ON r.`id` = a.`room_id`
		WHERE a.`id` = `asset_movement_logs`.`room_asset_id`
	),
	`room_name` = (
		SELECT r.`room_name` FROM `room_assets` a
		JOIN `rooms` r ON r.`id` = a.`room_id`
		WHERE a.`id` = `asset_movement_logs`.`room_asset_id`
	),
	`floor_name` = (
		SELECT f.`name` FROM `room_assets` a
		JOIN `rooms` r ON r.`id` = a.`room_id`
		JOIN `floors` f ON f.`id` = r.`floor_id`
		WHERE a.`id` = `asset_movement_logs`.`room_asset_id`
	)
WHERE `room_asset_id` IS NOT NULL;--> statement-breakpoint

PRAGMA foreign_keys=ON;
