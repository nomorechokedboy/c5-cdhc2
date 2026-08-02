import { api, APIError, Query } from 'encore.dev/api'
import { and, eq } from 'drizzle-orm'
import orm from '../database'
import { leaveClasses, leaveUnits } from '../schema/leave-management'

export interface LeaveClassResponse {
	id: number
	unitId: number
	unitName: string
	name: string
	isActive: boolean
}

export const ListLeaveClasses = api(
	{ auth: true, expose: true, method: 'GET', path: '/leave/classes' },
	async (q: {
		unitId?: Query<number>
	}): Promise<{ data: LeaveClassResponse[] }> => {
		const rows = await orm
			.select({
				id: leaveClasses.id,
				unitId: leaveClasses.unitId,
				unitName: leaveUnits.name,
				name: leaveClasses.name,
				isActive: leaveClasses.isActive
			})
			.from(leaveClasses)
			.innerJoin(leaveUnits, eq(leaveClasses.unitId, leaveUnits.id))
			.where(
				q.unitId != null
					? eq(leaveClasses.unitId, Number(q.unitId))
					: undefined
			)
			.orderBy(leaveUnits.name, leaveClasses.name)
		return { data: rows }
	}
)

export const CreateLeaveClass = api(
	{ auth: true, expose: true, method: 'POST', path: '/leave/classes' },
	async (body: {
		unitId: number
		name: string
	}): Promise<{ data: LeaveClassResponse }> => {
		const name = body.name?.trim()
		if (!name) {
			throw APIError.invalidArgument('Tên lớp là bắt buộc')
		}
		const unit = await orm
			.select()
			.from(leaveUnits)
			.where(
				and(
					eq(leaveUnits.id, body.unitId),
					eq(leaveUnits.level, 'company')
				)
			)
			.limit(1)
		if (!unit[0])
			throw APIError.invalidArgument('Lớp chỉ được tạo trong đại đội')
		const row = (
			await orm
				.insert(leaveClasses)
				.values({ unitId: body.unitId, name })
				.returning()
		)[0]!
		return {
			data: {
				id: row.id,
				unitId: row.unitId,
				unitName: unit[0].name,
				name: row.name,
				isActive: row.isActive
			}
		}
	}
)

export const DeleteLeaveClass = api(
	{ auth: true, expose: true, method: 'DELETE', path: '/leave/classes/:id' },
	async ({ id }: { id: number }): Promise<{ ok: boolean }> => {
		await orm.delete(leaveClasses).where(eq(leaveClasses.id, id))
		return { ok: true }
	}
)
