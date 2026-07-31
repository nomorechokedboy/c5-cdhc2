-- Khôi phục danh mục RBAC nếu database cũ đã có schema nhưng thiếu dữ liệu seed.
INSERT OR IGNORE INTO actions (name, display_name, description) VALUES
('create', 'Tạo', 'Tạo dữ liệu'),
('read', 'Xem', 'Xem dữ liệu'),
('update', 'Cập nhật', 'Cập nhật dữ liệu'),
('delete', 'Xóa', 'Xóa dữ liệu');
--> statement-breakpoint

INSERT OR IGNORE INTO resources (name, display_name, description) VALUES
('actions', 'Hành vi', 'Quản lý hành vi'),
('resources', 'Tài nguyên', 'Quản lý tài nguyên'),
('users', 'Người dùng', 'Quản lý người dùng'),
('permissions', 'Quyền', 'Quản lý quyền'),
('roles', 'Vai trò', 'Quản lý vai trò'),
('classes', 'Lớp', 'Quản lý lớp'),
('students', 'Học viên', 'Quản lý học viên'),
('units', 'Đơn vị', 'Quản lý đơn vị'),
('leave_management', 'Quản lý phép', 'Phân hệ quản lý nghỉ phép');
--> statement-breakpoint

INSERT OR IGNORE INTO roles (name, description) VALUES
('super_admin', 'Siêu quản trị viên — toàn quyền hệ thống'),
('admin', 'Quản trị viên — toàn quyền quản lý'),
('battalion_commander', 'Chỉ huy tiểu đoàn'),
('company_commander', 'Chỉ huy đại đội'),
('viewer', 'Người xem'),
('user_don_vi', 'Người dùng đơn vị'),
('user_nganh', 'Người dùng ngành'),
('exam_lecturer', 'Giảng viên soạn đề thi'),
('exam_dept_head', 'Chủ nhiệm khoa duyệt đề thi'),
('exam_office', 'Ban Khảo thí'),
('leave_admin', 'Quản trị phép — toàn quyền phân hệ phép'),
('leave_commander', 'Chỉ huy cơ quan — quản lý, đề xuất và duyệt phép trong đơn vị'),
('leave_agency', 'Cơ quan quản lý — quản lý và duyệt phép, không được đề xuất');
--> statement-breakpoint

INSERT OR IGNORE INTO permissions
	(resource_id, action_id, name, display_name, description)
SELECT
	r.id,
	a.id,
	r.name || ':' || a.name,
	a.display_name || ' - ' || r.display_name,
	a.display_name || ' ' || r.display_name
FROM resources r
CROSS JOIN actions a;
--> statement-breakpoint

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name IN ('super_admin', 'admin', 'leave_admin');
--> statement-breakpoint

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'leave_commander'
	AND permissions.name IN (
		'leave_management:create',
		'leave_management:read',
		'leave_management:update'
	);
--> statement-breakpoint

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'leave_agency'
	AND permissions.name IN (
		'leave_management:read',
		'leave_management:update'
	);
