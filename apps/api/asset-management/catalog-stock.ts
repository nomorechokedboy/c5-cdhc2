/**
 * Tăng/giảm số lượng danh mục vật tư theo ngành (user ngành).
 * Đồng bộ materials.quantity + ghi catalog_stock_logs (admin xem).
 */
import { api, APIError, Query } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import { and, asc, desc, eq, like, sql } from 'drizzle-orm'
import orm from '../database'
import { categories } from '../schema/categories'
import { materials } from '../schema/materials'
import { userNganh } from '../schema/user-nganh'
import { catalogStockLogs } from '../schema/catalog-stock-logs'
import { users } from '../schema/users'
import log from 'encore.dev/log'

function nganhFromCode(code: string): string {
	const u = code.trim().toUpperCase()
	const m = u.match(/^(HC2[A-Z])/)
	return m ? m[1]! : u.slice(0, 4)
}

function isNganhCode(code: string): boolean {
	return /^HC2[A-Z]$/.test(code.trim().toUpperCase())
}

function isChuyenNganhCode(code: string): boolean {
	return /^HC2[A-Z]\d{2}$/.test(code.trim().toUpperCase())
}

function nextMaterialCode(
	chuyenNganhCode: string,
	existingCodes: string[]
): string {
	const prefix = chuyenNganhCode.trim().toUpperCase()
	let maxSeq = 0
	for (const c of existingCodes) {
		const u = c.trim().toUpperCase()
		if (!u.startsWith(prefix)) continue
		const rest = u.slice(prefix.length)
		const n = parseInt(rest, 10)
		if (Number.isFinite(n) && n > maxSeq) maxSeq = n
	}
	return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
}

function nextChuyenNganhCode(nganhCode: string, existing: string[]): string {
	const prefix = nganhCode.trim().toUpperCase()
	let maxSeq = 0
	for (const c of existing) {
		const u = c.trim().toUpperCase()
		if (!u.startsWith(prefix)) continue
		const rest = u.slice(prefix.length)
		const n = parseInt(rest, 10)
		if (Number.isFinite(n) && n > maxSeq) maxSeq = n
	}
	return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
}

async function getUserNganhCodes(userId: number): Promise<string[]> {
	const rows = await orm
		.select({ code: userNganh.nganhCode })
		.from(userNganh)
		.where(eq(userNganh.userId, userId))
	return rows.map((r) => r.code.toUpperCase())
}

async function assertUserCanAccessNganh(
	userId: number,
	isAdmin: boolean,
	nganhCode: string
) {
	if (isAdmin) return
	const codes = await getUserNganhCodes(userId)
	if (!codes.includes(nganhCode.toUpperCase())) {
		throw APIError.permissionDenied(`Bạn không được gán ngành ${nganhCode}`)
	}
}

export interface CatalogStockLogResponse {
	id: number
	createdAt: string
	movementType: string
	executedAt: string
	materialId: number | null
	materialCode: string | null
	materialName: string
	nganhCode: string
	chuyenNganhCode: string | null
	chuyenNganhName: string | null
	quantity: number
	quantityBefore: number
	quantityAfter: number
	unit: string | null
	isNewMaterial: boolean
	reason: string | null
	note: string | null
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	actorIsAdmin: boolean
}

function toLogResponse(
	r: typeof catalogStockLogs.$inferSelect
): CatalogStockLogResponse {
	return {
		id: r.id,
		createdAt: r.createdAt,
		movementType: r.movementType,
		executedAt: r.executedAt,
		materialId: r.materialId ?? null,
		materialCode: r.materialCode ?? null,
		materialName: r.materialName,
		nganhCode: r.nganhCode,
		chuyenNganhCode: r.chuyenNganhCode ?? null,
		chuyenNganhName: r.chuyenNganhName ?? null,
		quantity: r.quantity,
		quantityBefore: r.quantityBefore,
		quantityAfter: r.quantityAfter,
		unit: r.unit ?? null,
		isNewMaterial: !!r.isNewMaterial,
		reason: r.reason ?? null,
		note: r.note ?? null,
		actorUserId: r.actorUserId ?? null,
		actorUsername: r.actorUsername ?? null,
		actorDisplayName: r.actorDisplayName ?? null,
		actorIsAdmin: !!r.actorIsAdmin
	}
}

