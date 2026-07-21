-- Báo hỏng theo SL trên cùng mã VT (không tạo dòng/mã mới)
ALTER TABLE `room_assets` ADD COLUMN `broken_quantity` integer NOT NULL DEFAULT 0;
ALTER TABLE `repair_requests` ADD COLUMN `original_grade` integer;
