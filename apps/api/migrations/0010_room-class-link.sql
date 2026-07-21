-- Gắn lớp học (classes) với phòng dạy (rooms) — user chọn phòng → HV + thiết bị
ALTER TABLE `rooms` ADD COLUMN `class_id` integer REFERENCES `classes`(`id`) ON DELETE SET NULL;