/** GET /asset-catalog/my-nganh — ngành được gán cho user hiện tại */
export const GetMyNganh = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-catalog/my-nganh'
	},
	async (): Promise<{
		data: Array<{ code: string; name: string }>
	}> => {
		const auth = getAuthData()!
		const userId = Number(auth.userID)
		if (auth.isSuperAdmin) {
			const rows = await orm
				.select()
				.from(categories)
				.orderBy(asc(categories.code))
			const nganh = rows
				.filter((c) => isNganhCode(c.code))
				.map((c) => ({ code: c.code, name: c.name }))
			return { data: nganh }
		}
		const codes = await getUserNganhCodes(userId)
		if (!codes.length) return { data: [] }
		const rows = await orm.select().from(categories)
		const data = rows
			.filter((c) => codes.includes(c.code.toUpperCase()))
			.map((c) => ({ code: c.code, name: c.name }))
		return { data }
	}
)

/** GET /asset-catalog/user-nganh?userId= — admin xem ngành đã gán */
export const GetUserNganh = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-catalog/user-nganh'
	},
	async (q: {
		userId?: Query<number>
	}): Promise<{ data: { userId: number; nganhCodes: string[] } }> => {
		const auth = getAuthData()!
		const targetId = q.userId ? Number(q.userId) : Number(auth.userID)
		if (!auth.isSuperAdmin && targetId !== Number(auth.userID)) {
			throw APIError.permissionDenied('Không xem ngành của user khác')
		}
		const codes = await getUserNganhCodes(targetId)
		return { data: { userId: targetId, nganhCodes: codes } }
	}
)

/** POST /asset-catalog/user-nganh — admin gán ngành cho user */
export const AssignUserNganh = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-catalog/user-nganh'
	},
	async (body: {
		userId: number
		nganhCodes: string[]
	}): Promise<{ data: { userId: number; nganhCodes: string[] } }> => {
		const auth = getAuthData()!
		if (!auth.isSuperAdmin) {
			throw APIError.permissionDenied('Chỉ admin gán ngành cho user')
		}
		const userId = Number(body.userId)
		const codes = (body.nganhCodes || [])
			.map((c) => c.trim().toUpperCase())
			.filter((c) => isNganhCode(c))
		await orm.delete(userNganh).where(eq(userNganh.userId, userId))
		for (const code of codes) {
			await orm.insert(userNganh).values({ userId, nganhCode: code })
		}
		return { data: { userId, nganhCodes: codes } }
	}
)

/**
 * POST /asset-catalog/stock-movements
 * User ngành: tăng/giảm SL danh mục. Tên mới → sinh mã theo loại vật (chuyên ngành).
 */
