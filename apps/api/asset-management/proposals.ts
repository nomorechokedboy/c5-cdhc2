/**
 * Đề xuất đơn vị: sửa chữa / thu hồi-trả / thanh lý.
 *
 * Luồng 2 bước (BGH → ngành):
 * 1) User ĐV gửi → PENDING → thông báo Ban Giám Hiệu (role admin)
 * 2) BGH phê duyệt → APPROVED → đẩy xuống ngành; BGH từ chối → REJECTED
 * 3) Ngành hoàn thành sửa chữa → COMPLETED → báo BGH + user ĐV
 *
 * REPAIR: khi gửi → giữ nguyên cấp (status BROKEN, mã tạm -HONG-);
 * sửa xong → vẫn cùng cấp đó + mã gốc (status NORMAL).
 */
import { api, APIError, Query } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import { desc, eq, sql } from 'drizzle-orm'
import orm from '../database'
import {
	assetProposals,
	assetProposalItems,
	assetProposalLogs
} from '../schema/asset-proposals'
import { materials } from '../schema/materials'
import { categories } from '../schema/categories'
import { users } from '../schema/users'
import { units } from '../schema/units'
import { userNganh } from '../schema/user-nganh'
import { userRoles } from '../schema/user-roles'
import { roles } from '../schema/roles'
import { catalogStockLogs } from '../schema/catalog-stock-logs'
import { rooms } from '../schema/rooms'
import { notifications } from '../schema/notifications'
import log from 'encore.dev/log'
import assetController from './controller'
import {
	completeRepairToGrade2,
	markAssetBrokenForRepair,
	restoreBrokenAssetOnCancel
} from './repair-grade'
import { writeAssetBrokenLog } from './broken-logs'
import { v4 as uuidv4 } from 'uuid'

const TYPES = ['REPAIR', 'RECALL', 'LIQUIDATION'] as const

function typeLabel(t: string) {
	switch (t) {
		case 'REPAIR':
			return 'Sửa chữa'
		case 'RECALL':
			return 'Thu hồi / trả'
		case 'LIQUIDATION':
			return 'Thanh lý'
		default:
			return t
	}
}

/**
 * Chi tiết log — đúng form:
 * «Máy tính Acer Core I3 Phòng H1.101 Bị Hư ram, xanh màng»
 * = tên thiết bị + Phòng {mã} + lý do
 */
function formatItemDetail(
	it: {
		materialName?: string | null
		fromRoomCode?: string | null
		fromRoomName?: string | null
		locationNote?: string | null
		note?: string | null
	},
	reasonFallback?: string | null
): string {
	const name = (it.materialName || '').trim() || '—'
	const roomCode = (it.fromRoomCode || '').trim()
	const roomName = (it.fromRoomName || '').trim()
	// Chỉ dùng mã phòng: «Phòng H1.101» (không ghép tên phòng dài)
	let room = ''
	if (roomCode) {
		room = `Phòng ${roomCode}`
	} else if (roomName) {
		room = /^phòng\s/i.test(roomName) ? roomName : `Phòng ${roomName}`
	}
	// Lý do: note item > mô tả đề xuất > locationNote (vị trí chi tiết)
	const reason = (it.note || reasonFallback || it.locationNote || '').trim()
	return [name, room, reason].filter(Boolean).join(' ')
}

function nganhFromCode(code: string): string {
	const u = code.trim().toUpperCase()
	const m = u.match(/^(HC2[A-Z])/)
	return m ? m[1]! : u.slice(0, 4)
}

export interface ProposalItemResponse {
	id: number
	materialId: number | null
	materialCode: string | null
	materialName: string
	roomAssetId: number | null
	sourceAssetId: number | null
	originalGrade: number | null
	originalCode: string | null
	quantity: number
	unit: string | null
	category: string | null
	nganhCode: string | null
	chuyenNganhCode: string | null
	note: string | null
	fromRoomId: number | null
	fromRoomCode: string | null
	fromRoomName: string | null
	locationNote: string | null
	targetRoomId: number | null
	targetRoomCode: string | null
	targetRoomName: string | null
}

export interface ProposalResponse {
	id: number
	createdAt: string
	updatedAt: string
	proposalType: string
	status: string
	title: string
	description: string | null
	unitId: number | null
	unitName: string | null
	nganhCode: string | null
	proposedByUserId: number | null
	proposedByUsername: string | null
	proposedByDisplayName: string | null
	adminNote: string | null
	decisionNumber: string | null
	decisionNganhCode: string | null
	decisionIssuingLevel: string | null
	decisionSigner: string | null
	decisionAt: string | null
	decidedByUserId: number | null
	decidedByUsername: string | null
	decidedByDisplayName: string | null
	completedAt: string | null
	items: ProposalItemResponse[]
}

export interface ProposalLogResponse {
	id: number
	createdAt: string
	proposalId: number | null
	action: string
	proposalType: string | null
	summary: string
	details: string | null
	/** Đơn vị đề xuất (từ phiếu đề xuất) */
	unitName: string | null
	/** Ngành đề xuất (từ phiếu) */
	nganhCode: string | null
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	actorIsAdmin: boolean
}

/** Dòng VT thanh lý (phục vụ màn Thanh lý + báo cáo theo năm) */
export interface LiquidationAssetRow {
	proposalId: number
	proposalTitle: string
	proposalStatus: string
	proposedAt: string
	unitName: string | null
	nganhCode: string | null
	proposedByDisplayName: string | null
	itemId: number
	materialId: number | null
	materialCode: string | null
	materialName: string
	roomAssetId: number | null
	quantity: number
	unit: string | null
	category: string | null
	fromRoomCode: string | null
	fromRoomName: string | null
	locationNote: string | null
	decisionNumber: string | null
	decisionNganhCode: string | null
	decisionIssuingLevel: string | null
	decisionSigner: string | null
	decisionAt: string | null
	completedAt: string | null
}

function toItem(
	r: typeof assetProposalItems.$inferSelect
): ProposalItemResponse {
	return {
		id: r.id,
		materialId: r.materialId ?? null,
		materialCode: r.materialCode ?? null,
		materialName: r.materialName,
		roomAssetId: r.roomAssetId ?? null,
		sourceAssetId: r.sourceAssetId ?? null,
		originalGrade: r.originalGrade ?? null,
		originalCode: r.originalCode ?? null,
		quantity: r.quantity,
		unit: r.unit ?? null,
		category: r.category ?? null,
		nganhCode: r.nganhCode ?? null,
		chuyenNganhCode: r.chuyenNganhCode ?? null,
		note: r.note ?? null,
		fromRoomId: r.fromRoomId ?? null,
		fromRoomCode: r.fromRoomCode ?? null,
		fromRoomName: r.fromRoomName ?? null,
		locationNote: r.locationNote ?? null,
		targetRoomId: r.targetRoomId ?? null,
		targetRoomCode: r.targetRoomCode ?? null,
		targetRoomName: r.targetRoomName ?? null
	}
}

function toProposal(
	p: typeof assetProposals.$inferSelect,
	items: ProposalItemResponse[]
): ProposalResponse {
	return {
		id: p.id,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
		proposalType: p.proposalType,
		status: p.status,
		title: p.title,
		description: p.description ?? null,
		unitId: p.unitId ?? null,
		unitName: p.unitName ?? null,
		nganhCode: p.nganhCode ?? null,
		proposedByUserId: p.proposedByUserId ?? null,
		proposedByUsername: p.proposedByUsername ?? null,
		proposedByDisplayName: p.proposedByDisplayName ?? null,
		adminNote: p.adminNote ?? null,
		decisionNumber: p.decisionNumber ?? null,
		decisionNganhCode: p.decisionNganhCode ?? null,
		decisionIssuingLevel: p.decisionIssuingLevel ?? null,
		decisionSigner: p.decisionSigner ?? null,
		decisionAt: p.decisionAt ?? null,
		decidedByUserId: p.decidedByUserId ?? null,
		decidedByUsername: p.decidedByUsername ?? null,
		decidedByDisplayName: p.decidedByDisplayName ?? null,
		completedAt: p.completedAt ?? null,
		items
	}
}

