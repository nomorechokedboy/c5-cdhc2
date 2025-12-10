-- Insert actions
INSERT INTO actions (name, display_name, description) VALUES 
('create', 'Tạo', 'Tạo tài nguyên'), 
('read', 'Xem', 'Xem tài nguyên'), 
('update', 'Chỉnh sửa', 'Chỉnh sửa tài nguyên'), 
('delete', 'Xóa', 'Xóa tài nguyên');
 --> statement-breakpoint

-- Insert resources
INSERT INTO resources (name, display_name, description) VALUES 
('actions', 'Hành vi', 'Tài nguyên này liên quan tới các hành vì trên các tài nguyên'), 
('resources', 'Tài nguyên', 'Quản lý tài nguyên của hệ thống'), 
('users', 'Người dùng', 'Quản lý người dùng'), 
('permissions', 'Quyền', 'Quản lý quyền của người dùng'),
('classes', 'Lớp', 'Quản lý lớp'),
('students', 'Học viên', 'Quản lý học viên'),
('units', 'Đơn vị', 'Quản lý đơn vị'),
('roles', 'Nhóm quyền', 'Quản lý và phân quyền cho các người dùng');
 --> statement-breakpoint

-- Insert roles (NO display_name column!)
INSERT INTO roles (name, description) VALUES
('super_admin', 'Siêu quản trị viên - Toàn quyền trên hệ thống'),
('admin', 'Quản trị viên - Quản trị hệ thống'),
('battalion_commander', 'Chỉ huy tiểu đoàn - Quản lý tiểu đoàn'),
('company_commander', 'Chỉ huy đại đội - Quản lý đại đội'),
('viewer', 'Người xem - Chỉ xem thông tin');
 --> statement-breakpoint

-- Insert permissions (using || instead of CONCAT)
INSERT INTO permissions (resource_id, action_id, name, display_name, description)
SELECT 
    r.id, 
    a.id, 
    r.name || ':' || a.name,
    a.display_name || ' - ' || r.display_name,
    'Quyền để ' || LOWER(a.display_name) || ' ' || LOWER(r.display_name)
FROM resources r
CROSS JOIN actions a;
--> statement-breakpoint

-- Create trigger to automatically assign new permissions to super_admin role
DROP TRIGGER IF EXISTS assign_permission_to_super_admin;
CREATE TRIGGER assign_permission_to_super_admin
AFTER INSERT ON permissions
BEGIN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 
        (SELECT id FROM roles WHERE name = 'super_admin'),
        NEW.id
    WHERE EXISTS (SELECT 1 FROM roles WHERE name = 'super_admin');
END;
--> statement-breakpoint

-- Assign ALL permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'super_admin'),
    p.id
FROM permissions p;
--> statement-breakpoint

-- Assign management permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    p.id
FROM permissions p
INNER JOIN resources r ON p.resource_id = r.id
WHERE r.name IN ('users', 'roles', 'classes', 'students', 'units');
--> statement-breakpoint

-- Battalion commander: manage classes, students, units (read only for units)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'battalion_commander'),
    p.id
FROM permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE (r.name IN ('classes', 'students') AND a.name IN ('create', 'read', 'update', 'delete'))
   OR (r.name = 'units' AND a.name IN ('read'));
--> statement-breakpoint

-- Company commander: manage classes and students
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'company_commander'),
    p.id
FROM permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE r.name IN ('classes', 'students')
  AND a.name IN ('create', 'read', 'update', 'delete');
--> statement-breakpoint

-- Viewer: read-only access to classes and students
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'viewer'),
    p.id
FROM permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE r.name IN ('classes', 'students')
  AND a.name = 'read';
