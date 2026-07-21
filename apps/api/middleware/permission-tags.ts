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
	ACTIONS_MANAGE: 'perm:actions:manage',

	// Buildings permissions
	BUILDINGS_CREATE: 'perm:buildings:create',
	BUILDINGS_READ: 'perm:buildings:read',
	BUILDINGS_UPDATE: 'perm:buildings:update',
	BUILDINGS_DELETE: 'perm:buildings:delete',
	BUILDINGS_MANAGE: 'perm:buildings:manage',

	// Floors permissions
	FLOORS_CREATE: 'perm:floors:create',
	FLOORS_READ: 'perm:floors:read',
	FLOORS_UPDATE: 'perm:floors:update',
	FLOORS_DELETE: 'perm:floors:delete',
	FLOORS_MANAGE: 'perm:floors:manage',

	// Rooms permissions
	ROOMS_CREATE: 'perm:rooms:create',
	ROOMS_READ: 'perm:rooms:read',
	ROOMS_UPDATE: 'perm:rooms:update',
	ROOMS_DELETE: 'perm:rooms:delete',
	ROOMS_MANAGE: 'perm:rooms:manage',

	// Room assets permissions
	ROOM_ASSETS_CREATE: 'perm:room-assets:create',
	ROOM_ASSETS_READ: 'perm:room-assets:read',
	ROOM_ASSETS_UPDATE: 'perm:room-assets:update',
	ROOM_ASSETS_DELETE: 'perm:room-assets:delete',
	ROOM_ASSETS_MANAGE: 'perm:room-assets:manage',

	// Room images permissions
	ROOM_IMAGES_CREATE: 'perm:room-images:create',
	ROOM_IMAGES_READ: 'perm:room-images:read',
	ROOM_IMAGES_UPDATE: 'perm:room-images:update',
	ROOM_IMAGES_DELETE: 'perm:room-images:delete',
	ROOM_IMAGES_MANAGE: 'perm:room-images:manage',

	// Repair logs permissions
	REPAIR_LOGS_CREATE: 'perm:repair-logs:create',
	REPAIR_LOGS_READ: 'perm:repair-logs:read',
	REPAIR_LOGS_UPDATE: 'perm:repair-logs:update',
	REPAIR_LOGS_DELETE: 'perm:repair-logs:delete',
	REPAIR_LOGS_MANAGE: 'perm:repair-logs:manage',

	// Inventory logs permissions
	INVENTORY_LOGS_CREATE: 'perm:inventory-logs:create',
	INVENTORY_LOGS_READ: 'perm:inventory-logs:read',
	INVENTORY_LOGS_UPDATE: 'perm:inventory-logs:update',
	INVENTORY_LOGS_DELETE: 'perm:inventory-logs:delete',
	INVENTORY_LOGS_MANAGE: 'perm:inventory-logs:manage',

	// Replacement logs permissions
	REPLACEMENT_LOGS_CREATE: 'perm:replacement-logs:create',
	REPLACEMENT_LOGS_READ: 'perm:replacement-logs:read',
	REPLACEMENT_LOGS_UPDATE: 'perm:replacement-logs:update',
	REPLACEMENT_LOGS_DELETE: 'perm:replacement-logs:delete',
	REPLACEMENT_LOGS_MANAGE: 'perm:replacement-logs:manage',

	// Repair request tickets (báo hỏng phòng → phân công)
	REPAIR_REQUESTS_CREATE: 'perm:repair-requests:create',
	REPAIR_REQUESTS_READ: 'perm:repair-requests:read',
	REPAIR_REQUESTS_UPDATE: 'perm:repair-requests:update',
	REPAIR_REQUESTS_DELETE: 'perm:repair-requests:delete',
	REPAIR_REQUESTS_MANAGE: 'perm:repair-requests:manage'
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
