/**
 * Danh mục ngành / chuyên ngành / vật tư (từ bảng categories + materials).
 * Dùng cho báo cáo thực lực theo ngành + UI danh mục + mua sắm VT mới.
 */
import { api, Query } from 'encore.dev/api'
import { asc, eq, sql } from 'drizzle-orm'
import log from 'encore.dev/log'
import { APIError } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import { categories } from '../schema/categories'
import { materials } from '../schema/materials'
import { roomAssets } from '../schema/room-assets'
import { userNganh } from '../schema/user-nganh'
import { logCatalogChange } from './catalog-audit'

export interface CatalogCategory {
	id: number
	code: string
	name: string
	description: string | null
	/** true nếu mã ngắn (≤4) = ngành quản lý */
	isNganh: boolean
	/** Mã ngành cha suy từ mã chuyên ngành (HC2A01 → HC2A) */
	nganhCode: string | null
	/** Số chuyên ngành (nếu là ngành) hoặc số VT danh mục (nếu là CN) */
	childCount: number
	/** Tổng SL thực tế từ room_assets thuộc nhánh này */
	stockQuantity: number
}

export interface CatalogMaterial {
	id: number
	code: string
	name: string
	unit: string
	categoryId: number
	categoryCode: string
	categoryName: string
	/** Mã ngành (HC2A…) */
	nganhCode: string
	/** Tổng SL đang có trên các phòng (room_assets) */
	stockQuantity: number
	/** SL danh mục (materials.quantity) — tăng/giảm user ngành */
	catalogQuantity: number
	manufactureYear: number | null
	usageYear: number | null
	classification: string | null
	assetStatus: string
	purchaseDate: string | null
	expiryDate: string | null
}

export interface AssetCatalogResponse {
	/** Ngành quản lý (HC2A, HC2B…) */
	nganh: CatalogCategory[]
	/** Chuyên ngành (HC2A01…) */
	chuyenNganh: CatalogCategory[]
	materials: CatalogMaterial[]
}

/** Ngành: HC2 + 1 chữ cái A–Z (gồm J) */
const NGANH_CODE_RE = /^HC2[A-Z]$/
/** Chuyên ngành: HC2A01, HC2A02… (2 chữ số sau mã ngành) */
const CHUYEN_NGANH_CODE_RE = /^HC2[A-Z]\d{2}$/

function nganhFromCode(code: string): string {
	const u = code.trim().toUpperCase()
	const m = u.match(/^(HC2[A-Z])/)
	return m ? m[1]! : u.slice(0, 4)
}

function isNganhCode(code: string): boolean {
	return NGANH_CODE_RE.test(code.trim().toUpperCase())
}

function isChuyenNganhCode(code: string): boolean {
	return CHUYEN_NGANH_CODE_RE.test(code.trim().toUpperCase())
}

function toCatalogCategory(
	c: typeof categories.$inferSelect,
	extras?: Partial<CatalogCategory>
): CatalogCategory {
	const code = (c.code || '').trim()
	const isNganh = isNganhCode(code) || code.length <= 4
	return {
		id: c.id,
		code,
		name: c.name,
		description: c.description ?? null,
		isNganh,
		nganhCode: isNganh ? code : nganhFromCode(code),
		childCount: 0,
		stockQuantity: 0,
		...extras
	}
}

/**
 * Mã VT danh mục gốc từ room_assets.code: HC2A0102-G2-BGH → HC2A0102
 */
function materialBaseFromRoomCode(
	code: string | null | undefined
): string | null {
	const raw = (code || '').trim().toUpperCase()
	if (!raw) return null
	const head = raw.split('-')[0] || raw
	const m = head.match(/^(HC2[A-Z]\d{4,})/)
	if (m) return m[1]!
	if (/^HC2[A-Z]\d{4}$/.test(head)) return head
	return null
}

/**
 * Sinh mã ngành tiếp theo: HC2A…HC2Z (gồm J), lấy chữ cái còn trống theo A→Z.
 */
