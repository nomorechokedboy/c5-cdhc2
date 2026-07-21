import { api, Query } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import log from 'encore.dev/log'
import { and, desc, eq, SQL } from 'drizzle-orm'
import orm from '../database'
import { AppError } from '../errors'
import { handleDatabaseErr } from '../utils'
import { rooms } from '../schema/rooms'
import { floors } from '../schema/floors'
import { buildings } from '../schema/buildings'
import { roomAssets } from '../schema/room-assets'
import { repairRequests, type RepairRequestDB } from '../schema/repair-requests'
import userRepo from '../users/repo'
import {
	completeRepairToGrade2,
	markAssetBrokenForRepair,
	restoreBrokenAssetOnCancel
} from './repair-grade'
import { writeAssetBrokenLog } from './broken-logs'

export interface RepairRequestResponse {
	id: number
	createdAt: string
	updatedAt: string
	roomId: number
	roomCode: string | null
	roomName: string | null
	floorName: string | null
	buildingCode: string | null
	buildingName: string | null
	roomAssetId: number | null
	sourceAssetId: number | null
	/** Số lượng hỏng trên phiếu */
	quantity: number
	assetName: string
	category: string | null
	description: string | null
	status: string
	brokenAt: string
	reportedByName: string
	reportedByUserId: number | null
	assignedToName: string | null
	assignedAt: string | null
	assignedByName: string | null
	repairStartedAt: string | null
	completedAt: string | null
	adminNote: string | null
}

function today() {
	return new Date().toISOString().slice(0, 10)
}

async function loadJoined(
	id?: number,
	filter?: {
		roomId?: number
		status?: string
	}
): Promise<RepairRequestResponse[]> {
	const conditions: SQL[] = []
	if (id !== undefined) conditions.push(eq(repairRequests.id, id))
	if (filter?.roomId !== undefined)
		conditions.push(eq(repairRequests.roomId, filter.roomId))
	if (filter?.status)
		conditions.push(eq(repairRequests.status, filter.status))

	const base = orm
		.select({
			id: repairRequests.id,
			createdAt: repairRequests.createdAt,
			updatedAt: repairRequests.updatedAt,
			roomId: repairRequests.roomId,
			roomCode: rooms.roomCode,
			roomName: rooms.roomName,
			floorName: floors.name,
			buildingCode: buildings.code,
			buildingName: buildings.name,
			roomAssetId: repairRequests.roomAssetId,
			sourceAssetId: repairRequests.sourceAssetId,
			quantity: repairRequests.quantity,
			assetName: repairRequests.assetName,
			category: repairRequests.category,
			description: repairRequests.description,
			status: repairRequests.status,
			brokenAt: repairRequests.brokenAt,
			reportedByName: repairRequests.reportedByName,
			reportedByUserId: repairRequests.reportedByUserId,
			assignedToName: repairRequests.assignedToName,
			assignedAt: repairRequests.assignedAt,
			assignedByName: repairRequests.assignedByName,
			repairStartedAt: repairRequests.repairStartedAt,
			completedAt: repairRequests.completedAt,
			adminNote: repairRequests.adminNote
		})
		.from(repairRequests)
		.leftJoin(rooms, eq(repairRequests.roomId, rooms.id))
		.leftJoin(floors, eq(rooms.floorId, floors.id))
		.leftJoin(buildings, eq(floors.buildingId, buildings.id))
		.orderBy(desc(repairRequests.createdAt))

	const rows = await (
		conditions.length ? base.where(and(...conditions)) : base
	).catch(handleDatabaseErr)

	return rows.map((r) => ({
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		roomId: r.roomId,
		roomCode: r.roomCode ?? null,
		roomName: r.roomName ?? null,
		floorName: r.floorName ?? null,
		buildingCode: r.buildingCode ?? null,
		buildingName: r.buildingName ?? null,
		roomAssetId: r.roomAssetId ?? null,
		sourceAssetId: r.sourceAssetId ?? null,
		quantity: Number(r.quantity) || 1,
		assetName: r.assetName,
		category: r.category ?? null,
		description: r.description ?? null,
		status: r.status,
		brokenAt: r.brokenAt,
		reportedByName: r.reportedByName,
		reportedByUserId: r.reportedByUserId ?? null,
		assignedToName: r.assignedToName ?? null,
		assignedAt: r.assignedAt ?? null,
		assignedByName: r.assignedByName ?? null,
		repairStartedAt: r.repairStartedAt ?? null,
		completedAt: r.completedAt ?? null,
		adminNote: r.adminNote ?? null
	}))
}

