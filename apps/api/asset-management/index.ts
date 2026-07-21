import type {
	Building,
	BuildingDB,
	CreateBuildingRequest,
	UpdateBuildingRequest
} from '../schema/buildings'
import type {
	CreateFloorRequest,
	Floor,
	FloorDB,
	UpdateFloorRequest
} from '../schema/floors'
import type {
	CreateRoomRequest,
	Room,
	RoomDB,
	UpdateRoomRequest
} from '../schema/rooms'
import type {
	CreateRoomAssetRequest,
	RoomAssetDB,
	UpdateRoomAssetRequest
} from '../schema/room-assets'
import type {
	CreateRoomImageRequest,
	RoomImageDB,
	UpdateRoomImageRequest
} from '../schema/room-images'
import type {
	CreateRepairLogRequest,
	RepairLogDB,
	UpdateRepairLogRequest
} from '../schema/repair-logs'
import type {
	CreateInventoryLogRequest,
	InventoryLogDB,
	UpdateInventoryLogRequest
} from '../schema/inventory-logs'
import type {
	CreateReplacementLogRequest,
	ReplacementLogDB,
	UpdateReplacementLogRequest
} from '../schema/replacement-logs'
import type {
	AssetMovementLogDB,
	AssetMovementQuery,
	AssetMovementReportRow,
	CreateAssetMovementRequest
} from '../schema/asset-movement-logs'

export type BuildingTree = BuildingDB & {
	floors: Array<
		FloorDB & {
			rooms: Array<
				RoomDB & {
					/** Tổng số lượng vật tư trong phòng (tổng SL các dòng VT) */
					totalQuantity?: number
				}
			>
		}
	>
}

export type RoomProfile = RoomDB & {
	floor?: FloorDB & {
		building?: BuildingDB
	}
	assets: RoomAssetDB[]
	images: RoomImageDB[]
	repairs: RepairLogDB[]
	inventories: InventoryLogDB[]
	replacements: ReplacementLogDB[]
	movements: AssetMovementLogDB[]
}

export type BuildingQuery = {
	ids?: number[]
	code?: string
}

export type FloorQuery = {
	ids?: number[]
	buildingId?: number
}

export type RoomQuery = {
	ids?: number[]
	floorId?: number
	buildingId?: number
	status?: string
}

export type RoomAssetQuery = {
	ids?: number[]
	roomId?: number
	status?: string
	category?: string
	code?: string
	codePrefix?: string
	grade?: number
}

export type RoomImageQuery = {
	ids?: number[]
	roomId?: number
}

export type LogQuery = {
	ids?: number[]
	roomAssetId?: number
	roomId?: number
}

/** Shared filters for report endpoints */
export type AssetReportFilter = {
	buildingId?: number
	floorId?: number
	roomId?: number
	category?: string
}

/** Asset row with location + repair lifecycle (used in stats drill-down & broken report) */
export type AssetDetailRow = {
	id: number
	code: string | null
	name: string
	category: string
	quantity: number
	unit: string | null
	grade: number
	status: string
	purchaseDate: string | null
	expiryDate: string | null
	description: string | null
	brokenAt: string | null
	repairStartedAt: string | null
	repairCompletedAt: string | null
	repairPerformer: string | null
	/** true if repairCompletedAt is set */
	repairCompleted: boolean
	roomId: number
	roomCode: string
	roomName: string
	floorId: number
	floorName: string
	buildingId: number
	buildingCode: string
	buildingName: string
}

export type AssetStatsReport = {
	totalAssets: number
	totalQuantity: number
	byStatus: Array<{
		status: string
		count: number
		quantity: number
		/** Thiết bị thuộc trạng thái này */
		items: AssetDetailRow[]
	}>
	byCategory: Array<{
		category: string
		count: number
		quantity: number
		/** Thiết bị thuộc loại này */
		items: AssetDetailRow[]
	}>
	byBuilding: Array<{
		buildingId: number
		buildingCode: string
		buildingName: string
		count: number
		quantity: number
	}>
}

export type BrokenAssetRow = AssetDetailRow

export type ExpiringAssetRow = BrokenAssetRow & {
	daysUntilExpiry: number
}

export type RepairHistoryRow = {
	id: number
	repairDate: string
	content: string
	cost: number
	performer: string | null
	note: string | null
	roomAssetId: number
	assetName: string
	assetCategory: string
	assetStatus: string
	roomId: number
	roomCode: string
	roomName: string
	floorId: number
	floorName: string
	buildingId: number
	buildingCode: string
	buildingName: string
}

export type BrokenAssetsFilter = AssetReportFilter & {
	includeRepairing?: boolean
}