function nextNganhCode(existingCodes: string[]): string {
	const used = new Set<string>()
	for (const c of existingCodes) {
		const u = c.trim().toUpperCase()
		if (NGANH_CODE_RE.test(u)) used.add(u[3]!)
	}
	for (let i = 0; i < 26; i++) {
		const letter = String.fromCharCode(65 + i) // A–Z
		if (!used.has(letter)) return `HC2${letter}`
	}
	throw APIError.failedPrecondition('Đã hết mã ngành HC2A–HC2Z (26 ngành)')
}

/**
 * Sinh mã chuyên ngành: HC2A + 01, 02… (2 chữ số, y tăng dần).
 */
function nextChuyenNganhCode(
	nganhCode: string,
	existingCnCodes: string[]
): string {
	const prefix = nganhCode.trim().toUpperCase()
	if (!NGANH_CODE_RE.test(prefix)) {
		throw APIError.invalidArgument(
			`Mã ngành không hợp lệ: ${nganhCode} (vd: HC2A)`
		)
	}
	let maxSeq = 0
	for (const c of existingCnCodes) {
		const u = c.trim().toUpperCase()
		if (!u.startsWith(prefix) || u.length !== prefix.length + 2) continue
		const rest = u.slice(prefix.length)
		if (!/^\d{2}$/.test(rest)) continue
		const n = parseInt(rest, 10)
		if (Number.isFinite(n) && n > maxSeq) maxSeq = n
	}
	if (maxSeq >= 99) {
		throw APIError.failedPrecondition(
			`Đã hết số thứ tự chuyên ngành cho ${prefix} (01–99)`
		)
	}
	return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
}

/**
 * Sinh mã VT danh mục tiếp theo trong chuyên ngành.
 * HC2A01 + seq 2 số → HC2A0101, HC2A0102, …
 */
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
	const next = maxSeq + 1
	const seq = String(next).padStart(2, '0')
	return `${prefix}${seq}`
}

async function stockByMaterialBase(): Promise<Map<string, number>> {
	const rows = await orm
		.select({
			code: roomAssets.code,
			quantity: roomAssets.quantity
		})
		.from(roomAssets)

	const map = new Map<string, number>()
	for (const r of rows) {
		const base = materialBaseFromRoomCode(r.code)
		if (!base) continue
		const q = Number(r.quantity) || 0
		map.set(base, (map.get(base) || 0) + q)
	}
	return map
}

/**
 * GET /asset-catalog?nganhCode=HC2A&chuyenNganhCode=HC2A01
 * Không truyền filter → trả về toàn bộ danh mục + SL thực tế.
 */
