INSERT OR IGNORE INTO roles (name, description)
VALUES (
	'leave_personnel',
	'Quân nhân — tự đề xuất nghỉ phép và xem quy định phép'
);
--> statement-breakpoint

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'leave_personnel'
	AND permissions.name IN (
		'leave_management:create',
		'leave_management:read'
	);
