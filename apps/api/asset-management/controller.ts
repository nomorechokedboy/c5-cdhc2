import log from 'encore.dev/log'
import argon2 from 'argon2'
import { AppError } from '../errors'
import { appConfig } from '../configs'

/** Mật khẩu mặc định khi tạo / reset tài khoản phòng */
export const DEFAULT_ROOM_ACCOUNT_PASSWORD = '123456'

async function hashRoomAccountPassword(plain: string): Promise<string> {
	return argon2.hash(plain, {
		secret: Buffer.from(appConfig.HASH_SECRET)
	})
}

function stripRoomPassword<T extends RoomDB>(room: T): T {
	const { accountPassword, ...rest } = room as T & {
		accountPassword?: string | null
	}
	return {
		...rest,
		hasAccountPassword: !!accountPassword
	} as T
}
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
	CreateAssetMovementRequest,
	CreateTransferRecallRequest,
	MovementLocationSnapshot
} from '../schema/asset-movement-logs'
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
	AssetMovementLogRepository,
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
	RoomRepository
} from './index'
import {
	assetMovementLogRepo,
	buildingRepo,
	floorRepo,
	inventoryLogRepo,
	repairLogRepo,
	replacementLogRepo,
	reportRepo,
	roomAssetRepo,
	roomImageRepo,
	roomRepo
} from './repo'

const ROOM_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'MAINTENANCE'])
const ASSET_STATUSES = new Set(['NORMAL', 'BROKEN', 'REPAIRING', 'DISPOSED'])
/** Năm SX / Năm SD tối thiểu */
const MIN_ASSET_YEAR = 2000

function assertAssetYears(opts: {
	manufactureYear?: number | null
	usageYear?: number | null
}) {
	const maxY = new Date().getFullYear() + 1
	const check = (y: number | null | undefined, label: string) => {
		if (y === undefined || y === null) return
		const n = Number(y)
		if (!Number.isFinite(n) || !Number.isInteger(n)) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(`${label} không hợp lệ`)
			)
		}
		if (n < MIN_ASSET_YEAR) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					`${label} phải từ ${MIN_ASSET_YEAR} trở đi`
				)
			)
		}
		if (n > maxY) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(`${label} không được lớn hơn ${maxY}`)
			)
		}
	}
	check(opts.manufactureYear, 'Năm sản xuất')
	check(opts.usageYear, 'Năm sử dụng')
	if (
		opts.manufactureYear != null &&
		opts.usageYear != null &&
		Number(opts.usageYear) < Number(opts.manufactureYear)
	) {
		throw AppError.handleAppErr(
			AppError.invalidArgument(
				'Năm sử dụng không được nhỏ hơn năm sản xuất'
			)
		)
	}
}

const INCREASE_REASONS = new Set([
	'FROM_SUPERIOR',
	'PURCHASE',
	'GRADE_UP',
	'INVENTORY',
	'OTHER'
])
const DECREASE_REASONS = new Set([
	'RETURN_SUPERIOR',
	'LOSS',
	'LIQUIDATION', // Thanh lý — hư hỏng dùng phiếu «Báo hỏng»
	'INVENTORY',
	'OTHER'
])
const MOVEMENT_TYPES = new Set(['INCREASE', 'DECREASE', 'ADJUST'])
const TRANSFER_RECALL_TYPES = new Set(['TRANSFER', 'RECALL'])

/**
 * Lấy lý do hư từ description VT / ghi chú form (bỏ nhiễu import Excel).
 */
function extractDamageReason(raw?: string | null): string | undefined {
	const d = String(raw ?? '').trim()
	if (!d) return undefined
	// Bỏ dòng import / metadata
	if (/^Import\s+từ/i.test(d)) return undefined
	const first = d.split('|')[0]?.trim() || d
	if (/^Import\s+từ/i.test(first)) return undefined
	// Đã là ghi chú chuẩn → không lấy lại làm "lý do hư"
	if (/hoàn thành sửa chữa/i.test(first) && !/lý do hư/i.test(first)) {
		return undefined
	}
	const m = first.match(/Lý do hư\s*:\s*(.+?)(?:\.|$)/i)
	if (m?.[1]?.trim()) return m[1].trim()
	// Chuỗi quá dài kiểu diễn giải kỹ thuật — bỏ
	if (/tổng tồn không đổi|chuyển \d+ từ cấp/i.test(first)) return undefined
	return first.slice(0, 200)
}

/** Ghi chú tăng phân cấp: lý do hư + đã/chưa hoàn thành SC */
function buildGradeUpNote(opts: {
	damageReason?: string | null
	userNote?: string | null
	completed: boolean
}): string {
	const user = String(opts.userNote ?? '').trim()
	// Form đã gửi ghi chú đầy đủ (có lý do + trạng thái SC) → giữ nguyên
	if (user && /lý do hư/i.test(user) && /hoàn thành sửa chữa/i.test(user)) {
		return user
	}
	const reason =
		extractDamageReason(opts.damageReason) || extractDamageReason(user)
	const status = opts.completed
		? 'Hiện tại đã hoàn thành sửa chữa'
		: 'Chưa hoàn thành sửa chữa'
	if (reason) return `Lý do hư: ${reason}. ${status}`
	return status
}

function isAssetRepairedForGradeUp(asset: {
	repairCompletedAt?: string | null
}): boolean {
	return !!(asset.repairCompletedAt && String(asset.repairCompletedAt).trim())
}

/** Tăng phân cấp: cấp đích 1–4; cấp 5/hỏng phải đã sửa xong */
function assertGradeUpAllowed(
	asset: {
		grade?: number | null
		status?: string | null
		repairCompletedAt?: string | null
		code?: string | null
		name?: string
	},
	newGrade: number
) {
	const current = asset.grade ?? 1
	if (newGrade < 1 || newGrade > 4) {
		throw AppError.handleAppErr(
			AppError.invalidArgument(
				'Tăng phân cấp chỉ cho phép cấp 1–4. Cấp 5 là hỏng, bắt buộc sửa chữa (không dùng tăng phân cấp).'
			)
		)
	}
	const needsRepair =
		current === 5 ||
		asset.status === 'BROKEN' ||
		asset.status === 'REPAIRING'
	if (needsRepair && !isAssetRepairedForGradeUp(asset)) {
		throw AppError.handleAppErr(
			AppError.invalidArgument(
				`Chưa hoàn thành sửa chữa — không được tăng phân cấp (vật tư "${asset.code || asset.name}", cấp ${current}).`
			)
		)
	}
}

/** Mã vị trí A1.101 từ tòa + tầng + phòng */
function buildLocationCodeFromRoom(room: {
	roomCode: string
	floor?: {
		floorNumber: number
		building?: { code: string } | null
	} | null
}): string {
	const buildingCode = room.floor?.building?.code?.trim() ?? ''
	const floorNumber = room.floor?.floorNumber
	let roomPart = (room.roomCode ?? '').trim()
	if (buildingCode && floorNumber != null) {
		const p = `${buildingCode}${floorNumber}.`
		if (roomPart.toUpperCase().startsWith(p.toUpperCase())) {
			roomPart = roomPart.slice(p.length)
		} else if (roomPart.includes('.')) {
			roomPart = roomPart.split('.').pop() ?? roomPart
		}
		// Dạng "A-101" → "101"
		if (/^[A-Za-z]+-\d+[A-Za-z]?$/.test(roomPart)) {
			roomPart = roomPart.split('-').pop() ?? roomPart
		}
		if (roomPart) return `${buildingCode}${floorNumber}.${roomPart}`
	}
	return room.roomCode?.trim() || ''
}

/**
 * Mã danh mục / thực lực:
 * - HC2A0113
 * - HC2A0113-G2-D1  (mã VT + cấp + alias đơn vị)
 * Không được ghép prefix tòa/tầng/phòng (CDHC20.CDHC2-D1-…).
 */
function isCatalogStyleAssetCode(code: string): boolean {
	const s = code.trim().toUpperCase()
	return /^HC2[A-Z]\d{2,}(-G[1-5](-[A-Z0-9]+)?)?$/.test(s)
}

/**
 * Chuẩn hóa mã VT.
 * - Mã danh mục HC2… → giữ nguyên (không dính vị trí phòng).
 * - Mã vị trí cũ A1.101-PC → ghép theo location nếu chỉ nhập suffix.
 */