/**
 * Phòng báo hỏng thiết bị (cấp phòng).
 * POST /repair-requests
 */
export const CreateRepairRequest = api(
	{ auth: true, expose: true, method: 'POST', path: '/repair-requests' },
	async (body: {
		roomId: number
		roomAssetId?: number
		/** Số lượng hỏng — bắt buộc khi chọn từ danh mục (mặc định 1) */
		quantity?: number
		assetName: string
		category?: string
		description?: string
		brokenAt?: string
		reportedByName?: string
	}): Promise<{ data: RepairRequestResponse }> => {
		log.trace('CreateRepairRequest', { body })

		if (!body.roomId || !body.assetName?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('roomId và assetName là bắt buộc')
			)
		}

		const room = await orm.query.rooms
			.findFirst({ where: eq(rooms.id, body.roomId) })
			.catch(handleDatabaseErr)
		if (!room) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid roomId')
			)
		}

		let assetName = body.assetName.trim()
		let category = body.category
		let roomAssetId = body.roomAssetId ?? null
		let sourceAssetId: number | null = null
		let originalGrade: number | null = null
		let brokenQty = Math.max(1, Math.floor(Number(body.quantity) || 1))

		const brokenAt = body.brokenAt || today()
		const damageNote = body.description?.trim()

		/**
		 * Báo hỏng → cấp 5 + mã -HONG- (bảng VT hư hỏng).
		 * Sửa xong → cấp 2 + mã gốc (xem CompleteRepairRequest).
		 */
		if (roomAssetId) {
			const asset = await orm.query.roomAssets
				.findFirst({ where: eq(roomAssets.id, roomAssetId) })
				.catch(handleDatabaseErr)
			if (!asset || asset.roomId !== body.roomId) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						'roomAssetId không thuộc phòng này'
					)
				)
			}
			try {
				const marked = await markAssetBrokenForRepair({
					roomAssetId,
					quantity: brokenQty,
					damageNote,
					brokenAt
				})
				assetName = marked.name
				category = marked.category
				roomAssetId = marked.brokenAssetId
				sourceAssetId = marked.sourceAssetId
				originalGrade = marked.originalGrade
				brokenQty = marked.quantity
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				throw AppError.handleAppErr(AppError.invalidArgument(msg))
			}
		}

		const auth = getAuthData()!
		const userId = Number(auth.userID)
		let reportedByName = body.reportedByName?.trim()
		if (!reportedByName) {
			try {
				const u = await userRepo.findOne({ id: userId } as any)
				reportedByName =
					(u as any)?.displayName ||
					(u as any)?.username ||
					`User #${userId}`
			} catch {
				reportedByName = `User #${userId}`
			}
		}

		const [created] = await orm
			.insert(repairRequests)
			.values({
				roomId: body.roomId,
				roomAssetId: roomAssetId ?? null,
				sourceAssetId,
				quantity: brokenQty,
				originalGrade,
				assetName: assetName || body.assetName.trim(),
				category: category ?? null,
				description: body.description ?? null,
				status: 'PENDING',
				brokenAt,
				reportedByName: reportedByName || `User #${userId}`,
				reportedByUserId: userId
			})
			.returning()
			.catch(handleDatabaseErr)

		await writeAssetBrokenLog({
			eventType: 'BROKEN',
			sourceType: 'REPAIR_REQUEST',
			sourceId: created.id,
			repairRequestId: created.id,
			roomAssetId: roomAssetId,
			sourceAssetId,
			originalCode: null,
			assetName: assetName || body.assetName.trim(),
			category: category ?? null,
			quantity: brokenQty,
			originalGrade,
			gradeAfter: 5,
			statusAfter: 'BROKEN',
			roomId: body.roomId,
			reason: damageNote || null,
			eventAt: brokenAt,
			actorUserId: userId,
			actorDisplayName: reportedByName || null
		})

		const [row] = await loadJoined(created.id)
		return { data: row }
	}
)

