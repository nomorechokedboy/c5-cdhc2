import {
	and,
	desc,
	eq,
	gte,
	inArray,
	isNull,
	like,
	lte,
	or,
	sql,
	SQL
} from 'drizzle-orm'
import log from 'encore.dev/log'
import orm, { DrizzleDatabase } from '../database'
import {
	Building,
	BuildingDB,
	buildings,
	CreateBuildingRequest,
	UpdateBuildingRequest
} from '../schema/buildings'
import {
	CreateFloorRequest,
	Floor,
	FloorDB,
	floors,
	UpdateFloorRequest
} from '../schema/floors'
import {
	CreateRoomRequest,
	Room,
	RoomDB,
	rooms,
	UpdateRoomRequest
} from '../schema/rooms'
import {
	CreateRoomAssetRequest,
	roomAssets,
	RoomAssetDB,
	UpdateRoomAssetRequest
} from '../schema/room-assets'
import {
	CreateRoomImageRequest,
	roomImages,
	RoomImageDB,
	UpdateRoomImageRequest
} from '../schema/room-images'
import {
	CreateRepairLogRequest,
	repairLogs,
	RepairLogDB,
	UpdateRepairLogRequest
} from '../schema/repair-logs'
import {
	CreateInventoryLogRequest,
	inventoryLogs,
	InventoryLogDB,
	UpdateInventoryLogRequest
} from '../schema/inventory-logs'
import {
	CreateReplacementLogRequest,
	replacementLogs,
	ReplacementLogDB,
	UpdateReplacementLogRequest
} from '../schema/replacement-logs'
import {
	assetMovementLogs,
	AssetMovementLogDB,
	AssetMovementQuery,
	AssetMovementReportRow,
	CreateAssetMovementRequest
} from '../schema/asset-movement-logs'
import {
	accountAuditLogs,
	AccountAuditLogDB,
	CreateAccountAuditLogRequest
} from '../schema/account-audit-logs'
import {
	catalogAuditLogs,
	CatalogAuditLogDB,
	CreateCatalogAuditLogRequest
} from '../schema/catalog-audit-logs'
import { repairRequests } from '../schema/repair-requests'
import { handleDatabaseErr } from '../utils'
import type {
	AssetReportFilter,
	AssetStatsReport,
	BrokenAssetRow,
	BrokenAssetsFilter,
	BuildingQuery,
	BuildingRepository,
	BuildingTree,
	ExpiringAssetRow,
	ExpiringAssetsFilter,
	FloorQuery,
	FloorRepository,
	InventoryLogRepository,
	LogQuery,
	RepairHistoryFilter,
	RepairHistoryRow,
	RepairLogRepository,
	ReplacementLogRepository,
	ReportRepository,
	RoomAssetQuery,
	RoomAssetRepository,
	RoomImageQuery,
	RoomImageRepository,
	RoomProfile,
	RoomQuery,
	RoomRepository,
	AssetMovementLogRepository
} from './index'

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(obj).filter(([, v]) => v !== undefined)
	) as Partial<T>
}

