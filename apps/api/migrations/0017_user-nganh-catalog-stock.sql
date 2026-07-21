-- User thuộc ngành (HC2A…) + nhật ký tăng/giảm danh mục vật tư theo ngành

CREATE TABLE IF NOT EXISTS `user_nganh` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`user_id` integer NOT NULL,
	`nganh_code` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `user_nganh_user_nganh_uq` ON `user_nganh` (`user_id`, `nganh_code`);
CREATE INDEX IF NOT EXISTS `user_nganh_user_idx` ON `user_nganh` (`user_id`);
CREATE INDEX IF NOT EXISTS `user_nganh_code_idx` ON `user_nganh` (`nganh_code`);

CREATE TABLE IF NOT EXISTS `catalog_stock_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`movement_type` text NOT NULL,
	`executed_at` text NOT NULL,
	`material_id` integer,
	`material_code` text,
	`material_name` text NOT NULL,
	`nganh_code` text NOT NULL,
	`chuyen_nganh_code` text,
	`chuyen_nganh_name` text,
	`quantity` integer NOT NULL DEFAULT 0,
	`quantity_before` integer NOT NULL DEFAULT 0,
	`quantity_after` integer NOT NULL DEFAULT 0,
	`unit` text,
	`is_new_material` integer NOT NULL DEFAULT 0,
	`reason` text,
	`note` text,
	`actor_user_id` integer,
	`actor_username` text,
	`actor_display_name` text,
	`actor_is_admin` integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS `catalog_stock_logs_nganh_idx` ON `catalog_stock_logs` (`nganh_code`);
CREATE INDEX IF NOT EXISTS `catalog_stock_logs_executed_idx` ON `catalog_stock_logs` (`executed_at`);
CREATE INDEX IF NOT EXISTS `catalog_stock_logs_actor_idx` ON `catalog_stock_logs` (`actor_user_id`);
