/**
 * Nhật ký VT hỏng / cần sửa chữa — ghi snapshot, list + xuất file.
 */
import { api, Query } from 'encore.dev/api'
import { desc, eq, and, gte, lte, SQL } from 'drizzle-orm'
import log from 'encore.dev/log'
import orm from '../database'
import { assetBrokenLogs } from '../schema/asset-broken-logs'
import { rooms } from '../schema/rooms'
import { floors } from '../schema/floors'
import { buildings } from '../schema/buildings'
import { roomAssets } from '../schema/room-assets'
import { handleDatabaseErr } from '../utils'

export type BrokenLogEventType =
	| 'BROKEN'
	| 'COMPLETED'
	| 'CANCELLED'
	| 'REJECTED'

export type BrokenLogSourceType = 'PROPOSAL' | 'REPAIR_REQUEST' | 'OTHER'

export interface AssetBrokenLogResponse {
	id: number
	createdAt: string
	updatedAt: string
	eventType: string
	sourceType: string
	sourceId: number | null
	proposalId: number | null
	repairRequestId: number | null
	roomAssetId: number | null
	sourceAssetId: number | null
	assetCode: string | null
	originalCode: string | null
	assetName: string
	category: string | null
	quantity: number
	originalGrade: number | null
	gradeAfter: number | null
	statusAfter: string | null
	roomId: number | null
	roomCode: string | null
	roomName: string | null
	floorName: string | null
	buildingCode: string | null
	buildingName: string | null
	unitName: string | null
	nganhCode: string | null
	reason: string | null
	resultNote: string | null
	performer: string | null
	eventAt: string
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
}

function toRow(r: typeof assetBrokenLogs.$inferSelect): AssetBrokenLogResponse {
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		eventType: r.eventType,
		sourceType: r.sourceType,
		sourceId: r.sourceId ?? null,
		proposalId: r.proposalId ?? null,
		repairRequestId: r.repairRequestId ?? null,
		roomAssetId: r.roomAssetId ?? null,
		sourceAssetId: r.sourceAssetId ?? null,
		assetCode: r.assetCode ?? null,
		originalCode: r.originalCode ?? null,
		assetName: r.assetName,
		category: r.category ?? null,
		quantity: Number(r.quantity) || 1,
		originalGrade: r.originalGrade ?? null,
		gradeAfter: r.gradeAfter ?? null,
		statusAfter: r.statusAfter ?? null,
		roomId: r.roomId ?? null,
		roomCode: r.roomCode ?? null,
		roomName: r.roomName ?? null,
		floorName: r.floorName ?? null,
		buildingCode: r.buildingCode ?? null,
		buildingName: r.buildingName ?? null,
		unitName: r.unitName ?? null,
		nganhCode: r.nganhCode ?? null,
		reason: r.reason ?? null,
		resultNote: r.resultNote ?? null,
		performer: r.performer ?? null,
		eventAt: r.eventAt,
		actorUserId: r.actorUserId ?? null,
		actorUsername: r.actorUsername ?? null,
		actorDisplayName: r.actorDisplayName ?? null
	}
}

async function resolveLocation(roomId: number | null | undefined) {
	if (roomId == null || !Number.isFinite(Number(roomId))) {
		return {
			roomId: null as number | null,
			roomCode: null as string | null,
			roomName: null as string | null,
			floorName: null as string | null,
			buildingCode: null as string | null,
			buildingName: null as string | null
		}
	}
	const rows = await orm
		.select({
			roomId: rooms.id,
			roomCode: rooms.roomCode,
			roomName: rooms.roomName,
			floorName: floors.name,
			buildingCode: buildings.code,
			buildingName: buildings.name
		})
		.from(rooms)
		.leftJoin(floors, eq(rooms.floorId, floors.id))
		.leftJoin(buildings, eq(floors.buildingId, buildings.id))
		.where(eq(rooms.id, Number(roomId)))
		.limit(1)
		.catch(handleDatabaseErr)
	const r = rows[0]
	if (!r) {
		return {
			roomId: Number(roomId),
			roomCode: null,
			roomName: null,
			floorName: null,
			buildingCode: null,
			buildingName: null
		}
	}
	return {
		roomId: r.roomId,
		roomCode: r.roomCode ?? null,
		roomName: r.roomName ?? null,
		floorName: r.floorName ?? null,
		buildingCode: r.buildingCode ?? null,
		buildingName: r.buildingName ?? null
	}
}

/**
 * Ghi 1 dòng nhật ký hỏng/sửa (không throw ra ngoài — tránh chặn luồng chính).
 */
