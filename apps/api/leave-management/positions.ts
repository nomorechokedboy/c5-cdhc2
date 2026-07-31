import { api, APIError, Query } from 'encore.dev/api'
import { asc, eq } from 'drizzle-orm'
import orm from '../database'
import { leavePositions } from '../schema/leave-positions'

type PositionResponse = {
	id: number
	name: string
	sortOrder: number
	isActive: boolean
}

const mapPosition = (
	row: typeof leavePositions.$inferSelect
): PositionResponse => ({
	id: row.id,
	name: row.name,
	sortOrder: row.sortOrder,
	isActive: !!row.isActive
})

export const ListLeavePositions = api(
	{ auth: true, expose: true, method: 'GET', path: '/leave/positions' },
	async (q: {
		activeOnly?: Query<boolean>
	}): Promise<{ data: PositionResponse[] }> => {
		const activeOnly = String(q.activeOnly ?? 'true') !== 'false'
		const rows = await orm
			.select()
			.from(leavePositions)
			.where(activeOnly ? eq(leavePositions.isActive, true) : undefined)
			.orderBy(asc(leavePositions.sortOrder), asc(leavePositions.name))
		return { data: rows.map(mapPosition) }
	}
)

export const CreateLeavePosition = api(
	{ auth: true, expose: true, method: 'POST', path: '/leave/positions' },
	async (body: {
		name: string
		sortOrder?: number
		isActive?: boolean
	}): Promise<{ data: PositionResponse }> => {
		if (!body.name?.trim())
			throw APIError.invalidArgument('Tên chức vụ là bắt buộc')
		try {
			const rows = await orm
				.insert(leavePositions)
				.values({
					name: body.name.trim(),
					sortOrder: body.sortOrder ?? 0,
					isActive: body.isActive !== false
				})
				.returning()
			return { data: mapPosition(rows[0]!) }
		} catch {
			throw APIError.alreadyExists('Chức vụ đã tồn tại')
		}
	}
)

export const UpdateLeavePosition = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/leave/positions/:id' },
	async ({
		id,
		...body
	}: {
		id: number
		name?: string
		sortOrder?: number
		isActive?: boolean
	}): Promise<{ data: PositionResponse }> => {
		const rows = await orm
			.update(leavePositions)
			.set({
				...(body.name !== undefined ? { name: body.name.trim() } : {}),
				...(body.sortOrder !== undefined
					? { sortOrder: body.sortOrder }
					: {}),
				...(body.isActive !== undefined
					? { isActive: body.isActive }
					: {}),
				updatedAt: new Date().toISOString()
			})
			.where(eq(leavePositions.id, id))
			.returning()
		if (!rows[0]) throw APIError.notFound('Không tìm thấy chức vụ')
		return { data: mapPosition(rows[0]) }
	}
)

export const DeleteLeavePosition = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/leave/positions/:id'
	},
	async ({ id }: { id: number }): Promise<{ ok: boolean }> => {
		const rows = await orm
			.delete(leavePositions)
			.where(eq(leavePositions.id, id))
			.returning()
		if (!rows[0]) throw APIError.notFound('Không tìm thấy chức vụ')
		return { ok: true }
	}
)
