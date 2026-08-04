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
	'GET:/actions': ['actions:read'],

	'POST:/classes': ['classes:create'],
	'GET:/classes': ['classes:read'],
	'GET:/classes/:id': ['classes:read'],
	'PATCH:/classes': ['classes:update'],
	'DELETE:/classes': ['classes:delete'],
	'GET:/moodle/courses': ['classes:read'],
	'GET:/moodle/status': ['classes:read'],
	'POST:/moodle/import-classes': ['classes:create'],

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
	'GET:/users/pending-permissions': ['users:read'],
	'GET:/users/pending-room-accounts': ['users:read'],
	'POST:/users/sync-accounts': ['users:update'],
	'PATCH:/users': ['users:update'],
	'PUT:/users': ['users:update'],
	'DELETE:/users': ['users:delete'],

	'GET:/resources': ['resources:read'],
	'GET:/audit-logs': [
		'audit-logs:read',
		'leave-reports:read',
		'asset-catalog:read',
		'rooms:read',
		'exam-approvals:read',
		'exam-bank:read'
	],
	'GET:/account-audit-logs': ['audit-logs:read', 'rooms:read'],
	'GET:/catalog-audit-logs': ['audit-logs:read', 'asset-catalog:read'],

	// Quản lý phép — tách quyền lập phiếu, duyệt, danh mục, báo cáo và cấu hình.
	'GET:/leave/requests': ['leave-proposals:read', 'leave-approvals:read'],
	'GET:/leave/requests/:id': ['leave-proposals:read', 'leave-approvals:read'],
	'POST:/leave/requests': ['leave-proposals:create'],
	'PATCH:/leave/requests/:id': ['leave-proposals:update'],
	'POST:/leave/requests/:id/cancel': ['leave-proposals:delete'],
	'POST:/leave/requests/:id/decide': ['leave-approvals:update'],
	'POST:/leave/requests/:id/batches': ['leave-approvals:update'],
	'GET:/leave/regulations': ['leave-catalogs:read'],
	'POST:/leave/regulations': ['leave-catalogs:create'],
	'PATCH:/leave/regulations/:id': ['leave-catalogs:update'],
	'DELETE:/leave/regulations/:id': ['leave-catalogs:delete'],
	'GET:/leave/meta': ['leave-catalogs:read'],
	'POST:/leave/compute-days': ['leave-catalogs:read'],
	'GET:/leave/units': ['leave-catalogs:read'],
	'POST:/leave/units': ['leave-catalogs:create'],
	'PATCH:/leave/units/:id': ['leave-catalogs:update'],
	'DELETE:/leave/units/:id': ['leave-catalogs:delete'],
	'POST:/leave/units/import': ['leave-catalogs:create'],
	'POST:/leave/units/seed-from-system': ['leave-catalogs:create'],
	'GET:/leave/personnel': ['leave-catalogs:read'],
	'GET:/leave/personnel/:id': ['leave-catalogs:read'],
	'POST:/leave/personnel': ['leave-catalogs:create'],
	'PATCH:/leave/personnel/:id': ['leave-catalogs:update'],
	'DELETE:/leave/personnel/:id': ['leave-catalogs:delete'],
	'POST:/leave/personnel/import': ['leave-catalogs:create'],
	'POST:/leave/accounts/assign': ['leave-catalogs:update'],
	'GET:/leave/positions': ['leave-catalogs:read'],
	'POST:/leave/positions': ['leave-catalogs:create'],
	'PATCH:/leave/positions/:id': ['leave-catalogs:update'],
	'DELETE:/leave/positions/:id': ['leave-catalogs:delete'],
	'GET:/leave/localities': ['leave-catalogs:read'],
	'POST:/leave/localities': ['leave-catalogs:create'],
	'PATCH:/leave/localities/:id': ['leave-catalogs:update'],
	'DELETE:/leave/localities/:id': ['leave-catalogs:delete'],
	'POST:/leave/localities/import': ['leave-catalogs:create'],
	'GET:/leave/classes': ['leave-catalogs:read'],
	'POST:/leave/classes': ['leave-catalogs:create'],
	'DELETE:/leave/classes/:id': ['leave-catalogs:delete'],
	'GET:/leave/batches': ['leave-catalogs:read'],
	'GET:/leave/batches/:id': ['leave-catalogs:read'],
	'POST:/leave/batches': ['leave-catalogs:create'],
	'PATCH:/leave/batches/:id': ['leave-catalogs:update'],
	'DELETE:/leave/batches/:id': ['leave-catalogs:delete'],
	'GET:/leave/records': ['leave-reports:read'],
	'GET:/leave/records/:id': ['leave-reports:read'],
	'GET:/leave/reports/*': ['leave-reports:read'],
	'GET:/leave/audit-logs': ['leave-reports:read'],
	'GET:/leave/mail/status': ['leave-settings:read'],
	'GET:/leave/mail/log': ['leave-settings:read'],
	'POST:/leave/mail/config': ['leave-settings:update'],
	'POST:/leave/mail/test': ['leave-settings:update'],
	'POST:/leave-management/word-templates/convert': ['leave-settings:update'],

	// Đề thi — quyền riêng cho từng danh mục và nghiệp vụ.
	'GET:/exam/systems': ['exam-systems:read'],
	'POST:/exam/systems': ['exam-systems:create'],
	'PUT:/exam/systems/:id': ['exam-systems:update'],
	'DELETE:/exam/systems/:id': ['exam-systems:delete'],
	'GET:/exam/majors': ['exam-majors:read'],
	'POST:/exam/majors': ['exam-majors:create'],
	'PUT:/exam/majors/:id': ['exam-majors:update'],
	'DELETE:/exam/majors/:id': ['exam-majors:delete'],
	'GET:/exam/faculties': ['exam-faculties:read'],
	'POST:/exam/faculties': ['exam-faculties:create'],
	'PUT:/exam/faculties/:id': ['exam-faculties:update'],
	'DELETE:/exam/faculties/:id': ['exam-faculties:delete'],
	'GET:/exam/subjects': ['exam-subjects:read'],
	'POST:/exam/subjects': ['exam-subjects:create'],
	'PUT:/exam/subjects/:id': ['exam-subjects:update'],
	'DELETE:/exam/subjects/:id': ['exam-subjects:delete'],
	'GET:/exam/classes': ['exam-classes:read'],
	'POST:/exam/classes': ['exam-classes:create'],
	'PUT:/exam/classes/:id': ['exam-classes:update'],
	'DELETE:/exam/classes/:id': ['exam-classes:delete'],
	'GET:/exam/assignments': ['exam-assignments:read'],
	'POST:/exam/assignments': ['exam-assignments:create'],
	'PUT:/exam/assignments/:id': ['exam-assignments:update'],
	'DELETE:/exam/assignments/:id': ['exam-assignments:delete'],
	'GET:/exam/assignment-logs': ['exam-assignments:read'],
	'GET:/exam/academic-titles': ['exam-teachers:read'],
	'POST:/exam/academic-titles': ['exam-teachers:create'],
	'PATCH:/exam/academic-titles/:id': ['exam-teachers:update'],
	'DELETE:/exam/academic-titles/:id': ['exam-teachers:delete'],
	'GET:/exam/faculty-options': ['exam-faculties:read'],
	'GET:/exam/faculty-heads': ['exam-faculties:read'],
	'POST:/exam/faculty-heads': ['exam-faculties:update'],
	'DELETE:/exam/faculty-heads/:facultyCode': ['exam-faculties:update'],
	'GET:/exam/teacher-catalog': ['exam-teachers:read'],
	'POST:/exam/teacher-catalog': ['exam-teachers:create'],
	'PATCH:/exam/teacher-catalog/:id': ['exam-teachers:update'],
	'DELETE:/exam/teacher-catalog/:id': ['exam-teachers:delete'],
	'GET:/exam/teachers': ['exam-teachers:read'],
	'GET:/exam/teacher-candidates': ['exam-teachers:read'],
	'POST:/exam/exams/:id/decide': ['exam-approvals:update'],
	'POST:/exam/exams/:id/generate-qr': ['exam-approvals:update'],
	'GET:/exam/pending-count': ['exam-approvals:read'],
	'GET:/exam/approval-board': ['exam-approvals:read'],
	'GET:/exam/bgh-board': ['exam-approvals:read'],
	'POST:/exam/bgh-approve-batch': ['exam-approvals:update'],

	'POST:/roles': ['roles:create'],
	'GET:/roles': ['roles:read'],
	'GET:/roles/:id': ['roles:read'],
	'PUT:/roles/:id': ['roles:update'],
	'DELETE:/roles': ['roles:delete'],

	// Asset management — buildings / floors / rooms
	'POST:/buildings': ['buildings:create'],
	'GET:/buildings': ['buildings:read'],
	'GET:/buildings/tree': ['buildings:read'],
	'GET:/buildings/:id': ['buildings:read'],
	'PATCH:/buildings/:id': ['buildings:update'],
	'DELETE:/buildings': ['buildings:delete'],

	'POST:/floors': ['floors:create'],
	'GET:/floors': ['floors:read'],
	'GET:/floors/:id': ['floors:read'],
	'PATCH:/floors/:id': ['floors:update'],
	'DELETE:/floors': ['floors:delete'],

	'POST:/rooms': ['rooms:create'],
	'GET:/rooms': ['rooms:read'],
	'GET:/rooms/:id': ['rooms:read'],
	'GET:/rooms/:id/profile': ['rooms:read'],
	'PATCH:/rooms/:id': ['rooms:update'],
	'DELETE:/rooms': ['rooms:delete'],

	// Room assets / images / logs
	'POST:/room-assets': ['room-assets:create'],
	'GET:/room-assets': ['room-assets:read'],
	'GET:/room-assets/:id': ['room-assets:read'],
	'PATCH:/room-assets/:id': ['room-assets:update'],
	'DELETE:/room-assets': ['room-assets:delete'],

	'POST:/room-images': ['room-images:create'],
	'GET:/room-images': ['room-images:read'],
	'GET:/room-images/:id': ['room-images:read'],
	'PATCH:/room-images/:id': ['room-images:update'],
	'DELETE:/room-images': ['room-images:delete'],

	'POST:/repair-logs': ['repair-logs:create'],
	'GET:/repair-logs': ['repair-logs:read'],
	'GET:/repair-logs/:id': ['repair-logs:read'],
	'PATCH:/repair-logs/:id': ['repair-logs:update'],
	'DELETE:/repair-logs': ['repair-logs:delete'],

	'POST:/inventory-logs': ['inventory-logs:create'],
	'GET:/inventory-logs': ['inventory-logs:read'],
	'GET:/inventory-logs/:id': ['inventory-logs:read'],
	'PATCH:/inventory-logs/:id': ['inventory-logs:update'],
	'DELETE:/inventory-logs': ['inventory-logs:delete'],

	'POST:/replacement-logs': ['replacement-logs:create'],
	'GET:/replacement-logs': ['replacement-logs:read'],
	'GET:/replacement-logs/:id': ['replacement-logs:read'],
	'PATCH:/replacement-logs/:id': ['replacement-logs:update'],
	'DELETE:/replacement-logs': ['replacement-logs:delete'],

	// Asset reports (BGH có asset-reports:read + room-assets:read → stats/kho)
	'GET:/asset-reports/stats': ['asset-reports:read', 'room-assets:read'],
	'GET:/asset-reports/broken': ['asset-reports:read', 'room-assets:read'],
	'GET:/asset-reports/expiring': ['asset-reports:read', 'room-assets:read'],
	// Lịch sử SC / nhật ký — cần repair-logs hoặc asset-movements (BGH không có)
	'GET:/asset-reports/repairs': ['repair-logs:read'],
	'GET:/asset-reports/movements': ['asset-movements:read'],
	'GET:/asset-movement-logs': ['asset-movements:read'],
	// Nhật ký VT hỏng — BGH không có repair-requests/repair-logs
	'GET:/asset-broken-logs': ['repair-requests:read', 'repair-logs:read'],

	// Phiếu báo hỏng / phân công
	'POST:/repair-requests': ['repair-requests:create'],
	'GET:/repair-requests': ['repair-requests:read'],
	'GET:/repair-requests/:id': ['repair-requests:read'],
	'PATCH:/repair-requests/:id/assign': ['repair-requests:update'],
	'PATCH:/repair-requests/:id/complete': ['repair-requests:update'],
	'PATCH:/repair-requests/:id/cancel': ['repair-requests:update'],

	// Danh mục ngành / chuyên ngành / VT
	'GET:/asset-catalog': ['asset-catalog:read', 'room-assets:read'],
	'GET:/asset-catalog/counts': ['asset-catalog:read', 'room-assets:read'],
	'GET:/asset-catalog/next-code': [
		'asset-catalog:create',
		'room-assets:create'
	],
	'GET:/asset-catalog/next-nganh-code': [
		'asset-catalog:create',
		'room-assets:create'
	],
	'GET:/asset-catalog/next-chuyen-nganh-code': [
		'asset-catalog:create',
		'room-assets:create'
	],
	'POST:/asset-catalog/materials': [
		'asset-catalog:create',
		'room-assets:create'
	],
	'POST:/asset-catalog/nganh': ['asset-catalog:create', 'room-assets:create'],
	'POST:/asset-catalog/chuyen-nganh': [
		'asset-catalog:create',
		'room-assets:create'
	],
	'PATCH:/asset-catalog/categories/:id': [
		'asset-catalog:update',
		'room-assets:update'
	],
	// User ngành + log tăng/giảm danh mục
	'GET:/asset-catalog/my-nganh': [
		'catalog-stock:read',
		'asset-catalog:read',
		'room-assets:read'
	],
	'GET:/asset-catalog/user-nganh': ['asset-catalog:read', 'room-assets:read'],
	'POST:/asset-catalog/user-nganh': [
		'asset-catalog:create',
		'room-assets:create'
	],
	'POST:/asset-catalog/stock-movements': [
		'catalog-stock:create',
		'room-assets:create'
	],
	'GET:/asset-catalog/stock-logs': ['catalog-stock:read', 'room-assets:read'],
	// Đề xuất sửa chữa / thu hồi / thanh lý
	'GET:/asset-proposals/pending-count': [
		'asset-proposals:read',
		'room-assets:read'
	],
	'GET:/asset-proposals/liquidations': [
		'asset-proposals:read',
		'room-assets:read'
	],
	'GET:/asset-proposals': ['asset-proposals:read', 'room-assets:read'],
	'GET:/asset-proposals/:id': ['asset-proposals:read', 'room-assets:read'],
	'POST:/asset-proposals': ['asset-proposals:create', 'room-assets:create'],
	// BGH (admin) có asset-proposals:update nhưng không cần room-assets:update
	'POST:/asset-proposals/:id/decide': [
		'asset-proposals:update',
		'asset-proposals:read',
		'room-assets:update'
	],
	'GET:/asset-proposal-logs': [
		'asset-proposals:read',
		'room-assets:read',
		'asset-proposals:update'
	]
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
		const separator = pattern.indexOf(':')
		const patternMethod = pattern.slice(0, separator)
		const patternPath = pattern.slice(separator + 1)
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
			throw AppError.handleAppErr(
				AppError.unauthenticated('Authentication required')
			)
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

		// OR: đủ 1 trong danh sách quyền là được (hỗ trợ quyền mới + quyền legacy)
		const hasPermission = requiredPermissions.some((required) =>
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

			// Phải map sang APIError — throw AppError thuần → client thấy "internal error"
			throw AppError.handleAppErr(
				AppError.permissionDenied(
					`Thiếu quyền: ${requiredPermissions.join(' hoặc ')}`
				)
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