function toLog(
	r: typeof assetProposalLogs.$inferSelect,
	meta?: {
		unitName?: string | null
		nganhCode?: string | null
	}
): ProposalLogResponse {
	return {
		id: r.id,
		createdAt: r.createdAt,
		proposalId: r.proposalId ?? null,
		action: r.action,
		proposalType: r.proposalType ?? null,
		summary: r.summary,
		unitName: meta?.unitName ?? null,
		nganhCode: meta?.nganhCode ?? null,
		details: r.details ?? null,
		actorUserId: r.actorUserId ?? null,
		actorUsername: r.actorUsername ?? null,
		actorDisplayName: r.actorDisplayName ?? null,
		actorIsAdmin: !!r.actorIsAdmin
	}
}

/**
 * Ghi log đề xuất.
 * Admin: hiện tên cụ thể.
 * User ngành / đơn vị: ghi chung «Ngành» / «Đơn vị sử dụng» — không lộ chi tiết.
 */
async function writeLog(opts: {
	proposalId?: number | null
	action: string
	proposalType?: string | null
	summary: string
	details?: string | null
	userId: number
	isAdmin: boolean
	/** 'admin' | 'nganh' | 'don_vi' — che tên trên log */
	actorKind?: 'admin' | 'nganh' | 'don_vi'
}) {
	const userRow = await orm.query.users.findFirst({
		where: eq(users.id, opts.userId)
	})
	let kind = opts.actorKind
	if (!kind) {
		if (opts.isAdmin) kind = 'admin'
		else {
			const codes = await loadUserNganhCodes(opts.userId)
			kind = codes.length > 0 ? 'nganh' : 'don_vi'
		}
	}
	const generic =
		kind === 'admin'
			? null
			: kind === 'nganh'
				? { username: 'nganh', displayName: 'Ngành' }
				: { username: 'don_vi', displayName: 'Đơn vị sử dụng' }

	await orm.insert(assetProposalLogs).values({
		proposalId: opts.proposalId ?? null,
		action: opts.action,
		proposalType: opts.proposalType ?? null,
		summary: opts.summary,
		details: opts.details ?? null,
		// Vẫn lưu userId nội bộ; UI/log public che tên nếu không phải admin
		actorUserId: opts.userId,
		actorUsername: generic ? generic.username : userRow?.username || null,
		actorDisplayName: generic
			? generic.displayName
			: userRow?.displayName || null,
		actorIsAdmin: opts.isAdmin ? 1 : 0
	})
}

async function loadItems(proposalId: number): Promise<ProposalItemResponse[]> {
	const rows = await orm
		.select()
		.from(assetProposalItems)
		.where(eq(assetProposalItems.proposalId, proposalId))
	return rows.map(toItem)
}

async function resolveRoom(roomId: number | null | undefined) {
	if (roomId == null || !Number.isFinite(Number(roomId))) return null
	const found = await orm
		.select()
		.from(rooms)
		.where(eq(rooms.id, Number(roomId)))
		.limit(1)
	return found[0] ?? null
}

/** Ngành gán cho user (user_nganh) */
async function loadUserNganhCodes(userId: number): Promise<string[]> {
	const rows = await orm
		.select({ code: userNganh.nganhCode })
		.from(userNganh)
		.where(eq(userNganh.userId, userId))
	return rows.map((r) => (r.code || '').trim().toUpperCase()).filter(Boolean)
}

/** Tên role của user */
async function loadUserRoleNames(userId: number): Promise<string[]> {
	const rows = await orm
		.select({ name: roles.name })
		.from(userRoles)
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
		.where(eq(userRoles.userId, userId))
	return rows.map((r) => (r.name || '').trim()).filter(Boolean)
}

/**
 * Ban Giám Hiệu: role `admin` (hoặc tên chứa giám hiệu).
 * Super admin cũng được coi là BGH (full quyền).
 */
async function isBghAdminUser(
	auth: { isSuperAdmin?: boolean; userID: string | number },
	userId?: number
): Promise<boolean> {
	if (auth.isSuperAdmin) return true
	const uid = userId ?? Number(auth.userID)
	const names = await loadUserRoleNames(uid)
	return names.some((n) => {
		const x = n.toLowerCase()
		return (
			x === 'admin' ||
			x === 'admin_bgh' ||
			x.includes('giam_hieu') ||
			x.includes('giám hiệu') ||
			x.includes('giam hieu') ||
			x.includes('bgh')
		)
	})
}

/** User IDs mang role Ban Giám Hiệu (admin) — nhận đề xuất chờ duyệt */
async function loadBghAdminUserIds(): Promise<number[]> {
	const rows = await orm
		.select({ userId: userRoles.userId })
		.from(userRoles)
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
		.where(
			// role admin = BGH; không gồm super_admin (xử lý riêng)
			eq(roles.name, 'admin')
		)
	const ids = new Set(rows.map((r) => r.userId).filter(Boolean))
	// Thêm super_admin users
	const supers = await orm
		.select({ id: users.id })
		.from(users)
		.where(eq(users.isSuperUser, true))
	for (const s of supers) ids.add(s.id)
	return [...ids]
}

async function notifyUsers(opts: {
	userIds: number[]
	title: string
	message: string
	actorId: number
	excludeUserId?: number
}) {
	const seen = new Set<number>()
	for (const rid of opts.userIds) {
		if (!rid || rid === opts.excludeUserId) continue
		if (seen.has(rid)) continue
		seen.add(rid)
		try {
			await orm.insert(notifications).values({
				id: uuidv4(),
				notificationType: 'assetProposal',
				title: opts.title,
				message: opts.message,
				recipientId: rid,
				actorId: opts.actorId,
				isBatch: false,
				totalCount: 1
			})
		} catch (err) {
			log.warn('notifyUsers failed', {
				rid,
				err: err instanceof Error ? err.message : String(err)
			})
		}
	}
}

/**
 * Được xem đề xuất:
 * - super admin / BGH (admin)
 * - người gửi
 * - user ngành có mã ngành trùng
 */
async function canAccessProposal(
	auth: { isSuperAdmin?: boolean; userID: string | number },
	row: { proposedByUserId?: number | null; nganhCode?: string | null },
	proposalId?: number
): Promise<boolean> {
	if (auth.isSuperAdmin) return true
	const uid = Number(auth.userID)
	if (row.proposedByUserId === uid) return true
	if (await isBghAdminUser(auth, uid)) return true
	const myNganh = await loadUserNganhCodes(uid)
	if (!myNganh.length) return false
	const header = (row.nganhCode || '').trim().toUpperCase()
	if (header && myNganh.includes(header)) return true
	if (proposalId != null) {
		const items = await loadItems(proposalId)
		if (
			items.some((it) => {
				const c = (it.nganhCode || '').trim().toUpperCase()
				return c && myNganh.includes(c)
			})
		) {
			return true
		}
	}
	return false
}