export const GetAssetCatalog = api(
	{ auth: true, expose: true, method: 'GET', path: '/asset-catalog' },
	async (q: {
		nganhCode?: Query<string>
		chuyenNganhCode?: Query<string>
	}): Promise<{ data: AssetCatalogResponse }> => {
		log.trace('GetAssetCatalog', { q })

		const auth = getAuthData()!
		const isAdmin = !!auth.isSuperAdmin
		const perms = new Set(auth.permissions || [])
		/**
		 * User ngành: chỉ ngành được gán (user_nganh).
		 * User đơn vị sử dụng (có proposals:create + catalog:read, không catalog:create):
		 *   xem full danh mục để chọn ngành khi tạo đề xuất.
		 * BGH (asset-proposals:update, không gán user_nganh): full list —
		 *   cần chọn ngành khi nhập QĐ thanh lý.
		 * Super admin: full.
		 */
		let allowedNganh: Set<string> | null = null
		if (!isAdmin) {
			const rows = await orm
				.select({ code: userNganh.nganhCode })
				.from(userNganh)
				.where(eq(userNganh.userId, Number(auth.userID)))
			if (rows.length > 0) {
				allowedNganh = new Set(rows.map((r) => r.code.toUpperCase()))
			} else {
				const isUnitStyleUser =
					perms.has('asset-proposals:create') &&
					(perms.has('asset-catalog:read') ||
						perms.has('room-assets:read')) &&
					!perms.has('asset-catalog:create') &&
					!perms.has('buildings:create')
				/** BGH / người duyệt đề xuất: full list ngành (thanh lý QĐ) */
				const isProposalApprover = perms.has('asset-proposals:update')
				// User ĐV / BGH không gán ngành → full list; còn lại rỗng
				allowedNganh =
					isUnitStyleUser || isProposalApprover ? null : new Set()
			}
		}

		const allCats = await orm
			.select()
			.from(categories)
			.orderBy(asc(categories.code))

		const stockMap = await stockByMaterialBase()

		const nganh: CatalogCategory[] = []
		const chuyenNganh: CatalogCategory[] = []
		for (const c of allCats) {
			const code = (c.code || '').trim()
			const item = toCatalogCategory(c)
			// Ngành = HC2X (4 ký tự); chuyên ngành = HC2X01…
			if (isNganhCode(code) || code.length <= 4) nganh.push(item)
			else chuyenNganh.push(item)
		}

		const nganhFilter = (q.nganhCode || '').trim().toUpperCase()
		const cnFilter = (q.chuyenNganhCode || '').trim().toUpperCase()

		let matRows = await orm
			.select({
				id: materials.id,
				code: materials.code,
				name: materials.name,
				unit: materials.unit,
				quantity: materials.quantity,
				categoryId: materials.categoryId,
				categoryCode: categories.code,
				categoryName: categories.name,
				manufactureYear: materials.manufactureYear,
				usageYear: materials.usageYear,
				classification: materials.classification,
				assetStatus: materials.assetStatus,
				purchaseDate: materials.purchaseDate,
				expiryDate: materials.expiryDate
			})
			.from(materials)
			.innerJoin(categories, eq(materials.categoryId, categories.id))
			.orderBy(asc(materials.code))

		if (cnFilter) {
			matRows = matRows.filter(
				(m) => (m.categoryCode || '').toUpperCase() === cnFilter
			)
		} else if (nganhFilter) {
			matRows = matRows.filter((m) => {
				const cc = (m.categoryCode || '').toUpperCase()
				const mc = (m.code || '').toUpperCase()
				return (
					cc === nganhFilter ||
					cc.startsWith(nganhFilter) ||
					mc.startsWith(nganhFilter)
				)
			})
		}

		const materialList: CatalogMaterial[] = matRows
			.map((m) => {
				const categoryCode = (m.categoryCode || '').trim()
				const code = (m.code || '').trim().toUpperCase()
				return {
					id: m.id,
					code: m.code,
					name: m.name,
					unit: m.unit,
					categoryId: m.categoryId,
					categoryCode,
					categoryName: m.categoryName,
					nganhCode: nganhFromCode(categoryCode || m.code),
					stockQuantity: stockMap.get(code) || 0,
					catalogQuantity: Number(m.quantity) || 0,
					manufactureYear: m.manufactureYear ?? null,
					usageYear: m.usageYear ?? null,
					classification: m.classification ?? null,
					assetStatus: m.assetStatus || 'NORMAL',
					purchaseDate: m.purchaseDate ?? null,
					expiryDate: m.expiryDate ?? null
				}
			})
			.filter((m) => {
				if (!allowedNganh) return true
				if (!allowedNganh.size) return false
				return allowedNganh.has(m.nganhCode.toUpperCase())
			})

		// Đếm child + SL theo chuyên ngành / ngành
		const cnByCode = new Map(
			chuyenNganh.map((c) => [c.code.toUpperCase(), c])
		)
		const nganhByCode = new Map(nganh.map((n) => [n.code.toUpperCase(), n]))

		for (const m of materialList) {
			const cn = cnByCode.get((m.categoryCode || '').toUpperCase())
			if (cn) {
				cn.childCount += 1
				cn.stockQuantity += m.stockQuantity
			}
			const ng = nganhByCode.get(m.nganhCode.toUpperCase())
			if (ng) {
				ng.stockQuantity += m.stockQuantity
			}
		}
		for (const cn of chuyenNganh) {
			const ng = nganhByCode.get((cn.nganhCode || '').toUpperCase())
			if (ng) ng.childCount += 1
		}

		// Lọc list CN theo ngành nếu có
		let cnList = chuyenNganh
		if (nganhFilter) {
			cnList = chuyenNganh.filter(
				(c) => (c.nganhCode || '').toUpperCase() === nganhFilter
			)
		}
		if (allowedNganh) {
			cnList = cnList.filter((c) =>
				allowedNganh!.has(
					(c.nganhCode || c.code).toUpperCase().slice(0, 4)
				)
			)
		}

		let nganhList = nganh
		if (nganhFilter) {
			nganhList = nganh.filter(
				(n) => n.code.toUpperCase() === nganhFilter
			)
		}
		if (allowedNganh) {
			nganhList = nganhList.filter((n) =>
				allowedNganh!.has(n.code.toUpperCase())
			)
		}

		return {
			data: {
				nganh: nganhList,
				chuyenNganh: cnList,
				materials: materialList
			}
		}
	}
)

