-- Custom SQL migration file, put your code below! --
INSERT OR IGNORE INTO actions (name, display_name, description) VALUES 
('create', 'Tạo', 'Tạo tài nguyên'), 
('read', 'Xem', 'Xem tài nguyên'), 
('update', 'Chỉnh sửa', 'Chỉnh sửa tài nguyên'), 
('delete', 'Xóa', 'Xóa tài nguyên'), 
('manage', 'Quản lý', 'Quản lý sẽ có toàn nguyền truy cập tài nguyên');

INSERT OR IGNORE INTO resources (name, display_name, description) VALUES 
('actions', 'Hành vi', 'Tài nguyên này liên quan tới các hành vì trên các tài nguyên'), 
('resources', 'Tài nguyên', 'Quản lý tài nguyên của hệ thống'), 
('users', 'Người dùng', 'Quản lý người dùng'), 
('permissions', 'Quyền', 'Quản lý quyền của người dùng'),
('roles', 'Nhóm quyền', 'Quản lý và phân quyền cho các người dùng');

INSERT OR IGNORE INTO roles (name, display_name, description) VALUES
('super_admin', 'Siêu quản trị viên', 'Toàn quyền trên hệ thống'),
('admin', 'Quản trị viên', 'Quản trị hệ thống');

INSERT INTO permissions (resource_id, action_id, name, display_name, description)
SELECT r.id, a.id, 
       CONCAT(r.name, ':', a.name),
       CONCAT(a.display_name, ' - ', r.display_name),
       CONCAT('Quyền để ', LOWER(a.display_name), ' ', LOWER(r.display_name))
FROM resources r
CROSS JOIN actions a;