/** GET /asset-proposals/pending-count — badge BGH (chờ duyệt) / ngành (chờ sửa) */
export const GetPendingProposalCount = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-proposals/pending-count'
	},
	async (): Promise<{ data: { count: number } }> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const isBgh = await isBghAdminUser(auth, uid)

		// BGH / super: đếm PENDING (chờ phê duyệt)
		if (isBgh) {
			const rows = await orm
				.select()
				.from(assetProposals)
				.where(eq(assetProposals.status, 'PENDING'))
			return { data: { count: rows.length } }
		}

		// Ngành: đếm APPROVED + REPAIR thuộc ngành (chờ sửa)
		const myNganh = await loadUserNganhCodes(uid)
		if (!myNganh.length) {
			return { data: { count: 0 } }
		}
		const approved = await orm
			.select()
			.from(assetProposals)
			.where(eq(assetProposals.status, 'APPROVED'))
		let count = 0
		for (const p of approved) {
			if (p.proposalType !== 'REPAIR') continue
			if (await canAccessProposal(auth, p, p.id)) count++
		}
		return { data: { count } }
	}
)

/**
 * GET /asset-proposals/liquidations
 * Danh sách VT các đơn vị đề nghị thanh lý (+ đã thanh lý) — lọc năm QĐ / trạng thái.
 */
export const ListLiquidationAssets = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-proposals/liquidations'
	},
	async (q: {
		status?: Query<string>
		year?: Query<number>
		limit?: Query<number>
	}): Promise<{ data: LiquidationAssetRow[] }> => {
		const auth = getAuthData()!
		const limit = Math.min(Number(q.limit) || 1000, 2000)

		let props = await orm
			.select()
			.from(assetProposals)
			.where(eq(assetProposals.proposalType, 'LIQUIDATION'))
			.orderBy(desc(assetProposals.createdAt), desc(assetProposals.id))
			.limit(limit)

		if (!auth.isSuperAdmin) {
			props = props.filter(
				(p) => p.proposedByUserId === Number(auth.userID)
			)
		}
		if (q.status) {
			const st = String(q.status).toUpperCase()
			if (st !== 'ALL') {
				props = props.filter((p) => p.status === st)
			}
		}
		if (q.year) {
			const y = String(q.year)
			props = props.filter((p) => {
				const d = p.decisionAt || p.completedAt || p.createdAt || ''
				return d.startsWith(y)
			})
		}

		const out: LiquidationAssetRow[] = []
		for (const p of props) {
			const items = await loadItems(p.id)
			for (const it of items) {
				out.push({
					proposalId: p.id,
					proposalTitle: p.title,
					proposalStatus: p.status,
					proposedAt: p.createdAt,
					unitName: p.unitName ?? null,
					nganhCode: p.nganhCode ?? null,
					proposedByDisplayName:
						p.proposedByDisplayName || p.proposedByUsername || null,
					itemId: it.id,
					materialId: it.materialId,
					materialCode: it.materialCode,
					materialName: it.materialName,
					roomAssetId: it.roomAssetId,
					quantity: it.quantity,
					unit: it.unit,
					category: it.category,
					fromRoomCode: it.fromRoomCode,
					fromRoomName: it.fromRoomName,
					locationNote: it.locationNote,
					decisionNumber: p.decisionNumber ?? null,
					decisionNganhCode: p.decisionNganhCode ?? null,
					decisionIssuingLevel: p.decisionIssuingLevel ?? null,
					decisionSigner: p.decisionSigner ?? null,
					decisionAt: p.decisionAt ?? null,
					completedAt: p.completedAt ?? null
				})
			}
		}
		return { data: out }
	}
)