/**
 * Đếm nhanh số vật tư danh mục theo ngành / chuyên ngành (debug / UI).
 * GET /asset-catalog/counts
 */
export const GetAssetCatalogCounts = api(
	{ auth: true, expose: true, method: 'GET', path: '/asset-catalog/counts' },
	async (): Promise<{
		data: Array<{ code: string; name: string; kind: string; count: number }>
	}> => {
		const rows = await orm
			.select({
				code: categories.code,
				name: categories.name,
				count: sql<number>`count(${materials.id})`.mapWith(Number)
			})
			.from(categories)
			.leftJoin(materials, eq(materials.categoryId, categories.id))
			.groupBy(categories.id)
			.orderBy(asc(categories.code))

		return {
			data: rows.map((r) => ({
				code: r.code,
				name: r.name,
				kind: (r.code || '').length <= 4 ? 'nganh' : 'chuyen_nganh',
				count: r.count
			}))
		}
	}
)

/**
 * Gợi ý mã VT danh mục tiếp theo trong chuyên ngành.
 * GET /asset-catalog/next-code?chuyenNganhCode=HC2A01
 */
export const SuggestNextMaterialCode = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-catalog/next-code'
	},
	async (q: {
		chuyenNganhCode: Query<string>
	}): Promise<{ data: { code: string; chuyenNganhCode: string } }> => {
		const cn = (q.chuyenNganhCode || '').trim().toUpperCase()
		if (!cn || cn.length < 5) {
			throw APIError.invalidArgument(
				'chuyenNganhCode is required (vd: HC2A01)'
			)
		}
		const cat = await orm.query.categories.findFirst({
			where: eq(categories.code, cn)
		})
		if (!cat) {
			throw APIError.notFound(`Chuyên ngành ${cn} không tồn tại`)
		}
		const rows = await orm
			.select({ code: materials.code })
			.from(materials)
			.where(eq(materials.categoryId, cat.id))
		const code = nextMaterialCode(
			cn,
			rows.map((r) => r.code)
		)
		return { data: { code, chuyenNganhCode: cn } }
	}
)

/**
 * Thêm thiết bị mới vào danh mục (dưới chuyên ngành).
 * Mã tự sinh theo ngành → chuyên ngành → seq (HC2A0101…).
 * POST /asset-catalog/materials
 */
