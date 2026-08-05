/**
 * Vai trò truy cập phân hệ phép: admin | commander | personnel
 */
import { api } from 'encore.dev/api'
import { eq } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import { users } from '../schema/users'
import { leaveUnits } from '../schema/leave-management'
import { leavePersonnel } from '../schema/leave-management'

export type LeaveAccessRole =
	| 'admin'
	| 'commander'
	| 'agency'
	| 'personnel'
	| 'none'

export interface LeaveAccess {
	role: LeaveAccessRole
	isAdmin: boolean
	/** Là chỉ huy CQ của ít nhất 1 đơn vị */
	isCommander: boolean
	/** Tài khoản Cơ quan quản lý (Cán bộ / Quân lực) */
	isAgency: boolean
	/** Có hồ sơ quân nhân liên kết */
	isPersonnel: boolean
	/** Được lập đề xuất phép (admin / chỉ huy / quân nhân, không áp dụng CQQL) */
	canPropose: boolean
	/** Có ít nhất một quyền trong phân hệ quản lý phép */
	hasModuleAccess: boolean
	/** Được xem và xử lý danh sách duyệt */
	canApprove: boolean
	/** Được đọc các danh mục phục vụ lập phiếu */
	canReadCatalogs: boolean
	/** Được thêm, xóa, sửa các danh mục quản lý phép */
	canManageCatalogs: boolean
	/** Được xem báo cáo và dữ liệu lưu trữ */
	canViewReports: boolean
	/** Được quản lý cấu hình phân hệ phép */
	canManageSettings: boolean
	managementArea: string | null
	/** Đơn vị được phụ trách (leave_units.id); admin = [] nghĩa là tất cả */
	unitIds: number[]
	/** Tên đơn vị phụ trách */
	unitNames: string[]
}

/** Tính quyền leave cho user hiện tại (dùng trong API khác) */
export async function resolveLeaveAccess(
	userId: number,
	isSuperAdmin: boolean,
	permissions: string[] = []
): Promise<LeaveAccess> {
	const hasFullLeaveAccess = [
		'leave-proposals:create',
		'leave-approvals:update',
		'leave-catalogs:update',
		'leave-reports:read',
		'leave-settings:update'
	].every((permission) => permissions.includes(permission))

	if (isSuperAdmin || hasFullLeaveAccess) {
		return {
			role: 'admin',
			isAdmin: true,
			isCommander: true,
			isAgency: true,
			isPersonnel: false,
			canPropose: true,
			hasModuleAccess: true,
			canApprove: true,
			canReadCatalogs: true,
			canManageCatalogs: true,
			canViewReports: true,
			canManageSettings: true,
			managementArea: null,
			unitIds: [],
			unitNames: []
		}
	}

	const asUnitCmd = await orm
		.select()
		.from(leaveUnits)
		.where(eq(leaveUnits.commanderUserId, userId))
	const account = await orm
		.select({
			position: users.position,
			managementArea: users.managementArea
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)
	const isAgency = account[0]?.position === 'Cơ quan quản lý'
	const managementArea = account[0]?.managementArea ?? null

	const unitIds = [
		...new Set(
			asUnitCmd.map((u) => u.id).filter((id): id is number => id != null)
		)
	]
	const unitNames = asUnitCmd.map((u) => u.name)

	// Cũng coi là chỉ huy nếu còn gán trên hồ sơ QN (dữ liệu cũ)
	const asPersCmd = await orm
		.select({ unitId: leavePersonnel.unitId })
		.from(leavePersonnel)
		.where(eq(leavePersonnel.commanderUserId, userId))
	for (const p of asPersCmd) {
		if (p.unitId != null && !unitIds.includes(p.unitId)) {
			unitIds.push(p.unitId)
		}
	}
	const isCommander = unitIds.length > 0
	if (isAgency && managementArea) {
		const managedUnits = await orm
			.select({ id: leaveUnits.id, name: leaveUnits.name })
			.from(leaveUnits)
			.where(eq(leaveUnits.managementArea, managementArea))
		for (const unit of managedUnits) {
			if (!unitIds.includes(unit.id)) unitIds.push(unit.id)
			if (!unitNames.includes(unit.name)) unitNames.push(unit.name)
		}
	}

	const myPersonnel = await orm
		.select({ id: leavePersonnel.id })
		.from(leavePersonnel)
		.where(eq(leavePersonnel.userId, userId))
		.limit(1)

	const isPersonnel = !!myPersonnel[0]

	let role: LeaveAccessRole = 'none'
	if (isAgency) role = 'agency'
	else if (isCommander) role = 'commander'
	else if (isPersonnel) role = 'personnel'

	const granularPermissions = permissions.filter((permission) =>
		permission.startsWith('leave-')
	)
	const hasGranularPermissions = granularPermissions.length > 0
	const hasPermission = (permission: string) =>
		granularPermissions.includes(permission)
	const roleCanPropose = (isCommander || isPersonnel) && !isAgency
	const roleCanApprove = isCommander || isAgency
	const roleCanManageCatalogs = isAgency
	const roleCanViewReports = isCommander || isAgency

	return {
		role,
		isAdmin: false,
		isCommander,
		isAgency,
		isPersonnel,
		canPropose:
			roleCanPropose &&
			(!hasGranularPermissions ||
				hasPermission('leave-proposals:create')),
		hasModuleAccess: role !== 'none' || hasGranularPermissions,
		canApprove:
			roleCanApprove &&
			(!hasGranularPermissions ||
				hasPermission('leave-approvals:update')),
		canReadCatalogs:
			!hasGranularPermissions || hasPermission('leave-catalogs:read'),
		canManageCatalogs:
			roleCanManageCatalogs &&
			(!hasGranularPermissions ||
				hasPermission('leave-catalogs:create') ||
				hasPermission('leave-catalogs:update') ||
				hasPermission('leave-catalogs:delete')),
		canViewReports:
			roleCanViewReports &&
			(!hasGranularPermissions || hasPermission('leave-reports:read')),
		canManageSettings:
			hasPermission('leave-settings:read') ||
			hasPermission('leave-settings:update'),
		managementArea,
		unitIds,
		unitNames
	}
}

export const GetLeaveMyAccess = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/my-access'
	},
	async (): Promise<{ data: LeaveAccess }> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const data = await resolveLeaveAccess(
			uid,
			!!auth.isSuperAdmin,
			auth.permissions || []
		)
		// super admin: check if also has personnel
		if (data.isAdmin) {
			const p = await orm
				.select({ id: leavePersonnel.id })
				.from(leavePersonnel)
				.where(eq(leavePersonnel.userId, uid))
				.limit(1)
			return {
				data: {
					...data,
					isPersonnel: !!p[0]
				}
			}
		}
		return { data }
	}
)
