/**
 * Asset management API wrappers.
 * Uses appFetcher until Encore client is regenerated (`pnpm gen` in apps/api).
 */
import { appFetcher } from '@/lib/axios'
import { ApiUrl } from '@/lib/const'
import type {
	AssetReportFilter,
	AssetStatsReport,
	BrokenAssetRow,
	BrokenAssetsFilter,
	Building,
	BuildingTree,
	CreateBuildingBody,
	CreateFloorBody,
	CreateInventoryLogBody,
	CreateRepairLogBody,
	CreateReplacementLogBody,
	CreateRoomAssetBody,
	CreateAssetMovementBody,
	CreateTransferRecallBody,
	CreateRoomBody,
	CreateRoomImageBody,
	AssetMovementFilter,
	AssetMovementLog,
	AssetMovementReportRow,
	ExpiringAssetRow,
	ExpiringAssetsFilter,
	Floor,
	InventoryLog,
	RepairHistoryFilter,
	RepairHistoryRow,
	RepairLog,
	ReplacementLog,
	Room,
	RoomAsset,
	RoomImage,
	RoomProfile,
	UpdateBuildingBody,
	UpdateFloorBody,
	UpdateRoomAssetBody,
	UpdateRoomBody
} from '@/types/asset'

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const url = `${ApiUrl.replace(/\/$/, '')}${path}`
	const resp = await appFetcher(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(init?.headers ?? {})
		}
	})
	if (!resp.ok) {
		let message = `HTTP ${resp.status}`
		try {
			const body = await resp.json()
			message =
				body?.message ||
				body?.error ||
				body?.internal_message ||
				message
			// Encore / SQLite unique → thông báo rõ
			if (
				/duplicate name/i.test(String(message)) ||
				body?.code === 'already_exists'
			) {
				message =
					'Trùng mã vật tư khi chuyển phòng. Thử lại (hệ thống đã sửa sinh mã unique / chuyển nguyên dòng).'
			}
		} catch {
			/* ignore */
		}
		throw new Error(message)
	}
	if (resp.status === 204) return undefined as T
	return resp.json() as Promise<T>
}

// ── Buildings ──────────────────────────────────────────────────

export async function GetBuildings(): Promise<Building[]> {
	const resp = await jsonFetch<{ data: Building[] }>('/buildings')
	return resp.data
}

export async function GetBuildingTree(): Promise<BuildingTree[]> {
	const resp = await jsonFetch<{ data: BuildingTree[] }>('/buildings/tree')
	return resp.data
}

export async function GetBuilding(id: number): Promise<BuildingTree> {
	const resp = await jsonFetch<{ data: BuildingTree }>(`/buildings/${id}`)
	return resp.data
}