export const CreateCatalogMaterial = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-catalog/materials'
	},
	async (body: {
		chuyenNganhCode: string
		name: string
		unit?: string
		quantity?: number
		/** Tùy chọn — nếu trống hệ thống tự sinh */
		code?: string
		description?: string
		manufactureYear?: number
		usageYear?: number
		classification?: string
		assetStatus?: string
		purchaseDate?: string
		expiryDate?: string
	}): Promise<{ data: CatalogMaterial }> => {
		const cnCode = (body.chuyenNganhCode || '').trim().toUpperCase()
		const name = (body.name || '').trim()
		if (!cnCode) {
			throw APIError.invalidArgument('chuyenNganhCode is required')
		}
		if (!name) {
			throw APIError.invalidArgument('name is required')
		}

		const cat = await orm.query.categories.findFirst({
			where: eq(categories.code, cnCode)
		})
		if (!cat) {
			throw APIError.notFound(`Chuyên ngành ${cnCode} không tồn tại`)
		}
		if ((cat.code || '').length <= 4) {
			throw APIError.invalidArgument(
				'Phải chọn chuyên ngành (vd HC2A01), không phải ngành (HC2A)'
			)
		}

		const existing = await orm
			.select({ code: materials.code })
			.from(materials)
			.where(eq(materials.categoryId, cat.id))

		let code = (body.code || '').trim().toUpperCase()
		if (!code) {
			code = nextMaterialCode(
				cnCode,
				existing.map((r) => r.code)
			)
		} else {
			const dup = await orm.query.materials.findFirst({
				where: eq(materials.code, code)
			})
			if (dup) {
				throw APIError.alreadyExists(`Mã ${code} đã tồn tại`)
			}
		}

		const unit = (body.unit || 'Bộ').trim() || 'Bộ'
		const inserted = await orm
			.insert(materials)
			.values({
				categoryId: cat.id,
				code,
				name,
				unit,
				quantity: Math.max(0, Math.floor(Number(body.quantity) || 0)),
				minQuantity: 0,
				status: 'ACTIVE',
				description: body.description?.trim() || null,
				manufactureYear: body.manufactureYear,
				usageYear: body.usageYear,
				classification: body.classification?.trim() || null,
				assetStatus: body.assetStatus || 'NORMAL',
				purchaseDate: body.purchaseDate || null,
				expiryDate: body.expiryDate || null
			})
			.returning()

		const row = inserted[0]
		if (!row) {
			throw APIError.internal('Không tạo được vật tư danh mục')
		}

		log.info('CreateCatalogMaterial', {
			code,
			name,
			chuyenNganhCode: cnCode
		})
		await logCatalogChange({
			action: 'CREATE',
			entityType: 'VAT_TU',
			entityId: row.id,
			entityCode: row.code,
			entityName: row.name,
			parentCode: cat.code,
			parentName: cat.name
		})

		return {
			data: {
				id: row.id,
				code: row.code,
				name: row.name,
				unit: row.unit,
				categoryId: row.categoryId,
				categoryCode: cat.code,
				categoryName: cat.name,
				nganhCode: nganhFromCode(cat.code),
				stockQuantity: 0,
				catalogQuantity: row.quantity,
				manufactureYear: row.manufactureYear ?? null,
				usageYear: row.usageYear ?? null,
				classification: row.classification ?? null,
				assetStatus: row.assetStatus || 'NORMAL',
				purchaseDate: row.purchaseDate ?? null,
				expiryDate: row.expiryDate ?? null
			}
		}
	}
)

/**
 * Sửa vật tư danh mục (tên / ĐVT / mô tả).
 * PATCH /asset-catalog/materials/:id
 */
