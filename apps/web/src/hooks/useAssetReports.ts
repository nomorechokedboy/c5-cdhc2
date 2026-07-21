import {
	GetAssetStatsReport,
	GetBrokenAssetsReport,
	GetExpiringAssetsReport,
	GetRepairHistoryReport,
	GetAssetMovementReport,
	GetRoomAssets,
	GetBuildingTree,
	ListAssetBrokenLogs
} from '@/api/asset'
import type {
	AssetReportFilter,
	AssetMovementFilter,
	BrokenAssetsFilter,
	ExpiringAssetsFilter,
	RepairHistoryFilter,
	RoomAsset
} from '@/types/asset'
import { useQuery } from '@tanstack/react-query'

export function useAssetStatsReport(filter: AssetReportFilter = {}) {
	return useQuery({
		queryKey: ['asset-reports', 'stats', filter],
		queryFn: () => GetAssetStatsReport(filter)
	})
}

/** Kho ổn định / hư hỏng — lấy trực tiếp room_assets + vị trí (đúng SL sau cập nhật) */
export type WarehouseAssetRow = RoomAsset & {
	roomCode: string
	roomName: string
	floorName: string
	floorId: number
	buildingCode: string
	buildingName: string
	buildingId: number
}

export function useWarehouseInventory(
	filter: {
		buildingId?: number
		floorId?: number
		roomId?: number
		category?: string
	} = {}
) {
	return useQuery({
		queryKey: ['asset-reports', 'warehouse', filter],
		queryFn: async (): Promise<{
			stable: WarehouseAssetRow[]
			broken: WarehouseAssetRow[]
		}> => {
			const [assets, tree] = await Promise.all([
				GetRoomAssets(filter.roomId),
				GetBuildingTree()
			])

			// map roomId → location
			const loc = new Map<
				number,
				{
					roomCode: string
					roomName: string
					floorName: string
					floorId: number
					buildingCode: string
					buildingName: string
					buildingId: number
				}
			>()
			for (const b of tree) {
				for (const f of b.floors ?? []) {
					for (const r of f.rooms ?? []) {
						loc.set(r.id, {
							roomCode: r.roomCode,
							roomName: r.roomName,
							floorName: f.name,
							floorId: f.id,
							buildingCode: b.code,
							buildingName: b.name,
							buildingId: b.id
						})
					}
				}
			}

			const cat = filter.category?.trim().toLowerCase()
			const rows: WarehouseAssetRow[] = []
			for (const a of assets) {
				const L = loc.get(a.roomId)
				if (!L) continue
				if (
					filter.buildingId != null &&
					L.buildingId !== filter.buildingId
				)
					continue
				if (filter.floorId != null && L.floorId !== filter.floorId)
					continue
				if (filter.roomId != null && a.roomId !== filter.roomId)
					continue
				if (cat && (a.category || '').toLowerCase() !== cat) continue
				// bỏ dòng SL 0 khỏi kho (đã chuyển hết)
				if ((a.quantity ?? 0) <= 0) continue
				rows.push({
					...a,
					roomCode: L.roomCode,
					roomName: L.roomName,
					floorName: L.floorName,
					floorId: L.floorId,
					buildingCode: L.buildingCode,
					buildingName: L.buildingName,
					buildingId: L.buildingId
				})
			}

			// Ổn định: cấp 1–4 và không đang BROKEN/REPAIRING
			const stable = rows
				.filter((a) => {
					const g = Number(a.grade ?? 1)
					const st = a.status || 'NORMAL'
					return g <= 4 && st !== 'BROKEN' && st !== 'REPAIRING'
				})
				.sort((a, b) =>
					(a.code || a.name).localeCompare(b.code || b.name, 'vi')
				)
			// Hư hỏng: cấp 5 HOẶC status BROKEN/REPAIRING (sau báo hỏng)
			const broken = rows
				.filter((a) => {
					const g = Number(a.grade ?? 1)
					const st = a.status || 'NORMAL'
					return g >= 5 || st === 'BROKEN' || st === 'REPAIRING'
				})
				.sort((a, b) =>
					(a.code || a.name).localeCompare(b.code || b.name, 'vi')
				)
			return { stable, broken }
		},
		refetchOnMount: 'always'
	})
}

export function useBrokenAssetsReport(filter: BrokenAssetsFilter = {}) {
	return useQuery({
		queryKey: ['asset-reports', 'broken', filter],
		queryFn: () => GetBrokenAssetsReport(filter)
	})
}

export function useExpiringAssetsReport(filter: ExpiringAssetsFilter = {}) {
	return useQuery({
		queryKey: ['asset-reports', 'expiring', filter],
		queryFn: () => GetExpiringAssetsReport(filter)
	})
}

export function useRepairHistoryReport(filter: RepairHistoryFilter = {}) {
	return useQuery({
		queryKey: ['asset-reports', 'repairs', filter],
		queryFn: () => GetRepairHistoryReport(filter)
	})
}

export function useAssetMovementReport(filter: AssetMovementFilter = {}) {
	return useQuery({
		queryKey: ['asset-reports', 'movements', filter],
		queryFn: () => GetAssetMovementReport(filter)
	})
}

/** Nhật ký VT hỏng / SC — lưu vĩnh viễn để xuất file */
export function useAssetBrokenLogs(params?: {
	eventType?: string
	sourceType?: string
	fromDate?: string
	toDate?: string
	limit?: number
}) {
	return useQuery({
		queryKey: ['asset-reports', 'broken-logs', params ?? {}],
		queryFn: () => ListAssetBrokenLogs(params),
		refetchOnMount: 'always'
	})
}
