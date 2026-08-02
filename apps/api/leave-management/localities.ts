/**
 * CRUD danh sách địa phương: Tỉnh → Xã/Phường → Thôn
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, asc, eq, isNull } from 'drizzle-orm'
import orm from '../database'
import {
	leaveLocalities,
	type LeaveLocalityLevel
} from '../schema/leave-management'

export interface LocalityResponse {
	id: number
	createdAt: string
	updatedAt: string
	name: string
	level: LeaveLocalityLevel
	parentId: number | null
	code: string | null
	children?: LocalityResponse[]
}

function mapRow(r: typeof leaveLocalities.$inferSelect): LocalityResponse {
	return {
		id: r.id,
		createdAt: r.createdAt ?? '',
		updatedAt: r.updatedAt ?? '',
		name: r.name,
		level: r.level as LeaveLocalityLevel,
		parentId: r.parentId,
		code: r.code
	}
}

const LEVELS: LeaveLocalityLevel[] = ['province', 'ward', 'village']

function isLevel(v: string): v is LeaveLocalityLevel {
	return LEVELS.includes(v as LeaveLocalityLevel)
}

export const ListLeaveLocalities = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/localities'
	},
	async (q: {
		level?: Query<string>
		parentId?: Query<number>
		tree?: Query<boolean>
	}): Promise<{ data: LocalityResponse[] }> => {
		if (q.tree) {
			const all = await orm
				.select()
				.from(leaveLocalities)
				.orderBy(asc(leaveLocalities.name))
			const mapped = all.map(mapRow)
			const byParent = new Map<number | null, LocalityResponse[]>()
			for (const row of mapped) {
				const key = row.parentId
				if (!byParent.has(key)) byParent.set(key, [])
				byParent.get(key)!.push(row)
			}
			const attach = (node: LocalityResponse): LocalityResponse => {
				const kids = byParent.get(node.id) || []
				return {
					...node,
					children: kids.map(attach)
				}
			}
			const roots = (byParent.get(null) || []).map(attach)
			return { data: roots }
		}

		const conditions = []
		if (q.level && isLevel(String(q.level))) {
			conditions.push(
				eq(leaveLocalities.level, q.level as LeaveLocalityLevel)
			)
		}
		if (q.parentId != null && Number(q.parentId) > 0) {
			conditions.push(eq(leaveLocalities.parentId, Number(q.parentId)))
		} else if (
			q.parentId === 0 ||
			(q.level && String(q.level) === 'province')
		) {
			// provinces: parent null
			if (!q.parentId || Number(q.parentId) === 0) {
				if (String(q.level || '') === 'province' || q.parentId === 0) {
					conditions.push(isNull(leaveLocalities.parentId))
				}
			}
		}

		const rows = await orm
			.select()
			.from(leaveLocalities)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(asc(leaveLocalities.name))
		return { data: rows.map(mapRow) }
	}
)

interface CreateLocalityBody {
	name: string
	level: string
	parentId?: number | null
	code?: string | null
}

export const CreateLeaveLocality = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/localities'
	},
	async (body: CreateLocalityBody): Promise<{ data: LocalityResponse }> => {
		if (!body.name?.trim()) {
			throw APIError.invalidArgument('Tên địa phương là bắt buộc')
		}
		if (!isLevel(body.level)) {
			throw APIError.invalidArgument(
				'Cấp phải là province | ward | village'
			)
		}
		if (body.level === 'province' && body.parentId) {
			throw APIError.invalidArgument('Tỉnh không có đơn vị cha')
		}
		if (body.level !== 'province') {
			if (!body.parentId) {
				throw APIError.invalidArgument('Cần chọn địa phương cha')
			}
			const parent = await orm
				.select()
				.from(leaveLocalities)
				.where(eq(leaveLocalities.id, body.parentId))
				.limit(1)
			if (!parent[0]) throw APIError.invalidArgument('Không tìm thấy cha')
			const expectedParent = body.level === 'ward' ? 'province' : 'ward'
			if (parent[0].level !== expectedParent) {
				throw APIError.invalidArgument(
					`Cấp cha phải là ${expectedParent}`
				)
			}
		}
		const inserted = await orm
			.insert(leaveLocalities)
			.values({
				name: body.name.trim(),
				level: body.level as LeaveLocalityLevel,
				parentId: body.parentId ?? null,
				code: body.code || null
			})
			.returning()
		return { data: mapRow(inserted[0]!) }
	}
)

export const UpdateLeaveLocality = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/leave/localities/:id'
	},
	async ({
		id,
		name,
		code
	}: {
		id: number
		name?: string
		code?: string | null
	}): Promise<{ data: LocalityResponse }> => {
		const existing = await orm
			.select()
			.from(leaveLocalities)
			.where(eq(leaveLocalities.id, id))
			.limit(1)
		if (!existing[0]) throw APIError.notFound('Không tìm thấy địa phương')
		const updated = await orm
			.update(leaveLocalities)
			.set({
				...(name != null ? { name: name.trim() } : {}),
				...(code !== undefined ? { code: code || null } : {})
			})
			.where(eq(leaveLocalities.id, id))
			.returning()
		return { data: mapRow(updated[0]!) }
	}
)

export const DeleteLeaveLocality = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/leave/localities/:id'
	},
	async ({ id }: { id: number }): Promise<{ ok: boolean }> => {
		const children = await orm
			.select()
			.from(leaveLocalities)
			.where(eq(leaveLocalities.parentId, id))
			.limit(1)
		if (children[0]) {
			throw APIError.failedPrecondition(
				'Còn địa phương con — xóa con trước'
			)
		}
		const res = await orm
			.delete(leaveLocalities)
			.where(eq(leaveLocalities.id, id))
			.returning()
		if (!res[0]) throw APIError.notFound('Không tìm thấy địa phương')
		return { ok: true }
	}
)

/** Build path "Tỉnh > Xã > Thôn" */
export async function resolveLocalityPath(
	localityId: number | null | undefined
): Promise<string | null> {
	if (!localityId) return null
	const parts: string[] = []
	let currentId: number | null = localityId
	for (let i = 0; i < 5 && currentId; i++) {
		const rows = await orm
			.select()
			.from(leaveLocalities)
			.where(eq(leaveLocalities.id, currentId))
			.limit(1)
		if (!rows[0]) break
		parts.unshift(rows[0].name)
		currentId = rows[0].parentId
	}
	return parts.length ? parts.join(' > ') : null
}