export const UpdateCatalogMaterial = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/asset-catalog/materials/:id'
	},
	async (params: {
		id: number
		name?: string
		unit?: string
		description?: string | null
		manufactureYear?: number | null
		usageYear?: number | null
		classification?: string | null
		assetStatus?: string | null
		purchaseDate?: string | null
		expiryDate?: string | null
	}): Promise<{ data: CatalogMaterial }> => {
		const id = Number(params.id)
		if (!Number.isFinite(id) || id <= 0) {
			throw APIError.invalidArgument('id không hợp lệ')
		}
		const existing = await orm.query.materials.findFirst({
			where: eq(materials.id, id),
			with: { category: true }
		})
		if (!existing) {
			throw APIError.notFound(`Vật tư #${id} không tồn tại`)
		}

		const patch: {
			name?: string
			unit?: string
			description?: string | null
			manufactureYear?: number | null
			usageYear?: number | null
			classification?: string | null
			assetStatus?: string
			purchaseDate?: string | null
			expiryDate?: string | null
		} = {}
		const changes: string[] = []
		if (params.name !== undefined) {
			const name = params.name.trim()
			if (!name) throw APIError.invalidArgument('Tên không được để trống')
			if (name !== existing.name) {
				changes.push(`tên: ${existing.name} → ${name}`)
			}
			patch.name = name
		}
		if (params.unit !== undefined) {
			const unit = params.unit.trim() || 'Bộ'
			if (unit !== existing.unit) {
				changes.push(`ĐVT: ${existing.unit} → ${unit}`)
			}
			patch.unit = unit
		}
		if (params.description !== undefined) {
			patch.description =
				params.description === null
					? null
					: params.description.trim() || null
		}
		for (const key of [
			'manufactureYear',
			'usageYear',
			'classification',
			'purchaseDate',
			'expiryDate'
		] as const) {
			if (params[key] !== undefined)
				(patch as Record<string, unknown>)[key] =
					typeof params[key] === 'string'
						? (params[key] as string).trim() || null
						: params[key]
		}
		if (params.assetStatus !== undefined) {
			patch.assetStatus = params.assetStatus?.trim() || 'NORMAL'
		}
		if (Object.keys(patch).length === 0) {
			throw APIError.invalidArgument('Không có trường để cập nhật')
		}

		const updated = await orm
			.update(materials)
			.set(patch)
			.where(eq(materials.id, id))
			.returning()
		const row = updated[0]
		if (!row) throw APIError.internal('Cập nhật thất bại')

		const cat = existing.category
		await logCatalogChange({
			action: 'UPDATE',
			entityType: 'VAT_TU',
			entityId: row.id,
			entityCode: row.code,
			entityName: row.name,
			parentCode: cat?.code ?? null,
			parentName: cat?.name ?? null,
			details: changes.length ? changes.join('; ') : null
		})

		return {
			data: {
				id: row.id,
				code: row.code,
				name: row.name,
				unit: row.unit,
				categoryId: row.categoryId,
				categoryCode: cat?.code ?? '',
				categoryName: cat?.name ?? '',
				nganhCode: cat ? nganhFromCode(cat.code) : '',
				stockQuantity: 0,
				catalogQuantity: row.quantity,
				manufactureYear: row.manufactureYear ?? null,
				usageYear: row.usageYear ?? null,
				classification: row.classification ?? null,
				assetStatus: row.assetStatus || 'NORMAL',
				purchaseDate: row.purchaseDate ?? null,
				expiryDate: row.expiryDate ?? null
			}
		}
	}
)

/**
 * Xóa vật tư danh mục.
 * POST /asset-catalog/materials/delete
 */
export const DeleteCatalogMaterials = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-catalog/materials/delete'
	},
	async (body: { ids: number[] }): Promise<{ ids: number[] }> => {
		const ids = (body.ids || []).filter((n) => Number.isFinite(n) && n > 0)
		if (!ids.length) {
			throw APIError.invalidArgument('ids must not be empty')
		}
		for (const id of ids) {
			const existing = await orm.query.materials.findFirst({
				where: eq(materials.id, id),
				with: { category: true }
			})
			if (!existing) continue
			await logCatalogChange({
				action: 'DELETE',
				entityType: 'VAT_TU',
				entityId: existing.id,
				entityCode: existing.code,
				entityName: existing.name,
				parentCode: existing.category?.code ?? null,
				parentName: existing.category?.name ?? null
			})
			await orm.delete(materials).where(eq(materials.id, id))
		}
		log.info('DeleteCatalogMaterials', { ids })
		return { ids }
	}
)

/**
 * Gợi ý mã ngành tiếp theo (HC2A…HC2Z, gồm J).
 * GET /asset-catalog/next-nganh-code
 */
export const SuggestNextNganhCode = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-catalog/next-nganh-code'
	},
	async (): Promise<{ data: { code: string } }> => {
		const rows = await orm
			.select({ code: categories.code })
			.from(categories)
		const nganhCodes = rows
			.map((r) => (r.code || '').trim())
			.filter((c) => isNganhCode(c) || c.length <= 4)
		const code = nextNganhCode(nganhCodes)
		return { data: { code } }
	}
)

/**
 * Gợi ý mã chuyên ngành tiếp theo trong ngành (HC2A01, HC2A02…).
 * GET /asset-catalog/next-chuyen-nganh-code?nganhCode=HC2A
 */
export const SuggestNextChuyenNganhCode = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-catalog/next-chuyen-nganh-code'
	},
	async (q: {
		nganhCode: Query<string>
	}): Promise<{ data: { code: string; nganhCode: string } }> => {
		const nganhCode = (q.nganhCode || '').trim().toUpperCase()
		if (!isNganhCode(nganhCode)) {
			throw APIError.invalidArgument('nganhCode is required (vd: HC2A)')
		}
		const parent = await orm.query.categories.findFirst({
			where: eq(categories.code, nganhCode)
		})
		if (!parent) {
			throw APIError.notFound(`Ngành ${nganhCode} không tồn tại`)
		}
		const rows = await orm
			.select({ code: categories.code })
			.from(categories)
		const cnCodes = rows
			.map((r) => (r.code || '').trim())
			.filter((c) => isChuyenNganhCode(c) && c.startsWith(nganhCode))
		const code = nextChuyenNganhCode(nganhCode, cnCodes)
		return { data: { code, nganhCode } }
	}
)