export async function writeAssetBrokenLog(opts: {
	eventType: BrokenLogEventType
	sourceType?: BrokenLogSourceType
	sourceId?: number | null
	proposalId?: number | null
	repairRequestId?: number | null
	roomAssetId?: number | null
	sourceAssetId?: number | null
	assetCode?: string | null
	originalCode?: string | null
	assetName: string
	category?: string | null
	quantity?: number
	originalGrade?: number | null
	gradeAfter?: number | null
	statusAfter?: string | null
	roomId?: number | null
	roomCode?: string | null
	roomName?: string | null
	unitName?: string | null
	nganhCode?: string | null
	reason?: string | null
	resultNote?: string | null
	performer?: string | null
	eventAt?: string
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
}): Promise<void> {
	try {
		let roomId = opts.roomId ?? null
		let assetCode = opts.assetCode ?? null
		let assetName = opts.assetName
		let category = opts.category ?? null

		// Bổ sung snapshot từ room_assets nếu thiếu
		if (opts.roomAssetId != null) {
			const asset = await orm.query.roomAssets
				.findFirst({ where: eq(roomAssets.id, opts.roomAssetId) })
				.catch(() => null)
			if (asset) {
				roomId = roomId ?? asset.roomId
				assetCode = assetCode ?? asset.code ?? null
				assetName = assetName || asset.name
				category = category ?? asset.category
			}
		}

		const loc =
			opts.roomCode || opts.roomName
				? {
						roomId,
						roomCode: opts.roomCode ?? null,
						roomName: opts.roomName ?? null,
						floorName: null as string | null,
						buildingCode: null as string | null,
						buildingName: null as string | null
					}
				: await resolveLocation(roomId)

		// Nếu đã có roomCode nhưng thiếu tòa/tầng → resolve
		const fullLoc =
			loc.buildingCode || !roomId
				? loc
				: { ...loc, ...(await resolveLocation(roomId)) }

		const eventAt =
			opts.eventAt ||
			new Date().toISOString().slice(0, 19).replace('T', ' ')

		await orm.insert(assetBrokenLogs).values({
			eventType: opts.eventType,
			sourceType: opts.sourceType || 'OTHER',
			sourceId: opts.sourceId ?? null,
			proposalId: opts.proposalId ?? null,
			repairRequestId: opts.repairRequestId ?? null,
			roomAssetId: opts.roomAssetId ?? null,
			sourceAssetId: opts.sourceAssetId ?? null,
			assetCode,
			originalCode: opts.originalCode ?? null,
			assetName,
			category,
			quantity: Math.max(1, Math.floor(Number(opts.quantity) || 1)),
			originalGrade: opts.originalGrade ?? null,
			gradeAfter: opts.gradeAfter ?? null,
			statusAfter: opts.statusAfter ?? null,
			roomId: fullLoc.roomId,
			roomCode: fullLoc.roomCode,
			roomName: fullLoc.roomName,
			floorName: fullLoc.floorName,
			buildingCode: fullLoc.buildingCode,
			buildingName: fullLoc.buildingName,
			unitName: opts.unitName ?? null,
			nganhCode: opts.nganhCode ?? null,
			reason: opts.reason ?? null,
			resultNote: opts.resultNote ?? null,
			performer: opts.performer ?? null,
			eventAt,
			actorUserId: opts.actorUserId ?? null,
			actorUsername: opts.actorUsername ?? null,
			actorDisplayName: opts.actorDisplayName ?? null
		})
	} catch (err) {
		log.warn('writeAssetBrokenLog failed', {
			eventType: opts.eventType,
			assetName: opts.assetName,
			err: err instanceof Error ? err.message : String(err)
		})
	}
}

/** GET /asset-broken-logs — nhật ký hỏng/sửa (để tải xuống) */
export const ListAssetBrokenLogs = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-broken-logs'
	},
	async (q: {
		eventType?: Query<string>
		sourceType?: Query<string>
		proposalId?: Query<number>
		fromDate?: Query<string>
		toDate?: Query<string>
		limit?: Query<number>
	}): Promise<{ data: AssetBrokenLogResponse[] }> => {
		const limit = Math.min(Number(q.limit) || 2000, 5000)
		const conditions: SQL[] = []
		if (q.eventType) {
			conditions.push(
				eq(assetBrokenLogs.eventType, String(q.eventType).toUpperCase())
			)
		}
		if (q.sourceType) {
			conditions.push(
				eq(
					assetBrokenLogs.sourceType,
					String(q.sourceType).toUpperCase()
				)
			)
		}
		if (q.proposalId != null) {
			conditions.push(
				eq(assetBrokenLogs.proposalId, Number(q.proposalId))
			)
		}
		if (q.fromDate) {
			conditions.push(gte(assetBrokenLogs.eventAt, String(q.fromDate)))
		}
		if (q.toDate) {
			conditions.push(
				lte(assetBrokenLogs.eventAt, String(q.toDate) + 'z')
			)
		}

		const base = orm
			.select()
			.from(assetBrokenLogs)
			.orderBy(desc(assetBrokenLogs.eventAt), desc(assetBrokenLogs.id))
			.limit(limit)

		const rows = await (
			conditions.length ? base.where(and(...conditions)) : base
		).catch(handleDatabaseErr)

		return { data: rows.map(toRow) }
	}
)