/**
 * Danh sách phiếu (admin / phòng).
 * GET /repair-requests?roomId=&status=
 */
export const GetRepairRequests = api(
	{ auth: true, expose: true, method: 'GET', path: '/repair-requests' },
	async (q: {
		roomId?: Query<number>
		status?: Query<string>
	}): Promise<{ data: RepairRequestResponse[] }> => {
		const data = await loadJoined(undefined, {
			roomId: q.roomId,
			status: q.status
		})
		return { data }
	}
)

export const GetRepairRequest = api(
	{ auth: true, expose: true, method: 'GET', path: '/repair-requests/:id' },
	async ({
		id
	}: {
		id: number
	}): Promise<{ data: RepairRequestResponse }> => {
		const rows = await loadJoined(id)
		if (!rows[0]) {
			throw AppError.handleAppErr(
				AppError.notFound('Phiếu không tồn tại')
			)
		}
		return { data: rows[0] }
	}
)

/**
 * Admin phân công người sửa.
 * PATCH /repair-requests/:id/assign
 */
export const AssignRepairRequest = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/repair-requests/:id/assign'
	},
	async ({
		id,
		assignedToName,
		repairStartedAt,
		adminNote,
		startRepair = true
	}: {
		id: number
		assignedToName: string
		repairStartedAt?: string
		adminNote?: string
		startRepair?: boolean
	}): Promise<{ data: RepairRequestResponse }> => {
		if (!assignedToName?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('assignedToName là bắt buộc')
			)
		}

		const existing = await orm.query.repairRequests
			.findFirst({ where: eq(repairRequests.id, id) })
			.catch(handleDatabaseErr)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Phiếu không tồn tại')
			)
		}
		if (
			existing.status === 'COMPLETED' ||
			existing.status === 'CANCELLED'
		) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'Không thể phân công phiếu đã hoàn thành/hủy'
				)
			)
		}

		const auth = getAuthData()!
		const userId = Number(auth.userID)
		let assignedByName = `User #${userId}`
		try {
			const u = await userRepo.findOne({ id: userId } as any)
			assignedByName =
				(u as any)?.displayName ||
				(u as any)?.username ||
				assignedByName
		} catch {
			/* ignore */
		}

		const started = repairStartedAt || today()
		const now = today()

		await orm
			.update(repairRequests)
			.set({
				status: startRepair ? 'IN_PROGRESS' : 'ASSIGNED',
				assignedToName: assignedToName.trim(),
				assignedAt: now,
				assignedByName,
				repairStartedAt: startRepair
					? started
					: existing.repairStartedAt,
				adminNote: adminNote ?? existing.adminNote
			})
			.where(eq(repairRequests.id, id))
			.catch(handleDatabaseErr)

		// Dòng hỏng (-HONG- hoặc cả dòng BROKEN) → REPAIRING
		if (existing.roomAssetId) {
			const assetUpdate: Record<string, unknown> = {
				status: 'REPAIRING',
				repairPerformer: assignedToName.trim(),
				repairCompletedAt: null,
				brokenAt: existing.brokenAt
			}
			if (startRepair) {
				assetUpdate.repairStartedAt = started
			}
			await orm
				.update(roomAssets)
				.set(assetUpdate)
				.where(eq(roomAssets.id, existing.roomAssetId))
				.catch(handleDatabaseErr)
		}

		const [row] = await loadJoined(id)
		return { data: row }
	}
)

/**
 * Đánh dấu hoàn thành sửa chữa (phiếu phân công).
 *
 * Cấp 5 (hỏng) → luôn về cấp 2 + mã gốc, status NORMAL (bảng VT ổn định).
 * Không phụ thuộc cấp ban đầu — sửa xong = cấp 2.
 *
 * PATCH /repair-requests/:id/complete
 */