export const CreateCatalogStockMovement = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-catalog/stock-movements'
	},
	async (body: {
		movementType: 'INCREASE' | 'DECREASE'
		/** Ngành HC2A */
		nganhCode: string
		/** Loại vật / chuyên ngành HC2A01 — hoặc tên mới để sinh loại */
		chuyenNganhCode?: string
		/** Tên loại vật nếu tạo mới (khi không có mã loại) */
		chuyenNganhName?: string
		/** Mã VT danh mục nếu đã có */
		materialCode?: string
		/** Tên VT (bắt buộc nếu tạo mới / tìm theo tên) */
		materialName: string
		quantity: number
		unit?: string
		reason?: string
		note?: string
		executedAt?: string
	}): Promise<{
		data: {
			material: {
				id: number
				code: string
				name: string
				quantity: number
				unit: string
				chuyenNganhCode: string
				nganhCode: string
				isNew: boolean
			}
			log: CatalogStockLogResponse
		}
	}> => {
		const auth = getAuthData()!
		const userId = Number(auth.userID)
		const isAdmin = !!auth.isSuperAdmin
		const nganhCode = (body.nganhCode || '').trim().toUpperCase()
		if (!isNganhCode(nganhCode)) {
			throw APIError.invalidArgument('nganhCode không hợp lệ (vd HC2A)')
		}
		await assertUserCanAccessNganh(userId, isAdmin, nganhCode)

		const qty = Number(body.quantity)
		if (!Number.isFinite(qty) || qty < 1) {
			throw APIError.invalidArgument('quantity phải ≥ 1')
		}
		const movementType = body.movementType
		if (movementType !== 'INCREASE' && movementType !== 'DECREASE') {
			throw APIError.invalidArgument(
				'movementType phải INCREASE hoặc DECREASE'
			)
		}
		const materialName = (body.materialName || '').trim()
		if (!materialName) {
			throw APIError.invalidArgument('materialName is required')
		}

		// ── Resolve / create chuyên ngành (loại vật) ─────────────
		let cnCode = (body.chuyenNganhCode || '').trim().toUpperCase()
		const cnName = (body.chuyenNganhName || '').trim()
		let cnCat = cnCode
			? await orm.query.categories.findFirst({
					where: eq(categories.code, cnCode)
				})
			: null

		if (!cnCat && cnName) {
			// Tìm loại theo tên trong ngành
			const allCn = await orm.select().from(categories)
			cnCat =
				allCn.find(
					(c) =>
						c.code.toUpperCase().startsWith(nganhCode) &&
						c.code.length > 4 &&
						c.name.trim().toLocaleLowerCase('vi') ===
							cnName.toLocaleLowerCase('vi')
				) || null
			if (cnCat) cnCode = cnCat.code.toUpperCase()
		}

		if (!cnCat) {
			// Sinh / tạo loại vật mới
			if (!cnName) {
				throw APIError.invalidArgument(
					'Cần chuyenNganhCode hoặc chuyenNganhName (loại vật tư)'
				)
			}
			const existingCn = await orm
				.select({ code: categories.code })
				.from(categories)
			// Tôn trọng mã loại đã resolve (import) nếu hợp lệ và thuộc ngành
			const providedCn = (body.chuyenNganhCode || '').trim().toUpperCase()
			if (
				providedCn &&
				isChuyenNganhCode(providedCn) &&
				providedCn.startsWith(nganhCode) &&
				!existingCn.some((c) => c.code.toUpperCase() === providedCn)
			) {
				cnCode = providedCn
			} else {
				cnCode = nextChuyenNganhCode(
					nganhCode,
					existingCn.map((c) => c.code)
				)
			}
			const inserted = await orm
				.insert(categories)
				.values({
					code: cnCode,
					name: cnName,
					description: `Tạo bởi user khi khai báo VT`
				})
				.returning()
			cnCat = inserted[0]!
			log.info('CreateChuyenNganhOnStock', { cnCode, cnName, userId })
		}

		if (!cnCat.code.toUpperCase().startsWith(nganhCode)) {
			throw APIError.invalidArgument(
				`Loại vật ${cnCat.code} không thuộc ngành ${nganhCode}`
			)
		}

		// ── Resolve / create material ────────────────────────────
		let matCode = (body.materialCode || '').trim().toUpperCase()
		let mat = matCode
			? await orm.query.materials.findFirst({
					where: eq(materials.code, matCode)
				})
			: null

		if (!mat) {
			// Tìm theo tên trong cùng loại
			const inCat = await orm
				.select()
				.from(materials)
				.where(eq(materials.categoryId, cnCat.id))
			const nameNorm = materialName.toLocaleLowerCase('vi')
			mat =
				inCat.find(
					(m) => m.name.trim().toLocaleLowerCase('vi') === nameNorm
				) || null
		}

		let isNew = false
		if (!mat) {
			if (movementType === 'DECREASE') {
				throw APIError.notFound(
					`Không có VT «${materialName}» trong loại ${cnCat.code} để giảm`
				)
			}
			const existingCodes = await orm
				.select({ code: materials.code })
				.from(materials)
				.where(eq(materials.categoryId, cnCat.id))
			const prefix = cnCat.code.toUpperCase()
			const providedMat = (body.materialCode || '').trim().toUpperCase()
			// Tôn trọng mã VT đã resolve (import) nếu thuộc loại và chưa dùng
			if (
				providedMat &&
				providedMat.startsWith(prefix) &&
				!existingCodes.some((c) => c.code.toUpperCase() === providedMat)
			) {
				matCode = providedMat
			} else {
				matCode = nextMaterialCode(
					prefix,
					existingCodes.map((c) => c.code)
				)
			}
			const unit = (body.unit || 'Bộ').trim() || 'Bộ'
			const inserted = await orm
				.insert(materials)
				.values({
					categoryId: cnCat.id,
					code: matCode,
					name: materialName,
					unit,
					quantity: 0,
					minQuantity: 0,
					status: 'ACTIVE',
					description: body.note?.trim() || null
				})
				.returning()
			mat = inserted[0]!
			isNew = true
			log.info('CreateMaterialOnStock', { matCode, materialName, userId })
		}

		const before = Number(mat.quantity) || 0
		let after = before
		if (movementType === 'INCREASE') {
			after = before + qty
		} else {
			if (qty > before) {
				throw APIError.invalidArgument(
					`Không đủ SL danh mục (có ${before}, giảm ${qty})`
				)
			}
			after = before - qty
		}

		await orm
			.update(materials)
			.set({ quantity: after })
			.where(eq(materials.id, mat.id))

		const userRow = await orm.query.users.findFirst({
			where: eq(users.id, userId)
		})
		const executedAt =
			body.executedAt?.trim() || new Date().toISOString().slice(0, 10)

		const logRow = await orm
			.insert(catalogStockLogs)
			.values({
				movementType,
				executedAt,
				materialId: mat.id,
				materialCode: mat.code,
				materialName: mat.name,
				nganhCode,
				chuyenNganhCode: cnCat.code,
				chuyenNganhName: cnCat.name,
				quantity: qty,
				quantityBefore: before,
				quantityAfter: after,
				unit: mat.unit,
				isNewMaterial: isNew ? 1 : 0,
				reason: body.reason?.trim() || null,
				note: body.note?.trim() || null,
				actorUserId: userId,
				actorUsername: userRow?.username || null,
				actorDisplayName: userRow?.displayName || null,
				actorIsAdmin: isAdmin ? 1 : 0
			})
			.returning()

		const logRec = logRow[0]!
		return {
			data: {
				material: {
					id: mat.id,
					code: mat.code,
					name: mat.name,
					quantity: after,
					unit: mat.unit,
					chuyenNganhCode: cnCat.code,
					nganhCode,
					isNew
				},
				log: toLogResponse(logRec)
			}
		}
	}
)

