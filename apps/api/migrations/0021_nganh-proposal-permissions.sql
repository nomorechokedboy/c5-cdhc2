-- User ngành: quyền đề xuất (create/read/update) — menu «Đề xuất»
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, p.id
FROM roles
CROSS JOIN permissions p
INNER JOIN resources r ON p.resource_id = r.id
INNER JOIN actions a ON p.action_id = a.id
WHERE (
	roles.name = 'user_nganh'
	OR roles.name LIKE '%Ngành%'
	OR roles.name LIKE '%nganh%'
)
AND r.name = 'asset-proposals'
AND a.name IN ('create', 'read', 'update')
AND NOT EXISTS (
	SELECT 1 FROM role_permissions rp
	WHERE rp.role_id = roles.id AND rp.permission_id = p.id
);
