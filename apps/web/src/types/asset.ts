export type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface Building {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	managerCode: string | null
	area: string | null
	address: string | null
	description: string | null
}

export interface Floor {
	id: number
	createdAt: string
	updatedAt: string
	buildingId: number
	code: string | null
	floorNumber: number
	name: string
	description: string | null
}

export interface Room {
	id: number
	createdAt: string
	updatedAt: string
	floorId: number
	roomCode: string
	roomName: string
	roomType: string | null
	manager: string | null
	managerCode: string | null
	/** Có mật khẩu (không trả hash) */
	hasAccountPassword?: boolean
	capacity: number
	status: string
	description: string | null
	/** Lớp học gắn phòng dạy */
	classId?: number | null
	/** Tổng SL vật tư trong phòng (từ cây tòa nhà) */
	totalQuantity?: number
}

export type BuildingTree = Building & {
	floors: Array<
		Floor & {
			rooms: Room[]
		}
	>
}

export interface CreateBuildingBody {
	code: string
	name: string
	managerCode?: string
	area?: string
	address?: string
	description?: string
}

export interface UpdateBuildingBody {
	code?: string
	name?: string
	managerCode?: string
	area?: string
	address?: string
	description?: string
}

export interface CreateFloorBody {
	buildingId: number
	code?: string | null
	floorNumber: number
	name: string
	description?: string | null
}

export interface UpdateFloorBody {
	buildingId?: number
	code?: string | null
	floorNumber?: number
	name?: string
	description?: string | null
}

export interface CreateRoomBody {
	floorId: number
	roomCode: string
	roomName: string
	roomType?: string
	manager?: string
	managerCode?: string
	/** Mật khẩu plain — server hash; mặc định 123456 */
	accountPassword?: string
	capacity?: number
	status?: string
	description?: string
}

export interface UpdateRoomBody {
	floorId?: number
	roomCode?: string
	roomName?: string
	roomType?: string
	manager?: string
	managerCode?: string
	/** Mật khẩu mới (plain); bỏ trống = giữ cũ */
	accountPassword?: string
	capacity?: number
	status?: string
	description?: string
	classId?: number | null
}

export type RoomAssetStatus = 'NORMAL' | 'BROKEN' | 'REPAIRING' | 'DISPOSED'

export interface RoomAsset {
	id: number
	createdAt: string
	updatedAt: string
	roomId: number
	code: string | null
	name: string
	category: string
	/** SL đang dùng được */
	quantity: number
	/** SL đang hỏng / chờ-đang sửa (cùng mã, không tạo dòng mới) */
	brokenQuantity?: number
	unit: string | null
	/** Đơn vị giữ/sử dụng; null + kho = chưa sử dụng */
	holdingUnitId?: number | null
	grade: number
	manufactureYear: number | null
	usageYear: number | null
	installAddress: string | null
	status: string
	purchaseDate: string | null
	expiryDate: string | null
	brokenAt: string | null
	repairStartedAt: string | null
	repairCompletedAt: string | null
	repairPerformer: string | null
	description: string | null
}

export interface RoomImage {
	id: number
	createdAt: string
	updatedAt: string
	roomId: number
	imageUrl: string
	title: string | null
	description: string | null
}

export interface RepairLog {
	id: number
	createdAt: string
	updatedAt: string
	roomAssetId: number
	repairDate: string
	content: string
	cost: number
	performer: string | null
	note: string | null
}

export interface InventoryLog {
	id: number
	createdAt: string
	updatedAt: string
	roomAssetId: number
	inventoryDate: string
	actualQuantity: number
	expectedQuantity: number
	result: string | null
	note: string | null
}

export interface ReplacementLog {
	id: number
	createdAt: string
	updatedAt: string
	roomAssetId: number
	replacementDate: string
	oldAsset: string
	newAsset: string
	reason: string | null
	performer: string | null
	note: string | null
}

export type AssetMovementType =
	| 'INCREASE'
	| 'DECREASE'
	| 'ADJUST'
	| 'TRANSFER'
	| 'RECALL'