/** GET /asset-catalog/stock-logs — admin / user xem log tăng giảm */
export const ListCatalogStockLogs = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-catalog/stock-logs'
	},
	async (q: {
		nganhCode?: Query<string>
		fromDate?: Query<string>
		toDate?: Query<string>
		limit?: Query<number>
	}): Promise<{ data: CatalogStockLogResponse[] }> => {
		const auth = getAuthData()!
		const userId = Number(auth.userID)
		const isAdmin = !!auth.isSuperAdmin
		const nganhFilter = (q.nganhCode || '').trim().toUpperCase()

		let allowed: string[] | null = null
		if (!isAdmin) {
			allowed = await getUserNganhCodes(userId)
			if (!allowed.length) return { data: [] }
		}

		const rows = await orm
			.select()
			.from(catalogStockLogs)
			.orderBy(
				desc(catalogStockLogs.executedAt),
				desc(catalogStockLogs.id)
			)
			.limit(Math.min(Number(q.limit) || 200, 500))

		let filtered = rows
		if (nganhFilter) {
			filtered = filtered.filter(
				(r) => r.nganhCode.toUpperCase() === nganhFilter
			)
		}
		if (allowed) {
			const set = new Set(allowed)
			filtered = filtered.filter((r) =>
				set.has(r.nganhCode.toUpperCase())
			)
		}
		if (q.fromDate) {
			filtered = filtered.filter(
				(r) => r.executedAt >= String(q.fromDate)
			)
		}
		if (q.toDate) {
			filtered = filtered.filter((r) => r.executedAt <= String(q.toDate))
		}

		return { data: filtered.map(toLogResponse) }
	}
)