export async function CreateBuilding(
	body: CreateBuildingBody
): Promise<Building> {
	const resp = await jsonFetch<{ data: Building }>('/buildings', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateBuilding(
	id: number,
	body: UpdateBuildingBody
): Promise<Building> {
	const resp = await jsonFetch<{ data: Building }>(`/buildings/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteBuildings(ids: number[]): Promise<void> {
	await jsonFetch('/buildings/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

// ── Floors ─────────────────────────────────────────────────────

export async function GetFloors(buildingId?: number): Promise<Floor[]> {
	const qs = buildingId !== undefined ? `?buildingId=${buildingId}` : ''
	const resp = await jsonFetch<{ data: Floor[] }>(`/floors${qs}`)
	return resp.data
}

export async function GetFloor(id: number): Promise<Floor> {
	const resp = await jsonFetch<{ data: Floor }>(`/floors/${id}`)
	return resp.data
}

export async function CreateFloor(body: CreateFloorBody): Promise<Floor> {
	const resp = await jsonFetch<{ data: Floor }>('/floors', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateFloor(
	id: number,
	body: UpdateFloorBody
): Promise<Floor> {
	const resp = await jsonFetch<{ data: Floor }>(`/floors/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteFloors(ids: number[]): Promise<void> {
	await jsonFetch('/floors/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

// ── Rooms ──────────────────────────────────────────────────────

export async function GetRooms(params?: {
	floorId?: number
	buildingId?: number
	status?: string
}): Promise<Room[]> {
	const sp = new URLSearchParams()
	if (params?.floorId !== undefined) sp.set('floorId', String(params.floorId))
	if (params?.buildingId !== undefined)
		sp.set('buildingId', String(params.buildingId))
	if (params?.status) sp.set('status', params.status)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: Room[] }>(`/rooms${qs}`)
	return resp.data
}

export async function GetRoom(id: number): Promise<Room> {
	const resp = await jsonFetch<{ data: Room }>(`/rooms/${id}`)
	return resp.data
}

/** Kho hệ thống KHO-VT (tự tạo nếu chưa có) */
export async function GetWarehouseRoom(): Promise<Room> {
	const resp = await jsonFetch<{ data: Room }>('/rooms/warehouse')
	return resp.data
}

export async function CreateRoom(body: CreateRoomBody): Promise<Room> {
	const resp = await jsonFetch<{ data: Room }>('/rooms', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateRoom(
	id: number,
	body: UpdateRoomBody
): Promise<Room> {
	const resp = await jsonFetch<{ data: Room }>(`/rooms/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteRooms(ids: number[]): Promise<void> {
	await jsonFetch('/rooms/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

/** Chỉ reset mật khẩu tài khoản phòng về 123456 (không đổi mã TK) */
export async function ResetRoomAccount(
	id: number
): Promise<{ data: Room; defaultPassword: string }> {
	return jsonFetch<{ data: Room; defaultPassword: string }>(
		`/rooms/${id}/reset-account`,
		{ method: 'POST', body: '{}' }
	)
}

export type PendingRoomAccountItem = {
	userId: number
	username: string
	displayName: string
	status: string | null
	roomId: number | null
	roomCode: string | null
	roomName: string | null
}

/** Tài khoản phòng đã add user nhưng chưa phân quyền (+n) */
export async function GetPendingRoomAccountUsers(): Promise<{
	count: number
	items: PendingRoomAccountItem[]
}> {
	const resp = await jsonFetch<{
		data: { count: number; items: PendingRoomAccountItem[] }
	}>('/users/pending-room-accounts')
	return resp.data
}

/** Đồng bộ TK phòng → users + tên denorm đề thi (GV/CNK/phân công) */
export async function SyncAllAccounts(): Promise<{
	roomUsersCreated: number
	teachersUpdated: number
	facultyHeadsUpdated: number
	assignmentsUpdated: number
	pendingRoomAccounts: number
}> {
	const resp = await jsonFetch<{
		data: {
			roomUsersCreated: number
			teachersUpdated: number
			facultyHeadsUpdated: number
			assignmentsUpdated: number
			pendingRoomAccounts: number
		}
	}>('/users/sync-accounts', { method: 'POST', body: '{}' })
	return resp.data
}

export async function GetRoomProfile(id: number): Promise<RoomProfile> {
	const resp = await jsonFetch<{ data: RoomProfile }>(`/rooms/${id}/profile`)
	return resp.data
}

// ── Account audit logs (tài khoản phòng) ───────────────────────

export type AccountAuditLog = {
	id: number
	createdAt: string
	action: string
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	actorIsAdmin: boolean
	roomId: number | null
	roomCode: string | null
	roomName: string | null
	address: string | null
	floorName: string | null
	buildingCode: string | null
	buildingName: string | null
	accountLabel: string | null
	summary: string
	details: string | null
}

export async function GetAccountAuditLogs(params?: {
	q?: string
	limit?: number
}): Promise<AccountAuditLog[]> {
	const sp = new URLSearchParams()
	if (params?.q?.trim()) sp.set('q', params.q.trim())
	if (params?.limit != null) sp.set('limit', String(params.limit))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: AccountAuditLog[] }>(
		`/account-audit-logs${qs}`
	)
	return resp.data
}

// ── Material catalog (ngành / chuyên ngành / danh mục VT) ───────

export type CatalogCategory = {
	id: number
	code: string
	name: string
	description: string | null
	isNganh: boolean
	nganhCode: string | null
	/** Số chuyên ngành (ngành) hoặc số VT danh mục (chuyên ngành) */
	childCount?: number
	/** Tổng SL thực tế từ kho phòng */
	stockQuantity?: number
}

export type CatalogMaterial = {
	id: number
	code: string
	name: string
	unit: string
	categoryId: number
	categoryCode: string
	categoryName: string
	nganhCode: string
	/** Tổng SL đang có trên các phòng */
	stockQuantity?: number
	/** SL danh mục (materials.quantity) — tăng/giảm user ngành */
	catalogQuantity?: number
}

export type AssetCatalog = {
	nganh: CatalogCategory[]
	chuyenNganh: CatalogCategory[]
	materials: CatalogMaterial[]
}

export async function GetAssetCatalog(params?: {
	nganhCode?: string
	chuyenNganhCode?: string
}): Promise<AssetCatalog> {
	const sp = new URLSearchParams()
	if (params?.nganhCode) sp.set('nganhCode', params.nganhCode)
	if (params?.chuyenNganhCode)
		sp.set('chuyenNganhCode', params.chuyenNganhCode)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: AssetCatalog }>(`/asset-catalog${qs}`)
	return resp.data
}

/** Gợi ý mã VT danh mục tiếp theo trong chuyên ngành (HC2A0101…) */
export async function SuggestNextMaterialCode(
	chuyenNganhCode: string
): Promise<{ code: string; chuyenNganhCode: string }> {
	const sp = new URLSearchParams({
		chuyenNganhCode: chuyenNganhCode.trim()
	})
	const resp = await jsonFetch<{
		data: { code: string; chuyenNganhCode: string }
	}>(`/asset-catalog/next-code?${sp}`)
	return resp.data
}

/** Gợi ý mã ngành tiếp theo (HC2A…HC2Z, gồm J) */
export async function SuggestNextNganhCode(): Promise<{ code: string }> {
	const resp = await jsonFetch<{ data: { code: string } }>(
		'/asset-catalog/next-nganh-code'
	)
	return resp.data
}

/** Gợi ý mã chuyên ngành tiếp theo (HC2A01, HC2A02…) */
export async function SuggestNextChuyenNganhCode(
	nganhCode: string
): Promise<{ code: string; nganhCode: string }> {
	const sp = new URLSearchParams({ nganhCode: nganhCode.trim() })
	const resp = await jsonFetch<{
		data: { code: string; nganhCode: string }
	}>(`/asset-catalog/next-chuyen-nganh-code?${sp}`)
	return resp.data
}

/** Thêm ngành — bắt buộc tên; mã hệ thống xin HC2x */
export async function CreateCatalogNganh(body: {
	name: string
	description?: string
}): Promise<CatalogCategory> {
	const resp = await jsonFetch<{ data: CatalogCategory }>(
		'/asset-catalog/nganh',
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

/** Thêm chuyên ngành — bắt buộc tên + ngành; mã HC2x0y tự sinh */
export async function CreateCatalogChuyenNganh(body: {
	nganhCode: string
	name: string
	description?: string
}): Promise<CatalogCategory> {
	const resp = await jsonFetch<{ data: CatalogCategory }>(
		'/asset-catalog/chuyen-nganh',
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

/** Sửa vật tư danh mục */
export async function UpdateCatalogMaterial(
	id: number,
	body: { name?: string; unit?: string; description?: string | null }
): Promise<CatalogMaterial> {
	const resp = await jsonFetch<{ data: CatalogMaterial }>(
		`/asset-catalog/materials/${id}`,
		{ method: 'PATCH', body: JSON.stringify(body) }
	)
	return resp.data
}

/** Xóa vật tư danh mục */
export async function DeleteCatalogMaterials(ids: number[]): Promise<void> {
	await jsonFetch('/asset-catalog/materials/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

/** Xóa ngành / loại vật */
export async function DeleteCatalogCategories(ids: number[]): Promise<void> {
	await jsonFetch('/asset-catalog/categories/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

export type CatalogAuditLog = {
	id: number
	createdAt: string
	action: string
	entityType: string
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	actorIsAdmin: boolean
	entityId: number | null
	entityCode: string | null
	entityName: string | null
	parentCode: string | null
	parentName: string | null
	summary: string
	details: string | null
}

export async function GetCatalogAuditLogs(params?: {
	q?: string
	entityType?: string
	limit?: number
}): Promise<CatalogAuditLog[]> {
	const sp = new URLSearchParams()
	if (params?.q?.trim()) sp.set('q', params.q.trim())
	if (params?.entityType) sp.set('entityType', params.entityType)
	if (params?.limit != null) sp.set('limit', String(params.limit))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: CatalogAuditLog[] }>(
		`/catalog-audit-logs${qs}`
	)
	return resp.data
}

/** Sửa tên ngành / chuyên ngành (không đổi mã) */
export async function UpdateCatalogCategory(
	id: number,
	body: { name?: string; description?: string | null }
): Promise<CatalogCategory> {
	const resp = await jsonFetch<{ data: CatalogCategory }>(
		`/asset-catalog/categories/${id}`,
		{
			method: 'PATCH',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

/** Thêm thiết bị mới vào danh mục (mã tự sinh ngành→CN→seq) */
export async function CreateCatalogMaterial(body: {
	chuyenNganhCode: string
	name: string
	unit?: string
	code?: string
	description?: string
}): Promise<CatalogMaterial> {
	const resp = await jsonFetch<{ data: CatalogMaterial }>(
		'/asset-catalog/materials',
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

// ── User ngành + tăng/giảm danh mục ────────────────────────────

export type MyNganhItem = { code: string; name: string }

export async function GetMyNganh(): Promise<MyNganhItem[]> {
	const resp = await jsonFetch<{ data: MyNganhItem[] }>(
		'/asset-catalog/my-nganh'
	)
	return resp.data
}

export async function GetUserNganh(
	userId: number
): Promise<{ userId: number; nganhCodes: string[] }> {
	const resp = await jsonFetch<{
		data: { userId: number; nganhCodes: string[] }
	}>(`/asset-catalog/user-nganh?userId=${userId}`)
	return resp.data
}

export async function AssignUserNganh(body: {
	userId: number
	nganhCodes: string[]
}): Promise<{ userId: number; nganhCodes: string[] }> {
	const resp = await jsonFetch<{
		data: { userId: number; nganhCodes: string[] }
	}>('/asset-catalog/user-nganh', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export type CatalogStockLog = {
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

export async function ListCatalogStockLogs(params?: {
	nganhCode?: string
	fromDate?: string
	toDate?: string
	limit?: number
}): Promise<CatalogStockLog[]> {
	const sp = new URLSearchParams()
	if (params?.nganhCode) sp.set('nganhCode', params.nganhCode)
	if (params?.fromDate) sp.set('fromDate', params.fromDate)
	if (params?.toDate) sp.set('toDate', params.toDate)
	if (params?.limit != null) sp.set('limit', String(params.limit))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: CatalogStockLog[] }>(
		`/asset-catalog/stock-logs${qs}`
	)
	return resp.data
}

export type CatalogStockMovementResult = {
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
	log: CatalogStockLog
}

/** User ngành tăng/giảm SL danh mục — tên mới tự sinh mã theo cấu trúc */
export async function CreateCatalogStockMovement(body: {
	movementType: 'INCREASE' | 'DECREASE'
	nganhCode: string
	chuyenNganhCode?: string
	chuyenNganhName?: string
	materialCode?: string
	materialName: string
	quantity: number
	unit?: string
	reason?: string
	note?: string
	executedAt?: string
}): Promise<CatalogStockMovementResult> {
	const resp = await jsonFetch<{ data: CatalogStockMovementResult }>(
		'/asset-catalog/stock-movements',
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

// ── Đề xuất (sửa chữa / thu hồi / thanh lý) ─────────────────────

export type AssetProposalType = 'REPAIR' | 'RECALL' | 'LIQUIDATION'
export type AssetProposalStatus =
	| 'PENDING'
	| 'APPROVED'
	| 'REJECTED'
	| 'COMPLETED'

export type AssetProposalItem = {
	id: number
	materialId: number | null
	materialCode: string | null
	materialName: string
	roomAssetId: number | null
	/** Dòng VT gốc trước khi tách hỏng (REPAIR) */
	sourceAssetId?: number | null
	/** Phân cấp trước khi đề xuất SC */
	originalGrade?: number | null
	/** Mã VT trước khi sinh -HONG- */
	originalCode?: string | null
	quantity: number
	unit: string | null
	category: string | null
	nganhCode: string | null
	chuyenNganhCode: string | null
	note: string | null
	fromRoomId?: number | null
	fromRoomCode?: string | null
	fromRoomName?: string | null
	locationNote?: string | null
	targetRoomId?: number | null
	targetRoomCode?: string | null
	targetRoomName?: string | null
}

/** Dòng VT thanh lý (màn Thanh lý + báo cáo theo năm) */
export type LiquidationAssetRow = {
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

export type AssetProposal = {
	id: number
	createdAt: string
	updatedAt: string
	proposalType: AssetProposalType | string
	status: AssetProposalStatus | string
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
	items: AssetProposalItem[]
}

export type AssetProposalLog = {
	id: number
	createdAt: string
	proposalId: number | null
	action: string
	proposalType: string | null
	summary: string
	details: string | null
	/** Đơn vị đề xuất */
	unitName?: string | null
	/** Ngành đề xuất */
	nganhCode?: string | null
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	actorIsAdmin: boolean
}

export async function GetPendingProposalCount(): Promise<number> {
	const resp = await jsonFetch<{ data: { count: number } }>(
		'/asset-proposals/pending-count'
	)
	return resp.data.count
}

export async function CreateAssetProposal(body: {
	proposalType: AssetProposalType
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
}): Promise<AssetProposal> {
	const resp = await jsonFetch<{ data: AssetProposal }>('/asset-proposals', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function ListLiquidationAssets(params?: {
	status?: string
	year?: number
	limit?: number
}): Promise<LiquidationAssetRow[]> {
	const sp = new URLSearchParams()
	if (params?.status) sp.set('status', params.status)
	if (params?.year != null) sp.set('year', String(params.year))
	if (params?.limit != null) sp.set('limit', String(params.limit))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: LiquidationAssetRow[] }>(
		`/asset-proposals/liquidations${qs}`
	)
	return resp.data
}

export async function ListAssetProposals(params?: {
	status?: string
	proposalType?: string
	mine?: boolean
	limit?: number
}): Promise<AssetProposal[]> {
	const sp = new URLSearchParams()
	if (params?.status) sp.set('status', params.status)
	if (params?.proposalType) sp.set('proposalType', params.proposalType)
	if (params?.mine) sp.set('mine', 'true')
	if (params?.limit != null) sp.set('limit', String(params.limit))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: AssetProposal[] }>(
		`/asset-proposals${qs}`
	)
	return resp.data
}

export async function GetAssetProposal(id: number): Promise<AssetProposal> {
	const resp = await jsonFetch<{ data: AssetProposal }>(
		`/asset-proposals/${id}`
	)
	return resp.data
}

export async function DecideAssetProposal(
	id: number,
	body: {
		decision: 'APPROVED' | 'REJECTED' | 'COMPLETED'
		adminNote?: string
		decisionNumber?: string
		decisionNganhCode?: string
		decisionIssuingLevel?: string
		decisionSigner?: string
		decisionAt?: string
		/** Kho đích khi hoàn thành thu hồi */
		targetRoomId?: number
	}
): Promise<AssetProposal> {
	const resp = await jsonFetch<{ data: AssetProposal }>(
		`/asset-proposals/${id}/decide`,
		{ method: 'POST', body: JSON.stringify(body) }
	)
	return resp.data
}

export async function ListAssetProposalLogs(params?: {
	proposalId?: number
	fromDate?: string
	toDate?: string
	limit?: number
}): Promise<AssetProposalLog[]> {
	const sp = new URLSearchParams()
	if (params?.proposalId != null)
		sp.set('proposalId', String(params.proposalId))
	if (params?.fromDate) sp.set('fromDate', params.fromDate)
	if (params?.toDate) sp.set('toDate', params.toDate)
	if (params?.limit != null) sp.set('limit', String(params.limit))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: AssetProposalLog[] }>(
		`/asset-proposal-logs${qs}`
	)
	return resp.data
}

// ── Room assets ────────────────────────────────────────────────

export async function GetRoomAssets(roomId?: number): Promise<RoomAsset[]> {
	const qs = roomId !== undefined ? `?roomId=${roomId}` : ''
	const resp = await jsonFetch<{ data: RoomAsset[] }>(`/room-assets${qs}`)
	return resp.data
}

export async function CreateRoomAsset(
	body: CreateRoomAssetBody
): Promise<RoomAsset> {
	const resp = await jsonFetch<{ data: RoomAsset }>('/room-assets', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateRoomAsset(
	id: number,
	body: UpdateRoomAssetBody
): Promise<RoomAsset> {
	const resp = await jsonFetch<{ data: RoomAsset }>(`/room-assets/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteRoomAssets(ids: number[]): Promise<void> {
	await jsonFetch('/room-assets/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

// ── Room images ────────────────────────────────────────────────

export async function GetRoomImages(roomId?: number): Promise<RoomImage[]> {
	const qs = roomId !== undefined ? `?roomId=${roomId}` : ''
	const resp = await jsonFetch<{ data: RoomImage[] }>(`/room-images${qs}`)
	return resp.data
}

export async function CreateRoomImage(
	body: CreateRoomImageBody
): Promise<RoomImage> {
	const resp = await jsonFetch<{ data: RoomImage }>('/room-images', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteRoomImages(ids: number[]): Promise<void> {
	await jsonFetch('/room-images/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

// ── Logs ───────────────────────────────────────────────────────

export async function GetRepairLogs(params?: {
	roomId?: number
	roomAssetId?: number
}): Promise<RepairLog[]> {
	const sp = new URLSearchParams()
	if (params?.roomId !== undefined) sp.set('roomId', String(params.roomId))
	if (params?.roomAssetId !== undefined)
		sp.set('roomAssetId', String(params.roomAssetId))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: RepairLog[] }>(`/repair-logs${qs}`)
	return resp.data
}

export async function CreateRepairLog(
	body: CreateRepairLogBody
): Promise<RepairLog> {
	const resp = await jsonFetch<{ data: RepairLog }>('/repair-logs', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteRepairLogs(ids: number[]): Promise<void> {
	await jsonFetch('/repair-logs/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

export async function GetInventoryLogs(params?: {
	roomId?: number
	roomAssetId?: number
}): Promise<InventoryLog[]> {
	const sp = new URLSearchParams()
	if (params?.roomId !== undefined) sp.set('roomId', String(params.roomId))
	if (params?.roomAssetId !== undefined)
		sp.set('roomAssetId', String(params.roomAssetId))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: InventoryLog[] }>(
		`/inventory-logs${qs}`
	)
	return resp.data
}

export async function CreateInventoryLog(
	body: CreateInventoryLogBody
): Promise<InventoryLog> {
	const resp = await jsonFetch<{ data: InventoryLog }>('/inventory-logs', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteInventoryLogs(ids: number[]): Promise<void> {
	await jsonFetch('/inventory-logs/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

export async function GetReplacementLogs(params?: {
	roomId?: number
	roomAssetId?: number
}): Promise<ReplacementLog[]> {
	const sp = new URLSearchParams()
	if (params?.roomId !== undefined) sp.set('roomId', String(params.roomId))
	if (params?.roomAssetId !== undefined)
		sp.set('roomAssetId', String(params.roomAssetId))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ReplacementLog[] }>(
		`/replacement-logs${qs}`
	)
	return resp.data
}

export async function CreateReplacementLog(
	body: CreateReplacementLogBody
): Promise<ReplacementLog> {
	const resp = await jsonFetch<{ data: ReplacementLog }>(
		'/replacement-logs',
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

export async function DeleteReplacementLogs(ids: number[]): Promise<void> {
	await jsonFetch('/replacement-logs/delete', {
		method: 'POST',
		body: JSON.stringify({ ids })
	})
}

/** Resolve media URI for <img src> */
export function mediaUrl(imageUrl: string): string {
	if (!imageUrl) return ''
	if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
		return imageUrl
	}
	const base = ApiUrl.replace(/\/$/, '')
	// stored as URI path or raw key
	if (imageUrl.startsWith('/')) return `${base}${imageUrl}`
	return `${base}/media/${encodeURIComponent(imageUrl)}`
}

// ── Reports ────────────────────────────────────────────────────

function reportQuery(
	filter: AssetReportFilter &
		Record<string, string | number | boolean | undefined>
): string {
	const sp = new URLSearchParams()
	for (const [k, v] of Object.entries(filter)) {
		if (v === undefined || v === '' || v === null) continue
		sp.set(k, String(v))
	}
	const qs = sp.toString()
	return qs ? `?${qs}` : ''
}

export async function GetAssetStatsReport(
	filter: AssetReportFilter = {}
): Promise<AssetStatsReport> {
	const resp = await jsonFetch<{ data: AssetStatsReport }>(
		`/asset-reports/stats${reportQuery(filter)}`
	)
	return resp.data
}

export async function GetBrokenAssetsReport(
	filter: BrokenAssetsFilter = {}
): Promise<BrokenAssetRow[]> {
	const resp = await jsonFetch<{ data: BrokenAssetRow[] }>(
		`/asset-reports/broken${reportQuery(filter)}`
	)
	return resp.data
}

export async function GetExpiringAssetsReport(
	filter: ExpiringAssetsFilter = {}
): Promise<ExpiringAssetRow[]> {
	const resp = await jsonFetch<{ data: ExpiringAssetRow[] }>(
		`/asset-reports/expiring${reportQuery(filter)}`
	)
	return resp.data
}

export async function GetRepairHistoryReport(
	filter: RepairHistoryFilter = {}
): Promise<RepairHistoryRow[]> {
	const resp = await jsonFetch<{ data: RepairHistoryRow[] }>(
		`/asset-reports/repairs${reportQuery(filter)}`
	)
	return resp.data
}

// ── Nhật ký VT hỏng / cần SC (lưu vĩnh viễn) ───────────────────

export type AssetBrokenLog = {
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

export async function ListAssetBrokenLogs(params?: {
	eventType?: string
	sourceType?: string
	fromDate?: string
	toDate?: string
	limit?: number
}): Promise<AssetBrokenLog[]> {
	const sp = new URLSearchParams()
	if (params?.eventType) sp.set('eventType', params.eventType)
	if (params?.sourceType) sp.set('sourceType', params.sourceType)
	if (params?.fromDate) sp.set('fromDate', params.fromDate)
	if (params?.toDate) sp.set('toDate', params.toDate)
	if (params?.limit != null) sp.set('limit', String(params.limit))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: AssetBrokenLog[] }>(
		`/asset-broken-logs${qs}`
	)
	return resp.data
}

// ── Repair requests (báo hỏng / phân công) ─────────────────────

export type RepairRequest = {
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
	sourceAssetId?: number | null
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

export async function GetRepairRequests(params?: {
	roomId?: number
	status?: string
}): Promise<RepairRequest[]> {
	const sp = new URLSearchParams()
	if (params?.roomId !== undefined) sp.set('roomId', String(params.roomId))
	if (params?.status) sp.set('status', params.status)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: RepairRequest[] }>(
		`/repair-requests${qs}`
	)
	return resp.data
}

export async function CreateRepairRequest(body: {
	roomId: number
	roomAssetId?: number
	/** Số lượng hỏng (mặc định 1; không vượt SL đang dùng) */
	quantity?: number
	assetName: string
	category?: string
	description?: string
	brokenAt?: string
	reportedByName?: string
}): Promise<RepairRequest> {
	const resp = await jsonFetch<{ data: RepairRequest }>('/repair-requests', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function AssignRepairRequest(
	id: number,
	body: {
		assignedToName: string
		repairStartedAt?: string
		adminNote?: string
		startRepair?: boolean
	}
): Promise<RepairRequest> {
	const resp = await jsonFetch<{ data: RepairRequest }>(
		`/repair-requests/${id}/assign`,
		{
			method: 'PATCH',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

export async function CompleteRepairRequest(
	id: number,
	body?: { completedAt?: string; adminNote?: string }
): Promise<RepairRequest> {
	const resp = await jsonFetch<{ data: RepairRequest }>(
		`/repair-requests/${id}/complete`,
		{
			method: 'PATCH',
			body: JSON.stringify(body ?? {})
		}
	)
	return resp.data
}

export async function CancelRepairRequest(
	id: number,
	body?: { adminNote?: string }
): Promise<RepairRequest> {
	const resp = await jsonFetch<{ data: RepairRequest }>(
		`/repair-requests/${id}/cancel`,
		{
			method: 'PATCH',
			body: JSON.stringify(body ?? {})
		}
	)
	return resp.data
}

// ── Asset movements (tăng/giảm / điều chỉnh) ───────────────────

export async function CreateAssetMovement(
	roomAssetId: number,
	body: CreateAssetMovementBody
): Promise<AssetMovementLog> {
	const resp = await jsonFetch<{ data: AssetMovementLog }>(
		`/room-assets/${roomAssetId}/movements`,
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

export async function CreateTransferRecall(
	roomAssetId: number,
	body: CreateTransferRecallBody
): Promise<AssetMovementLog> {
	const resp = await jsonFetch<{ data: AssetMovementLog }>(
		`/room-assets/${roomAssetId}/transfer-recall`,
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

export async function GetAssetMovementLogs(
	filter: AssetMovementFilter = {}
): Promise<AssetMovementLog[]> {
	const resp = await jsonFetch<{ data: AssetMovementLog[] }>(
		`/asset-movement-logs${reportQuery(filter)}`
	)
	return resp.data
}

export async function GetAssetMovementReport(
	filter: AssetMovementFilter = {}
): Promise<AssetMovementReportRow[]> {
	const resp = await jsonFetch<{ data: AssetMovementReportRow[] }>(
		`/asset-reports/movements${reportQuery(filter)}`
	)
	return resp.data
}