export const CompleteRepairRequest = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/repair-requests/:id/complete'
	},
	async ({
		id,
		completedAt,
		adminNote
	}: {
		id: number
		completedAt?: string
		adminNote?: string
	}): Promise<{ data: RepairRequestResponse }> => {
		const existing = await orm.query.repairRequests
			.findFirst({ where: eq(repairRequests.id, id) })
			.catch(handleDatabaseErr)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Phiếu không tồn tại')
			)
		}

		const doneAt = completedAt || today()

		let restoredAssetId = existing.roomAssetId
		if (existing.roomAssetId) {
			try {
				const newId = await completeRepairToGrade2({
					roomAssetId: existing.roomAssetId,
					sourceAssetId: existing.sourceAssetId,
					quantity: existing.quantity,
					performer: existing.assignedToName,
					completedAt: doneAt
				})
				if (newId != null) restoredAssetId = newId
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						`Không chuyển VT về cấp 2 sau sửa chữa: ${msg}`
					)
				)
			}
		}

		await orm
			.update(repairRequests)
			.set({
				status: 'COMPLETED',
				completedAt: doneAt,
				adminNote: adminNote ?? existing.adminNote,
				roomAssetId: restoredAssetId
			})
			.where(eq(repairRequests.id, id))
			.catch(handleDatabaseErr)

		await writeAssetBrokenLog({
			eventType: 'COMPLETED',
			sourceType: 'REPAIR_REQUEST',
			sourceId: id,
			repairRequestId: id,
			roomAssetId: restoredAssetId,
			sourceAssetId: existing.sourceAssetId,
			assetName: existing.assetName,
			category: existing.category,
			quantity: existing.quantity,
			originalGrade: existing.originalGrade,
			gradeAfter: 2,
			statusAfter: 'NORMAL',
			roomId: existing.roomId,
			reason: existing.description,
			resultNote: adminNote ?? existing.adminNote,
			performer: existing.assignedToName,
			eventAt: doneAt
		})

		const [row] = await loadJoined(id)
		return { data: row }
	}
)

/**
 * Hủy phiếu — trả SL về dòng nguồn (cùng phân cấp cũ), xóa dòng -HONG- nếu có.
 * PATCH /repair-requests/:id/cancel
 */
export const CancelRepairRequest = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/repair-requests/:id/cancel'
	},
	async ({
		id,
		adminNote
	}: {
		id: number
		adminNote?: string
	}): Promise<{ data: RepairRequestResponse }> => {
		const existing = await orm.query.repairRequests
			.findFirst({ where: eq(repairRequests.id, id) })
			.catch(handleDatabaseErr)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Phiếu không tồn tại')
			)
		}
		if (existing.status === 'COMPLETED') {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Không hủy phiếu đã hoàn thành')
			)
		}

		const qty = Math.max(1, Number(existing.quantity) || 1)
		const sourceId = existing.sourceAssetId
		const brokenId = existing.roomAssetId

		await restoreBrokenAssetOnCancel({
			brokenAssetId: brokenId ?? null,
			sourceAssetId: sourceId ?? null,
			originalGrade: existing.originalGrade,
			quantity: qty
		})

		await orm
			.update(repairRequests)
			.set({
				status: 'CANCELLED',
				adminNote: adminNote ?? existing.adminNote,
				roomAssetId:
					brokenId && sourceId && sourceId !== brokenId
						? null
						: existing.roomAssetId
			})
			.where(eq(repairRequests.id, id))
			.catch(handleDatabaseErr)

		await writeAssetBrokenLog({
			eventType: 'CANCELLED',
			sourceType: 'REPAIR_REQUEST',
			sourceId: id,
			repairRequestId: id,
			roomAssetId: brokenId,
			sourceAssetId: sourceId,
			assetName: existing.assetName,
			category: existing.category,
			quantity: qty,
			originalGrade: existing.originalGrade,
			gradeAfter: existing.originalGrade ?? 1,
			statusAfter: 'NORMAL',
			roomId: existing.roomId,
			reason: adminNote ?? existing.adminNote,
			eventAt: today()
		})

		const [row] = await loadJoined(id)
		return { data: row }
	}
)
