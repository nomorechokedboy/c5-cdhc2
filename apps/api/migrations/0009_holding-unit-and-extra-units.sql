-- Đơn vị giữ vật tư trên room_assets
ALTER TABLE `room_assets` ADD `holding_unit_id` integer REFERENCES units(id) ON DELETE SET NULL;

-- Thêm đơn vị (idempotent-ish: bỏ qua nếu alias trùng — dùng INSERT OR IGNORE)
INSERT OR IGNORE INTO units (alias, level, name, parentId) VALUES
('d3', 0, 'Tiểu đoàn 3', NULL),
('c6', 1, 'Đại đội 6', 1),
('c7', 1, 'Đại đội 7', 2),
('c8', 1, 'Đại đội 8', NULL),
('c9', 1, 'Đại đội 9', NULL),
('phc', 1, 'Phòng Hậu cần', NULL),
('kdt', 1, 'Khoa Đào tạo', NULL),
('ktc', 1, 'Khoa Tài chính', NULL),
('kcn', 1, 'Khoa Công nghệ', NULL);
