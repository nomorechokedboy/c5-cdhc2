/**
 * Permission tags for RBAC
 * Format: "perm:<resource>:<action>"
 */
export const PermissionTag = {
	// Classes permissions
	CLASSES_CREATE: 'perm:classes:create',
	CLASSES_READ: 'perm:classes:read',
	CLASSES_UPDATE: 'perm:classes:update',
	CLASSES_DELETE: 'perm:classes:delete',
	CLASSES_MANAGE: 'perm:classes:manage',

	// Students permissions
	STUDENTS_CREATE: 'perm:students:create',
	STUDENTS_READ: 'perm:students:read',
	STUDENTS_UPDATE: 'perm:students:update',
	STUDENTS_DELETE: 'perm:students:delete',
	STUDENTS_MANAGE: 'perm:students:manage',

	// Users permissions
	USERS_CREATE: 'perm:users:create',
	USERS_READ: 'perm:users:read',
	USERS_UPDATE: 'perm:users:update',
	USERS_DELETE: 'perm:users:delete',
	USERS_MANAGE: 'perm:users:manage',

	// Units permissions
	UNITS_CREATE: 'perm:units:create',
	UNITS_READ: 'perm:units:read',
	UNITS_UPDATE: 'perm:units:update',
	UNITS_DELETE: 'perm:units:delete',
	UNITS_MANAGE: 'perm:units:manage',

	// Roles permissions
	ROLES_CREATE: 'perm:roles:create',
	ROLES_READ: 'perm:roles:read',
	ROLES_UPDATE: 'perm:roles:update',
	ROLES_DELETE: 'perm:roles:delete',
	ROLES_MANAGE: 'perm:roles:manage',

	// Permissions permissions
	PERMISSIONS_CREATE: 'perm:permissions:create',
	PERMISSIONS_READ: 'perm:permissions:read',
	PERMISSIONS_UPDATE: 'perm:permissions:update',
	PERMISSIONS_DELETE: 'perm:permissions:delete',
	PERMISSIONS_MANAGE: 'perm:permissions:manage',

	// Resources permissions
	RESOURCES_CREATE: 'perm:resources:create',
	RESOURCES_READ: 'perm:resources:read',
	RESOURCES_UPDATE: 'perm:resources:update',
	RESOURCES_DELETE: 'perm:resources:delete',
	RESOURCES_MANAGE: 'perm:resources:manage',

	// Actions permissions
	ACTIONS_CREATE: 'perm:actions:create',
	ACTIONS_READ: 'perm:actions:read',
	ACTIONS_UPDATE: 'perm:actions:update',
	ACTIONS_DELETE: 'perm:actions:delete',
	ACTIONS_MANAGE: 'perm:actions:manage'
} as const

/**
 * Helper to extract permission from tag
 * Example: "perm:classes:create" -> "classes:create"
 */
export function extractPermissionFromTag(tag: string): string | null {
	if (!tag.startsWith('perm:')) return null
	return tag.substring(5) // Remove "perm:" prefix
}

/**
 * Helper to get all permission tags from an array of tags
 */
export function getPermissionTags(tags: string[]): string[] {
	return tags.filter((tag) => tag.startsWith('perm:'))
}