class BuildingSqliteRepo implements BuildingRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateBuildingRequest): Promise<BuildingDB> {
		log.info('BuildingRepo.create', { params })
		return this.db
			.insert(buildings)
			.values(params)
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	update(params: UpdateBuildingRequest): Promise<BuildingDB> {
		const { id, ...rest } = params
		const payload = stripUndefined(rest)
		log.info('BuildingRepo.update', { id, payload })
		return this.db
			.update(buildings)
			.set(payload)
			.where(eq(buildings.id, id))
			.returning()
			.then((rows) => {
				if (!rows[0]) throw new Error(`Building ${id} not found`)
				return rows[0]
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<BuildingDB[]> {
		log.info('BuildingRepo.delete', { ids })
		return this.db
			.delete(buildings)
			.where(inArray(buildings.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	find(q: BuildingQuery = {}): Promise<Building[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(buildings.id, q.ids))
		if (q.code) conditions.push(eq(buildings.code, q.code))

		return this.db.query.buildings
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined,
				with: { floors: true }
			})
			.catch(handleDatabaseErr) as Promise<Building[]>
	}

	findById(id: number): Promise<Building | undefined> {
		return this.db.query.buildings
			.findFirst({
				where: eq(buildings.id, id),
				with: {
					floors: {
						with: {
							rooms: {
								with: {
									assets: {
										columns: { id: true, quantity: true }
									}
								}
							}
						}
					}
				}
			})
			.then((row) => {
				if (!row) return undefined
				const floors = (row.floors ?? []).map((f) => ({
					...f,
					rooms: (f.rooms ?? []).map((r) => {
						const assets =
							(
								r as RoomDB & {
									assets?: Array<{ quantity?: number | null }>
								}
							).assets ?? []
						const totalQuantity = assets.reduce(
							(s, a) => s + (Number(a.quantity) || 0),
							0
						)
						const {
							assets: _a,
							accountPassword,
							...room
						} = r as RoomDB & {
							assets?: unknown
							accountPassword?: string | null
						}
						return {
							...room,
							totalQuantity,
							hasAccountPassword: !!accountPassword
						}
					})
				}))
				return { ...row, floors } as Building
			})
			.catch(handleDatabaseErr) as Promise<Building | undefined>
	}

	findTree(): Promise<BuildingTree[]> {
		return this.db.query.buildings
			.findMany({
				with: {
					floors: {
						with: {
							rooms: {
								// Lấy SL vật tư để hiển thị cột số lượng trên danh sách phòng
								with: {
									assets: {
										columns: {
											id: true,
											quantity: true
										}
									}
								}
							}
						}
					}
				}
			})
			.then((rows) => {
				// Sort in JS for stable tree presentation; gắn totalQuantity = tổng SL VT
				const sorted = (rows as BuildingTree[]).map((b) => ({
					...b,
					floors: [...(b.floors ?? [])]
						.sort((a, b) => a.floorNumber - b.floorNumber)
						.map((f) => ({
							...f,
							rooms: [...(f.rooms ?? [])]
								.map((r) => {
									const assets =
										(
											r as RoomDB & {
												assets?: Array<{
													quantity?: number | null
												}>
											}
										).assets ?? []
									const totalQuantity = assets.reduce(
										(s, a) => s + (Number(a.quantity) || 0),
										0
									)
									const {
										assets: _a,
										accountPassword,
										...room
									} = r as RoomDB & {
										assets?: unknown
										accountPassword?: string | null
									}
									return {
										...room,
										totalQuantity,
										hasAccountPassword: !!accountPassword
									}
								})
								.sort((a, b) =>
									a.roomCode.localeCompare(b.roomCode)
								)
						}))
				}))
				return sorted.sort((a, b) => a.code.localeCompare(b.code))
			})
			.catch(handleDatabaseErr) as Promise<BuildingTree[]>
	}
}

class FloorSqliteRepo implements FloorRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateFloorRequest): Promise<FloorDB> {
		log.info('FloorRepo.create', { params })
		return this.db
			.insert(floors)
			.values({
				buildingId: params.buildingId,
				code: params.code ?? null,
				floorNumber: params.floorNumber,
				name: params.name,
				description: params.description ?? null
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	update(params: UpdateFloorRequest): Promise<FloorDB> {
		const { id, ...rest } = params
		const payload = stripUndefined(rest)
		log.info('FloorRepo.update', { id, payload })
		return this.db
			.update(floors)
			.set(payload)
			.where(eq(floors.id, id))
			.returning()
			.then((rows) => {
				if (!rows[0]) throw new Error(`Floor ${id} not found`)
				return rows[0]
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<FloorDB[]> {
		log.info('FloorRepo.delete', { ids })
		return this.db
			.delete(floors)
			.where(inArray(floors.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	find(q: FloorQuery = {}): Promise<Floor[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(floors.id, q.ids))
		if (q.buildingId !== undefined)
			conditions.push(eq(floors.buildingId, q.buildingId))

		return this.db.query.floors
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined,
				with: { building: true, rooms: true }
			})
			.then((rows) =>
				[...(rows as Floor[])].sort(
					(a, b) => a.floorNumber - b.floorNumber
				)
			)
			.catch(handleDatabaseErr) as Promise<Floor[]>
	}

	findById(id: number): Promise<Floor | undefined> {
		return this.db.query.floors
			.findFirst({
				where: eq(floors.id, id),
				with: { building: true, rooms: true }
			})
			.catch(handleDatabaseErr) as Promise<Floor | undefined>
	}

	findByIds(ids: number[]): Promise<FloorDB[]> {
		if (!ids.length) return Promise.resolve([])
		return this.db.query.floors
			.findMany({ where: inArray(floors.id, ids) })
			.catch(handleDatabaseErr)
	}
}

class RoomSqliteRepo implements RoomRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(
		params: CreateRoomRequest & { accountPassword?: string | null }
	): Promise<RoomDB> {
		log.info('RoomRepo.create', {
			params: {
				...params,
				accountPassword: params.accountPassword ? '[set]' : null
			}
		})
		return this.db
			.insert(rooms)
			.values({
				floorId: params.floorId,
				roomCode: params.roomCode,
				roomName: params.roomName,
				roomType: params.roomType,
				manager: params.manager,
				managerCode: params.managerCode,
				accountPassword: params.accountPassword ?? null,
				capacity: params.capacity ?? 0,
				status: params.status ?? 'ACTIVE',
				description: params.description,
				classId: params.classId ?? null
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	update(
		params: UpdateRoomRequest & { accountPassword?: string | null }
	): Promise<RoomDB> {
		const { id, ...rest } = params
		const payload = stripUndefined(rest)
		log.info('RoomRepo.update', {
			id,
			payload: {
				...payload,
				accountPassword:
					payload.accountPassword !== undefined ? '[set]' : undefined
			}
		})
		return this.db
			.update(rooms)
			.set(payload)
			.where(eq(rooms.id, id))
			.returning()
			.then((rows) => {
				if (!rows[0]) throw new Error(`Room ${id} not found`)
				return rows[0]
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<RoomDB[]> {
		log.info('RoomRepo.delete', { ids })
		return this.db
			.delete(rooms)
			.where(inArray(rooms.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	async find(q: RoomQuery = {}): Promise<Room[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(rooms.id, q.ids))
		if (q.floorId !== undefined)
			conditions.push(eq(rooms.floorId, q.floorId))
		if (q.status) conditions.push(eq(rooms.status, q.status))

		if (q.buildingId !== undefined) {
			const floorRows = await this.db
				.select({ id: floors.id })
				.from(floors)
				.where(eq(floors.buildingId, q.buildingId))
				.catch(handleDatabaseErr)
			const floorIds = floorRows.map((f) => f.id)
			if (!floorIds.length) return []
			conditions.push(inArray(rooms.floorId, floorIds))
		}

		return this.db.query.rooms
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined,
				with: { floor: true }
			})
			.catch(handleDatabaseErr) as Promise<Room[]>
	}

	findById(id: number): Promise<Room | undefined> {
		return this.db.query.rooms
			.findFirst({
				where: eq(rooms.id, id),
				with: { floor: { with: { building: true } } }
			})
			.catch(handleDatabaseErr) as Promise<Room | undefined>
	}

	findByIds(ids: number[]): Promise<RoomDB[]> {
		if (!ids.length) return Promise.resolve([])
		return this.db.query.rooms
			.findMany({ where: inArray(rooms.id, ids) })
			.catch(handleDatabaseErr)
	}

	async findProfile(id: number): Promise<RoomProfile | undefined> {
		const room = await this.db.query.rooms
			.findFirst({
				where: eq(rooms.id, id),
				with: {
					floor: { with: { building: true } },
					assets: true,
					images: true
				}
			})
			.catch(handleDatabaseErr)

		if (!room) return undefined

		const assetIds = (room.assets ?? []).map((a) => a.id)
		let repairs: RepairLogDB[] = []
		let inventories: InventoryLogDB[] = []
		let replacements: ReplacementLogDB[] = []
		let movements: AssetMovementLogDB[] = []

		if (assetIds.length) {
			;[repairs, inventories, replacements, movements] =
				await Promise.all([
					this.db.query.repairLogs
						.findMany({
							where: inArray(repairLogs.roomAssetId, assetIds)
						})
						.catch(handleDatabaseErr),
					this.db.query.inventoryLogs
						.findMany({
							where: inArray(inventoryLogs.roomAssetId, assetIds)
						})
						.catch(handleDatabaseErr),
					this.db.query.replacementLogs
						.findMany({
							where: inArray(
								replacementLogs.roomAssetId,
								assetIds
							)
						})
						.catch(handleDatabaseErr),
					this.db.query.assetMovementLogs
						.findMany({
							where: inArray(
								assetMovementLogs.roomAssetId,
								assetIds
							)
						})
						.catch(handleDatabaseErr)
				])
		}

		return {
			...room,
			assets: room.assets ?? [],
			images: room.images ?? [],
			repairs,
			inventories,
			replacements,
			movements
		} as RoomProfile
	}
}

class RoomAssetSqliteRepo implements RoomAssetRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateRoomAssetRequest): Promise<RoomAssetDB> {
		log.info('RoomAssetRepo.create', { params })
		return this.db
			.insert(roomAssets)
			.values({
				roomId: params.roomId,
				code: params.code,
				name: params.name,
				category: params.category,
				quantity: params.quantity ?? 1,
				unit: params.unit,
				holdingUnitId: params.holdingUnitId,
				grade: params.grade ?? 1,
				manufactureYear: params.manufactureYear,
				usageYear: params.usageYear,
				installAddress: params.installAddress,
				status: params.status ?? 'NORMAL',
				purchaseDate: params.purchaseDate,
				expiryDate: params.expiryDate,
				brokenAt: params.brokenAt,
				repairStartedAt: params.repairStartedAt,
				repairCompletedAt: params.repairCompletedAt,
				repairPerformer: params.repairPerformer,
				description: params.description
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	update(params: UpdateRoomAssetRequest): Promise<RoomAssetDB> {
		const { id, ...rest } = params
		const payload = stripUndefined(rest)
		log.info('RoomAssetRepo.update', { id, payload })
		return this.db
			.update(roomAssets)
			.set(payload)
			.where(eq(roomAssets.id, id))
			.returning()
			.then((rows) => {
				if (!rows[0]) throw new Error(`RoomAsset ${id} not found`)
				return rows[0]
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<RoomAssetDB[]> {
		return this.db
			.delete(roomAssets)
			.where(inArray(roomAssets.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	find(q: RoomAssetQuery = {}): Promise<RoomAssetDB[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(roomAssets.id, q.ids))
		if (q.roomId !== undefined)
			conditions.push(eq(roomAssets.roomId, q.roomId))
		if (q.status) conditions.push(eq(roomAssets.status, q.status))
		if (q.category) conditions.push(eq(roomAssets.category, q.category))
		if (q.code) conditions.push(eq(roomAssets.code, q.code))
		if (q.codePrefix) {
			conditions.push(sql`${roomAssets.code} LIKE ${q.codePrefix + '%'}`)
		}
		if (q.grade !== undefined)
			conditions.push(eq(roomAssets.grade, q.grade))

		return this.db.query.roomAssets
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined
			})
			.catch(handleDatabaseErr)
	}

	findById(id: number): Promise<RoomAssetDB | undefined> {
		return this.db.query.roomAssets
			.findFirst({ where: eq(roomAssets.id, id) })
			.catch(handleDatabaseErr)
	}
}

class RoomImageSqliteRepo implements RoomImageRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateRoomImageRequest): Promise<RoomImageDB> {
		return this.db
			.insert(roomImages)
			.values({
				roomId: params.roomId,
				imageUrl: params.imageUrl,
				title: params.title,
				description: params.description
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	update(params: UpdateRoomImageRequest): Promise<RoomImageDB> {
		const { id, ...rest } = params
		const payload = stripUndefined(rest)
		return this.db
			.update(roomImages)
			.set(payload)
			.where(eq(roomImages.id, id))
			.returning()
			.then((rows) => {
				if (!rows[0]) throw new Error(`RoomImage ${id} not found`)
				return rows[0]
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<RoomImageDB[]> {
		return this.db
			.delete(roomImages)
			.where(inArray(roomImages.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	find(q: RoomImageQuery = {}): Promise<RoomImageDB[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(roomImages.id, q.ids))
		if (q.roomId !== undefined)
			conditions.push(eq(roomImages.roomId, q.roomId))

		return this.db.query.roomImages
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined
			})
			.catch(handleDatabaseErr)
	}

	findById(id: number): Promise<RoomImageDB | undefined> {
		return this.db.query.roomImages
			.findFirst({ where: eq(roomImages.id, id) })
			.catch(handleDatabaseErr)
	}
}

async function resolveAssetIdsByRoom(
	db: DrizzleDatabase,
	roomId: number
): Promise<number[]> {
	const rows = await db
		.select({ id: roomAssets.id })
		.from(roomAssets)
		.where(eq(roomAssets.roomId, roomId))
		.catch(handleDatabaseErr)
	return rows.map((r) => r.id)
}

class RepairLogSqliteRepo implements RepairLogRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateRepairLogRequest): Promise<RepairLogDB> {
		return this.db
			.insert(repairLogs)
			.values({
				roomAssetId: params.roomAssetId,
				repairDate: params.repairDate,
				content: params.content,
				cost: params.cost ?? 0,
				performer: params.performer,
				note: params.note
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	update(params: UpdateRepairLogRequest): Promise<RepairLogDB> {
		const { id, ...rest } = params
		const payload = stripUndefined(rest)
		return this.db
			.update(repairLogs)
			.set(payload)
			.where(eq(repairLogs.id, id))
			.returning()
			.then((rows) => {
				if (!rows[0]) throw new Error(`RepairLog ${id} not found`)
				return rows[0]
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<RepairLogDB[]> {
		return this.db
			.delete(repairLogs)
			.where(inArray(repairLogs.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	async find(q: LogQuery = {}): Promise<RepairLogDB[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(repairLogs.id, q.ids))
		if (q.roomAssetId !== undefined)
			conditions.push(eq(repairLogs.roomAssetId, q.roomAssetId))
		if (q.roomId !== undefined) {
			const assetIds = await resolveAssetIdsByRoom(this.db, q.roomId)
			if (!assetIds.length) return []
			conditions.push(inArray(repairLogs.roomAssetId, assetIds))
		}
		return this.db.query.repairLogs
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined
			})
			.catch(handleDatabaseErr)
	}

	findById(id: number): Promise<RepairLogDB | undefined> {
		return this.db.query.repairLogs
			.findFirst({ where: eq(repairLogs.id, id) })
			.catch(handleDatabaseErr)
	}
}

class InventoryLogSqliteRepo implements InventoryLogRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateInventoryLogRequest): Promise<InventoryLogDB> {
		return this.db
			.insert(inventoryLogs)
			.values({
				roomAssetId: params.roomAssetId,
				inventoryDate: params.inventoryDate,
				actualQuantity: params.actualQuantity ?? 0,
				expectedQuantity:
					params.expectedQuantity !== undefined
						? params.expectedQuantity
						: 0,
				result: params.result,
				note: params.note
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	update(params: UpdateInventoryLogRequest): Promise<InventoryLogDB> {
		const { id, ...rest } = params
		const payload = stripUndefined(rest)
		return this.db
			.update(inventoryLogs)
			.set(payload)
			.where(eq(inventoryLogs.id, id))
			.returning()
			.then((rows) => {
				if (!rows[0]) throw new Error(`InventoryLog ${id} not found`)
				return rows[0]
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<InventoryLogDB[]> {
		return this.db
			.delete(inventoryLogs)
			.where(inArray(inventoryLogs.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	async find(q: LogQuery = {}): Promise<InventoryLogDB[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(inventoryLogs.id, q.ids))
		if (q.roomAssetId !== undefined)
			conditions.push(eq(inventoryLogs.roomAssetId, q.roomAssetId))
		if (q.roomId !== undefined) {
			const assetIds = await resolveAssetIdsByRoom(this.db, q.roomId)
			if (!assetIds.length) return []
			conditions.push(inArray(inventoryLogs.roomAssetId, assetIds))
		}
		return this.db.query.inventoryLogs
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined
			})
			.catch(handleDatabaseErr)
	}

	findById(id: number): Promise<InventoryLogDB | undefined> {
		return this.db.query.inventoryLogs
			.findFirst({ where: eq(inventoryLogs.id, id) })
			.catch(handleDatabaseErr)
	}
}

class ReplacementLogSqliteRepo implements ReplacementLogRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateReplacementLogRequest): Promise<ReplacementLogDB> {
		return this.db
			.insert(replacementLogs)
			.values({
				roomAssetId: params.roomAssetId,
				replacementDate: params.replacementDate,
				oldAsset: params.oldAsset,
				newAsset: params.newAsset,
				reason: params.reason,
				performer: params.performer,
				note: params.note
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	update(params: UpdateReplacementLogRequest): Promise<ReplacementLogDB> {
		const { id, ...rest } = params
		const payload = stripUndefined(rest)
		return this.db
			.update(replacementLogs)
			.set(payload)
			.where(eq(replacementLogs.id, id))
			.returning()
			.then((rows) => {
				if (!rows[0]) throw new Error(`ReplacementLog ${id} not found`)
				return rows[0]
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<ReplacementLogDB[]> {
		return this.db
			.delete(replacementLogs)
			.where(inArray(replacementLogs.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	async find(q: LogQuery = {}): Promise<ReplacementLogDB[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(replacementLogs.id, q.ids))
		if (q.roomAssetId !== undefined)
			conditions.push(eq(replacementLogs.roomAssetId, q.roomAssetId))
		if (q.roomId !== undefined) {
			const assetIds = await resolveAssetIdsByRoom(this.db, q.roomId)
			if (!assetIds.length) return []
			conditions.push(inArray(replacementLogs.roomAssetId, assetIds))
		}
		return this.db.query.replacementLogs
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined
			})
			.catch(handleDatabaseErr)
	}

	findById(id: number): Promise<ReplacementLogDB | undefined> {
		return this.db.query.replacementLogs
			.findFirst({ where: eq(replacementLogs.id, id) })
			.catch(handleDatabaseErr)
	}
}

/** Build WHERE fragments for asset location filters (room_assets ⋈ rooms ⋈ floors ⋈ buildings) */
function assetLocationConditions(filter: AssetReportFilter): SQL[] {
	const conditions: SQL[] = []
	if (filter.roomId !== undefined) {
		conditions.push(eq(roomAssets.roomId, filter.roomId))
	}
	if (filter.floorId !== undefined) {
		conditions.push(eq(rooms.floorId, filter.floorId))
	}
	if (filter.buildingId !== undefined) {
		conditions.push(eq(floors.buildingId, filter.buildingId))
	}
	if (filter.category) {
		conditions.push(eq(roomAssets.category, filter.category))
	}
	return conditions
}

const assetJoinBase = () =>
	orm
		.select({
			id: roomAssets.id,
			code: roomAssets.code,
			name: roomAssets.name,
			category: roomAssets.category,
			quantity: roomAssets.quantity,
			unit: roomAssets.unit,
			grade: roomAssets.grade,
			status: roomAssets.status,
			purchaseDate: roomAssets.purchaseDate,
			expiryDate: roomAssets.expiryDate,
			description: roomAssets.description,
			brokenAt: roomAssets.brokenAt,
			repairStartedAt: roomAssets.repairStartedAt,
			repairCompletedAt: roomAssets.repairCompletedAt,
			repairPerformer: roomAssets.repairPerformer,
			roomId: rooms.id,
			roomCode: rooms.roomCode,
			roomName: rooms.roomName,
			floorId: floors.id,
			floorName: floors.name,
			buildingId: buildings.id,
			buildingCode: buildings.code,
			buildingName: buildings.name
		})
		.from(roomAssets)
		.innerJoin(rooms, eq(roomAssets.roomId, rooms.id))
		.innerJoin(floors, eq(rooms.floorId, floors.id))
		.innerJoin(buildings, eq(floors.buildingId, buildings.id))

function mapAssetRow(row: {
	id: number
	name: string
	category: string
	quantity: number
	unit: string | null
	status: string
	purchaseDate: string | null
	expiryDate: string | null
	description: string | null
	brokenAt: string | null
	repairStartedAt: string | null
	repairCompletedAt: string | null
	repairPerformer: string | null
	roomId: number
	roomCode: string
	roomName: string
	floorId: number
	floorName: string
	buildingId: number
	buildingCode: string
	buildingName: string
}): BrokenAssetRow {
	return {
		id: row.id,
		name: row.name,
		category: row.category,
		quantity: row.quantity,
		code: (row as any).code ?? null,
		unit: row.unit,
		grade: (row as any).grade ?? 1,
		status: row.status,
		purchaseDate: row.purchaseDate,
		expiryDate: row.expiryDate,
		description: row.description,
		brokenAt: row.brokenAt,
		repairStartedAt: row.repairStartedAt,
		repairCompletedAt: row.repairCompletedAt,
		repairPerformer: row.repairPerformer,
		repairCompleted: !!(
			row.repairCompletedAt && String(row.repairCompletedAt).trim()
		),
		roomId: row.roomId,
		roomCode: row.roomCode,
		roomName: row.roomName,
		floorId: row.floorId,
		floorName: row.floorName,
		buildingId: row.buildingId,
		buildingCode: row.buildingCode,
		buildingName: row.buildingName
	}
}

class ReportSqliteRepo implements ReportRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	async getStats(filter: AssetReportFilter): Promise<AssetStatsReport> {
		const loc = assetLocationConditions(filter)
		const whereClause = loc.length
			? loc.length === 1
				? loc[0]
				: and(...loc)
			: undefined

		const detailRows = await (
			whereClause ? assetJoinBase().where(whereClause) : assetJoinBase()
		).catch(handleDatabaseErr)

		const mapped = detailRows.map(mapAssetRow)

		const byStatusMap = new Map<
			string,
			{ count: number; quantity: number; items: BrokenAssetRow[] }
		>()
		const byCategoryMap = new Map<
			string,
			{ count: number; quantity: number; items: BrokenAssetRow[] }
		>()
		const byBuildingMap = new Map<
			number,
			{
				buildingId: number
				buildingCode: string
				buildingName: string
				count: number
				quantity: number
			}
		>()

		let totalQuantity = 0
		for (const r of mapped) {
			const qty = r.quantity ?? 0
			totalQuantity += qty
			const st = r.status ?? 'NORMAL'
			const cat = r.category ?? 'Khác'

			const s = byStatusMap.get(st) ?? {
				count: 0,
				quantity: 0,
				items: []
			}
			s.count += 1
			s.quantity += qty
			s.items.push(r)
			byStatusMap.set(st, s)

			const c = byCategoryMap.get(cat) ?? {
				count: 0,
				quantity: 0,
				items: []
			}
			c.count += 1
			c.quantity += qty
			c.items.push(r)
			byCategoryMap.set(cat, c)

			const b = byBuildingMap.get(r.buildingId) ?? {
				buildingId: r.buildingId,
				buildingCode: r.buildingCode,
				buildingName: r.buildingName,
				count: 0,
				quantity: 0
			}
			b.count += 1
			b.quantity += qty
			byBuildingMap.set(r.buildingId, b)
		}

		return {
			totalAssets: mapped.length,
			totalQuantity,
			byStatus: [...byStatusMap.entries()]
				.map(([status, v]) => ({ status, ...v }))
				.sort((a, b) => a.status.localeCompare(b.status)),
			byCategory: [...byCategoryMap.entries()]
				.map(([category, v]) => ({ category, ...v }))
				.sort((a, b) => b.quantity - a.quantity),
			byBuilding: [...byBuildingMap.values()].sort((a, b) =>
				a.buildingCode.localeCompare(b.buildingCode)
			)
		}
	}

	async getBrokenAssets(
		filter: BrokenAssetsFilter
	): Promise<BrokenAssetRow[]> {
		// Hỏng / đang sửa / cấp 5 (đã sửa xong phiếu nhưng chưa tăng cấp vẫn nằm kho hỏng)
		const statusList = filter.includeRepairing
			? ['BROKEN', 'REPAIRING']
			: ['BROKEN']
		const loc = assetLocationConditions(filter)
		const conditions: SQL[] = [
			sql`(
				${inArray(roomAssets.status, statusList)}
				OR ${roomAssets.grade} >= 5
			)`,
			// Không lấy đã thanh lý / SL 0 rác
			sql`(${roomAssets.quantity} IS NULL OR ${roomAssets.quantity} > 0)`,
			...loc
		]
		const rows = await assetJoinBase()
			.where(and(...conditions))
			.catch(handleDatabaseErr)
		return rows.map(mapAssetRow)
	}

	async getExpiringAssets(
		filter: ExpiringAssetsFilter
	): Promise<ExpiringAssetRow[]> {
		const withinDays =
			filter.withinDays !== undefined && filter.withinDays > 0
				? filter.withinDays
				: 30

		const today = new Date()
		const todayStr = today.toISOString().slice(0, 10)
		const end = new Date(today)
		end.setDate(end.getDate() + withinDays)
		const endStr = end.toISOString().slice(0, 10)

		const conditions: SQL[] = [
			// only assets that have an expiry date set
			sql`${roomAssets.expiryDate} IS NOT NULL AND ${roomAssets.expiryDate} != ''`,
			gte(roomAssets.expiryDate, todayStr),
			lte(roomAssets.expiryDate, endStr),
			// exclude disposed
			sql`${roomAssets.status} != 'DISPOSED'`,
			...assetLocationConditions(filter)
		]

		const rows = await assetJoinBase()
			.where(and(...conditions))
			.catch(handleDatabaseErr)

		const todayMs = Date.parse(todayStr)
		return rows
			.map((row) => {
				const base = mapAssetRow(row)
				const expMs = Date.parse(base.expiryDate ?? todayStr)
				const daysUntilExpiry = Math.round(
					(expMs - todayMs) / (1000 * 60 * 60 * 24)
				)
				return { ...base, daysUntilExpiry }
			})
			.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
	}

	async getRepairHistory(
		filter: RepairHistoryFilter
	): Promise<RepairHistoryRow[]> {
		const conditions: SQL[] = []
		if (filter.roomAssetId !== undefined) {
			conditions.push(eq(repairLogs.roomAssetId, filter.roomAssetId))
		}
		if (filter.fromDate) {
			conditions.push(gte(repairLogs.repairDate, filter.fromDate))
		}
		if (filter.toDate) {
			conditions.push(lte(repairLogs.repairDate, filter.toDate))
		}
		// location filters via joins
		conditions.push(...assetLocationConditions(filter))

		const base = this.db
			.select({
				id: repairLogs.id,
				repairDate: repairLogs.repairDate,
				content: repairLogs.content,
				cost: repairLogs.cost,
				performer: repairLogs.performer,
				note: repairLogs.note,
				roomAssetId: roomAssets.id,
				assetName: roomAssets.name,
				assetCategory: roomAssets.category,
				assetStatus: roomAssets.status,
				roomId: rooms.id,
				roomCode: rooms.roomCode,
				roomName: rooms.roomName,
				floorId: floors.id,
				floorName: floors.name,
				buildingId: buildings.id,
				buildingCode: buildings.code,
				buildingName: buildings.name
			})
			.from(repairLogs)
			.innerJoin(roomAssets, eq(repairLogs.roomAssetId, roomAssets.id))
			.innerJoin(rooms, eq(roomAssets.roomId, rooms.id))
			.innerJoin(floors, eq(rooms.floorId, floors.id))
			.innerJoin(buildings, eq(floors.buildingId, buildings.id))

		const rows = await (
			conditions.length ? base.where(and(...conditions)) : base
		).catch(handleDatabaseErr)

		return rows
			.map((r) => ({
				id: r.id,
				repairDate: r.repairDate,
				content: r.content,
				cost: r.cost,
				performer: r.performer,
				note: r.note,
				roomAssetId: r.roomAssetId,
				assetName: r.assetName,
				assetCategory: r.assetCategory,
				assetStatus: r.assetStatus,
				roomId: r.roomId,
				roomCode: r.roomCode,
				roomName: r.roomName,
				floorId: r.floorId,
				floorName: r.floorName,
				buildingId: r.buildingId,
				buildingCode: r.buildingCode,
				buildingName: r.buildingName
			}))
			.sort((a, b) => b.repairDate.localeCompare(a.repairDate))
	}
}

class AssetMovementSqliteRepo implements AssetMovementLogRepository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(
		params: CreateAssetMovementRequest & {
			quantityBefore: number
			quantityAfter: number
			assetCode?: string | null
			assetName: string
			grade: number
			buildingCode?: string | null
			buildingName?: string | null
			roomCode?: string | null
			roomName?: string | null
			floorName?: string | null
		}
	): Promise<AssetMovementLogDB> {
		return this.db
			.insert(assetMovementLogs)
			.values({
				roomAssetId: params.roomAssetId,
				movementType: params.movementType,
				executedAt: params.executedAt,
				executingUnit: params.executingUnit,
				installAddress: params.installAddress,
				assetCode: params.assetCode,
				assetName: params.assetName,
				quantity: params.quantity,
				quantityBefore: params.quantityBefore,
				quantityAfter: params.quantityAfter,
				grade: params.grade,
				manufactureYear: params.manufactureYear,
				usageYear: params.usageYear,
				reasonCode: params.reasonCode,
				reasonOther: params.reasonOther,
				decisionDate: params.decisionDate,
				decisionNumber: params.decisionNumber,
				signer: params.signer,
				performer: params.performer,
				explanation: params.explanation,
				note: params.note,
				buildingCode: params.buildingCode,
				buildingName: params.buildingName,
				roomCode: params.roomCode,
				roomName: params.roomName,
				floorName: params.floorName
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	findById(id: number): Promise<AssetMovementLogDB | undefined> {
		return this.db.query.assetMovementLogs
			.findFirst({ where: eq(assetMovementLogs.id, id) })
			.catch(handleDatabaseErr)
	}

	async find(q: AssetMovementQuery = {}): Promise<AssetMovementLogDB[]> {
		const conditions: SQL[] = []
		if (q.ids?.length) conditions.push(inArray(assetMovementLogs.id, q.ids))
		if (q.roomAssetId !== undefined)
			conditions.push(eq(assetMovementLogs.roomAssetId, q.roomAssetId))
		if (q.movementType)
			conditions.push(eq(assetMovementLogs.movementType, q.movementType))
		if (q.fromDate)
			conditions.push(gte(assetMovementLogs.executedAt, q.fromDate))
		if (q.toDate)
			conditions.push(lte(assetMovementLogs.executedAt, q.toDate))

		if (q.roomId !== undefined || q.buildingId !== undefined) {
			const assetConds: SQL[] = []
			if (q.roomId !== undefined)
				assetConds.push(eq(roomAssets.roomId, q.roomId))
			if (q.buildingId !== undefined) {
				const floorRows = await this.db
					.select({ id: floors.id })
					.from(floors)
					.where(eq(floors.buildingId, q.buildingId))
					.catch(handleDatabaseErr)
				const floorIds = floorRows.map((f) => f.id)
				if (!floorIds.length) return []
				const roomRows = await this.db
					.select({ id: rooms.id })
					.from(rooms)
					.where(inArray(rooms.floorId, floorIds))
					.catch(handleDatabaseErr)
				const roomIds = roomRows.map((r) => r.id)
				if (!roomIds.length) return []
				assetConds.push(inArray(roomAssets.roomId, roomIds))
			}
			const assetRows = await this.db
				.select({ id: roomAssets.id })
				.from(roomAssets)
				.where(
					assetConds.length === 1 ? assetConds[0] : and(...assetConds)
				)
				.catch(handleDatabaseErr)
			const assetIds = assetRows.map((a) => a.id)
			if (!assetIds.length) return []
			conditions.push(inArray(assetMovementLogs.roomAssetId, assetIds))
		}

		return this.db.query.assetMovementLogs
			.findMany({
				where: conditions.length
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined
			})
			.then((rows) =>
				[...(rows as AssetMovementLogDB[])].sort((a, b) =>
					b.executedAt.localeCompare(a.executedAt)
				)
			)
			.catch(handleDatabaseErr)
	}

	async findReport(
		q: AssetMovementQuery = {}
	): Promise<AssetMovementReportRow[]> {
		const conditions: SQL[] = []
		if (q.roomAssetId !== undefined)
			conditions.push(eq(assetMovementLogs.roomAssetId, q.roomAssetId))
		if (q.movementType)
			conditions.push(eq(assetMovementLogs.movementType, q.movementType))
		if (q.fromDate)
			conditions.push(gte(assetMovementLogs.executedAt, q.fromDate))
		if (q.toDate)
			conditions.push(lte(assetMovementLogs.executedAt, q.toDate))

		// Lọc vị trí: join hiện tại HOẶC snapshot (khi VT đã xóa, room_asset_id = null)
		if (q.roomId !== undefined) {
			const room = await this.db.query.rooms
				.findFirst({ where: eq(rooms.id, q.roomId) })
				.catch(handleDatabaseErr)
			const roomCode = room?.roomCode
			conditions.push(
				roomCode
					? or(
							eq(rooms.id, q.roomId),
							and(
								isNull(rooms.id),
								eq(assetMovementLogs.roomCode, roomCode)
							)
						)!
					: eq(rooms.id, q.roomId)
			)
		}
		if (q.buildingId !== undefined) {
			const b = await this.db.query.buildings
				.findFirst({ where: eq(buildings.id, q.buildingId) })
				.catch(handleDatabaseErr)
			const bCode = b?.code
			conditions.push(
				bCode
					? or(
							eq(buildings.id, q.buildingId),
							and(
								isNull(buildings.id),
								eq(assetMovementLogs.buildingCode, bCode)
							)
						)!
					: eq(buildings.id, q.buildingId)
			)
		}

		// LEFT JOIN: giữ nhật ký dù VT đã xóa (FK SET NULL) — dùng snapshot vị trí
		const base = this.db
			.select({
				id: assetMovementLogs.id,
				createdAt: assetMovementLogs.createdAt,
				updatedAt: assetMovementLogs.updatedAt,
				roomAssetId: assetMovementLogs.roomAssetId,
				movementType: assetMovementLogs.movementType,
				executedAt: assetMovementLogs.executedAt,
				executingUnit: assetMovementLogs.executingUnit,
				installAddress: assetMovementLogs.installAddress,
				assetCode: assetMovementLogs.assetCode,
				assetName: assetMovementLogs.assetName,
				quantity: assetMovementLogs.quantity,
				quantityBefore: assetMovementLogs.quantityBefore,
				quantityAfter: assetMovementLogs.quantityAfter,
				grade: assetMovementLogs.grade,
				manufactureYear: assetMovementLogs.manufactureYear,
				usageYear: assetMovementLogs.usageYear,
				reasonCode: assetMovementLogs.reasonCode,
				reasonOther: assetMovementLogs.reasonOther,
				decisionDate: assetMovementLogs.decisionDate,
				decisionNumber: assetMovementLogs.decisionNumber,
				signer: assetMovementLogs.signer,
				performer: assetMovementLogs.performer,
				explanation: assetMovementLogs.explanation,
				note: assetMovementLogs.note,
				roomId: sql<number>`coalesce(${rooms.id}, 0)`.as('roomId'),
				roomCode:
					sql<string>`coalesce(${rooms.roomCode}, ${assetMovementLogs.roomCode}, '')`.as(
						'roomCode'
					),
				roomName:
					sql<string>`coalesce(${rooms.roomName}, ${assetMovementLogs.roomName}, '')`.as(
						'roomName'
					),
				floorId: sql<number>`coalesce(${floors.id}, 0)`.as('floorId'),
				floorName:
					sql<string>`coalesce(${floors.name}, ${assetMovementLogs.floorName}, '')`.as(
						'floorName'
					),
				buildingId: sql<number>`coalesce(${buildings.id}, 0)`.as(
					'buildingId'
				),
				buildingCode:
					sql<string>`coalesce(${buildings.code}, ${assetMovementLogs.buildingCode}, '')`.as(
						'buildingCode'
					),
				buildingName:
					sql<string>`coalesce(${buildings.name}, ${assetMovementLogs.buildingName}, '')`.as(
						'buildingName'
					),
				holdingUnitId: roomAssets.holdingUnitId
			})
			.from(assetMovementLogs)
			.leftJoin(
				roomAssets,
				eq(assetMovementLogs.roomAssetId, roomAssets.id)
			)
			.leftJoin(rooms, eq(roomAssets.roomId, rooms.id))
			.leftJoin(floors, eq(rooms.floorId, floors.id))
			.leftJoin(buildings, eq(floors.buildingId, buildings.id))

		const rows = await (
			conditions.length ? base.where(and(...conditions)) : base
		).catch(handleDatabaseErr)

		return (rows as AssetMovementReportRow[]).sort((a, b) =>
			b.executedAt.localeCompare(a.executedAt)
		)
	}

	/** Create PENDING repair request if none open for this asset */
	async ensureRepairSuggestion(asset: {
		id: number
		roomId: number
		name: string
		category: string
		code?: string | null
	}): Promise<void> {
		const open = await this.db.query.repairRequests
			.findMany({
				where: and(
					eq(repairRequests.roomAssetId, asset.id),
					inArray(repairRequests.status, [
						'PENDING',
						'ASSIGNED',
						'IN_PROGRESS'
					])
				)
			})
			.catch(handleDatabaseErr)
		if (open.length) return

		const today = new Date().toISOString().slice(0, 10)
		await this.db
			.insert(repairRequests)
			.values({
				roomId: asset.roomId,
				roomAssetId: asset.id,
				assetName: asset.name,
				category: asset.category,
				description: `Tự động đề xuất sửa chữa do phân cấp 5 (mã: ${asset.code ?? asset.id})`,
				status: 'PENDING',
				brokenAt: today,
				reportedByName: 'Hệ thống (phân cấp 5)'
			})
			.catch(handleDatabaseErr)
	}
}

class AccountAuditLogSqliteRepo {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateAccountAuditLogRequest): Promise<AccountAuditLogDB> {
		log.info('AccountAuditLogRepo.create', {
			action: params.action,
			roomId: params.roomId
		})
		return this.db
			.insert(accountAuditLogs)
			.values({
				action: params.action,
				actorUserId: params.actorUserId ?? null,
				actorUsername: params.actorUsername ?? null,
				actorDisplayName: params.actorDisplayName ?? null,
				actorIsAdmin: params.actorIsAdmin ? 1 : 0,
				roomId: params.roomId ?? null,
				roomCode: params.roomCode ?? null,
				roomName: params.roomName ?? null,
				address: params.address ?? null,
				floorName: params.floorName ?? null,
				buildingCode: params.buildingCode ?? null,
				buildingName: params.buildingName ?? null,
				accountLabel: params.accountLabel ?? null,
				summary: params.summary,
				details: params.details ?? null
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	async find(q?: {
		search?: string
		limit?: number
	}): Promise<AccountAuditLogDB[]> {
		const limit = Math.min(Math.max(q?.limit ?? 200, 1), 500)
		const search = q?.search?.trim()
		if (!search) {
			return this.db
				.select()
				.from(accountAuditLogs)
				.orderBy(desc(accountAuditLogs.id))
				.limit(limit)
				.catch(handleDatabaseErr)
		}
		const pattern = `%${search}%`
		return this.db
			.select()
			.from(accountAuditLogs)
			.where(
				or(
					like(accountAuditLogs.summary, pattern),
					like(accountAuditLogs.roomCode, pattern),
					like(accountAuditLogs.roomName, pattern),
					like(accountAuditLogs.accountLabel, pattern),
					like(accountAuditLogs.actorUsername, pattern),
					like(accountAuditLogs.actorDisplayName, pattern),
					like(accountAuditLogs.address, pattern),
					like(accountAuditLogs.floorName, pattern),
					like(accountAuditLogs.buildingName, pattern),
					like(accountAuditLogs.buildingCode, pattern),
					like(accountAuditLogs.action, pattern),
					like(accountAuditLogs.details, pattern)
				)
			)
			.orderBy(desc(accountAuditLogs.id))
			.limit(limit)
			.catch(handleDatabaseErr)
	}
}

export const buildingRepo = new BuildingSqliteRepo(orm)
export const floorRepo = new FloorSqliteRepo(orm)
export const roomRepo = new RoomSqliteRepo(orm)
export const roomAssetRepo = new RoomAssetSqliteRepo(orm)
export const roomImageRepo = new RoomImageSqliteRepo(orm)
export const repairLogRepo = new RepairLogSqliteRepo(orm)
export const inventoryLogRepo = new InventoryLogSqliteRepo(orm)
export const replacementLogRepo = new ReplacementLogSqliteRepo(orm)
export const reportRepo = new ReportSqliteRepo(orm)
export const assetMovementLogRepo = new AssetMovementSqliteRepo(orm)
export const accountAuditLogRepo = new AccountAuditLogSqliteRepo(orm)

class CatalogAuditLogSqliteRepo {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateCatalogAuditLogRequest): Promise<CatalogAuditLogDB> {
		log.info('CatalogAuditLogRepo.create', {
			action: params.action,
			entityType: params.entityType
		})
		return this.db
			.insert(catalogAuditLogs)
			.values({
				action: params.action,
				entityType: params.entityType,
				actorUserId: params.actorUserId ?? null,
				actorUsername: params.actorUsername ?? null,
				actorDisplayName: params.actorDisplayName ?? null,
				actorIsAdmin: params.actorIsAdmin ? 1 : 0,
				entityId: params.entityId ?? null,
				entityCode: params.entityCode ?? null,
				entityName: params.entityName ?? null,
				parentCode: params.parentCode ?? null,
				parentName: params.parentName ?? null,
				summary: params.summary,
				details: params.details ?? null
			})
			.returning()
			.then((rows) => rows[0])
			.catch(handleDatabaseErr)
	}

	async find(q?: {
		search?: string
		entityType?: string
		limit?: number
	}): Promise<CatalogAuditLogDB[]> {
		const limit = Math.min(Math.max(q?.limit ?? 200, 1), 500)
		const search = q?.search?.trim()
		const entityType = q?.entityType?.trim().toUpperCase()
		const conditions: SQL[] = []
		if (entityType) {
			conditions.push(eq(catalogAuditLogs.entityType, entityType))
		}
		if (search) {
			const pattern = `%${search}%`
			conditions.push(
				or(
					like(catalogAuditLogs.summary, pattern),
					like(catalogAuditLogs.entityCode, pattern),
					like(catalogAuditLogs.entityName, pattern),
					like(catalogAuditLogs.actorUsername, pattern),
					like(catalogAuditLogs.actorDisplayName, pattern),
					like(catalogAuditLogs.parentCode, pattern),
					like(catalogAuditLogs.parentName, pattern),
					like(catalogAuditLogs.action, pattern),
					like(catalogAuditLogs.details, pattern)
				)!
			)
		}
		const where =
			conditions.length === 0
				? undefined
				: conditions.length === 1
					? conditions[0]
					: and(...conditions)

		return this.db
			.select()
			.from(catalogAuditLogs)
			.where(where)
			.orderBy(desc(catalogAuditLogs.id))
			.limit(limit)
			.catch(handleDatabaseErr)
	}
}

export const catalogAuditLogRepo = new CatalogAuditLogSqliteRepo(orm)
