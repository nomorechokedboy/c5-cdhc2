import { api, Query } from 'encore.dev/api'
import log from 'encore.dev/log'
import assetController from './controller'
import type {
	AssetStatsReport,
	BrokenAssetRow,
	ExpiringAssetRow,
	RepairHistoryRow
} from './index'

/** Shared location filters for asset reports */
interface ReportFilters {
	buildingId?: Query<number>
	floorId?: Query<number>
	roomId?: Query<number>
	category?: Query<string>
}

function filtersFromQuery(q: ReportFilters) {
	return {
		buildingId: q.buildingId,
		floorId: q.floorId,
		roomId: q.roomId,
		category: q.category
	}
}

/**
 * Thống kê vật tư — totals by status & category, optional location scope.
 * GET /asset-reports/stats?buildingId=&floorId=&roomId=&category=
 */
export const GetAssetStatsReport = api(
	{ auth: true, expose: true, method: 'GET', path: '/asset-reports/stats' },
	async (q: ReportFilters): Promise<{ data: AssetStatsReport }> => {
		log.trace('GetAssetStatsReport', { q })
		const data = await assetController.getAssetStats(filtersFromQuery(q))
		return { data }
	}
)

/**
 * Vật tư hỏng — status BROKEN (optionally include REPAIRING via includeRepairing).
 * GET /asset-reports/broken?buildingId=&includeRepairing=true
 */
export const GetBrokenAssetsReport = api(
	{ auth: true, expose: true, method: 'GET', path: '/asset-reports/broken' },
	async (
		q: ReportFilters & { includeRepairing?: Query<boolean> }
	): Promise<{ data: BrokenAssetRow[] }> => {
		log.trace('GetBrokenAssetsReport', { q })
		const data = await assetController.getBrokenAssets({
			...filtersFromQuery(q),
			includeRepairing: q.includeRepairing === true
		})
		return { data }
	}
)

/**
 * Vật tư sắp hết hạn — expiryDate within `withinDays` (default 30), from today.
 * GET /asset-reports/expiring?withinDays=30&buildingId=
 */
export const GetExpiringAssetsReport = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-reports/expiring'
	},
	async (
		q: ReportFilters & { withinDays?: Query<number> }
	): Promise<{ data: ExpiringAssetRow[] }> => {
		log.trace('GetExpiringAssetsReport', { q })
		const withinDays =
			q.withinDays !== undefined && q.withinDays > 0 ? q.withinDays : 30
		const data = await assetController.getExpiringAssets({
			...filtersFromQuery(q),
			withinDays
		})
		return { data }
	}
)

/**
 * Lịch sử sửa chữa — repair logs joined with asset/room/building.
 * GET /asset-reports/repairs?buildingId=&roomId=&roomAssetId=&fromDate=&toDate=
 */
export const GetRepairHistoryReport = api(
	{ auth: true, expose: true, method: 'GET', path: '/asset-reports/repairs' },
	async (
		q: ReportFilters & {
			roomAssetId?: Query<number>
			fromDate?: Query<string>
			toDate?: Query<string>
		}
	): Promise<{ data: RepairHistoryRow[] }> => {
		log.trace('GetRepairHistoryReport', { q })
		const data = await assetController.getRepairHistory({
			...filtersFromQuery(q),
			roomAssetId: q.roomAssetId,
			fromDate: q.fromDate,
			toDate: q.toDate
		})
		return { data }
	}
)