export interface AssetMovementLog {
	id: number
	createdAt: string
	updatedAt: string
	roomAssetId: number
	movementType: string
	executedAt: string
	executingUnit: string | null
	installAddress: string | null
	assetCode: string | null
	assetName: string
	quantity: number
	quantityBefore: number
	quantityAfter: number
	grade: number
	manufactureYear: number | null
	usageYear: number | null
	reasonCode: string | null
	reasonOther: string | null
	decisionDate: string | null
	decisionNumber: string | null
	signer: string | null
	performer: string | null
	explanation: string | null
	note: string | null
}

export type AssetMovementReportRow = AssetMovementLog & {
	roomId: number
	roomCode: string
	roomName: string
	floorId: number
	floorName: string
	buildingId: number
	buildingCode: string
	buildingName: string
	/** Đơn vị sử dụng (holding) gắn VT */
	holdingUnitId?: number | null
}

export type RoomProfile = Room & {
	floor?: Floor & {
		building?: Building
	}
	assets: RoomAsset[]
	images: RoomImage[]
	repairs: RepairLog[]
	inventories: InventoryLog[]
	replacements: ReplacementLog[]
	movements?: AssetMovementLog[]
}

export interface CreateRoomAssetBody {
	roomId: number
	code: string
	name: string
	category: string
	quantity?: number
	unit?: string
	/** Đơn vị giữ / sử dụng (đồng bộ hậu tố mã …-D1) */
	holdingUnitId?: number
	grade?: number
	manufactureYear?: number
	usageYear?: number
	installAddress?: string
	status?: string
	purchaseDate?: string
	expiryDate?: string
	brokenAt?: string
	repairStartedAt?: string
	repairCompletedAt?: string
	repairPerformer?: string
	description?: string
}

export interface UpdateRoomAssetBody {
	roomId?: number
	code?: string
	name?: string
	category?: string
	quantity?: number
	unit?: string
	holdingUnitId?: number | null
	grade?: number
	manufactureYear?: number
	usageYear?: number
	installAddress?: string
	status?: string
	purchaseDate?: string
	expiryDate?: string
	brokenAt?: string
	repairStartedAt?: string
	repairCompletedAt?: string
	repairPerformer?: string
	description?: string
}

export interface CreateAssetMovementBody {
	movementType: AssetMovementType
	executedAt: string
	executingUnit?: string
	installAddress?: string
	assetName?: string
	quantity: number
	grade?: number
	manufactureYear?: number
	usageYear?: number
	reasonCode?: string
	reasonOther?: string
	decisionDate?: string
	decisionNumber?: string
	signer?: string
	performer?: string
	explanation?: string
	note?: string
	/** Đơn vị quản lý — tự cập nhật lên VT khi ghi nhận tăng/giảm */
	holdingUnitId?: number | null
}

/** Điều động (TRANSFER) / thu hồi (RECALL) */
export interface CreateTransferRecallBody {
	movementType: 'TRANSFER' | 'RECALL'
	/** RECALL: optional → kho KHO-VT */
	targetRoomId?: number
	quantity: number
	executedAt: string
	holdingUnitId?: number | null
	executingUnit?: string
	installAddress?: string
	decisionDate?: string
	decisionNumber?: string
	signer?: string
	performer?: string
	reasonOther?: string
	note?: string
}

export type AssetMovementFilter = {
	roomAssetId?: number
	roomId?: number
	buildingId?: number
	movementType?: string
	fromDate?: string
	toDate?: string
}

export interface CreateRoomImageBody {
	roomId: number
	imageUrl: string
	title?: string
	description?: string
}

export interface CreateRepairLogBody {
	roomAssetId: number
	repairDate: string
	content: string
	cost?: number
	performer?: string
	note?: string
}

export interface CreateInventoryLogBody {
	roomAssetId: number
	inventoryDate: string
	actualQuantity: number
	expectedQuantity?: number
	result?: string
	note?: string
}

export interface CreateReplacementLogBody {
	roomAssetId: number
	replacementDate: string
	oldAsset: string
	newAsset: string
	reason?: string
	performer?: string
	note?: string
}

/** Report filters & responses (Sprint 4 API) */
export type AssetReportFilter = {
	buildingId?: number
	floorId?: number
	roomId?: number
	category?: string
}

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
		items: AssetDetailRow[]
	}>
	byCategory: Array<{
		category: string
		count: number
		quantity: number
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
	withinDays?: number
}

export type RepairHistoryFilter = AssetReportFilter & {
	roomAssetId?: number
	fromDate?: string
	toDate?: string
}