export interface ImportLocalityItem {
	/** Tên tỉnh (bắt buộc) */
	province: string
	/** Tên xã/phường (tuỳ chọn) */
	ward?: string | null
	/** Tên thôn (tuỳ chọn — cần ward) */
	village?: string | null
	provinceCode?: string | null
	wardCode?: string | null
	villageCode?: string | null
}

export interface ImportLocalityResult {
	successCount: number
	errorCount: number
	totalCount: number
	createdCount: number
	skippedCount: number
	errors: { row: number; message: string }[]
}

function cacheKey(
	level: LeaveLocalityLevel,
	parentId: number | null,
	name: string
): string {
	return `${level}|${parentId ?? 'null'}|${name}`
}

function normalizeLocalityName(name: string): string {
	return name.replace(/\s+/g, ' ').trim()
}

/**
 * Import địa phương dạng phẳng (file 3321 xã/phường):
 * mỗi dòng = Tỉnh/TP + Xã/Phường (+ tuỳ chọn Thôn).
 * Cache in-memory để import ~3k dòng nhanh.
 */
export const ImportLeaveLocalities = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/localities/import'
	},
	async (body: {
		items: ImportLocalityItem[]
	}): Promise<{ data: ImportLocalityResult }> => {
		const items = body.items || []
		if (!items.length) {
			throw APIError.invalidArgument('Danh sách import trống')
		}
		if (items.length > 10000) {
			throw APIError.invalidArgument('Tối đa 10000 dòng mỗi lần import')
		}

		// Preload existing localities into cache
		const all = await orm.select().from(leaveLocalities)
		const byKey = new Map<string, { id: number; code: string | null }>()
		for (const r of all) {
			byKey.set(
				cacheKey(
					r.level as LeaveLocalityLevel,
					r.parentId,
					normalizeLocalityName(r.name)
				),
				{ id: r.id, code: r.code }
			)
		}

		const findOrCreate = async (
			name: string,
			level: LeaveLocalityLevel,
			parentId: number | null,
			code?: string | null
		): Promise<{ id: number; created: boolean }> => {
			const n = normalizeLocalityName(name)
			const key = cacheKey(level, parentId, n)
			const hit = byKey.get(key)
			if (hit) {
				if (code && !hit.code) {
					await orm
						.update(leaveLocalities)
						.set({ code })
						.where(eq(leaveLocalities.id, hit.id))
					hit.code = code
				}
				return { id: hit.id, created: false }
			}
			const inserted = await orm
				.insert(leaveLocalities)
				.values({
					name: n,
					level,
					parentId,
					code: code || null
				})
				.returning()
			const id = inserted[0]!.id
			byKey.set(key, { id, code: code || null })
			return { id, created: true }
		}

		const errors: { row: number; message: string }[] = []
		let successCount = 0
		let createdCount = 0
		let skippedCount = 0

		for (let i = 0; i < items.length; i++) {
			const row = i + 1
			const item = items[i]!
			const province = normalizeLocalityName(String(item.province || ''))
			if (!province) {
				errors.push({ row, message: 'Tên tỉnh/thành phố là bắt buộc' })
				continue
			}
			const ward = item.ward
				? normalizeLocalityName(String(item.ward))
				: ''
			const village = item.village
				? normalizeLocalityName(String(item.village))
				: ''
			if (village && !ward) {
				errors.push({
					row,
					message: 'Thôn cần có Xã/Phường'
				})
				continue
			}

			try {
				let anyCreated = false
				const p = await findOrCreate(
					province,
					'province',
					null,
					item.provinceCode
						? String(item.provinceCode).trim() || null
						: null
				)
				if (p.created) anyCreated = true

				if (ward) {
					const w = await findOrCreate(
						ward,
						'ward',
						p.id,
						item.wardCode
							? String(item.wardCode).trim() || null
							: null
					)
					if (w.created) anyCreated = true

					if (village) {
						const v = await findOrCreate(
							village,
							'village',
							w.id,
							item.villageCode
								? String(item.villageCode).trim() || null
								: null
						)
						if (v.created) anyCreated = true
					}
				}

				successCount++
				if (anyCreated) createdCount++
				else skippedCount++
			} catch (e: unknown) {
				errors.push({
					row,
					message: String((e as Error)?.message || e)
				})
			}
		}

		return {
			data: {
				successCount,
				errorCount: errors.length,
				totalCount: items.length,
				createdCount,
				skippedCount,
				errors
			}
		}
	}
)
