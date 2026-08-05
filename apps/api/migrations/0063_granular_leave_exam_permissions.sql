-- Tách quyền quản lý phép và danh mục đề thi theo từng nghiệp vụ.
INSERT OR IGNORE INTO resources (name, display_name, description) VALUES
('leave-proposals', 'Đề xuất phép', 'Lập và quản lý đề xuất nghỉ phép'),
('leave-approvals', 'Duyệt đề xuất phép', 'Xem và duyệt đề xuất nghỉ phép'),
('leave-catalogs', 'Danh mục quản lý phép', 'Quản lý quân nhân, đơn vị, chức vụ, địa phương, lớp, quy định và đợt phép'),
('leave-reports', 'Báo cáo và lưu trữ phép', 'Xem báo cáo, lịch sử và dữ liệu lưu trữ phép'),
('leave-settings', 'Cấu hình quản lý phép', 'Quản lý cấu hình gửi thư và mẫu biểu phép'),
('exam-systems', 'Hệ đào tạo', 'Quản lý hệ đào tạo của phân hệ đề thi'),
('exam-majors', 'Ngành đào tạo', 'Quản lý ngành đào tạo của phân hệ đề thi'),
('exam-faculties', 'Khoa', 'Quản lý khoa của phân hệ đề thi'),
('exam-subjects', 'Môn học', 'Quản lý môn học của phân hệ đề thi'),
('exam-classes', 'Lớp thi', 'Quản lý lớp của phân hệ đề thi'),
('exam-teachers', 'Giảng viên đề thi', 'Quản lý giảng viên và chức danh học thuật'),
('exam-assignments', 'Phân công đề thi', 'Quản lý phân công giảng viên ra đề'),
('exam-approvals', 'Duyệt đề thi', 'Xem và thực hiện quy trình duyệt đề thi');
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
CROSS JOIN actions a
WHERE r.name IN (
	'leave-proposals', 'leave-approvals', 'leave-catalogs', 'leave-reports',
	'leave-settings', 'exam-systems', 'exam-majors', 'exam-faculties',
	'exam-subjects', 'exam-classes', 'exam-teachers', 'exam-assignments',
	'exam-approvals'
)
	AND a.name IN ('create', 'read', 'update', 'delete');
--> statement-breakpoint

-- Các vai trò quản trị giữ toàn quyền như trước.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin', 'leave_admin')
	AND p.name LIKE 'leave-%';
--> statement-breakpoint

-- Chỉ huy: đề xuất trong đơn vị, duyệt và xem danh mục/báo cáo.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'leave_commander' AND p.name IN (
	'leave-proposals:create', 'leave-proposals:read', 'leave-proposals:update',
	'leave-proposals:delete', 'leave-approvals:read', 'leave-approvals:update',
	'leave-catalogs:read', 'leave-reports:read'
);
--> statement-breakpoint

-- Cơ quan quản lý: duyệt, quản lý danh mục và xem báo cáo; không lập đề xuất.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'leave_agency' AND p.name IN (
	'leave-proposals:read', 'leave-approvals:read', 'leave-approvals:update',
	'leave-catalogs:create', 'leave-catalogs:read', 'leave-catalogs:update',
	'leave-catalogs:delete', 'leave-reports:read'
);
--> statement-breakpoint

-- Quân nhân: tự đề xuất và đọc danh mục cần thiết để lập phiếu.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'leave_personnel' AND p.name IN (
	'leave-proposals:create', 'leave-proposals:read', 'leave-proposals:update',
	'leave-proposals:delete', 'leave-catalogs:read'
);
--> statement-breakpoint

-- Danh mục đề thi: BGH/Ban Khảo thí đọc; khoa/CNK được quản lý.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('admin', 'exam_office')
	AND p.action_id = (SELECT id FROM actions WHERE name = 'read')
	AND p.resource_id IN (
		SELECT id FROM resources WHERE name IN (
			'exam-systems', 'exam-majors', 'exam-faculties', 'exam-subjects',
			'exam-classes', 'exam-teachers', 'exam-assignments', 'exam-approvals'
		)
	);
--> statement-breakpoint

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('user_nganh', 'exam_dept_head')
	AND p.resource_id IN (
		SELECT id FROM resources WHERE name IN (
			'exam-systems', 'exam-majors', 'exam-faculties', 'exam-subjects',
			'exam-classes', 'exam-teachers', 'exam-assignments', 'exam-approvals'
		)
	);
--> statement-breakpoint

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'super_admin'
	AND p.resource_id IN (
		SELECT id FROM resources WHERE name IN (
			'exam-systems', 'exam-majors', 'exam-faculties', 'exam-subjects',
			'exam-classes', 'exam-teachers', 'exam-assignments', 'exam-approvals'
		)
	);
--> statement-breakpoint

-- Ban Khảo thí/BGH được vận hành bước duyệt, không được sửa danh mục.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('admin', 'exam_office')
	AND p.name IN ('exam-approvals:update');
--> statement-breakpoint

-- Giảng viên chỉ đọc dữ liệu phục vụ việc soạn và phân công của mình.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'exam_lecturer' AND p.name IN (
	'exam-subjects:read', 'exam-classes:read', 'exam-assignments:read'
);
--> statement-breakpoint

-- Bỏ nhóm quyền phép tổng quát sau khi đã chuyển toàn bộ vai trò sang quyền mới.
DELETE FROM role_permissions
WHERE permission_id IN (
	SELECT p.id FROM permissions p
	JOIN resources r ON r.id = p.resource_id
	WHERE r.name = 'leave_management'
);
--> statement-breakpoint
DELETE FROM permissions
WHERE resource_id = (SELECT id FROM resources WHERE name = 'leave_management');
--> statement-breakpoint
DELETE FROM resources WHERE name = 'leave_management';
