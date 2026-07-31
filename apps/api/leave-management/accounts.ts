import { api, APIError } from 'encore.dev/api'
import { eq } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import { users } from '../schema/users'
import { leavePersonnel, leaveUnits } from '../schema/leave-management'

type LeaveAccountKind = 'personnel' | 'commander' | 'management'

export const AssignLeaveAccount = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/accounts/assign'
	},
	async (body: {
		userId: number
		kind: LeaveAccountKind
		personnelId?: number
		unitId?: number
		managementArea?: 'cán_bộ' | 'quân_lực'
	}): Promise<{ ok: boolean }> => {
		if (!getAuthData()?.isSuperAdmin) {
			throw APIError.permissionDenied(
				'Chỉ admin được gán loại tài khoản phép'
			)
		}
		const user = await orm
			.select()
			.from(users)
			.where(eq(users.id, body.userId))
			.limit(1)
		if (!user[0]) throw APIError.notFound('Không tìm thấy tài khoản')

		if (body.kind === 'personnel') {
			if (!body.personnelId)
				throw APIError.invalidArgument('Chọn quân nhân')
			const p = await orm
				.select()
				.from(leavePersonnel)
				.where(eq(leavePersonnel.id, body.personnelId))
				.limit(1)
			if (!p[0]) throw APIError.notFound('Không tìm thấy quân nhân')
			if (p[0].userId && p[0].userId !== body.userId) {
				throw APIError.alreadyExists('Quân nhân đã có tài khoản')
			}
			await orm
				.update(leavePersonnel)
				.set({ userId: body.userId, email: p[0].email })
				.where(eq(leavePersonnel.id, body.personnelId))
			await orm
				.update(users)
				.set({
					position: 'Quân nhân',
					leaveUnitId: p[0].unitId,
					managementArea: p[0].managementArea
				})
				.where(eq(users.id, body.userId))
		} else if (body.kind === 'commander') {
			if (!body.unitId)
				throw APIError.invalidArgument('Chọn cơ quan chỉ huy')
			const u = await orm
				.select()
				.from(leaveUnits)
				.where(eq(leaveUnits.id, body.unitId))
				.limit(1)
			if (!u[0]) throw APIError.notFound('Không tìm thấy cơ quan')
			await orm
				.update(leaveUnits)
				.set({
					commanderUserId: body.userId,
					commanderName: user[0].displayName
				})
				.where(eq(leaveUnits.id, body.unitId))
			await orm
				.update(users)
				.set({
					position: 'Chỉ huy cơ quan',
					leaveUnitId: body.unitId,
					managementArea: u[0].managementArea
				})
				.where(eq(users.id, body.userId))
			await orm
				.update(leavePersonnel)
				.set({
					commanderUserId: body.userId,
					commanderName: user[0].displayName
				})
				.where(eq(leavePersonnel.unitId, body.unitId))
		} else {
			if (!body.managementArea) {
				throw APIError.invalidArgument('Chọn Cán bộ hoặc Quân lực')
			}
			await orm
				.update(users)
				.set({
					position: 'Cơ quan quản lý',
					leaveUnitId: null,
					managementArea: body.managementArea
				})
				.where(eq(users.id, body.userId))
		}
		return { ok: true }
	}
)