function normalizeAssetCode(locationCode: string, raw: string): string {
	const loc = locationCode.trim()
	let s = raw.trim().toUpperCase()
	if (!s) return s

	// Gỡ nhầm prefix vị trí dính trước mã HC2…
	// VD: CDHC20.CDHC2-D1-HC2A0113 → HC2A0113
	//     CDHC20.CDHC2-D1-HC2A0113-G2-D1 → HC2A0113-G2-D1
	const embedded = s.match(/HC2[A-Z]\d{2,}(?:-G[1-5](?:-[A-Z0-9]+)?)?/)
	if (embedded && !isCatalogStyleAssetCode(s)) {
		s = embedded[0]!
	}

	if (isCatalogStyleAssetCode(s)) {
		return s
	}

	// pure suffix (PC, TV…)
	if (!s.includes('.') && !s.includes('-')) {
		return loc ? `${loc}-${s}` : s
	}
	// full or partial with dash — chỉ áp dụng mã vị trí kiểu A1.101-PC
	const suffix = s.includes('-') ? (s.split('-').pop() ?? s) : s
	if (loc) return `${loc}-${suffix.replace(/^-+/, '')}`
	return s
}

function requireId(id: number | undefined, label: string) {
	if (!id) {
		throw AppError.handleAppErr(
			AppError.invalidArgument(`${label} id is required`)
		)
	}
}

function requireUpdateFields(rest: Record<string, unknown>) {
	const hasField = Object.values(rest).some((v) => v !== undefined)
	if (!hasField) {
		throw AppError.handleAppErr(
			AppError.invalidArgument('No update fields provided')
		)
	}
}

class AssetController {
	constructor(
		private readonly buildings: BuildingRepository,
		private readonly floors: FloorRepository,
		private readonly rooms: RoomRepository,
		private readonly assets: RoomAssetRepository,
		private readonly images: RoomImageRepository,
		private readonly repairs: RepairLogRepository,
		private readonly inventories: InventoryLogRepository,
		private readonly replacements: ReplacementLogRepository,
		private readonly reports: ReportRepository,
		private readonly movements: AssetMovementLogRepository
	) {}

	// ── Buildings ──────────────────────────────────────────────

