-- Thuộc tính khai báo mặc định của vật tư danh mục
ALTER TABLE `materials` ADD COLUMN `manufacture_year` integer;--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN `usage_year` integer;--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN `classification` text;--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN `asset_status` text NOT NULL DEFAULT 'NORMAL';--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN `purchase_date` text;--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN `expiry_date` text;