/**
 * Thêm ngành mới. Bắt buộc tên; mã hệ thống xin theo HC2x (x = A–Z).
 * POST /asset-catalog/nganh
 */
export const CreateCatalogNganh = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-catalog/nganh'
	},
	async (body: {
		name: string
		description?: string
	}): Promise<{ data: CatalogCategory }> => {
		const name = (body.name || '').trim()
		if (!name) {
			throw APIError.invalidArgument('Tên ngành là bắt buộc')
		}

		const rows = await orm
			.select({ code: categories.code })
			.from(categories)
		const nganhCodes = rows
			.map((r) => (r.code || '').trim())
			.filter((c) => isNganhCode(c) || c.length <= 4)
		const code = nextNganhCode(nganhCodes)

		const dup = await orm.query.categories.findFirst({
			where: eq(categories.code, code)
		})
		if (dup) {
			throw APIError.alreadyExists(`Mã ngành ${code} đã tồn tại`)
		}

		const inserted = await orm
			.insert(categories)
			.values({
				code,
				name,
				description:
					body.description?.trim() || `Ngành quản lý. Mã ${code}`
			})
			.returning()

		const row = inserted[0]
		if (!row) {
			throw APIError.internal('Không tạo được ngành')
		}

		log.info('CreateCatalogNganh', { code, name })
		await logCatalogChange({
			action: 'CREATE',
			entityType: 'NGANH',
			entityId: row.id,
			entityCode: row.code,
			entityName: row.name
		})
		return { data: toCatalogCategory(row) }
	}
)

/**
 * Thêm chuyên ngành dưới ngành. Bắt buộc tên + nganhCode; mã HC2x0y tự sinh.
 * POST /asset-catalog/chuyen-nganh
 */
export const CreateCatalogChuyenNganh = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-catalog/chuyen-nganh'
	},
	async (body: {
		nganhCode: string
		name: string
		description?: string
	}): Promise<{ data: CatalogCategory }> => {
		const nganhCode = (body.nganhCode || '').trim().toUpperCase()
		const name = (body.name || '').trim()
		if (!isNganhCode(nganhCode)) {
			throw APIError.invalidArgument('nganhCode is required (vd: HC2A)')
		}
		if (!name) {
			throw APIError.invalidArgument('Tên chuyên ngành là bắt buộc')
		}

		const parent = await orm.query.categories.findFirst({
			where: eq(categories.code, nganhCode)
		})
		if (!parent) {
			throw APIError.notFound(`Ngành ${nganhCode} không tồn tại`)
		}

		const rows = await orm
			.select({ code: categories.code })
			.from(categories)
		const cnCodes = rows
			.map((r) => (r.code || '').trim())
			.filter((c) => isChuyenNganhCode(c) && c.startsWith(nganhCode))
		const code = nextChuyenNganhCode(nganhCode, cnCodes)

		const inserted = await orm
			.insert(categories)
			.values({
				code,
				name,
				description:
					body.description?.trim() ||
					`Chuyên ngành thuộc ${parent.name} (${nganhCode})`
			})
			.returning()

		const row = inserted[0]
		if (!row) {
			throw APIError.internal('Không tạo được chuyên ngành')
		}

		log.info('CreateCatalogChuyenNganh', {
			code,
			name,
			nganhCode
		})
		await logCatalogChange({
			action: 'CREATE',
			entityType: 'LOAI_VAT',
			entityId: row.id,
			entityCode: row.code,
			entityName: row.name,
			parentCode: nganhCode,
			parentName: parent.name
		})
		return { data: toCatalogCategory(row) }
	}
)

/**
 * Sửa tên (và mô tả) ngành / chuyên ngành — không đổi mã.
 * PATCH /asset-catalog/categories/:id
 */
