import { middleware } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import unitRepo from '../units/repo'
import log from 'encore.dev/log'
import userRepo from '../users/repo'
import { AppError } from '../errors'

// Extend the middleware data type
declare module 'encore.dev/api' {
	interface MiddlewareData {
		validClassIds: number[]
		validUnitIds: number[]
	}
}

async function getValidIdsFromUnit(unitId: number) {
	const unit = await unitRepo.getOne({ id: unitId })

	if (!unit) {
		return { classIds: [], unitIds: [] }
	}

	let classIds: number[] = []
	const unitIds: number[] = [unitId]

	if (unit.level === 'battalion') {
		classIds = unit.children.flatMap((c) => c.classes.map((cl) => cl.id))
		unitIds.push(...unit.children.map((c) => c.id))
	} else if (unit.level === 'company') {
		classIds = unit.classes.map((cl) => cl.id)
	}

	return { classIds, unitIds }
}

async function getAllValidIds() {
	const units = await unitRepo.findAll()

	const classIds = units.flatMap((u) => {
		let ids = u.classes?.map((c) => c.id) || []
		if (u.children) {
			for (const child of u.children) {
				ids = ids.concat(child.classes?.map((c) => c.id) || [])
			}
		}
		return ids
	})

	const unitIds = units.flatMap((u) => {
		const ids = [u.id]
		if (u.children) {
			ids.push(...u.children.map((c) => c.id))
		}
		return ids
	})

	return { classIds, unitIds }
}

export const authzMiddleware = middleware(
	{ target: { auth: true } },
	async (req, next) => {
		const authData = getAuthData()

		if (!authData) {
			log.warn('authzMiddleware: No auth data available')
			req.data.validClassIds = []
			req.data.validUnitIds = []
			return next(req)
		}

		let classIds: number[] = []
		let unitIds: number[] = []

		try {
			if (authData.isSuperAdmin) {
				// Super admins get access to all units and classes
				const allIds = await getAllValidIds()

				classIds = allIds.classIds
				unitIds = allIds.unitIds
			} else if (authData.userID) {
				// Regular users: fetch their user record to get current unitId
				const user = await userRepo.findOne({
					id: Number(authData.userID)
				})

				if (user?.unitId) {
					const validIds = await getValidIdsFromUnit(user.unitId)
					classIds = validIds.classIds
					unitIds = validIds.unitIds
				}
			}

			log.trace('authzMiddleware: Computed valid IDs', {
				userId: authData.userID,
				classIds,
				unitIds
			})

			// Attach to request for API handlers to use
			req.data.validClassIds = classIds
			req.data.validUnitIds = unitIds

			return next(req)
		} catch (err) {
			console.error('authzMiddleware error', err)
			log.error('authzMiddleware: Error computing valid IDs', { err })
			req.data.validClassIds = []
			req.data.validUnitIds = []
			return next(req)
		}
	}
)

// Define permission mapping based on method and path patterns
const PERMISSION_MAP: Record<string, string[]> = {
	'POST:/classes': ['classes:create'],
	'GET:/classes': ['classes:read'],
	'GET:/classes/:id': ['classes:read'],
	'PATCH:/classes': ['classes:update'],
	'DELETE:/classes': ['classes:delete'],

	'POST:/students': ['students:create'],
	'GET:/students': ['students:read'],
	'GET:/students/:id': ['students:read'],
	'PATCH:/students': ['students:update'],
	'DELETE:/students': ['students:delete'],

	'POST:/units': ['units:create'],
	'GET:/units': ['units:read'],
	'GET:/units/:id': ['units:read'],
	'PATCH:/units': ['units:update'],
	'DELETE:/units': ['units:delete'],

	'POST:/users': ['users:create'],
	'GET:/users': ['users:read'],
	'GET:/users/:id': ['users:read'],
	'PATCH:/users': ['users:update'],
	'DELETE:/users': ['users:delete'],

	'POST:/roles': ['roles:create'],
	'GET:/roles': ['roles:read'],
	'GET:/roles/:id': ['roles:read'],
	'PUT:/roles/:id': ['roles:update'],
	'DELETE:/roles': ['roles:delete']
}

function getPermissionsForRequest(method: string, path: string): string[] {
	// Try exact match first
	log.debug('DEBUG permission mdw', { method, path })
	const key = `${method}:${path}`
	if (PERMISSION_MAP[key]) {
		return PERMISSION_MAP[key]
	}

	// Try pattern matching for dynamic segments
	for (const [pattern, permissions] of Object.entries(PERMISSION_MAP)) {
		const [patternMethod, patternPath] = pattern.split(':')
		if (method !== patternMethod) continue

		// Convert pattern to regex
		const regexPattern = patternPath
			.replace(/:\w+/g, '[^/]+') // Replace :id with any non-slash chars
			.replace(/\*/g, '.*') // Replace * with any chars

		const regex = new RegExp(`^${regexPattern}$`)
		if (regex.test(path)) {
			return permissions
		}
	}

	return []
}

export const permissionMiddleware = middleware(
	{ target: { auth: true } },
	async (req, next) => {
		const authData = getAuthData()

		if (!authData) {
			log.warn('permissionMiddleware: No auth data available')
			throw AppError.unauthenticated('Authentication required')
		}

		// Super admins bypass all permission checks
		if (authData.isSuperAdmin) {
			log.trace('permissionMiddleware: Super admin bypass', {
				userId: authData.userID
			})
			return next(req)
		}

		// Get required permissions for this endpoint
		const requiredPermissions = getPermissionsForRequest(
			req.requestMeta?.method,
			req.requestMeta?.path
		)

		// If no permissions required for this endpoint, allow access
		if (requiredPermissions.length === 0) {
			return next(req)
		}

		const userPermissions = authData.permissions || []

		// Check if user has required permissions
		const hasPermission = requiredPermissions.every((required) =>
			userPermissions.includes(required)
		)

		if (!hasPermission) {
			log.warn('permissionMiddleware: Permission denied', {
				userId: authData.userID,
				method: req.requestMeta?.method,
				path: req.requestMeta?.path,
				required: requiredPermissions,
				has: userPermissions
			})

			throw AppError.permissionDenied(
				`Missing required permission(s): ${requiredPermissions.join(', ')}`
			)
		}

		log.trace('permissionMiddleware: Permission granted', {
			userId: authData.userID,
			endpoint: `${req.requestMeta?.method}:${req.requestMeta?.path}`,
			checked: requiredPermissions
		})

		return next(req)
	}
)