/** POST /asset-proposals — đơn vị tạo đề xuất */
export const CreateAssetProposal = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-proposals'
	},
	async (body: {
		proposalType: 'REPAIR' | 'RECALL' | 'LIQUIDATION'
		title: string
		description?: string
		unitId?: number
		unitName?: string
		nganhCode?: string
		items: Array<{
			materialId?: number
			materialCode?: string
			materialName: string
			roomAssetId?: number
			quantity: number
			unit?: string
			category?: string
			nganhCode?: string
			chuyenNganhCode?: string
			note?: string
			fromRoomId?: number
			fromRoomCode?: string
			fromRoomName?: string
			locationNote?: string
			targetRoomId?: number
			targetRoomCode?: string
			targetRoomName?: string
		}>
	}): Promise<{ data: ProposalResponse }> => {
		const auth = getAuthData()!
		const userId = Number(auth.userID)
		const isAdmin = !!auth.isSuperAdmin
		const ptype = body.proposalType
		if (!TYPES.includes(ptype)) {
			throw APIError.invalidArgument('proposalType không hợp lệ')
		}
		const title = (body.title || '').trim()
		if (!title) throw APIError.invalidArgument('title is required')
		const items = body.items || []
		if (!items.length) {
			throw APIError.invalidArgument('Cần ít nhất 1 vật tư trong đề xuất')
		}
		for (const it of items) {
			if (!(it.materialName || '').trim()) {
				throw APIError.invalidArgument('materialName is required')
			}
			if (
				!Number.isFinite(Number(it.quantity)) ||
				Number(it.quantity) < 1
			) {
				throw APIError.invalidArgument('quantity phải ≥ 1')
			}
		}

		const userRow = await orm.query.users.findFirst({
			where: eq(users.id, userId)
		})

		// User gắn unitId (đơn vị sử dụng) → cố định đơn vị đề xuất
		let unitId = body.unitId ?? null
		let unitName = body.unitName?.trim() || null
		if (userRow?.unitId != null && !isAdmin) {
			unitId = userRow.unitId
			const u = await orm.query.units.findFirst({
				where: eq(units.id, userRow.unitId)
			})
			if (u) {
				unitName = `${u.alias} — ${u.name}`
			}
		}

		const nganhCode =
			body.nganhCode?.trim().toUpperCase() ||
			items
				.find((i) => i.nganhCode)
				?.nganhCode?.trim()
				.toUpperCase() ||
			null

		const inserted = await orm
			.insert(assetProposals)
			.values({
				proposalType: ptype,
				status: 'PENDING',
				title,
				description: body.description?.trim() || null,
				unitId,
				unitName,
				nganhCode,
				proposedByUserId: userId,
				proposedByUsername: userRow?.username || null,
				proposedByDisplayName: userRow?.displayName || null
			})
			.returning()
		const prop = inserted[0]!

		const brokenAt = new Date().toISOString().slice(0, 10)
		/** Đã mark hỏng — dùng để rollback nếu lỗi giữa chừng */
		const markedBroken: Array<{
			brokenAssetId: number
			sourceAssetId: number | null
			originalGrade: number
			quantity: number
		}> = []

		try {
			for (const it of items) {
				const fromRoom = await resolveRoom(it.fromRoomId)
				const targetRoom = await resolveRoom(it.targetRoomId)
				const itemNganh =
					it.nganhCode?.trim().toUpperCase() || nganhCode || null
				const qty = Math.floor(Number(it.quantity))

				/**
				 * REPAIR + có roomAssetId:
				 * Giữ nguyên cấp; mã -HONG-, status BROKEN (bảng hư hỏng theo status).
				 * Sửa xong (COMPLETED) → cùng cấp ban đầu + mã gốc.
				 */
				let roomAssetId = it.roomAssetId ?? null
				let sourceAssetId: number | null = null
				let originalGrade: number | null = null
				let originalCode: string | null = null
				let materialCode = it.materialCode?.trim() || null
				let materialName = it.materialName.trim()
				let category = it.category?.trim() || null

				if (ptype === 'REPAIR' && roomAssetId != null) {
					const marked = await markAssetBrokenForRepair({
						roomAssetId,
						quantity: qty,
						damageNote:
							it.note?.trim() || body.description?.trim() || null,
						brokenAt,
						preserveGrade: true
					})
					markedBroken.push({
						brokenAssetId: marked.brokenAssetId,
						sourceAssetId:
							marked.sourceAssetId !== marked.brokenAssetId
								? marked.sourceAssetId
								: marked.brokenAssetId,
						originalGrade: marked.originalGrade,
						quantity: marked.quantity
					})
					roomAssetId = marked.brokenAssetId
					sourceAssetId =
						marked.sourceAssetId !== marked.brokenAssetId
							? marked.sourceAssetId
							: marked.brokenAssetId
					originalGrade = marked.originalGrade
					originalCode = marked.originalCode
					materialCode = marked.originalCode
					materialName = marked.name
					category = marked.category || category

					// Nhật ký hỏng — lưu vĩnh viễn để tải xuống
					await writeAssetBrokenLog({
						eventType: 'BROKEN',
						sourceType: 'PROPOSAL',
						sourceId: prop.id,
						proposalId: prop.id,
						roomAssetId: marked.brokenAssetId,
						sourceAssetId,
						assetCode: undefined,
						originalCode: marked.originalCode,
						assetName: marked.name,
						category: marked.category,
						quantity: marked.quantity,
						originalGrade: marked.originalGrade,
						gradeAfter: marked.gradeAfter,
						statusAfter: 'BROKEN',
						roomId: marked.roomId,
						roomCode:
							fromRoom?.roomCode ||
							it.fromRoomCode?.trim() ||
							null,
						roomName:
							fromRoom?.roomName ||
							it.fromRoomName?.trim() ||
							null,
						unitName,
						nganhCode: itemNganh,
						reason:
							it.note?.trim() || body.description?.trim() || null,
						eventAt: brokenAt,
						actorUserId: userId,
						actorUsername: userRow?.username || null,
						actorDisplayName: userRow?.displayName || null
					})
				}

				await orm.insert(assetProposalItems).values({
					proposalId: prop.id,
					materialId: it.materialId ?? null,
					materialCode,
					materialName,
					roomAssetId,
					sourceAssetId,
					originalGrade,
					originalCode,
					quantity: qty,
					unit: it.unit?.trim() || 'Bộ',
					category,
					nganhCode: itemNganh,
					chuyenNganhCode:
						it.chuyenNganhCode?.trim().toUpperCase() || null,
					note: it.note?.trim() || null,
					fromRoomId: fromRoom?.id ?? it.fromRoomId ?? null,
					fromRoomCode:
						fromRoom?.roomCode || it.fromRoomCode?.trim() || null,
					fromRoomName:
						fromRoom?.roomName || it.fromRoomName?.trim() || null,
					locationNote: it.locationNote?.trim() || null,
					targetRoomId: targetRoom?.id ?? it.targetRoomId ?? null,
					targetRoomCode:
						targetRoom?.roomCode ||
						it.targetRoomCode?.trim() ||
						null,
					targetRoomName:
						targetRoom?.roomName ||
						it.targetRoomName?.trim() ||
						null
				})
			}
		} catch (err) {
			// Rollback VT đã chuyển hỏng + xóa phiếu
			for (const m of markedBroken.reverse()) {
				try {
					await restoreBrokenAssetOnCancel({
						brokenAssetId: m.brokenAssetId,
						sourceAssetId: m.sourceAssetId,
						originalGrade: m.originalGrade,
						quantity: m.quantity
					})
				} catch (rollbackErr) {
					log.warn(
						'CreateAssetProposal: rollback mark broken failed',
						{
							...m,
							err:
								rollbackErr instanceof Error
									? rollbackErr.message
									: String(rollbackErr)
						}
					)
				}
			}
			await orm
				.delete(assetProposalItems)
				.where(eq(assetProposalItems.proposalId, prop.id))
			await orm
				.delete(assetProposals)
				.where(eq(assetProposals.id, prop.id))
			const msg = err instanceof Error ? err.message : String(err)
			throw APIError.failedPrecondition(msg)
		}

		const itemList = await loadItems(prop.id)
		const reason = body.description?.trim() || null
		// Log CREATE — actor ĐV ghi «Đơn vị sử dụng»; admin xem full tab Nhật ký
		const createKind = isAdmin
			? ('admin' as const)
			: (await loadUserNganhCodes(userId)).length > 0
				? ('nganh' as const)
				: ('don_vi' as const)
		const logBits = [
			title,
			`(${itemList.length} VT)`,
			unitName ? `ĐV:${unitName}` : null,
			nganhCode ? '→ Ngành' : null
		].filter(Boolean)
		await writeLog({
			proposalId: prop.id,
			action: 'CREATE',
			proposalType: ptype,
			summary: logBits.join(' '),
			// Chi tiết: chỉ tên thiết bị · phòng · lý do (không ghi chuyển cấp)
			details: itemList
				.map((i) => formatItemDetail(i, reason))
				.join('; '),
			userId,
			isAdmin,
			actorKind: createKind
		})

		// Thông báo → Ban Giám Hiệu (role admin) + super admin — chờ phê duyệt
		const proposer =
			userRow?.displayName || userRow?.username || `user #${userId}`
		const itemBrief = itemList
			.map((i) => formatItemDetail(i, reason))
			.join('; ')
		const unitLabel = unitName ? ` · ĐV: ${unitName}` : ''
		const nganhLabel = nganhCode ? ` · Ngành: ${nganhCode}` : ''
		const notiTitle = `Đề xuất mới #${prop.id} — chờ BGH phê duyệt`
		const notiMessage = [
			`${proposer} vừa gửi đề xuất «${title}» (${itemList.length} VT)${unitLabel}${nganhLabel}.`,
			itemBrief ? `Chi tiết: ${itemBrief}.` : null,
			'Ban Giám Hiệu vui lòng phê duyệt hoặc từ chối tại Đề xuất.'
		]
			.filter(Boolean)
			.join(' ')

		try {
			const bghIds = await loadBghAdminUserIds()
			await notifyUsers({
				userIds: bghIds,
				title: notiTitle,
				message: notiMessage,
				actorId: userId,
				excludeUserId: userId
			})
			log.info('CreateAssetProposal: notified BGH', {
				proposalId: prop.id,
				recipientCount: bghIds.length,
				nganhCode: nganhCode || null
			})
		} catch (err) {
			log.warn('CreateAssetProposal: failed to notify', {
				proposalId: prop.id,
				err: err instanceof Error ? err.message : String(err)
			})
		}

		log.info('CreateAssetProposal', {
			id: prop.id,
			ptype,
			userId,
			nganhCode
		})
		return { data: toProposal(prop, itemList) }
	}
)

/** GET /asset-proposals */
export const ListAssetProposals = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-proposals'
	},
	async (q: {
		status?: Query<string>
		proposalType?: Query<string>
		mine?: Query<boolean>
		limit?: Query<number>
	}): Promise<{ data: ProposalResponse[] }> => {
		const auth = getAuthData()!
		const userId = Number(auth.userID)
		// Super + BGH (role admin): xem toàn bộ đề xuất
		const isAdmin =
			!!auth.isSuperAdmin || (await isBghAdminUser(auth, userId))
		const limit = Math.min(Number(q.limit) || 200, 500)
		const mineOnly = q.mine === true || String(q.mine) === 'true'

		/**
		 * Super / BGH: luôn thấy TOÀN BỘ đề xuất.
		 * User ngành: đề xuất ngành mình + của mình.
		 * User đơn vị: chỉ đề xuất mình gửi (mine hoặc canAccess).
		 */
		let rows = await orm
			.select()
			.from(assetProposals)
			.orderBy(desc(assetProposals.createdAt), desc(assetProposals.id))
			.limit(isAdmin && !mineOnly ? limit : Math.min(limit * 5, 2000))

		if (mineOnly) {
			rows = rows.filter((r) => r.proposedByUserId === userId)
		} else if (!isAdmin) {
			const filtered: typeof rows = []
			for (const r of rows) {
				if (await canAccessProposal(auth, r, r.id)) filtered.push(r)
			}
			rows = filtered
		}
		// Super/BGH: không lọc theo ngành — full list
		if (q.status) {
			const st = String(q.status).toUpperCase()
			rows = rows.filter((r) => r.status === st)
		}
		if (q.proposalType) {
			const pt = String(q.proposalType).toUpperCase()
			rows = rows.filter((r) => r.proposalType === pt)
		}
		rows = rows.slice(0, limit)

		const out: ProposalResponse[] = []
		for (const p of rows) {
			out.push(toProposal(p, await loadItems(p.id)))
		}
		return { data: out }
	}
)

