-- Asset management: buildings → floors → rooms → room_assets / room_images + logs
-- Also creates warehouse/materials catalog tables (schema exists; no API/UI in v1)

CREATE TABLE `buildings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_code_unique` ON `buildings` (`code`);
--> statement-breakpoint

CREATE TABLE `floors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`building_id` integer NOT NULL,
	`floor_number` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE `rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`floor_id` integer NOT NULL,
	`room_code` text NOT NULL,
	`room_name` text NOT NULL,
	`room_type` text,
	`manager` text,
	`capacity` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`description` text,
	FOREIGN KEY (`floor_id`) REFERENCES `floors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_room_code_unique` ON `rooms` (`room_code`);
--> statement-breakpoint

CREATE TABLE `room_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_id` integer NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit` text,
	`status` text DEFAULT 'NORMAL' NOT NULL,
	`purchase_date` text,
	`expiry_date` text,
	`description` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE `room_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_id` integer NOT NULL,
	`image_url` text NOT NULL,
	`title` text,
	`description` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE `repair_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer NOT NULL,
	`repair_date` text NOT NULL,
	`content` text NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`performer` text,
	`note` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE `inventory_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer NOT NULL,
	`inventory_date` text NOT NULL,
	`actual_quantity` integer DEFAULT 0 NOT NULL,
	`expected_quantity` integer DEFAULT 0 NOT NULL,
	`result` text,
	`note` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE `replacement_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`room_asset_id` integer NOT NULL,
	`replacement_date` text NOT NULL,
	`old_asset` text NOT NULL,
	`new_asset` text NOT NULL,
	`reason` text,
	`performer` text,
	`note` text,
	FOREIGN KEY (`room_asset_id`) REFERENCES `room_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Catalog / warehouse (included for schema parity; no UI in Sprint 1–7 v1)
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_code_unique` ON `categories` (`code`);
--> statement-breakpoint

CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`contact_person` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_code_unique` ON `suppliers` (`code`);
--> statement-breakpoint

CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`category_id` integer NOT NULL,
	`supplier_id` integer,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`min_quantity` integer DEFAULT 0 NOT NULL,
	`price` real DEFAULT 0,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`description` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `materials_code_unique` ON `materials` (`code`);
--> statement-breakpoint

CREATE TABLE `warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`manager` text,
	`phone` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_code_unique` ON `warehouses` (`code`);
--> statement-breakpoint

CREATE TABLE `warehouse_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`warehouse_id` integer NOT NULL,
	`material_id` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`min_quantity` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