export type ExpiringAssetsFilter = AssetReportFilter & {
	/** Include assets whose expiryDate is between today and today+withinDays (inclusive). Default 30. */
	withinDays?: number
}

export type RepairHistoryFilter = AssetReportFilter & {
	roomAssetId?: number
	fromDate?: string
	toDate?: string
}

export interface ReportRepository {
	getStats(filter: AssetReportFilter): Promise<AssetStatsReport>
	getBrokenAssets(filter: BrokenAssetsFilter): Promise<BrokenAssetRow[]>
	getExpiringAssets(filter: ExpiringAssetsFilter): Promise<ExpiringAssetRow[]>
	getRepairHistory(filter: RepairHistoryFilter): Promise<RepairHistoryRow[]>
}

export interface BuildingRepository {
	create(params: CreateBuildingRequest): Promise<BuildingDB>
	update(params: UpdateBuildingRequest): Promise<BuildingDB>
	delete(ids: number[]): Promise<BuildingDB[]>
	find(q?: BuildingQuery): Promise<Building[]>
	findById(id: number): Promise<Building | undefined>
	findTree(): Promise<BuildingTree[]>
}

export interface FloorRepository {
	create(params: CreateFloorRequest): Promise<FloorDB>
	update(params: UpdateFloorRequest): Promise<FloorDB>
	delete(ids: number[]): Promise<FloorDB[]>
	find(q?: FloorQuery): Promise<Floor[]>
	findById(id: number): Promise<Floor | undefined>
	findByIds(ids: number[]): Promise<FloorDB[]>
}

export interface RoomRepository {
	create(params: CreateRoomRequest): Promise<RoomDB>
	update(params: UpdateRoomRequest): Promise<RoomDB>
	delete(ids: number[]): Promise<RoomDB[]>
	find(q?: RoomQuery): Promise<Room[]>
	findById(id: number): Promise<Room | undefined>
	findByIds(ids: number[]): Promise<RoomDB[]>
	findProfile(id: number): Promise<RoomProfile | undefined>
}

export interface RoomAssetRepository {
	create(params: CreateRoomAssetRequest): Promise<RoomAssetDB>
	update(params: UpdateRoomAssetRequest): Promise<RoomAssetDB>
	delete(ids: number[]): Promise<RoomAssetDB[]>
	find(q?: RoomAssetQuery): Promise<RoomAssetDB[]>
	findById(id: number): Promise<RoomAssetDB | undefined>
}

export interface RoomImageRepository {
	create(params: CreateRoomImageRequest): Promise<RoomImageDB>
	update(params: UpdateRoomImageRequest): Promise<RoomImageDB>
	delete(ids: number[]): Promise<RoomImageDB[]>
	find(q?: RoomImageQuery): Promise<RoomImageDB[]>
	findById(id: number): Promise<RoomImageDB | undefined>
}

export interface RepairLogRepository {
	create(params: CreateRepairLogRequest): Promise<RepairLogDB>
	update(params: UpdateRepairLogRequest): Promise<RepairLogDB>
	delete(ids: number[]): Promise<RepairLogDB[]>
	find(q?: LogQuery): Promise<RepairLogDB[]>
	findById(id: number): Promise<RepairLogDB | undefined>
}

export interface InventoryLogRepository {
	create(params: CreateInventoryLogRequest): Promise<InventoryLogDB>
	update(params: UpdateInventoryLogRequest): Promise<InventoryLogDB>
	delete(ids: number[]): Promise<InventoryLogDB[]>
	find(q?: LogQuery): Promise<InventoryLogDB[]>
	findById(id: number): Promise<InventoryLogDB | undefined>
}

export interface ReplacementLogRepository {
	create(params: CreateReplacementLogRequest): Promise<ReplacementLogDB>
	update(params: UpdateReplacementLogRequest): Promise<ReplacementLogDB>
	delete(ids: number[]): Promise<ReplacementLogDB[]>
	find(q?: LogQuery): Promise<ReplacementLogDB[]>
	findById(id: number): Promise<ReplacementLogDB | undefined>
}

export type {
	AssetMovementLogDB,
	AssetMovementQuery,
	AssetMovementReportRow,
	CreateAssetMovementRequest
}

export interface AssetMovementLogRepository {
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
	): Promise<AssetMovementLogDB>
	findById(id: number): Promise<AssetMovementLogDB | undefined>
	find(q?: AssetMovementQuery): Promise<AssetMovementLogDB[]>
	findReport(q?: AssetMovementQuery): Promise<AssetMovementReportRow[]>
	ensureRepairSuggestion(asset: {
		id: number
		roomId: number
		name: string
		category: string
		code?: string | null
	}): Promise<void>
}
