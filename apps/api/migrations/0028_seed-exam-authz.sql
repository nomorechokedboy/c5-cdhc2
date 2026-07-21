-- RBAC cho phân hệ đề thi tự luận

INSERT INTO resources (name, display_name, description)
SELECT v.name, v.display_name, v.description
FROM (
	SELECT 'exams' AS name, 'Đề thi' AS display_name, 'Quản lý đề thi tự luận' AS description
	UNION ALL SELECT 'exam-bank', 'Ngân hàng đề', 'Ngân hàng đề đã duyệt'
	UNION ALL SELECT 'exam-draw', 'Rút đề', 'Rút / bốc đề thi'
) AS v
WHERE NOT EXISTS (SELECT 1 FROM resources r WHERE r.name = v.name);
--> statement-breakpoint

INSERT INTO permissions (resource_id, action_id, name, display_name, description)
SELECT
	r.id,
	a.id,
	r.name || ':' || a.name,
	a.display_name || ' - ' || r.display_name,
	'Quyền để ' || LOWER(a.display_name) || ' ' || LOWER(r.display_name)
FROM resources r
CROSS JOIN actions a
WHERE r.name IN ('exams', 'exam-bank', 'exam-draw')
AND NOT EXISTS (
	SELECT 1 FROM permissions p WHERE p.name = r.name || ':' || a.name
);
--> statement-breakpoint

-- Roles chuyên biệt
INSERT INTO roles (name, description)
SELECT 'exam_lecturer', 'Giảng viên soạn đề thi tự luận'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'exam_lecturer');
--> statement-breakpoint

INSERT INTO roles (name, description)
SELECT 'exam_dept_head', 'Chủ nhiệm khoa duyệt đề thi'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'exam_dept_head');
--> statement-breakpoint

INSERT INTO roles (name, description)
SELECT 'exam_office', 'Ban Khảo thí thẩm định / rút đề'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'exam_office');
--> statement-breakpoint

-- Super admin + admin (BGH): full
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
WHERE roles.name IN ('super_admin', 'admin')
AND r.name IN ('exams', 'exam-bank', 'exam-draw')
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
--> statement-breakpoint

-- Giảng viên: create/read/update exams (soạn + gửi)
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'exam_lecturer'
AND r.name = 'exams'
AND a.name IN ('create', 'read', 'update')
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
--> statement-breakpoint

-- CNK: read + update (duyệt)
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE roles.name = 'exam_dept_head'
AND r.name = 'exams'
AND a.name IN ('read', 'update', 'manage')
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
--> statement-breakpoint

-- Ban Khảo thí: duyệt + ngân hàng + rút đề
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
WHERE roles.name = 'exam_office'
AND r.name IN ('exams', 'exam-bank', 'exam-draw')
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