export const UpdateCatalogCategory = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/asset-catalog/categories/:id'
	},
	async (params: {
		id: number
		name?: string
		description?: string | null
	}): Promise<{ data: CatalogCategory }> => {
		const id = Number(params.id)
		if (!Number.isFinite(id) || id <= 0) {
			throw APIError.invalidArgument('id không hợp lệ')
		}

		const existing = await orm.query.categories.findFirst({
			where: eq(categories.id, id)
		})
		if (!existing) {
			throw APIError.notFound(`Category #${id} không tồn tại`)
		}

		const patch: { name?: string; description?: string | null } = {}
		if (params.name !== undefined) {
			const name = params.name.trim()
			if (!name) {
				throw APIError.invalidArgument('Tên không được để trống')
			}
			patch.name = name
		}
		if (params.description !== undefined) {
			patch.description =
				params.description === null
					? null
					: params.description.trim() || null
		}
		if (Object.keys(patch).length === 0) {
			throw APIError.invalidArgument(
				'Cần ít nhất name hoặc description để cập nhật'
			)
		}

		const updated = await orm
			.update(categories)
			.set(patch)
			.where(eq(categories.id, id))
			.returning()

		const row = updated[0]
		if (!row) {
			throw APIError.internal('Cập nhật thất bại')
		}

		log.info('UpdateCatalogCategory', {
			id,
			code: row.code,
			patch
		})
		const isNganh = (row.code || '').length <= 4
		const changes: string[] = []
		if (patch.name && patch.name !== existing.name) {
			changes.push(`tên: ${existing.name} → ${patch.name}`)
		}
		await logCatalogChange({
			action: 'UPDATE',
			entityType: isNganh ? 'NGANH' : 'LOAI_VAT',
			entityId: row.id,
			entityCode: row.code,
			entityName: row.name,
			parentCode: isNganh ? null : nganhFromCode(row.code),
			details: changes.length ? changes.join('; ') : null
		})
		return { data: toCatalogCategory(row) }
	}
)

/**
 * Xóa ngành hoặc loại vật.
 * - Ngành: chặn nếu còn loại vật con.
 * - Loại vật: chặn nếu còn vật tư danh mục.
 * POST /asset-catalog/categories/delete
 */
export const DeleteCatalogCategories = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-catalog/categories/delete'
	},
	async (body: { ids: number[] }): Promise<{ ids: number[] }> => {
		const ids = (body.ids || []).filter((n) => Number.isFinite(n) && n > 0)
		if (!ids.length) {
			throw APIError.invalidArgument('ids must not be empty')
		}

		for (const id of ids) {
			const existing = await orm.query.categories.findFirst({
				where: eq(categories.id, id)
			})
			if (!existing) continue

			const code = (existing.code || '').trim().toUpperCase()
			const isNganh = code.length <= 4

			if (isNganh) {
				const allCats = await orm.select().from(categories)
				const cnChildren = allCats.filter(
					(c) =>
						c.id !== existing.id &&
						(c.code || '').toUpperCase().startsWith(code) &&
						(c.code || '').length > 4
				)
				if (cnChildren.length > 0) {
					throw APIError.failedPrecondition(
						`Không xóa ngành ${code}: còn ${cnChildren.length} loại vật. Xóa loại vật trước.`
					)
				}
			} else {
				const mats = await orm
					.select({ id: materials.id })
					.from(materials)
					.where(eq(materials.categoryId, existing.id))
				if (mats.length > 0) {
					throw APIError.failedPrecondition(
						`Không xóa loại vật ${code}: còn ${mats.length} vật tư danh mục. Xóa vật tư trước.`
					)
				}
			}

			await logCatalogChange({
				action: 'DELETE',
				entityType: isNganh ? 'NGANH' : 'LOAI_VAT',
				entityId: existing.id,
				entityCode: existing.code,
				entityName: existing.name,
				parentCode: isNganh ? null : nganhFromCode(existing.code)
			})

			await orm.delete(categories).where(eq(categories.id, id))
		}

		log.info('DeleteCatalogCategories', { ids })
		return { ids }
	}
)
