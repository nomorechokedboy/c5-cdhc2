-- User ngành: vận hành phân hệ đề thi tự luận (soạn, duyệt cấp khoa/KT, ngân hàng, rút đề)

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
WHERE roles.name = 'user_nganh'
AND r.name IN ('exams', 'exam-bank', 'exam-draw')
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