/** GET /asset-proposals/:id */
export const GetAssetProposal = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-proposals/:id'
	},
	async (p: { id: number }): Promise<{ data: ProposalResponse }> => {
		const auth = getAuthData()!
		const found = await orm
			.select()
			.from(assetProposals)
			.where(eq(assetProposals.id, Number(p.id)))
			.limit(1)
		const row = found[0]
		if (!row) throw APIError.notFound('Không tìm thấy đề xuất')
		if (!(await canAccessProposal(auth, row, row.id))) {
			throw APIError.permissionDenied('Không xem được đề xuất này')
		}
		return { data: toProposal(row, await loadItems(row.id)) }
	}
)

/**
 * POST /asset-proposals/:id/decide
 * Admin duyệt / từ chối / hoàn thành.
 * - RECALL COMPLETED: thu hồi VT về kho (giảm nguồn, tăng kho).
 * - LIQUIDATION COMPLETED: nhập QĐ → giảm danh mục + room_assets lý do «Thanh lý».
 * - REPAIR COMPLETED: ghi kết quả sửa chữa (adminNote).
 */
export const DecideAssetProposal = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/asset-proposals/:id/decide'
	},
	async (req: {
		id: number
		/** APPROVED | REJECTED | COMPLETED */
		decision: 'APPROVED' | 'REJECTED' | 'COMPLETED'
		adminNote?: string
		/** Bắt buộc khi COMPLETED + LIQUIDATION */
		decisionNumber?: string
		decisionNganhCode?: string
		decisionIssuingLevel?: string
		decisionSigner?: string
		decisionAt?: string
		/** Kho đích khi COMPLETED + RECALL (áp dụng mọi item chưa có target) */
		targetRoomId?: number
	}): Promise<{ data: ProposalResponse }> => {
		const auth = getAuthData()!
		const userId = Number(auth.userID)
		const id = Number(req.id)
		const found = await orm
			.select()
			.from(assetProposals)
			.where(eq(assetProposals.id, id))
			.limit(1)
		const row = found[0]
		if (!row) throw APIError.notFound('Không tìm thấy đề xuất')

		const isBgh = await isBghAdminUser(auth, userId)
		const myNganh = await loadUserNganhCodes(userId)
		const headerNganh = (row.nganhCode || '').trim().toUpperCase()
		const nganhMatch =
			myNganh.length > 0 &&
			((headerNganh && myNganh.includes(headerNganh)) ||
				(await canAccessProposal(auth, row, row.id)))
		// Người gửi không tự xử lý
		if (row.proposedByUserId === userId && !auth.isSuperAdmin) {
			throw APIError.permissionDenied(
				'Người gửi đề xuất không tự phê duyệt / hoàn thành'
			)
		}

		const decision = req.decision
		if (!['APPROVED', 'REJECTED', 'COMPLETED'].includes(decision)) {
			throw APIError.invalidArgument('decision không hợp lệ')
		}

		/**
		 * Phân quyền 2 bước:
		 * - PENDING + APPROVED/REJECTED → chỉ BGH (admin) / super
		 * - APPROVED + COMPLETED (REPAIR) → ngành khớp (hoặc super)
		 * - APPROVED + REJECTED → BGH hoặc ngành
		 * - RECALL/LIQUIDATION COMPLETED → BGH hoặc ngành (sau khi đã duyệt)
		 */
		if (decision === 'APPROVED') {
			if (row.status !== 'PENDING') {
				throw APIError.failedPrecondition(
					`Chỉ phê duyệt đề xuất đang chờ BGH (PENDING), hiện: ${row.status}`
				)
			}
			if (!isBgh) {
				throw APIError.permissionDenied(
					'Chỉ Ban Giám Hiệu (admin) được phê duyệt đề xuất'
				)
			}
		} else if (decision === 'REJECTED') {
			if (row.status === 'PENDING') {
				if (!isBgh) {
					throw APIError.permissionDenied(
						'Chỉ Ban Giám Hiệu được từ chối đề xuất đang chờ duyệt'
					)
				}
			} else if (row.status === 'APPROVED') {
				if (!isBgh && !nganhMatch && !auth.isSuperAdmin) {
					throw APIError.permissionDenied(
						'Chỉ BGH hoặc ngành phụ trách được hủy đề xuất đã duyệt'
					)
				}
			} else {
				throw APIError.failedPrecondition(
					`Không từ chối được đề xuất ở trạng thái ${row.status}`
				)
			}
		} else if (decision === 'COMPLETED') {
			// REPAIR: phải đã BGH duyệt
			if (row.proposalType === 'REPAIR' && row.status !== 'APPROVED') {
				throw APIError.failedPrecondition(
					'Đề xuất sửa chữa cần Ban Giám Hiệu phê duyệt trước — ngành chỉ hoàn thành khi đã duyệt'
				)
			}
			// Ngành thực hiện; BGH thuần không được bấm «Sửa xong» (kể cả super? super được)
			if (row.proposalType === 'REPAIR') {
				const pureBgh = isBgh && !auth.isSuperAdmin && !nganhMatch
				if (pureBgh) {
					throw APIError.permissionDenied(
						'Ban Giám Hiệu không báo hoàn thành sửa chữa — chỉ ngành phụ trách bấm «Sửa xong». BGH nhận thông báo khi ngành xong.'
					)
				}
				if (!auth.isSuperAdmin && !nganhMatch) {
					throw APIError.permissionDenied(
						'Chỉ ngành phụ trách được báo hoàn thành sửa chữa'
					)
				}
			} else {
				// RECALL / LIQUIDATION: BGH hoặc ngành sau duyệt
				if (row.status === 'PENDING') {
					// Cho phép BGH hoàn thành luôn (thanh lý/thu hồi gộp) hoặc duyệt trước
					if (!isBgh && !nganhMatch) {
						throw APIError.permissionDenied(
							'Cần BGH hoặc ngành phụ trách xử lý đề xuất'
						)
					}
				} else if (row.status === 'APPROVED') {
					if (!isBgh && !nganhMatch && !auth.isSuperAdmin) {
						throw APIError.permissionDenied(
							'Không có quyền hoàn thành đề xuất này'
						)
					}
				} else {
					throw APIError.failedPrecondition(
						`Không hoàn thành được đề xuất ở trạng thái ${row.status}`
					)
				}
			}
		}

		const userRow = await orm.query.users.findFirst({
			where: eq(users.id, userId)
		})
		const now = new Date().toISOString().slice(0, 10)
		const items = await loadItems(id)

		// ── Thu hồi / trả về → LUÔN kho hệ thống KHO-VT ─────────
		if (decision === 'COMPLETED' && row.proposalType === 'RECALL') {
			const warehouse = await assetController.ensureSystemWarehouse()

			const moveSummaries: string[] = []
			for (const it of items) {
				if (it.roomAssetId == null) {
					throw APIError.failedPrecondition(
						`VT «${it.materialName}» thiếu roomAssetId — không thu hồi được`
					)
				}

				// Cập nhật item trỏ về kho
				await orm
					.update(assetProposalItems)
					.set({
						targetRoomId: warehouse.id,
						targetRoomCode: warehouse.roomCode,
						targetRoomName: warehouse.roomName
					})
					.where(eq(assetProposalItems.id, it.id))

				const proposedBy =
					row.proposedByDisplayName ||
					row.proposedByUsername ||
					row.unitName ||
					null
				const approvedBy =
					userRow?.displayName || userRow?.username || null
				// createTransferRecall (RECALL) luôn ép đích = KHO-VT
				await assetController.createTransferRecall({
					roomAssetId: it.roomAssetId,
					movementType: 'RECALL',
					quantity: it.quantity,
					executedAt: req.decisionAt?.trim() || now,
					holdingUnitId: null,
					reasonOther: `Đề xuất thu hồi #${id}`,
					note: [
						proposedBy ? `Đề xuất từ: ${proposedBy}` : null,
						approvedBy ? `Phê duyệt: ${approvedBy}` : null,
						`đề xuất #${id}`,
						it.locationNote,
						req.adminNote,
						'→ Kho vật tư (KHO-VT)'
					]
						.filter(Boolean)
						.join(' · '),
					performer: approvedBy || undefined
				})

				const from =
					it.fromRoomCode || it.fromRoomName
						? `${it.fromRoomCode || ''} ${it.fromRoomName || ''}`.trim()
						: 'nguồn'
				moveSummaries.push(
					`${it.materialName} ×${it.quantity}: ${from} → ${warehouse.roomCode} ${warehouse.roomName}`
				)
			}

			const updated = await orm
				.update(assetProposals)
				.set({
					status: 'COMPLETED',
					adminNote: req.adminNote?.trim() || row.adminNote,
					decidedByUserId: userId,
					decidedByUsername: userRow?.username || null,
					decidedByDisplayName: userRow?.displayName || null,
					decisionAt: req.decisionAt?.trim() || now,
					completedAt: new Date().toISOString()
				})
				.where(eq(assetProposals.id, id))
				.returning()

			await writeLog({
				proposalId: id,
				action: 'RECALL_COMPLETE',
				proposalType: 'RECALL',
				summary: [
					row.title,
					`(${items.length} VT)`,
					row.unitName ? `ĐV:${row.unitName}` : null,
					row.nganhCode ? '→ Ngành' : null
				]
					.filter(Boolean)
					.join(' '),
				details: moveSummaries.join('; '),
				userId,
				isAdmin: !!auth.isSuperAdmin,
				actorKind: auth.isSuperAdmin ? 'admin' : 'nganh'
			})

			return {
				data: toProposal(updated[0]!, await loadItems(id))
			}
		}

		// ── Thanh lý hoàn tất: giảm danh mục + room assets ───────
		if (decision === 'COMPLETED' && row.proposalType === 'LIQUIDATION') {
			const decisionNumber = (req.decisionNumber || '').trim()
			const decisionNganh = (req.decisionNganhCode || row.nganhCode || '')
				.trim()
				.toUpperCase()
			const issuing = (req.decisionIssuingLevel || '').trim()
			const signer = (req.decisionSigner || '').trim()
			if (!decisionNumber) {
				throw APIError.invalidArgument('Cần số quyết định thanh lý')
			}
			if (!decisionNganh) {
				throw APIError.invalidArgument('Cần ngành thanh lý')
			}
			if (!issuing) {
				throw APIError.invalidArgument('Cần cấp ban hành QĐ thanh lý')
			}
			if (!signer) {
				throw APIError.invalidArgument('Cần người ký QĐ thanh lý')
			}

			const executedAt = req.decisionAt?.trim() || now

			const proposedBy =
				row.proposedByDisplayName ||
				row.proposedByUsername ||
				row.unitName ||
				null
			const approvedBy =
				userRow?.displayName || userRow?.username || signer || null

			for (const it of items) {
				// 1) Giảm room_assets nếu có (lý do Thanh lý)
				if (it.roomAssetId != null) {
					try {
						await assetController.createAssetMovement({
							roomAssetId: it.roomAssetId,
							movementType: 'DECREASE',
							quantity: it.quantity,
							executedAt,
							reasonCode: 'LIQUIDATION',
							decisionDate: executedAt,
							decisionNumber,
							signer,
							note: [
								proposedBy ? `Đề xuất từ: ${proposedBy}` : null,
								approvedBy ? `Phê duyệt: ${approvedBy}` : null,
								`đề xuất #${id}`,
								`QĐ ${decisionNumber} · ${issuing}`
							]
								.filter(Boolean)
								.join(' · '),
							performer: approvedBy || undefined
						})
					} catch (err) {
						const msg =
							err instanceof Error ? err.message : String(err)
						// Nếu VT đã hết / xóa trước đó — vẫn giảm danh mục
						log.warn('LIQUIDATION room asset decrease skip', {
							roomAssetId: it.roomAssetId,
							msg
						})
					}
				}

				// 2) Giảm danh mục materials
				let mat =
					it.materialId != null
						? await orm.query.materials.findFirst({
								where: eq(materials.id, it.materialId)
							})
						: null
				if (!mat && it.materialCode) {
					mat = await orm.query.materials.findFirst({
						where: eq(
							materials.code,
							it.materialCode.trim().toUpperCase()
						)
					})
				}
				if (!mat && it.materialName) {
					const all = await orm.select().from(materials)
					const nameNorm = it.materialName
						.trim()
						.toLocaleLowerCase('vi')
					mat =
						all.find(
							(m) =>
								m.name.trim().toLocaleLowerCase('vi') ===
								nameNorm
						) || null
				}
				if (!mat) {
					// Có room asset đã giảm → cho qua nếu không map danh mục
					if (it.roomAssetId != null) continue
					throw APIError.failedPrecondition(
						`Không tìm thấy VT danh mục «${it.materialName}» để thanh lý`
					)
				}
				const before = Number(mat.quantity) || 0
				const qty = Math.min(it.quantity, before)
				if (qty < 1) {
					// Danh mục đã 0 — vẫn ghi log 0 nếu đã trừ room
					if (it.roomAssetId != null) continue
					throw APIError.failedPrecondition(
						`VT «${mat.code}» không còn SL danh mục để thanh lý (có ${before})`
					)
				}
				const after = before - qty
				await orm
					.update(materials)
					.set({ quantity: after })
					.where(eq(materials.id, mat.id))

				const cat = await orm.query.categories.findFirst({
					where: eq(categories.id, mat.categoryId)
				})
				const cnCode = cat?.code || it.chuyenNganhCode || null
				const ng =
					decisionNganh || (cnCode ? nganhFromCode(cnCode) : 'HC2A')

				await orm.insert(catalogStockLogs).values({
					movementType: 'DECREASE',
					executedAt,
					materialId: mat.id,
					materialCode: mat.code,
					materialName: mat.name,
					nganhCode: ng,
					chuyenNganhCode: cnCode,
					chuyenNganhName: cat?.name || null,
					quantity: qty,
					quantityBefore: before,
					quantityAfter: after,
					unit: mat.unit,
					isNewMaterial: 0,
					reason: 'Thanh lý',
					note: `QĐ ${decisionNumber} · ${issuing} · Ký: ${signer} · đề xuất #${id}`,
					actorUserId: userId,
					actorUsername: userRow?.username || null,
					actorDisplayName: userRow?.displayName || null,
					actorIsAdmin: 1
				})
			}

			const updated = await orm
				.update(assetProposals)
				.set({
					status: 'COMPLETED',
					adminNote: req.adminNote?.trim() || row.adminNote,
					decisionNumber,
					decisionNganhCode: decisionNganh,
					decisionIssuingLevel: issuing,
					decisionSigner: signer,
					decisionAt: executedAt,
					decidedByUserId: userId,
					decidedByUsername: userRow?.username || null,
					decidedByDisplayName: userRow?.displayName || null,
					completedAt: new Date().toISOString()
				})
				.where(eq(assetProposals.id, id))
				.returning()

			await writeLog({
				proposalId: id,
				action: 'LIQUIDATE',
				proposalType: 'LIQUIDATION',
				summary: [
					row.title,
					`(${items.length} VT)`,
					row.unitName ? `ĐV:${row.unitName}` : null,
					row.nganhCode ? '→ Ngành' : null
				]
					.filter(Boolean)
					.join(' '),
				details: [
					...items.map((i) => formatItemDetail(i, row.description)),
					`QĐ ${decisionNumber} · Cấp BH: ${issuing} · Ký: ${signer} · Ngày: ${executedAt}`
				].join('; '),
				userId,
				isAdmin: !!auth.isSuperAdmin,
				actorKind: auth.isSuperAdmin ? 'admin' : 'nganh'
			})

			return {
				data: toProposal(updated[0]!, await loadItems(id))
			}
		}

		// ── Duyệt / từ chối / hoàn thành (sửa chữa…) ─────────────
		// Sửa xong: bắt buộc ghi kết quả để báo user
		if (
			decision === 'COMPLETED' &&
			row.proposalType === 'REPAIR' &&
			!(req.adminNote || '').trim()
		) {
			throw APIError.invalidArgument(
				'Cần ghi kết quả sửa chữa để báo cho đơn vị biết'
			)
		}

		/**
		 * REPAIR REJECTED: trả VT về cấp/mã gốc (khỏi bảng hư hỏng).
		 */
		if (decision === 'REJECTED' && row.proposalType === 'REPAIR') {
			for (const it of items) {
				if (it.roomAssetId == null) continue
				try {
					await restoreBrokenAssetOnCancel({
						brokenAssetId: it.roomAssetId,
						sourceAssetId: it.sourceAssetId,
						originalGrade: it.originalGrade,
						quantity: it.quantity
					})
					await writeAssetBrokenLog({
						eventType: 'REJECTED',
						sourceType: 'PROPOSAL',
						sourceId: id,
						proposalId: id,
						roomAssetId: it.roomAssetId,
						sourceAssetId: it.sourceAssetId,
						originalCode: it.originalCode,
						assetName: it.materialName,
						category: it.category,
						quantity: it.quantity,
						originalGrade: it.originalGrade,
						gradeAfter: it.originalGrade ?? 1,
						statusAfter: 'NORMAL',
						roomId: it.fromRoomId,
						roomCode: it.fromRoomCode,
						roomName: it.fromRoomName,
						unitName: row.unitName,
						nganhCode: row.nganhCode,
						reason: req.adminNote?.trim() || null,
						eventAt: now,
						actorUserId: userId,
						actorUsername: userRow?.username || null,
						actorDisplayName: userRow?.displayName || null
					})
				} catch (err) {
					log.warn('REPAIR reject restore failed', {
						proposalId: id,
						roomAssetId: it.roomAssetId,
						err: err instanceof Error ? err.message : String(err)
					})
				}
			}
		}

		/**
		 * REPAIR COMPLETED: giữ nguyên cấp ban đầu + mã gốc (status NORMAL).
		 * Không hạ cấp 5 khi gửi, không ép về cấp 2 khi sửa xong.
		 */
		if (decision === 'COMPLETED' && row.proposalType === 'REPAIR') {
			const performer = userRow?.displayName || userRow?.username || null
			const doneAt = req.decisionAt?.trim() || now
			for (const it of items) {
				if (it.roomAssetId == null) continue
				const keepGrade =
					it.originalGrade != null &&
					Number(it.originalGrade) >= 1 &&
					Number(it.originalGrade) <= 5
						? Number(it.originalGrade)
						: undefined
				try {
					const newId = await completeRepairToGrade2({
						roomAssetId: it.roomAssetId,
						sourceAssetId: it.sourceAssetId,
						quantity: it.quantity,
						performer,
						completedAt: doneAt,
						targetGrade: keepGrade
					})
					// Cập nhật item trỏ về dòng ổn định sau gộp
					if (newId != null && newId !== it.roomAssetId) {
						await orm
							.update(assetProposalItems)
							.set({ roomAssetId: newId })
							.where(eq(assetProposalItems.id, it.id))
					}
					await writeAssetBrokenLog({
						eventType: 'COMPLETED',
						sourceType: 'PROPOSAL',
						sourceId: id,
						proposalId: id,
						roomAssetId: newId ?? it.roomAssetId,
						sourceAssetId: it.sourceAssetId,
						originalCode: it.originalCode,
						assetName: it.materialName,
						category: it.category,
						quantity: it.quantity,
						originalGrade: it.originalGrade,
						gradeAfter: keepGrade ?? it.originalGrade ?? 2,
						statusAfter: 'NORMAL',
						roomId: it.fromRoomId,
						roomCode: it.fromRoomCode,
						roomName: it.fromRoomName,
						unitName: row.unitName,
						nganhCode: row.nganhCode,
						reason: row.description,
						resultNote: req.adminNote?.trim() || null,
						performer,
						eventAt: doneAt,
						actorUserId: userId,
						actorUsername: userRow?.username || null,
						actorDisplayName: userRow?.displayName || null
					})
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err)
					log.warn('REPAIR complete preserve grade failed', {
						proposalId: id,
						roomAssetId: it.roomAssetId,
						err: msg
					})
					throw APIError.failedPrecondition(
						`Không hoàn tất sửa chữa VT «${it.materialName}»: ${msg}`
					)
				}
			}
		}

		const resultNote = req.adminNote?.trim() || null
		const patch: Partial<typeof assetProposals.$inferInsert> = {
			status: decision,
			adminNote: resultNote || row.adminNote,
			decidedByUserId: userId,
			decidedByUsername: userRow?.username || null,
			decidedByDisplayName: userRow?.displayName || null,
			decisionAt: req.decisionAt?.trim() || now
		}
		if (decision === 'COMPLETED') {
			patch.completedAt = new Date().toISOString()
		}

		const updated = await orm
			.update(assetProposals)
			.set(patch)
			.where(eq(assetProposals.id, id))
			.returning()

		// Log: BGH/super = admin (hiện tên); ngành = «Ngành»; còn lại ĐV
		const actorKind = isBgh
			? ('admin' as const)
			: myNganh.length > 0
				? ('nganh' as const)
				: ('don_vi' as const)
		const actorLabel =
			actorKind === 'admin'
				? userRow?.displayName || userRow?.username || 'Ban Giám Hiệu'
				: actorKind === 'nganh'
					? 'Ngành'
					: 'Đơn vị sử dụng'
		/** Tóm tắt theo hành động — rõ ràng, dễ đọc trên bảng Nhật ký */
		const proposalRef = `đề xuất #${id} «${row.title}»`
		let decisionSummary: string
		if (decision === 'APPROVED') {
			// BGH phê duyệt → đẩy xuống ngành
			decisionSummary = `${actorLabel} đã phê duyệt ${proposalRef} (chuyển ngành)`
		} else if (decision === 'REJECTED') {
			decisionSummary = `${actorLabel} đã từ chối ${proposalRef}`
		} else if (decision === 'COMPLETED') {
			decisionSummary =
				row.proposalType === 'REPAIR'
					? `Ngành đã hoàn thành sửa chữa ${proposalRef}`
					: row.proposalType === 'RECALL'
						? `Đã hoàn thành thu hồi ${proposalRef}`
						: row.proposalType === 'LIQUIDATION'
							? `Đã hoàn thành thanh lý ${proposalRef}`
							: `Đã hoàn thành ${proposalRef}`
		} else {
			decisionSummary = `${actorLabel} · ${proposalRef}`
		}
		await writeLog({
			proposalId: id,
			action: decision,
			proposalType: row.proposalType,
			summary: decisionSummary,
			// Chi tiết: chỉ thiết bị · phòng · lý do — không ghi chuyển cấp / KQ
			details: items
				.map((i) => formatItemDetail(i, row.description))
				.join('; '),
			userId,
			isAdmin: isBgh,
			actorKind
		})

		// ── Thông báo theo bước BGH → ngành → kết quả ─────────────
		const actorName =
			userRow?.displayName || userRow?.username || 'Hệ thống'

		// BGH phê duyệt → đẩy xuống ngành + báo user ĐV
		if (decision === 'APPROVED') {
			const title = `BGH đã phê duyệt đề xuất #${id}`
			const message = [
				`Ban Giám Hiệu (${actorName}) đã phê duyệt «${row.title}».`,
				row.nganhCode
					? `Đã chuyển xuống ngành ${row.nganhCode} xử lý.`
					: 'Đã chuyển xuống ngành xử lý.',
				resultNote ? `Ghi chú: ${resultNote}` : null
			]
				.filter(Boolean)
				.join(' ')

			const recipients: number[] = []
			// Ngành
			const targetNganh = (row.nganhCode || '').toUpperCase()
			if (targetNganh) {
				const nganhUsers = await orm
					.select({ userId: userNganh.userId })
					.from(userNganh)
					.where(eq(userNganh.nganhCode, targetNganh))
				for (const nu of nganhUsers) recipients.push(nu.userId)
			}
			// User đơn vị gửi
			if (row.proposedByUserId) recipients.push(row.proposedByUserId)

			await notifyUsers({
				userIds: recipients,
				title,
				message,
				actorId: userId,
				excludeUserId: userId
			})
		}

		// BGH / ngành từ chối → báo user ĐV
		if (decision === 'REJECTED' && row.proposedByUserId) {
			const title = `Đề xuất #${id} bị từ chối`
			const message = [
				`«${row.title}» bị từ chối bởi ${actorName}.`,
				resultNote ? `Lý do: ${resultNote}` : null
			]
				.filter(Boolean)
				.join(' ')
			await notifyUsers({
				userIds: [row.proposedByUserId],
				title,
				message,
				actorId: userId,
				excludeUserId: userId
			})
		}

		// Ngành hoàn thành SC → báo BGH + user ĐV
		if (decision === 'COMPLETED' && row.proposalType === 'REPAIR') {
			const itemNames = items
				.map((i) => i.materialName)
				.filter(Boolean)
				.join(', ')
			const title = `Kết quả sửa chữa — đề xuất #${id}`
			const message = [
				`Ngành đã hoàn thành «${row.title}».`,
				itemNames ? `Vật tư: ${itemNames}.` : null,
				resultNote ? `Kết quả: ${resultNote}` : null,
				`Người xử lý: ${actorName}`
			]
				.filter(Boolean)
				.join(' ')

			const recipients: number[] = []
			if (row.proposedByUserId) recipients.push(row.proposedByUserId)
			// BGH nhận kết quả
			const bghIds = await loadBghAdminUserIds()
			recipients.push(...bghIds)

			await notifyUsers({
				userIds: recipients,
				title,
				message,
				actorId: userId,
				excludeUserId: userId
			})
			log.info('Repair result notified BGH + unit', {
				proposalId: id,
				count: recipients.length
			})
		}

		return {
			data: toProposal(updated[0]!, await loadItems(id))
		}
	}
)