	async createBuilding(params: CreateBuildingRequest): Promise<BuildingDB> {
		log.trace('AssetController.createBuilding', { params })
		if (!params.code?.trim() || !params.name?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Building code and name are required')
			)
		}
		return this.buildings.create(params).catch(AppError.handleAppErr)
	}

	async updateBuilding(params: UpdateBuildingRequest): Promise<BuildingDB> {
		log.trace('AssetController.updateBuilding', { params })
		requireId(params.id, 'Building')
		const existing = await this.buildings.findById(params.id)
		if (!existing) {
			throw AppError.handleAppErr(AppError.notFound('Building not found'))
		}
		const { id, ...rest } = params
		requireUpdateFields(rest)
		return this.buildings.update(params).catch(AppError.handleAppErr)
	}

	async deleteBuildings(ids: number[]): Promise<BuildingDB[]> {
		if (!ids?.length) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('ids must not be empty')
			)
		}
		return this.buildings.delete(ids).catch(AppError.handleAppErr)
	}

	async listBuildings(q?: BuildingQuery): Promise<Building[]> {
		return this.buildings.find(q).catch(AppError.handleAppErr)
	}

	async getBuilding(id: number): Promise<Building> {
		const building = await this.buildings
			.findById(id)
			.catch(AppError.handleAppErr)
		if (!building) {
			throw AppError.handleAppErr(AppError.notFound('Building not found'))
		}
		return building
	}

	async getBuildingTree(): Promise<BuildingTree[]> {
		return this.buildings.findTree().catch(AppError.handleAppErr)
	}

	// ── Floors ─────────────────────────────────────────────────

	async createFloor(params: CreateFloorRequest): Promise<FloorDB> {
		if (!params.buildingId || !params.name?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('buildingId and name are required')
			)
		}
		if (params.floorNumber === undefined || params.floorNumber === null) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('floorNumber is required')
			)
		}
		const building = await this.buildings.findById(params.buildingId)
		if (!building) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid buildingId')
			)
		}
		const code =
			params.code?.trim() || `${building.code}${params.floorNumber}`
		return this.floors
			.create({ ...params, code })
			.catch(AppError.handleAppErr)
	}

	async updateFloor(params: UpdateFloorRequest): Promise<FloorDB> {
		requireId(params.id, 'Floor')
		const existing = await this.floors.findById(params.id)
		if (!existing) {
			throw AppError.handleAppErr(AppError.notFound('Floor not found'))
		}
		if (params.buildingId !== undefined) {
			const building = await this.buildings.findById(params.buildingId)
			if (!building) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('Invalid buildingId')
				)
			}
		}
		const { id, ...rest } = params
		requireUpdateFields(rest)
		return this.floors.update(params).catch(AppError.handleAppErr)
	}

	async deleteFloors(ids: number[]): Promise<FloorDB[]> {
		if (!ids?.length) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('ids must not be empty')
			)
		}
		return this.floors.delete(ids).catch(AppError.handleAppErr)
	}

	async listFloors(q?: FloorQuery): Promise<Floor[]> {
		return this.floors.find(q).catch(AppError.handleAppErr)
	}

	async getFloor(id: number): Promise<Floor> {
		const floor = await this.floors
			.findById(id)
			.catch(AppError.handleAppErr)
		if (!floor) {
			throw AppError.handleAppErr(AppError.notFound('Floor not found'))
		}
		return floor
	}

	// ── Rooms ──────────────────────────────────────────────────

	async createRoom(params: CreateRoomRequest): Promise<RoomDB> {
		if (
			!params.floorId ||
			!params.roomCode?.trim() ||
			!params.roomName?.trim()
		) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'floorId, roomCode and roomName are required'
				)
			)
		}
		if (params.status && !ROOM_STATUSES.has(params.status)) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					`status must be one of: ${[...ROOM_STATUSES].join(', ')}`
				)
			)
		}
		const floor = await this.floors.findById(params.floorId)
		if (!floor) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid floorId')
			)
		}
		// Hash mật khẩu nếu có plain; mặc định 123456 khi có tài khoản
		const { accountPassword: plainPw, ...rest } = params
		let accountPassword: string | null | undefined = undefined
		if (plainPw !== undefined) {
			accountPassword = plainPw
				? await hashRoomAccountPassword(plainPw)
				: null
		} else if (params.managerCode || params.manager) {
			accountPassword = await hashRoomAccountPassword(
				DEFAULT_ROOM_ACCOUNT_PASSWORD
			)
		}
		const created = await this.rooms
			.create({ ...rest, accountPassword: accountPassword ?? null })
			.catch(AppError.handleAppErr)
		return stripRoomPassword(created)
	}

	async updateRoom(params: UpdateRoomRequest): Promise<RoomDB> {
		requireId(params.id, 'Room')
		const existing = await this.rooms.findById(params.id)
		if (!existing) {
			throw AppError.handleAppErr(AppError.notFound('Room not found'))
		}
		if (params.status && !ROOM_STATUSES.has(params.status)) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					`status must be one of: ${[...ROOM_STATUSES].join(', ')}`
				)
			)
		}
		if (params.floorId !== undefined) {
			const floor = await this.floors.findById(params.floorId)
			if (!floor) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('Invalid floorId')
				)
			}
		}
		const { id, accountPassword: plainPw, ...rest } = params
		// Cho phép sửa manager / managerCode (tài khoản) + mật khẩu
		const toUpdate: Record<string, unknown> = { ...rest }
		if (plainPw !== undefined && plainPw !== '') {
			toUpdate.accountPassword = await hashRoomAccountPassword(plainPw)
		}
		requireUpdateFields(toUpdate)
		const updated = await this.rooms
			.update({ id, ...(toUpdate as Omit<UpdateRoomRequest, 'id'>) })
			.catch(AppError.handleAppErr)
		return stripRoomPassword(updated)
	}

	/** Chỉ reset mật khẩu về mặc định 123456 — không đổi mã/tên tài khoản */
	async resetRoomAccount(id: number): Promise<RoomDB> {
		requireId(id, 'Room')
		const existing = await this.rooms.findById(id)
		if (!existing) {
			throw AppError.handleAppErr(AppError.notFound('Room not found'))
		}
		const hashed = await hashRoomAccountPassword(
			DEFAULT_ROOM_ACCOUNT_PASSWORD
		)
		const updated = await this.rooms
			.update({
				id,
				accountPassword: hashed
			})
			.catch(AppError.handleAppErr)
		return stripRoomPassword(updated)
	}

	async deleteRooms(ids: number[]): Promise<RoomDB[]> {
		if (!ids?.length) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('ids must not be empty')
			)
		}
		return this.rooms.delete(ids).catch(AppError.handleAppErr)
	}

	async listRooms(q?: RoomQuery): Promise<Room[]> {
		return this.rooms.find(q).catch(AppError.handleAppErr)
	}

	async getRoom(id: number): Promise<Room> {
		const room = await this.rooms.findById(id).catch(AppError.handleAppErr)
		if (!room) {
			throw AppError.handleAppErr(AppError.notFound('Room not found'))
		}
		return room
	}

	async getRoomProfile(id: number): Promise<RoomProfile> {
		const profile = await this.rooms
			.findProfile(id)
			.catch(AppError.handleAppErr)
		if (!profile) {
			throw AppError.handleAppErr(AppError.notFound('Room not found'))
		}
		return profile
	}

	// ── Room assets ────────────────────────────────────────────

	async createRoomAsset(
		params: CreateRoomAssetRequest
	): Promise<RoomAssetDB> {
		if (
			!params.roomId ||
			!params.name?.trim() ||
			!params.category?.trim() ||
			!params.code?.trim()
		) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'roomId, code, name and category are required'
				)
			)
		}
		if (params.quantity !== undefined && params.quantity < 0) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('quantity must be >= 0')
			)
		}
		const grade = params.grade ?? 1
		if (grade < 1 || grade > 5) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('grade must be between 1 and 5')
			)
		}
		if (params.status && !ASSET_STATUSES.has(params.status)) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					`status must be one of: ${[...ASSET_STATUSES].join(', ')}`
				)
			)
		}
		assertAssetYears({
			manufactureYear: params.manufactureYear,
			usageYear: params.usageYear
		})
		const room = await this.rooms.findById(params.roomId)
		if (!room) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid roomId')
			)
		}
		const locationCode = buildLocationCodeFromRoom(room)
		const code = normalizeAssetCode(locationCode, params.code)
		if (!code) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'code is required (vd: A1.101-PC — tòa+tầng+phòng+viết tắt)'
				)
			)
		}
		const created = await this.assets
			.create({ ...params, grade, code })
			.catch(AppError.handleAppErr)
		if (grade === 5) {
			await this.movements
				.ensureRepairSuggestion({
					id: created.id,
					roomId: created.roomId,
					name: created.name,
					category: created.category,
					code: created.code
				})
				.catch(AppError.handleAppErr)
		}
		return created
	}

	async updateRoomAsset(
		params: UpdateRoomAssetRequest
	): Promise<RoomAssetDB> {
		requireId(params.id, 'RoomAsset')
		const existing = await this.assets.findById(params.id)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Room asset not found')
			)
		}
		if (params.status && !ASSET_STATUSES.has(params.status)) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					`status must be one of: ${[...ASSET_STATUSES].join(', ')}`
				)
			)
		}
		if (params.roomId !== undefined) {
			const room = await this.rooms.findById(params.roomId)
			if (!room) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('Invalid roomId')
				)
			}
		}
		if (params.quantity !== undefined && params.quantity < 0) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('quantity must be >= 0')
			)
		}
		if (
			params.grade !== undefined &&
			(params.grade < 1 || params.grade > 5)
		) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('grade must be between 1 and 5')
			)
		}
		assertAssetYears({
			manufactureYear: params.manufactureYear,
			usageYear: params.usageYear
		})
		if (params.code !== undefined && !params.code.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('code must not be empty')
			)
		}
		const { id, ...rest } = params
		requireUpdateFields(rest)
		let nextCode = params.code?.trim()
		if (nextCode) {
			const roomForCode = await this.rooms.findById(
				params.roomId ?? existing.roomId
			)
			if (roomForCode) {
				const locationCode = buildLocationCodeFromRoom(roomForCode)
				nextCode = normalizeAssetCode(locationCode, nextCode)
			}
		}
		const updated = await this.assets
			.update({
				...params,
				code: nextCode
			})
			.catch(AppError.handleAppErr)

		// Đổi tên thiết bị → ghi nhật ký sửa chữa (báo cáo vật tư → nhật ký SC)
		const oldName = (existing.name || '').trim()
		const newName = (updated.name || '').trim()
		if (
			params.name !== undefined &&
			oldName &&
			newName &&
			oldName !== newName
		) {
			const today = new Date().toISOString().slice(0, 10)
			await this.repairs
				.create({
					roomAssetId: updated.id,
					repairDate: today,
					content: `Đổi tên thiết bị: «${oldName}» → «${newName}»`,
					performer: 'Hệ thống (user phòng/ngành)',
					cost: 0,
					note: 'Tự động ghi khi sửa tên trên tài khoản phòng/ngành'
				})
				.catch(AppError.handleAppErr)
		}

		const finalGrade = params.grade ?? existing.grade ?? 1
		if (finalGrade === 5) {
			await this.movements
				.ensureRepairSuggestion({
					id: updated.id,
					roomId: updated.roomId,
					name: updated.name,
					category: updated.category,
					code: updated.code
				})
				.catch(AppError.handleAppErr)
		}
		return updated
	}

	async deleteRoomAssets(ids: number[]): Promise<RoomAssetDB[]> {
		if (!ids?.length) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('ids must not be empty')
			)
		}
		return this.assets.delete(ids).catch(AppError.handleAppErr)
	}

	async listRoomAssets(q?: RoomAssetQuery): Promise<RoomAssetDB[]> {
		return this.assets.find(q).catch(AppError.handleAppErr)
	}

	async getRoomAsset(id: number): Promise<RoomAssetDB> {
		const asset = await this.assets
			.findById(id)
			.catch(AppError.handleAppErr)
		if (!asset) {
			throw AppError.handleAppErr(
				AppError.notFound('Room asset not found')
			)
		}
		return asset
	}

	// ── Room images ────────────────────────────────────────────

	async createRoomImage(
		params: CreateRoomImageRequest
	): Promise<RoomImageDB> {
		if (!params.roomId || !params.imageUrl?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('roomId and imageUrl are required')
			)
		}
		const room = await this.rooms.findById(params.roomId)
		if (!room) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid roomId')
			)
		}
		return this.images.create(params).catch(AppError.handleAppErr)
	}

	async updateRoomImage(
		params: UpdateRoomImageRequest
	): Promise<RoomImageDB> {
		requireId(params.id, 'RoomImage')
		const existing = await this.images.findById(params.id)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Room image not found')
			)
		}
		if (params.roomId !== undefined) {
			const room = await this.rooms.findById(params.roomId)
			if (!room) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('Invalid roomId')
				)
			}
		}
		const { id, ...rest } = params
		requireUpdateFields(rest)
		return this.images.update(params).catch(AppError.handleAppErr)
	}

	async deleteRoomImages(ids: number[]): Promise<RoomImageDB[]> {
		if (!ids?.length) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('ids must not be empty')
			)
		}
		return this.images.delete(ids).catch(AppError.handleAppErr)
	}

	async listRoomImages(q?: RoomImageQuery): Promise<RoomImageDB[]> {
		return this.images.find(q).catch(AppError.handleAppErr)
	}

	async getRoomImage(id: number): Promise<RoomImageDB> {
		const image = await this.images
			.findById(id)
			.catch(AppError.handleAppErr)
		if (!image) {
			throw AppError.handleAppErr(
				AppError.notFound('Room image not found')
			)
		}
		return image
	}

	// ── Repair logs ────────────────────────────────────────────

	private async assertAsset(roomAssetId: number) {
		const asset = await this.assets.findById(roomAssetId)
		if (!asset) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid roomAssetId')
			)
		}
		return asset
	}

	async createRepairLog(
		params: CreateRepairLogRequest
	): Promise<RepairLogDB> {
		if (
			!params.roomAssetId ||
			!params.repairDate?.trim() ||
			!params.content?.trim()
		) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'roomAssetId, repairDate and content are required'
				)
			)
		}
		await this.assertAsset(params.roomAssetId)
		return this.repairs.create(params).catch(AppError.handleAppErr)
	}

	async updateRepairLog(
		params: UpdateRepairLogRequest
	): Promise<RepairLogDB> {
		requireId(params.id, 'RepairLog')
		const existing = await this.repairs.findById(params.id)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Repair log not found')
			)
		}
		if (params.roomAssetId !== undefined) {
			await this.assertAsset(params.roomAssetId)
		}
		const { id, ...rest } = params
		requireUpdateFields(rest)
		return this.repairs.update(params).catch(AppError.handleAppErr)
	}

	async deleteRepairLogs(ids: number[]): Promise<RepairLogDB[]> {
		if (!ids?.length) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('ids must not be empty')
			)
		}
		return this.repairs.delete(ids).catch(AppError.handleAppErr)
	}

	async listRepairLogs(q?: LogQuery): Promise<RepairLogDB[]> {
		return this.repairs.find(q).catch(AppError.handleAppErr)
	}

	async getRepairLog(id: number): Promise<RepairLogDB> {
		const row = await this.repairs.findById(id).catch(AppError.handleAppErr)
		if (!row) {
			throw AppError.handleAppErr(
				AppError.notFound('Repair log not found')
			)
		}
		return row
	}

	// ── Inventory logs ─────────────────────────────────────────

	async createInventoryLog(
		params: CreateInventoryLogRequest
	): Promise<InventoryLogDB> {
		if (!params.roomAssetId || !params.inventoryDate?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'roomAssetId and inventoryDate are required'
				)
			)
		}
		const asset = await this.assertAsset(params.roomAssetId)
		const payload: CreateInventoryLogRequest = {
			...params,
			expectedQuantity:
				params.expectedQuantity !== undefined
					? params.expectedQuantity
					: (asset.quantity ?? 0)
		}
		return this.inventories.create(payload).catch(AppError.handleAppErr)
	}

	async updateInventoryLog(
		params: UpdateInventoryLogRequest
	): Promise<InventoryLogDB> {
		requireId(params.id, 'InventoryLog')
		const existing = await this.inventories.findById(params.id)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Inventory log not found')
			)
		}
		if (params.roomAssetId !== undefined) {
			await this.assertAsset(params.roomAssetId)
		}
		const { id, ...rest } = params
		requireUpdateFields(rest)
		return this.inventories.update(params).catch(AppError.handleAppErr)
	}

	async deleteInventoryLogs(ids: number[]): Promise<InventoryLogDB[]> {
		if (!ids?.length) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('ids must not be empty')
			)
		}
		return this.inventories.delete(ids).catch(AppError.handleAppErr)
	}

	async listInventoryLogs(q?: LogQuery): Promise<InventoryLogDB[]> {
		return this.inventories.find(q).catch(AppError.handleAppErr)
	}

	async getInventoryLog(id: number): Promise<InventoryLogDB> {
		const row = await this.inventories
			.findById(id)
			.catch(AppError.handleAppErr)
		if (!row) {
			throw AppError.handleAppErr(
				AppError.notFound('Inventory log not found')
			)
		}
		return row
	}

	// ── Replacement logs ───────────────────────────────────────

	async createReplacementLog(
		params: CreateReplacementLogRequest
	): Promise<ReplacementLogDB> {
		if (
			!params.roomAssetId ||
			!params.replacementDate?.trim() ||
			!params.oldAsset?.trim() ||
			!params.newAsset?.trim()
		) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'roomAssetId, replacementDate, oldAsset and newAsset are required'
				)
			)
		}
		await this.assertAsset(params.roomAssetId)
		return this.replacements.create(params).catch(AppError.handleAppErr)
	}

	async updateReplacementLog(
		params: UpdateReplacementLogRequest
	): Promise<ReplacementLogDB> {
		requireId(params.id, 'ReplacementLog')
		const existing = await this.replacements.findById(params.id)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Replacement log not found')
			)
		}
		if (params.roomAssetId !== undefined) {
			await this.assertAsset(params.roomAssetId)
		}
		const { id, ...rest } = params
		requireUpdateFields(rest)
		return this.replacements.update(params).catch(AppError.handleAppErr)
	}

	async deleteReplacementLogs(ids: number[]): Promise<ReplacementLogDB[]> {
		if (!ids?.length) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('ids must not be empty')
			)
		}
		return this.replacements.delete(ids).catch(AppError.handleAppErr)
	}

	async listReplacementLogs(q?: LogQuery): Promise<ReplacementLogDB[]> {
		return this.replacements.find(q).catch(AppError.handleAppErr)
	}

	async getReplacementLog(id: number): Promise<ReplacementLogDB> {
		const row = await this.replacements
			.findById(id)
			.catch(AppError.handleAppErr)
		if (!row) {
			throw AppError.handleAppErr(
				AppError.notFound('Replacement log not found')
			)
		}
		return row
	}

	// ── Reports (Sprint 4) ─────────────────────────────────────

	async getAssetStats(
		filter: AssetReportFilter = {}
	): Promise<AssetStatsReport> {
		log.trace('AssetController.getAssetStats', { filter })
		return this.reports.getStats(filter).catch(AppError.handleAppErr)
	}

	async getBrokenAssets(
		filter: BrokenAssetsFilter = {}
	): Promise<BrokenAssetRow[]> {
		log.trace('AssetController.getBrokenAssets', { filter })
		return this.reports.getBrokenAssets(filter).catch(AppError.handleAppErr)
	}

	async getExpiringAssets(
		filter: ExpiringAssetsFilter = {}
	): Promise<ExpiringAssetRow[]> {
		log.trace('AssetController.getExpiringAssets', { filter })
		const withinDays = filter.withinDays ?? 30
		if (withinDays < 1 || withinDays > 3650) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'withinDays must be between 1 and 3650'
				)
			)
		}
		return this.reports
			.getExpiringAssets({ ...filter, withinDays })
			.catch(AppError.handleAppErr)
	}

	async getRepairHistory(
		filter: RepairHistoryFilter = {}
	): Promise<RepairHistoryRow[]> {
		log.trace('AssetController.getRepairHistory', { filter })
		if (
			filter.fromDate &&
			filter.toDate &&
			filter.fromDate > filter.toDate
		) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('fromDate must be <= toDate')
			)
		}
		return this.reports
			.getRepairHistory(filter)
			.catch(AppError.handleAppErr)
	}

	// ── Kho hệ thống (thu hồi / trả trên) ───────────────────────

	/**
	 * Phòng kho cố định KHO-VT — tạo tự động nếu chưa có.
	 * VT thu hồi / trả trên được chuyển về đây (bỏ gán đơn vị giữ).
	 */
	async ensureSystemWarehouse(): Promise<RoomDB> {
		const WAREHOUSE_CODE = 'KHO-VT'
		const allRooms = await this.rooms.find({}).catch(AppError.handleAppErr)
		const existing = allRooms.find(
			(r) =>
				(r.roomCode || '').toUpperCase() === WAREHOUSE_CODE ||
				(r.roomType || '').toUpperCase() === 'WAREHOUSE'
		)
		if (existing) return stripRoomPassword(existing)

		const buildings = await this.buildings
			.find({})
			.catch(AppError.handleAppErr)
		let building = buildings.find(
			(b) => (b.code || '').toUpperCase() === 'KHO'
		)
		if (!building) {
			building = await this.createBuilding({
				code: 'KHO',
				name: 'Kho vật tư'
			})
		}

		const floorsOfB = await this.floors
			.find({ buildingId: building.id })
			.catch(AppError.handleAppErr)
		let floor = floorsOfB[0]
		if (!floor) {
			floor = await this.createFloor({
				buildingId: building.id,
				name: 'Tầng kho',
				floorNumber: 1,
				code: 'KHO1'
			})
		}

		const created = await this.createRoom({
			floorId: floor.id,
			roomCode: WAREHOUSE_CODE,
			roomName: 'Kho vật tư (thu hồi / trả trên)',
			roomType: 'WAREHOUSE',
			capacity: 0,
			status: 'ACTIVE',
			description:
				'Kho hệ thống — vật tư thu hồi, trả trên. Không gán đơn vị sử dụng.'
		})
		log.info('Created system warehouse room', {
			id: created.id,
			code: created.roomCode
		})
		return created
	}

	// ── Asset movements (tăng/giảm / điều chỉnh) ───────────────

	async createAssetMovement(
		params: CreateAssetMovementRequest
	): Promise<AssetMovementLogDB> {
		if (!params.roomAssetId || !params.executedAt?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'roomAssetId and executedAt are required'
				)
			)
		}
		if (!MOVEMENT_TYPES.has(params.movementType)) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'movementType must be INCREASE, DECREASE or ADJUST'
				)
			)
		}
		if (params.quantity === undefined || params.quantity < 0) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'Số lượng không được âm (quantity ≥ 0)'
				)
			)
		}
		assertAssetYears({
			manufactureYear: params.manufactureYear,
			usageYear: params.usageYear
		})

		/**
		 * Trả trên → chuyển VT về kho hệ thống (không xóa SL).
		 * Ghi nhật ký RECALL + reasonOther «Trả trên».
		 */
		if (
			params.movementType === 'DECREASE' &&
			(params.reasonCode || '').toUpperCase() === 'RETURN_SUPERIOR'
		) {
			const wh = await this.ensureSystemWarehouse()
			const qty = Math.max(1, Math.floor(Number(params.quantity) || 1))
			return this.createTransferRecall({
				roomAssetId: params.roomAssetId,
				targetRoomId: wh.id,
				movementType: 'RECALL',
				quantity: qty,
				executedAt: params.executedAt,
				holdingUnitId: null,
				executingUnit: params.executingUnit,
				installAddress: params.installAddress,
				decisionDate: params.decisionDate,
				decisionNumber: params.decisionNumber,
				signer: params.signer,
				performer: params.performer,
				reasonOther: params.reasonOther?.trim() || 'Trả trên',
				note: [params.note?.trim(), 'Trả trên → Kho vật tư (KHO-VT)']
					.filter(Boolean)
					.join(' | ')
			})
		}

		const asset = await this.assertAsset(params.roomAssetId)
		const before = asset.quantity ?? 0
		const currentGrade = asset.grade ?? 1
		const grade = params.grade ?? currentGrade
		if (grade < 1 || grade > 5) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('grade must be between 1 and 5')
			)
		}
		// Snapshot vị trí ngay — giữ nhật ký sau khi xóa VT (SL→0)
		const locSnap = await this.resolveLocationSnapshot(asset.roomId)

		const isIncDec =
			params.movementType === 'INCREASE' ||
			params.movementType === 'DECREASE'
		const isGradeUp = params.reasonCode === 'GRADE_UP'
		const isLiquidation =
			params.reasonCode === 'LIQUIDATION' &&
			params.movementType === 'DECREASE'

		if (isIncDec) {
			if (!params.reasonCode?.trim()) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('reasonCode is required')
				)
			}
			// Hư hỏng không còn qua cập nhật giảm — dùng phiếu Báo hỏng
			if (
				params.movementType === 'DECREASE' &&
				params.reasonCode === 'DAMAGED'
			) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						'Hư hỏng không dùng «Giảm» tại cập nhật. Vui lòng dùng «Báo hỏng» (đưa sang vật tư hư hỏng). Giảm vật tư dùng «Thanh lý» / Hao hụt / Trả trên…'
					)
				)
			}
			const set =
				params.movementType === 'INCREASE'
					? INCREASE_REASONS
					: DECREASE_REASONS
			if (!set.has(params.reasonCode)) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						`Invalid reasonCode for ${params.movementType}`
					)
				)
			}
			if (params.reasonCode === 'OTHER' && !params.reasonOther?.trim()) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						'reasonOther is required when reason is OTHER'
					)
				)
			}
			if (isGradeUp) {
				assertGradeUpAllowed(asset, grade)
			}
		} else if (!params.explanation?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('explanation is required for ADJUST')
			)
		}

		const assetName = params.assetName?.trim() || asset.name
		const installAddress =
			params.installAddress ?? asset.installAddress ?? undefined

		/**
		 * Tăng phân cấp — KHÔNG bao giờ cộng SL tồn (chỉ chuyển / đổi cấp).
		 *
		 * - Cấp 5 (hỏng) → cấp 1–4: chuyển N từ kho hỏng sang kho ổn định
		 *   (hỏng −N, ổn định +N, tổng không đổi).
		 * - Đã ở cấp 1–4: chỉ đổi số cấp trên đúng dòng, SL giữ nguyên.
		 */
		if (isGradeUp) {
			/** Ghi chú xuất báo cáo: lý do hư + trạng thái đã sửa xong */
			const gradeUpNote = buildGradeUpNote({
				damageReason:
					extractDamageReason(asset.description) ||
					extractDamageReason(params.note) ||
					params.reasonOther,
				userNote: params.note,
				completed: true
			})

			// --- Từ kho hư hỏng (cấp 5 / BROKEN) → ổn định ---
			if (
				(currentGrade >= 5 ||
					String(asset.status || '').toUpperCase() === 'BROKEN' ||
					String(asset.status || '').toUpperCase() === 'REPAIRING') &&
				grade >= 1 &&
				grade <= 4
			) {
				const transfer = params.quantity > 0 ? params.quantity : 1
				if (transfer > before) {
					throw AppError.handleAppErr(
						AppError.invalidArgument(
							`Không đủ SL kho hư hỏng (có ${before}, chuyển ${transfer})`
						)
					)
				}
				const afterSource = before - transfer

				const peer = await this.addToWarehousePeer({
					source: asset,
					targetGrade: grade,
					addQuantity: transfer,
					assetName,
					installAddress
				})

				if (afterSource > 0) {
					await this.assets
						.update({
							id: asset.id,
							quantity: afterSource,
							grade: 5,
							status: asset.status ?? 'BROKEN'
						})
						.catch(AppError.handleAppErr)
				} else if (peer.id !== asset.id) {
					// Chuyển hết SL → xóa dòng nguồn (không để quantity = 0)
					await this.assets
						.delete([asset.id])
						.catch(AppError.handleAppErr)
				}

				const peerAfter = peer.quantity ?? 0

				return this.movements
					.create({
						roomAssetId: peer.id,
						// Ghi nhận là điều chuyển cấp, không phải nhập tăng tồn
						movementType: 'ADJUST',
						executedAt: params.executedAt,
						executingUnit: params.executingUnit,
						installAddress,
						assetCode: peer.code ?? asset.code,
						assetName,
						quantity: transfer,
						quantityBefore: Math.max(0, peerAfter - transfer),
						quantityAfter: peerAfter,
						grade,
						manufactureYear:
							params.manufactureYear ??
							asset.manufactureYear ??
							undefined,
						usageYear:
							params.usageYear ?? asset.usageYear ?? undefined,
						reasonCode: 'GRADE_UP',
						reasonOther: params.reasonOther,
						decisionDate: params.decisionDate,
						decisionNumber: params.decisionNumber,
						signer: params.signer,
						performer: params.performer,
						explanation: `Chuyển ${transfer} từ cấp ${currentGrade} → cấp ${grade} (tổng tồn không đổi)`,
						note: gradeUpNote,
						...locSnap
					})
					.catch(AppError.handleAppErr)
			}

			// --- Đã ở kho ổn định: chỉ đổi cấp, tuyệt đối không +SL ---
			if (grade < 1 || grade > 4) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						'Tăng phân cấp chỉ cho phép cấp đích 1–4'
					)
				)
			}
			if (grade === currentGrade) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						`Vật tư đã ở phân cấp ${currentGrade} — không cần tăng cấp (và không tăng số lượng)`
					)
				)
			}

			await this.assets
				.update({
					id: asset.id,
					// SL giữ nguyên
					quantity: before,
					grade,
					name: params.assetName?.trim() ? assetName : undefined,
					installAddress,
					status: 'NORMAL',
					repairCompletedAt:
						asset.repairCompletedAt ?? params.executedAt
				})
				.catch(AppError.handleAppErr)

			return this.movements
				.create({
					roomAssetId: asset.id,
					movementType: 'ADJUST',
					executedAt: params.executedAt,
					executingUnit: params.executingUnit,
					installAddress,
					assetCode: asset.code,
					assetName,
					// Không ghi nhận tăng tồn
					quantity: 0,
					quantityBefore: before,
					quantityAfter: before,
					grade,
					manufactureYear:
						params.manufactureYear ??
						asset.manufactureYear ??
						undefined,
					usageYear: params.usageYear ?? asset.usageYear ?? undefined,
					reasonCode: 'GRADE_UP',
					reasonOther: params.reasonOther,
					decisionDate: params.decisionDate,
					decisionNumber: params.decisionNumber,
					signer: params.signer,
					performer: params.performer,
					explanation: `Đổi phân cấp ${currentGrade} → ${grade}, SL không đổi (${before})`,
					note: gradeUpNote,
					...locSnap
				})
				.catch(AppError.handleAppErr)
		}

		// Hư hỏng → dùng phiếu «Báo hỏng» (BROKEN + mã -HONG-), không giảm DAMAGED tại đây.
		// Cập nhật kho thông thường (tăng/giảm/điều chỉnh trên đúng bản ghi)
		let after = before
		if (params.movementType === 'INCREASE') {
			after = before + params.quantity
		} else if (params.movementType === 'DECREASE') {
			if (before <= 0) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						'Số lượng đang là 0 — không thể giảm tiếp thiết bị này'
					)
				)
			}
			if (params.quantity <= 0) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('Số lượng giảm phải ≥ 1')
				)
			}
			if (params.quantity > before) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						`Không đủ số lượng để giảm. Hiện có ${before}, không giảm ${params.quantity}`
					)
				)
			}
			after = before - params.quantity
			if (after < 0) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('Số lượng sau giảm không được âm')
				)
			}
		} else {
			// ADJUST: SL mới ≥ 0
			if (params.quantity < 0) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('Số lượng mới không được âm')
				)
			}
			after = params.quantity
		}

		const poolNote = isLiquidation
			? after === 0
				? `Thanh lý hết (−${params.quantity}) → xóa dòng`
				: `Thanh lý −${params.quantity} (còn ${after})`
			: currentGrade <= 4
				? params.movementType === 'INCREASE'
					? `Kho ổn định +${params.quantity}`
					: params.movementType === 'DECREASE'
						? after === 0
							? `Kho ổn định −${params.quantity} → xóa dòng (SL=0)`
							: `Kho ổn định −${params.quantity}`
						: after === 0
							? `Kho ổn định SL ${before} → 0 → xóa dòng`
							: `Kho ổn định SL ${before} → ${after}`
				: params.movementType === 'INCREASE'
					? `Kho hư hỏng +${params.quantity}`
					: params.movementType === 'DECREASE'
						? after === 0
							? `Kho hư hỏng −${params.quantity} → xóa dòng (SL=0)`
							: `Kho hư hỏng −${params.quantity}`
						: after === 0
							? `Kho hư hỏng SL ${before} → 0 → xóa dòng`
							: `Kho hư hỏng SL ${before} → ${after}`

		// Ghi nhật ký trước khi xóa VT. FK ON DELETE SET NULL + snapshot vị trí
		// → log vẫn còn trong nhật ký cập nhật sau khi SL→0.
		const logRow = await this.movements
			.create({
				roomAssetId: asset.id,
				movementType: params.movementType,
				executedAt: params.executedAt,
				executingUnit: params.executingUnit,
				installAddress,
				assetCode: asset.code,
				assetName,
				quantity: params.quantity,
				quantityBefore: before,
				quantityAfter: after,
				grade,
				manufactureYear:
					params.manufactureYear ??
					asset.manufactureYear ??
					undefined,
				usageYear: params.usageYear ?? asset.usageYear ?? undefined,
				reasonCode: isIncDec ? params.reasonCode : 'ADJUST',
				reasonOther: params.reasonOther,
				decisionDate: isIncDec ? params.decisionDate : undefined,
				decisionNumber: isIncDec ? params.decisionNumber : undefined,
				signer: isIncDec ? params.signer : undefined,
				performer: isIncDec ? params.performer : undefined,
				explanation: !isIncDec ? params.explanation : undefined,
				note: [params.note, poolNote].filter(Boolean).join(' | '),
				...locSnap
			})
			.catch(AppError.handleAppErr)

		// SL về 0 (giảm / điều chỉnh / thanh lý hết) → xóa dòng vật tư
		// (room_asset_id trên log → NULL, snapshot vị trí vẫn giữ)
		if (after === 0) {
			await this.assets.delete([asset.id]).catch(AppError.handleAppErr)
			return logRow
		}

		const updated = await this.assets
			.update({
				id: asset.id,
				quantity: after,
				grade,
				name: params.assetName?.trim() ? assetName : undefined,
				manufactureYear:
					params.manufactureYear !== undefined
						? params.manufactureYear
						: undefined,
				usageYear:
					params.usageYear !== undefined
						? params.usageYear
						: undefined,
				installAddress,
				// Form cập nhật: chọn ĐVQL → tự ghi lên VT
				holdingUnitId:
					params.holdingUnitId !== undefined
						? params.holdingUnitId
						: undefined
			})
			.catch(AppError.handleAppErr)

		if (grade === 5) {
			await this.movements
				.ensureRepairSuggestion({
					id: updated.id,
					roomId: updated.roomId,
					name: updated.name,
					category: updated.category,
					code: updated.code
				})
				.catch(AppError.handleAppErr)
		}

		return logRow
	}

	/**
	 * Cộng SL vào kho peer (cùng phòng + tên + loại + cấp), hoặc tạo mới.
	 * targetGrade 1–4 = kho ổn định; 5 = kho hư hỏng.
	 * Ví dụ tăng cấp: hư hỏng −N, ổn định +N.
	 */
	private async addToWarehousePeer(opts: {
		source: RoomAssetDB
		targetGrade: number
		addQuantity: number
		assetName: string
		installAddress?: string
		asBroken?: boolean
		/** Lý do hỏng — lưu vào description để báo cáo */
		damageReason?: string
	}): Promise<RoomAssetDB> {
		const {
			source,
			targetGrade,
			addQuantity,
			assetName,
			installAddress,
			asBroken,
			damageReason
		} = opts
		const inRoom = await this.assets
			.find({ roomId: source.roomId })
			.catch(AppError.handleAppErr)

		/** Mã gốc (bỏ -HONG-/-OK-/-G*) — trả về mã này khi sửa xong */
		const stripTempCode = (code: string | null | undefined, id: number) => {
			let c = (code || `VT${id}`).trim()
			// Chỉ bỏ -HONG-/-OK- tạm; giữ mã gốc đầy đủ
			for (let i = 0; i < 5; i++) {
				const n = c
					.replace(/-HONG-[A-Z0-9]+$/i, '')
					.replace(/-OK-[A-Z0-9]+$/i, '')
					.replace(/-HONG$/i, '')
					.replace(/-OK$/i, '')
				if (n === c) break
				c = n
			}
			return c || `VT${id}`
		}
		const base = stripTempCode(source.code, source.id)

		const isBrokenTarget = asBroken || targetGrade >= 5
		const reasonText = damageReason?.trim() || undefined

		// Ưu tiên gộp: cùng grade → hoặc cùng mã gốc (ổn định)
		const peer =
			inRoom.find(
				(p) =>
					p.id !== source.id &&
					p.name === source.name &&
					p.category === source.category &&
					(p.grade ?? 1) === targetGrade
			) ||
			(!isBrokenTarget
				? inRoom.find(
						(p) =>
							p.id !== source.id &&
							stripTempCode(p.code, p.id) === base &&
							(p.grade ?? 1) <= 4 &&
							String(p.status || 'NORMAL').toUpperCase() !==
								'BROKEN'
					)
				: undefined)

		if (peer) {
			// Gộp vào dòng cùng loại; nếu về kho ổn định → giữ/gán mã gốc
			const peerCode = !isBrokenTarget
				? stripTempCode(peer.code, peer.id) || base
				: peer.code
			return this.assets
				.update({
					id: peer.id,
					quantity: (peer.quantity ?? 0) + addQuantity,
					status: isBrokenTarget ? 'BROKEN' : 'NORMAL',
					...(!isBrokenTarget ? { code: peerCode } : {}),
					installAddress:
						installAddress ??
						peer.installAddress ??
						source.installAddress ??
						undefined,
					// Giữ đơn vị giữ nếu peer chưa có
					...(peer.holdingUnitId == null &&
					source.holdingUnitId != null
						? { holdingUnitId: source.holdingUnitId }
						: {}),
					...(isBrokenTarget && reasonText
						? {
								description: reasonText,
								brokenAt:
									peer.brokenAt ||
									new Date().toISOString().slice(0, 10)
							}
						: {})
				})
				.catch(AppError.handleAppErr)
		}

		// Hỏng: mã tạm -HONG- (dễ tìm). Ổn định: mã gốc (tránh trùng nếu mã gốc đang dùng).
		let code: string
		if (isBrokenTarget) {
			code =
				`${base}-HONG-${Date.now().toString(36).slice(-5)}`.toUpperCase()
		} else {
			const taken = inRoom.some(
				(p) =>
					p.id !== source.id &&
					(p.code || '').toUpperCase() === base.toUpperCase()
			)
			code = taken
				? `${base}-R${Date.now().toString(36).slice(-4)}`.toUpperCase()
				: base
		}

		return this.assets
			.create({
				roomId: source.roomId,
				code,
				name: assetName || source.name,
				category: source.category,
				quantity: addQuantity,
				unit: source.unit ?? undefined,
				holdingUnitId: source.holdingUnitId ?? undefined,
				grade: targetGrade,
				status: isBrokenTarget ? 'BROKEN' : 'NORMAL',
				installAddress:
					installAddress ?? source.installAddress ?? undefined,
				manufactureYear: source.manufactureYear ?? undefined,
				usageYear: source.usageYear ?? undefined,
				description: isBrokenTarget
					? reasonText || `Hỏng từ mã gốc ${base}`
					: (source.description ?? undefined),
				brokenAt: isBrokenTarget
					? new Date().toISOString().slice(0, 10)
					: undefined,
				repairCompletedAt:
					targetGrade <= 4
						? (source.repairCompletedAt ?? undefined)
						: undefined
			})
			.catch(AppError.handleAppErr)
	}

	/**
	 * Điều động (TRANSFER) / thu hồi (RECALL): chuyển SL vật tư sang phòng đích.
	 * Gộp vào dòng cùng tên+loại+cấp tại phòng đích nếu có; trừ SL nguồn.
	 */
	async createTransferRecall(
		params: CreateTransferRecallRequest
	): Promise<AssetMovementLogDB> {
		if (!params.roomAssetId) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('roomAssetId is required')
			)
		}
		if (!TRANSFER_RECALL_TYPES.has(params.movementType)) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'movementType must be TRANSFER or RECALL'
				)
			)
		}
		if (!params.executedAt?.trim()) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('executedAt is required')
			)
		}
		if (!params.quantity || params.quantity < 1) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('quantity must be ≥ 1')
			)
		}

		// Thu hồi / trả trên: LUÔN về kho hệ thống KHO-VT (không cho chọn phòng khác)
		let targetRoomId = params.targetRoomId
		let forcedHolding: number | null | undefined = params.holdingUnitId
		if (params.movementType === 'RECALL') {
			const wh = await this.ensureSystemWarehouse()
			targetRoomId = wh.id
			forcedHolding = null
			// Ghi chú đích kho (nếu caller chưa ghi)
			if (!params.installAddress?.trim()) {
				params = {
					...params,
					installAddress: `${wh.roomCode} — ${wh.roomName}`
				}
			}
			const noteExtra = '→ Kho vật tư (KHO-VT)'
			if (!params.note?.includes('KHO-VT')) {
				params = {
					...params,
					note: [params.note?.trim(), noteExtra]
						.filter(Boolean)
						.join(' | ')
				}
			}
		}
		if (!targetRoomId) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'targetRoomId is required (điều động phải chọn phòng đích)'
				)
			)
		}

		const asset = await this.assertAsset(params.roomAssetId)
		const before = asset.quantity ?? 0
		if (before <= 0) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'Số lượng nguồn đang là 0 — không thể điều động/thu hồi'
				)
			)
		}
		if (params.quantity > before) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					`Không đủ số lượng (có ${before}, cần ${params.quantity})`
				)
			)
		}
		const targetRoom = await this.rooms
			.findById(targetRoomId)
			.catch(AppError.handleAppErr)
		if (!targetRoom) {
			throw AppError.handleAppErr(
				AppError.notFound('Target room not found')
			)
		}
		// Ghi đè params để phần dưới dùng target/holding đã chuẩn hóa
		params = {
			...params,
			targetRoomId,
			holdingUnitId: forcedHolding
		}

		const sourceRoom = await this.rooms
			.findById(asset.roomId)
			.catch(AppError.handleAppErr)

		const locLabel = async (roomId: number, room?: RoomDB | null) => {
			const r =
				room ??
				(await this.rooms.findById(roomId).catch(AppError.handleAppErr))
			if (!r) return `phòng #${roomId}`
			const floor = await this.floors
				.findById(r.floorId)
				.catch(AppError.handleAppErr)
			const building = floor
				? await this.buildings
						.findById(floor.buildingId)
						.catch(AppError.handleAppErr)
				: null
			const b = building ? `${building.code}` : '?'
			return `${b} / ${r.roomCode} (${r.roomName})`
		}

		const fromLabel = await locLabel(asset.roomId, sourceRoom)
		const toLabel = await locLabel(params.targetRoomId, targetRoom)
		const grade = asset.grade ?? 1
		const installAddress =
			params.installAddress?.trim() || asset.installAddress || undefined
		const actionLabel =
			params.movementType === 'TRANSFER' ? 'Điều động' : 'Thu hồi'

		// Cùng phòng: chỉ gán lại đơn vị giữ (không tách SL)
		if (params.targetRoomId === asset.roomId) {
			const nextHolding =
				params.holdingUnitId !== undefined
					? params.holdingUnitId
					: (asset.holdingUnitId ?? null)
			if ((asset.holdingUnitId ?? null) === (nextHolding ?? null)) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						'Phòng đích trùng phòng nguồn và đơn vị giữ không đổi — chọn phòng khác'
					)
				)
			}
			const updated = await this.assets
				.update({
					id: asset.id,
					holdingUnitId: nextHolding,
					installAddress
				})
				.catch(AppError.handleAppErr)
			const sameRoomSnap = await this.resolveLocationSnapshot(
				params.targetRoomId
			)
			return this.movements
				.create({
					roomAssetId: updated.id,
					movementType: params.movementType,
					executedAt: params.executedAt,
					executingUnit: params.executingUnit,
					installAddress,
					assetCode: updated.code ?? asset.code,
					assetName: updated.name || asset.name,
					quantity: params.quantity,
					quantityBefore: before,
					quantityAfter: before,
					grade,
					manufactureYear: asset.manufactureYear ?? undefined,
					usageYear: asset.usageYear ?? undefined,
					reasonCode: params.movementType,
					reasonOther: params.reasonOther,
					decisionDate: params.decisionDate,
					decisionNumber: params.decisionNumber,
					signer: params.signer,
					performer: params.performer,
					explanation: `${actionLabel} (cùng phòng ${fromLabel}): đổi đơn vị giữ, SL ${params.quantity}`,
					note: params.note,
					...sameRoomSnap
				})
				.catch(AppError.handleAppErr)
		}

		const afterSource = before - params.quantity
		const holdingUnitId =
			params.holdingUnitId !== undefined
				? params.holdingUnitId
				: (asset.holdingUnitId ?? null)

		/**
		 * Điều động đi: luôn trừ SL nguồn.
		 * - Còn SL: giữ dòng nguồn với SL mới.
		 * - Hết SL (=0): xóa dòng nguồn (trừ khi chuyển nguyên dòng sang phòng đích
		 *   vì không có peer — giữ id + mã VT).
		 * Đích: gộp peer cùng tên+loại+cấp, hoặc tạo dòng / chuyển nguyên dòng.
		 */
		let dest: RoomAssetDB
		let destBefore: number
		let destAfter: number

		const inTarget = await this.assets
			.find({ roomId: params.targetRoomId })
			.catch(AppError.handleAppErr)
		const peer = inTarget.find(
			(p) =>
				p.id !== asset.id &&
				p.name === asset.name &&
				p.category === asset.category &&
				(p.grade ?? 1) === grade
		)

		if (afterSource === 0 && !peer) {
			// Chuyển hết, không peer → đổi phòng (giữ id + mã VT), không để lại SL=0
			destBefore = 0
			dest = await this.assets
				.update({
					id: asset.id,
					roomId: params.targetRoomId,
					quantity: params.quantity,
					installAddress,
					holdingUnitId: holdingUnitId ?? null
				})
				.catch(AppError.handleAppErr)
			destAfter = params.quantity
		} else {
			// Trừ SL nguồn trước
			await this.assets
				.update({
					id: asset.id,
					quantity: afterSource
				})
				.catch(AppError.handleAppErr)

			if (peer) {
				destBefore = peer.quantity ?? 0
				dest = await this.assets
					.update({
						id: peer.id,
						quantity: destBefore + params.quantity,
						installAddress:
							installAddress ?? peer.installAddress ?? undefined,
						holdingUnitId: holdingUnitId ?? null
					})
					.catch(AppError.handleAppErr)
				destAfter = dest.quantity ?? destBefore + params.quantity
			} else {
				dest = await this.addToRoomPeer({
					source: asset,
					targetRoomId: params.targetRoomId,
					addQuantity: params.quantity,
					assetName: asset.name,
					installAddress,
					holdingUnitId
				})
				destBefore =
					(dest.quantity ?? params.quantity) - params.quantity
				destAfter = dest.quantity ?? params.quantity
			}

			// Hết SL nguồn → xóa dòng (không giữ bản ghi quantity = 0)
			if (afterSource === 0) {
				await this.assets
					.delete([asset.id])
					.catch(AppError.handleAppErr)
			}
		}

		const explanation = `${actionLabel}: ${fromLabel} → ${toLabel} (SL ${params.quantity})`
		const destSnap = await this.resolveLocationSnapshot(params.targetRoomId)

		return this.movements
			.create({
				roomAssetId: dest.id,
				movementType: params.movementType,
				executedAt: params.executedAt,
				executingUnit: params.executingUnit,
				installAddress,
				assetCode: dest.code ?? asset.code,
				assetName: dest.name || asset.name,
				quantity: params.quantity,
				quantityBefore: Math.max(0, destBefore),
				quantityAfter: destAfter,
				grade,
				manufactureYear: asset.manufactureYear ?? undefined,
				usageYear: asset.usageYear ?? undefined,
				reasonCode: params.movementType,
				reasonOther: params.reasonOther,
				decisionDate: params.decisionDate,
				decisionNumber: params.decisionNumber,
				signer: params.signer,
				performer: params.performer,
				explanation,
				note: [
					params.note,
					afterSource === 0
						? `Nguồn: ${fromLabel} (hết SL → đã xóa dòng)`
						: `Nguồn: ${fromLabel} (còn ${afterSource})`
				]
					.filter(Boolean)
					.join(' | '),
				...destSnap
			})
			.catch(AppError.handleAppErr)
	}

	/**
	 * Cộng SL vào peer tại phòng đích (cùng tên + loại + cấp), hoặc tạo dòng mới.
	 */
	private async addToRoomPeer(opts: {
		source: RoomAssetDB
		targetRoomId: number
		addQuantity: number
		assetName: string
		installAddress?: string
		holdingUnitId?: number | null
	}): Promise<RoomAssetDB> {
		const {
			source,
			targetRoomId,
			addQuantity,
			assetName,
			installAddress,
			holdingUnitId
		} = opts
		const targetGrade = source.grade ?? 1
		const inRoom = await this.assets
			.find({ roomId: targetRoomId })
			.catch(AppError.handleAppErr)

		const stripTempCode = (code: string | null | undefined, id: number) => {
			let c = (code || `VT${id}`).trim()
			for (let i = 0; i < 5; i++) {
				const n = c
					.replace(/-HONG-[A-Z0-9]+$/i, '')
					.replace(/-OK-[A-Z0-9]+$/i, '')
					.replace(/-HONG$/i, '')
					.replace(/-OK$/i, '')
				if (n === c) break
				c = n
			}
			return c || `VT${id}`
		}
		const base = stripTempCode(source.code, source.id)
		const status = String(source.status || 'NORMAL').toUpperCase()
		const isBroken =
			targetGrade >= 5 || status === 'BROKEN' || status === 'REPAIRING'

		const peer =
			// Cùng phòng nguồn & cùng id khi target = source room → gộp không áp dụng id
			inRoom.find(
				(p) =>
					p.id !== source.id &&
					p.name === source.name &&
					p.category === source.category &&
					(p.grade ?? 1) === targetGrade
			) ||
			(!isBroken
				? inRoom.find(
						(p) =>
							p.id !== source.id &&
							stripTempCode(p.code, p.id) === base &&
							(p.grade ?? 1) <= 4 &&
							String(p.status || 'NORMAL').toUpperCase() !==
								'BROKEN'
					)
				: undefined)

		const holdingUpdate =
			holdingUnitId !== undefined
				? { holdingUnitId: holdingUnitId ?? null }
				: {}

		if (peer) {
			return this.assets
				.update({
					id: peer.id,
					quantity: (peer.quantity ?? 0) + addQuantity,
					installAddress:
						installAddress ??
						peer.installAddress ??
						source.installAddress ??
						undefined,
					...holdingUpdate
				})
				.catch(AppError.handleAppErr)
		}

		// Tạo dòng mới tại phòng đích — mã unique toàn cục
		// KHÔNG exclude source: nguồn vẫn giữ mã (điều động một phần)
		const code = await this.uniqueRoomAssetCode(
			isBroken ? `${base}-HONG` : base
		)

		return this.assets
			.create({
				roomId: targetRoomId,
				code,
				name: assetName || source.name,
				category: source.category,
				quantity: addQuantity,
				unit: source.unit ?? undefined,
				holdingUnitId:
					holdingUnitId !== undefined
						? (holdingUnitId ?? undefined)
						: (source.holdingUnitId ?? undefined),
				grade: targetGrade,
				status: isBroken ? 'BROKEN' : 'NORMAL',
				installAddress:
					installAddress ?? source.installAddress ?? undefined,
				manufactureYear: source.manufactureYear ?? undefined,
				usageYear: source.usageYear ?? undefined,
				description: source.description ?? undefined
			})
			.catch(AppError.handleAppErr)
	}

	/** Snapshot tòa/tầng/phòng để nhật ký còn đúng vị trí sau khi xóa VT */
	private async resolveLocationSnapshot(
		roomId: number
	): Promise<MovementLocationSnapshot> {
		const r = await this.rooms.findById(roomId).catch(AppError.handleAppErr)
		if (!r) return {}
		const floor = await this.floors
			.findById(r.floorId)
			.catch(AppError.handleAppErr)
		const building = floor
			? await this.buildings
					.findById(floor.buildingId)
					.catch(AppError.handleAppErr)
			: null
		return {
			buildingCode: building?.code ?? null,
			buildingName: building?.name ?? null,
			roomCode: r.roomCode ?? null,
			roomName: r.roomName ?? null,
			floorName: floor?.name ?? null
		}
	}

	/**
	 * Sinh mã VT chưa trùng.
	 * Không tái dùng mã của bản ghi đang tồn tại (kể cả excludeId) —
	 * tránh lỗi UNIQUE khi điều động một phần (nguồn vẫn giữ mã gốc).
	 */
	private async uniqueRoomAssetCode(base: string): Promise<string> {
		const root = (base || 'VT').trim().toUpperCase() || 'VT'
		const candidates = [
			root,
			`${root}-R${Date.now().toString(36).slice(-5)}`.toUpperCase(),
			`${root}-${Date.now().toString(36).toUpperCase()}`,
			`${root}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
			`${root}-${Date.now()}-${Math.floor(Math.random() * 9999)}`
		]
		for (const c of candidates) {
			const found = await this.assets
				.find({ code: c })
				.catch(AppError.handleAppErr)
			if (!found.length) return c
		}
		// Đảm bảo không trùng
		return `${root}-X${Date.now()}${Math.floor(Math.random() * 99999)}`
	}

	async listAssetMovements(
		q?: AssetMovementQuery
	): Promise<AssetMovementLogDB[]> {
		return this.movements.find(q).catch(AppError.handleAppErr)
	}

	async getAssetMovement(id: number): Promise<AssetMovementLogDB> {
		const row = await this.movements
			.findById(id)
			.catch(AppError.handleAppErr)
		if (!row) {
			throw AppError.handleAppErr(
				AppError.notFound('Asset movement log not found')
			)
		}
		return row
	}

	async listAssetMovementReport(
		q?: AssetMovementQuery
	): Promise<AssetMovementReportRow[]> {
		return this.movements.findReport(q).catch(AppError.handleAppErr)
	}
}

const assetController = new AssetController(
	buildingRepo,
	floorRepo,
	roomRepo,
	roomAssetRepo,
	roomImageRepo,
	repairLogRepo,
	inventoryLogRepo,
	replacementLogRepo,
	reportRepo,
	assetMovementLogRepo
)

export default assetController