/** GET /asset-proposal-logs */
export const ListAssetProposalLogs = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-proposal-logs'
	},
	async (q: {
		proposalId?: Query<number>
		fromDate?: Query<string>
		toDate?: Query<string>
		limit?: Query<number>
	}): Promise<{ data: ProposalLogResponse[] }> => {
		const auth = getAuthData()!
		const limit = Math.min(Number(q.limit) || 300, 1000)
		let rows = await orm
			.select()
			.from(assetProposalLogs)
			.orderBy(
				desc(assetProposalLogs.createdAt),
				desc(assetProposalLogs.id)
			)
			.limit(limit)

		if (q.proposalId) {
			rows = rows.filter((r) => r.proposalId === Number(q.proposalId))
		}
		if (q.fromDate) {
			rows = rows.filter((r) => r.createdAt >= String(q.fromDate))
		}
		if (q.toDate) {
			rows = rows.filter((r) => r.createdAt <= String(q.toDate) + 'z')
		}

		// Log đề xuất: tạo + xử lý (duyệt / thu hồi / thanh lý…)
		const KEEP = new Set([
			'CREATE',
			'APPROVED',
			'REJECTED',
			'COMPLETED',
			'RECALL_COMPLETE',
			'LIQUIDATE'
		])
		rows = rows.filter((r) =>
			KEEP.has(String(r.action || '').toUpperCase())
		)

		/**
		 * Super / BGH (role admin): full log mọi đề xuất.
		 * User ngành: log đề xuất thuộc ngành mình.
		 * User khác: chỉ log đề xuất mình gửi.
		 */
		const uid = Number(auth.userID)
		const isBgh = await isBghAdminUser(auth, uid)
		if (!auth.isSuperAdmin && !isBgh) {
			const myNganh = await loadUserNganhCodes(uid)
			const allProps = await orm.select().from(assetProposals)
			const allowedIds = new Set<number>()
			for (const p of allProps) {
				if (p.proposedByUserId === uid) {
					allowedIds.add(p.id)
					continue
				}
				if (
					myNganh.length &&
					(await canAccessProposal(auth, p, p.id))
				) {
					allowedIds.add(p.id)
				}
			}
			rows = rows.filter(
				(r) => r.proposalId != null && allowedIds.has(r.proposalId)
			)
		}
		// Super admin + BGH: giữ nguyên toàn bộ rows

		// Gắn đơn vị + ngành từ phiếu đề xuất
		const proposalIds = [
			...new Set(
				rows
					.map((r) => r.proposalId)
					.filter((id): id is number => id != null)
			)
		]
		const metaByProposal = new Map<
			number,
			{
				unitName: string | null
				proposedBy: string | null
				nganhCode: string | null
			}
		>()
		if (proposalIds.length) {
			const props = await orm
				.select({
					id: assetProposals.id,
					unitName: assetProposals.unitName,
					nganhCode: assetProposals.nganhCode,
					proposedByDisplayName: assetProposals.proposedByDisplayName,
					proposedByUsername: assetProposals.proposedByUsername
				})
				.from(assetProposals)
			for (const p of props) {
				if (!proposalIds.includes(p.id)) continue
				metaByProposal.set(p.id, {
					unitName: p.unitName ?? null,
					nganhCode: (p.nganhCode || '').trim().toUpperCase() || null,
					proposedBy:
						p.proposedByDisplayName || p.proposedByUsername || null
				})
			}
		}

		return {
			data: rows.map((r) => {
				const meta =
					r.proposalId != null
						? metaByProposal.get(r.proposalId)
						: undefined
				// Ưu tiên unitName; fallback người gửi nếu chưa nhập đơn vị
				const unitLabel =
					meta?.unitName?.trim() || meta?.proposedBy || null
				return toLog(r, {
					unitName: unitLabel,
					nganhCode: meta?.nganhCode ?? null
				})
			})
		}
	}
)
