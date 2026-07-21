import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
	AlertTriangle,
	BarChart3,
	CalendarClock,
	ChevronDown,
	ChevronRight,
	Download,
	FileSpreadsheet,
	FileText,
	RefreshCw,
	Wrench
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import { useBuildings } from '@/hooks/useBuildings'
import { useFloors } from '@/hooks/useFloors'
import {
	useAssetStatsReport,
	useBrokenAssetsReport,
	useExpiringAssetsReport,
	useRepairHistoryReport,
	useAssetMovementReport,
	useWarehouseInventory,
	useAssetBrokenLogs
} from '@/hooks/useAssetReports'
import { useRepairRequests } from '@/hooks/useRepairRequests'
import type { AssetBrokenLog, RepairRequest } from '@/api/asset'
import { isBghOnlyUser } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { downloadCsv } from '@/lib/export-csv'
import {
	exportBrokenAssetsExcel,
	exportAssetMovementsExcel,
	exportDamagedRepairAssetsExcel,
	exportDamagedRepairGroupedExcel,
	exportWarehouseAssetsExcel
} from '@/lib/export-asset-excel'
import {
	exportAssetMovementsWord,
	exportDamagedRepairAssetsWord,
	exportDamagedRepairGroupedWord,
	exportTransferRecallLogsWord,
	exportWarehouseAssetsWord,
	type MilitaryReportMeta
} from '@/lib/export-asset-word'
import {
	exportThucLucTheoDonViWord,
	exportThucLucTheoViTriWord,
	exportThucLucTongHopWord,
	type ThucLucAssetRow
} from '@/lib/export-thuc-luc'
import {
	exportThucLucTheoViTriExcel,
	exportThucLucTongHopExcel
} from '@/lib/export-thuc-luc-excel'
import {
	buildPeriodAggregate,
	exportPeriodTangGiamWord,
	exportPeriodThucLucWord,
	type PeriodScope
} from '@/lib/export-thuc-luc-period'
import {
	NGANH_LIST,
	assetMatchesMaterialCode,
	extractMaterialBaseCode,
	extractNganhCode,
	nganhLabel
} from '@/lib/nganh'
import { useBuildingTree } from '@/hooks/useBuildings'
import useUnitsData from '@/hooks/useUnitsData'
import type { AssetDetailRow } from '@/types/asset'
import { toast } from 'sonner'

import { resolveInstallAddress } from '@/lib/export-asset-excel'
import {
	DECREASE_REASON_LABELS,
	INCREASE_REASON_LABELS,
	formatMovementReason,
	movementTypeLabel
} from '@/lib/asset-movement-labels'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	GetAssetCatalog,
	GetAssetMovementReport,
	GetBuildingTree,
	GetRoomAssets,
	GetWarehouseRoom,
	type CatalogMaterial
} from '@/api/asset'
import type { WarehouseAssetRow } from '@/hooks/useAssetReports'
import { formatMovementDateTime } from '@/lib/utils'

const assetStatusLabel: Record<string, string> = {
	NORMAL: 'Bình thường',
	BROKEN: 'Hỏng',
	REPAIRING: 'Đang sửa',
	DISPOSED: 'Thanh lý'
}

/** Nhật ký cập nhật VT: chỉ Tăng / Giảm / Điều chỉnh (không gồm điều động–thu hồi) */
const UPDATE_MOVEMENT_TYPES = new Set(['INCREASE', 'DECREASE', 'ADJUST'])

export default function AssetReports() {
	/** BGH: chỉ thống kê + kho — không nhật ký / lịch sử SC */
	const bghOnly = isBghOnlyUser()
	const { data: buildings = [] } = useBuildings()
	const { data: unitsTree = [] } = useUnitsData()
	const [buildingId, setBuildingId] = useState<string>('all')
	const [floorId, setFloorId] = useState<string>('all')
	const [category, setCategory] = useState('')
	const [includeRepairing, setIncludeRepairing] = useState(true)
	const [withinDays, setWithinDays] = useState(30)
	const [fromDate, setFromDate] = useState('')
	const [toDate, setToDate] = useState('')
	/** Bộ lọc nhật ký cập nhật (tab Nhật ký — admin + user có tab này) */
	const [movementSearch, setMovementSearch] = useState('')
	const [movementNganh, setMovementNganh] = useState<string>('all')
	const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all')
	const [movementUnitId, setMovementUnitId] = useState<string>('all')
	const [movementRoomId, setMovementRoomId] = useState<string>('all')
	/** Dialog xuất báo cáo */
	const [exportOpen, setExportOpen] = useState(false)
	/**
	 * 1–3 thực lực · 4 kho ổn định/hư hại · 5 kho hệ thống KHO-VT
	 * 6–7 QĐ điều động / thu hồi · 8 hư hại · 9 cập nhật tăng-giảm
	 */
	type ExportKind =
		| 'thuc_luc'
		| 'tong_hop_ky'
		| 'thuc_luc_su_dung'
		| 'thuc_luc_nganh'
		| 'warehouse'
		| 'kho_he_thong'
		| 'qd_transfer'
		| 'qd_recall'
		| 'damaged'
		| 'updates'
	const [exportKind, setExportKind] = useState<ExportKind>('thuc_luc')
	type ExportLayout = 'tong_hop' | 'vi_tri'
	const [exportLayout, setExportLayout] = useState<ExportLayout>('vi_tri')
	type ExportKyMode = 'thuc_luc' | 'tang_giam'
	const [exportKyMode, setExportKyMode] = useState<ExportKyMode>('thuc_luc')
	type ExportKyScope = 'all' | 'nganh' | 'don_vi'
	const [exportKyScope, setExportKyScope] = useState<ExportKyScope>('all')
	const [exportFormat, setExportFormat] = useState<'excel' | 'word'>('word')
	const [exportFrom, setExportFrom] = useState('')
	const [exportTo, setExportTo] = useState('')
	const [exportPending, setExportPending] = useState(false)
	const [exportBuildingId, setExportBuildingId] = useState<string>('all')
	const [exportRoomId, setExportRoomId] = useState<string>('all')
	const [exportNganhCode, setExportNganhCode] = useState<string>('all')
	const [exportChuyenNganhCode, setExportChuyenNganhCode] =
		useState<string>('')
	const [catalogChuyenNganh, setCatalogChuyenNganh] = useState<
		{ code: string; name: string }[]
	>([])
	const [exportUnitId, setExportUnitId] = useState<string>('')
	/** QĐ điều động / thu hồi: số quyết định (tùy chọn — trống = tất cả trong kỳ) */
	const [exportDecisionNumber, setExportDecisionNumber] = useState('')
	/** Cập nhật tăng/giảm: hướng + lý do */
	type ExportUpdateDir = 'all' | 'INCREASE' | 'DECREASE'
	const [exportUpdateDir, setExportUpdateDir] =
		useState<ExportUpdateDir>('all')
	const [exportUpdateReason, setExportUpdateReason] = useState<string>('all')

	const { data: buildingTree = [] } = useBuildingTree()
	const exportRooms = useMemo(() => {
		// Theo ngành: luôn liệt kê mọi phòng (không lọc tòa)
		const bid =
			exportKind === 'thuc_luc_nganh' || exportBuildingId === 'all'
				? null
				: Number(exportBuildingId)
		const rooms: {
			id: number
			roomName: string
			roomCode: string
			buildingName: string
			buildingId: number
		}[] = []
		for (const b of buildingTree) {
			if (bid != null && b.id !== bid) continue
			for (const f of b.floors ?? []) {
				for (const r of f.rooms ?? []) {
					rooms.push({
						id: r.id,
						roomName: r.roomName,
						roomCode: r.roomCode || '',
						buildingName: b.name,
						buildingId: b.id
					})
				}
			}
		}
		return rooms.sort((a, b) => a.roomName.localeCompare(b.roomName, 'vi'))
	}, [buildingTree, exportBuildingId, exportKind])

	const buildingIdNum = buildingId === 'all' ? undefined : Number(buildingId)
	const floorIdNum = floorId === 'all' ? undefined : Number(floorId)

	const { data: floors = [] } = useFloors(buildingIdNum)

	const baseFilter = useMemo(
		() => ({
			buildingId: buildingIdNum,
			floorId: floorIdNum,
			category: category.trim() || undefined
		}),
		[buildingIdNum, floorIdNum, category]
	)

	const statsQ = useAssetStatsReport(baseFilter)
	const brokenQ = useBrokenAssetsReport({
		...baseFilter,
		includeRepairing
	})
	const expiringQ = useExpiringAssetsReport({
		...baseFilter,
		withinDays
	})
	const repairsQ = useRepairHistoryReport({
		...baseFilter,
		fromDate: fromDate || undefined,
		toDate: toDate || undefined
	})

	const movementRoomIdNum =
		movementRoomId !== 'all' ? Number(movementRoomId) : undefined
	const movementUnitIdNum =
		movementUnitId !== 'all' ? Number(movementUnitId) : undefined

	const movements = useAssetMovementReport({
		buildingId: buildingIdNum,
		roomId: movementRoomIdNum,
		fromDate: fromDate || undefined,
		toDate: toDate || undefined,
		movementType:
			movementTypeFilter !== 'all' ? movementTypeFilter : undefined
	})

	/** VT để map đơn vị sử dụng → phòng (holdingUnitId) */
	const assetsForUnitFilterQ = useQuery({
		queryKey: ['room-assets', 'unit-room-filter'],
		queryFn: () => GetRoomAssets(),
		staleTime: 120_000
	})

	/**
	 * Map unitId → set roomId (phòng có VT gán đơn vị đó).
	 * Ưu tiên danh mục VT; bổ sung từ log nếu VT đã xóa.
	 */
	const unitRoomIds = useMemo(() => {
		const map = new Map<number, Set<number>>()
		const add = (
			hid: number | null | undefined,
			rid: number | null | undefined
		) => {
			if (hid == null || rid == null || !rid) return
			if (!map.has(hid)) map.set(hid, new Set())
			map.get(hid)!.add(rid)
		}
		for (const a of assetsForUnitFilterQ.data ?? []) {
			add(a.holdingUnitId, a.roomId)
		}
		for (const r of movements.data ?? []) {
			add(r.holdingUnitId, r.roomId)
		}
		return map
	}, [assetsForUnitFilterQ.data, movements.data])

	/** Phòng: theo tòa + theo đơn vị sử dụng (nếu chọn) */
	const movementRooms = useMemo(() => {
		const bid = buildingIdNum ?? null
		const allowedRooms =
			movementUnitIdNum != null
				? unitRoomIds.get(movementUnitIdNum)
				: null
		const rooms: {
			id: number
			label: string
			keywords: string
		}[] = []
		for (const b of buildingTree) {
			if (bid != null && b.id !== bid) continue
			for (const f of b.floors ?? []) {
				for (const r of f.rooms ?? []) {
					if (allowedRooms && !allowedRooms.has(r.id)) continue
					rooms.push({
						id: r.id,
						label: `${r.roomCode || '—'} — ${r.roomName}${bid == null ? ` (${b.name})` : ''}`,
						keywords: `${r.roomCode || ''} ${r.roomName} ${b.name}`
					})
				}
			}
		}
		return rooms.sort((a, b) => a.label.localeCompare(b.label, 'vi'))
	}, [buildingTree, buildingIdNum, movementUnitIdNum, unitRoomIds])

	const updateMovements = useMemo(
		() =>
			(movements.data ?? []).filter((r) =>
				UPDATE_MOVEMENT_TYPES.has(r.movementType)
			),
		[movements.data]
	)

	const filteredMovements = useMemo(() => {
		let rows = updateMovements
		// Đơn vị sử dụng (holding)
		if (movementUnitIdNum != null) {
			rows = rows.filter((r) => r.holdingUnitId === movementUnitIdNum)
		}
		// Ngành (theo mã VT HC2A…)
		if (movementNganh !== 'all') {
			const ng = movementNganh.toUpperCase()
			rows = rows.filter((r) => extractNganhCode(r.assetCode) === ng)
		}
		// Loại biến động (nếu API chưa lọc)
		if (movementTypeFilter !== 'all') {
			rows = rows.filter((r) => r.movementType === movementTypeFilter)
		}
		// Phòng (client fallback)
		if (movementRoomIdNum != null) {
			rows = rows.filter((r) => r.roomId === movementRoomIdNum)
		}
		// Tìm kiếm
		const q = movementSearch
			.trim()
			.toLocaleLowerCase('vi')
			.split(/\s+/)
			.filter(Boolean)
		if (!q.length) return rows
		return rows.filter((r) => {
			const hay = [
				r.executedAt,
				r.movementType,
				movementTypeLabel(r.movementType),
				r.buildingCode,
				r.buildingName,
				r.roomCode,
				r.roomName,
				r.assetCode,
				r.assetName,
				r.reasonCode,
				formatMovementReason(r),
				r.reasonOther,
				r.explanation,
				r.note,
				r.decisionNumber,
				r.performer,
				extractNganhCode(r.assetCode),
				r.holdingUnitId != null ? String(r.holdingUnitId) : '',
				String(r.quantity),
				String(r.quantityBefore),
				String(r.quantityAfter),
				String(r.grade)
			]
				.filter(Boolean)
				.join(' ')
				.toLocaleLowerCase('vi')
			return q.every((part) => hay.includes(part))
		})
	}, [
		updateMovements,
		movementSearch,
		movementNganh,
		movementTypeFilter,
		movementRoomIdNum,
		movementUnitIdNum
	])

	const brokenOnly = useMemo(
		() =>
			(brokenQ.data ?? []).filter((r) => {
				const st = r.status || 'NORMAL'
				const g = Number(r.grade ?? 1)
				// Hỏng / cấp 5 (chưa tăng cấp) — không gộp vào đang sửa
				return st === 'BROKEN' || (g >= 5 && st !== 'REPAIRING')
			}),
		[brokenQ.data]
	)

	/** Nhật ký phiếu báo hỏng / phân công — giữ vĩnh viễn để xuất file */
	const repairLogQ = useRepairRequests(undefined)
	const repairLogRows = useMemo(() => {
		const rows = repairLogQ.data ?? []
		// Lọc theo tòa nếu chọn (khớp buildingName/code)
		const bid = buildingId === 'all' ? null : Number(buildingId)
		if (bid == null) return rows
		const b = buildings.find((x) => x.id === bid)
		if (!b) return rows
		return rows.filter(
			(r) => r.buildingCode === b.code || r.buildingName === b.name
		)
	}, [repairLogQ.data, buildingId, buildings])

	const repairLogOpen = useMemo(
		() =>
			repairLogRows.filter((r) =>
				['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status)
			),
		[repairLogRows]
	)
	const repairLogDone = useMemo(
		() =>
			repairLogRows.filter((r) =>
				['COMPLETED', 'CANCELLED'].includes(r.status)
			),
		[repairLogRows]
	)

	/** Nhật ký VT hỏng/SC (đề xuất + báo hỏng) — vĩnh viễn */
	const brokenLogsQ = useAssetBrokenLogs({ limit: 3000 })
	const brokenLogRows = useMemo(() => {
		const rows = brokenLogsQ.data ?? []
		const bid = buildingId === 'all' ? null : Number(buildingId)
		if (bid == null) return rows
		const b = buildings.find((x) => x.id === bid)
		if (!b) return rows
		return rows.filter(
			(r) => r.buildingCode === b.code || r.buildingName === b.name
		)
	}, [brokenLogsQ.data, buildingId, buildings])

	/** Kho ổn định / hư hỏng — nguồn room_assets (đúng SL sau tăng cấp / hư hỏng) */
	const warehouseQ = useWarehouseInventory({
		buildingId: buildingIdNum,
		floorId: floorIdNum,
		roomId: undefined,
		category: category.trim() || undefined
	})
	const stableItems = warehouseQ.data?.stable ?? []
	const grade5Items = warehouseQ.data?.broken ?? []
	const stableTotalQty = useMemo(
		() => stableItems.reduce((s, r) => s + (r.quantity ?? 0), 0),
		[stableItems]
	)
	const grade5TotalQty = useMemo(
		() => grade5Items.reduce((s, r) => s + (r.quantity ?? 0), 0),
		[grade5Items]
	)

	const repairingOnly = useMemo(
		() => (brokenQ.data ?? []).filter((r) => r.status === 'REPAIRING'),
		[brokenQ.data]
	)

	function refetchAll() {
		statsQ.refetch()
		brokenQ.refetch()
		expiringQ.refetch()
		repairsQ.refetch()
		movements.refetch()
		warehouseQ.refetch()
		repairLogQ.refetch()
		brokenLogsQ.refetch()
		toast.success('Đã làm mới báo cáo')
	}

	function exportBrokenEventLogCsv(rows: AssetBrokenLog[], filename: string) {
		if (!rows.length) {
			toast.error('Không có nhật ký hỏng/sửa để xuất')
			return
		}
		const eventLb: Record<string, string> = {
			BROKEN: 'Báo hỏng / đề xuất SC',
			COMPLETED: 'Sửa xong',
			CANCELLED: 'Hủy phiếu',
			REJECTED: 'Từ chối đề xuất'
		}
		const srcLb: Record<string, string> = {
			PROPOSAL: 'Đề xuất',
			REPAIR_REQUEST: 'Báo hỏng phòng',
			OTHER: 'Khác'
		}
		downloadCsv(
			filename,
			[
				'Mã NK',
				'Ngày sự kiện',
				'Sự kiện',
				'Nguồn',
				'Mã nguồn',
				'Mã ĐX',
				'Mã phiếu BH',
				'Thiết bị',
				'Mã VT (lúc sự kiện)',
				'Mã gốc',
				'Phân loại',
				'SL',
				'Cấp trước',
				'Cấp sau',
				'TT sau',
				'Tòa (mã)',
				'Tòa (tên)',
				'Tầng',
				'Phòng (mã)',
				'Phòng (tên)',
				'Đơn vị',
				'Ngành',
				'Lý do / mô tả',
				'Kết quả SC',
				'Người sửa',
				'Người thực hiện'
			],
			rows.map((r) => [
				r.id,
				r.eventAt || r.createdAt,
				eventLb[r.eventType] || r.eventType,
				srcLb[r.sourceType] || r.sourceType,
				r.sourceId ?? '',
				r.proposalId ?? '',
				r.repairRequestId ?? '',
				r.assetName,
				r.assetCode || '',
				r.originalCode || '',
				r.category || '',
				r.quantity,
				r.originalGrade ?? '',
				r.gradeAfter ?? '',
				r.statusAfter || '',
				r.buildingCode || '',
				r.buildingName || '',
				r.floorName || '',
				r.roomCode || '',
				r.roomName || '',
				r.unitName || '',
				r.nganhCode || '',
				r.reason || '',
				r.resultNote || '',
				r.performer || '',
				r.actorDisplayName || r.actorUsername || ''
			])
		)
		toast.success(`Đã xuất CSV nhật ký hỏng/SC (${rows.length} dòng)`)
	}

	function exportRepairLogCsv(rows: RepairRequest[], filename: string) {
		if (!rows.length) {
			toast.error('Không có dữ liệu để xuất')
			return
		}
		const statusLb: Record<string, string> = {
			PENDING: 'Chờ phân công',
			ASSIGNED: 'Đã gán',
			IN_PROGRESS: 'Đang sửa',
			COMPLETED: 'Hoàn thành',
			CANCELLED: 'Đã hủy'
		}
		downloadCsv(
			filename,
			[
				'Mã phiếu',
				'Thiết bị',
				'Phân loại',
				'SL',
				'Tòa (mã)',
				'Tòa (tên)',
				'Tầng',
				'Phòng (mã)',
				'Phòng (tên)',
				'Ngày hư',
				'Người báo',
				'Trạng thái phiếu',
				'Ngày bắt đầu sửa',
				'Người sửa',
				'Ngày hoàn thành',
				'Mô tả / ghi chú'
			],
			rows.map((r) => [
				r.id,
				r.assetName,
				r.category || '',
				r.quantity ?? 1,
				r.buildingCode || '',
				r.buildingName || '',
				r.floorName || '',
				r.roomCode || '',
				r.roomName || '',
				r.brokenAt || '',
				r.reportedByName || '',
				statusLb[r.status] || r.status,
				r.repairStartedAt || '',
				r.assignedToName || '',
				r.completedAt || '',
				[r.description, r.adminNote].filter(Boolean).join(' | ')
			])
		)
		toast.success(`Đã xuất CSV (${rows.length} dòng)`)
	}

	/**
	 * Đơn vị cột báo cáo thực lực.
	 * GetUnits trả về tree (parent + children) → company có thể lặp nếu vừa ở root vừa là con.
	 * Chỉ lấy level=company, unique theo id.
	 */
	const reportUnits = useMemo(() => {
		const byId = new Map<
			number,
			{ id: number; name: string; alias?: string }
		>()
		const walk = (nodes: typeof unitsTree) => {
			for (const u of nodes) {
				// company level (API: 'company' | 1)
				const isCompany =
					u.level === 'company' ||
					(u as { level?: string | number }).level === 1
				if (isCompany && !byId.has(u.id)) {
					byId.set(u.id, {
						id: u.id,
						name: u.name,
						alias: u.alias
					})
				}
				if (u.children?.length) walk(u.children)
			}
		}
		walk(unitsTree)
		// fallback: mọi node unique (trừ khi đã có company)
		if (!byId.size) {
			const flat = (nodes: typeof unitsTree) => {
				for (const u of nodes) {
					if (!byId.has(u.id)) {
						byId.set(u.id, {
							id: u.id,
							name: u.name,
							alias: u.alias
						})
					}
					if (u.children?.length) flat(u.children)
				}
			}
			flat(unitsTree)
		}
		return [...byId.values()].sort((a, b) => {
			const ca = (a.alias || a.name).toUpperCase()
			const cb = (b.alias || b.name).toUpperCase()
			return ca.localeCompare(cb, 'vi', { numeric: true })
		})
	}, [unitsTree])

	function openExportDialog() {
		setExportFrom(fromDate)
		setExportTo(toDate)
		setExportKind('thuc_luc')
		setExportLayout('tong_hop')
		setExportFormat('word')
		// Đồng bộ tòa từ bộ lọc trang (nếu đang chọn)
		setExportBuildingId(buildingId === 'all' ? 'all' : buildingId)
		setExportRoomId('all')
		setExportNganhCode('all')
		setExportChuyenNganhCode('')
		setCatalogChuyenNganh([])
		setExportUnitId('')
		setExportOpen(true)
	}

	/** Load danh sách chuyên ngành (lọc theo ngành nếu có) */
	async function loadChuyenNganhForExport(nganhCode: string) {
		try {
			const cat = await GetAssetCatalog(
				nganhCode !== 'all' ? { nganhCode } : undefined
			)
			setCatalogChuyenNganh(
				cat.chuyenNganh.map((c) => ({ code: c.code, name: c.name }))
			)
		} catch {
			setCatalogChuyenNganh([])
		}
	}

	function wordMeta(
		scopeLabel?: string,
		extra?: Partial<MilitaryReportMeta>
	): MilitaryReportMeta {
		return {
			scopeLabel,
			asOfDate: exportTo || exportFrom || undefined,
			...extra
		}
	}

	async function handleExportConfirm() {
		if (exportFrom && exportTo && exportFrom > exportTo) {
			toast.error('Từ ngày phải ≤ đến ngày')
			return
		}
		if (exportKind === 'thuc_luc_don_vi' && !exportUnitId) {
			toast.error(
				'Thống kê theo từng đơn vị bắt buộc chọn đơn vị trước khi xuất'
			)
			return
		}
		if (exportKind === 'tong_hop_ky') {
			if (
				exportKyScope === 'nganh' &&
				(!exportNganhCode || exportNganhCode === 'all')
			) {
				toast.error('Chọn ngành trước khi xuất báo cáo kỳ')
				return
			}
			if (exportKyScope === 'don_vi' && !exportUnitId) {
				toast.error('Chọn đơn vị trước khi xuất báo cáo kỳ')
				return
			}
		}
		setExportPending(true)
		try {
			const selectedUnit =
				exportKind === 'thuc_luc_don_vi' &&
				exportUnitId &&
				exportUnitId !== 'kho'
					? reportUnits.find((u) => String(u.id) === exportUnitId)
					: undefined
			const unitScopeLabel =
				exportKind === 'thuc_luc_don_vi'
					? exportUnitId === 'kho'
						? 'KHO'
						: selectedUnit
							? (
									selectedUnit.alias || selectedUnit.name
								).toUpperCase()
							: 'Đơn vị'
					: null

			const selectedNganh =
				exportKind === 'thuc_luc_nganh' && exportNganhCode !== 'all'
					? NGANH_LIST.find((n) => n.code === exportNganhCode)
					: undefined
			const selectedCn =
				exportKind === 'thuc_luc_nganh' && exportChuyenNganhCode
					? catalogChuyenNganh.find(
							(c) => c.code === exportChuyenNganhCode
						) ||
						// fallback nếu list chưa load xong nhưng đã chọn mã
						({
							code: exportChuyenNganhCode,
							name: exportChuyenNganhCode
						} as { code: string; name: string })
					: undefined

			const bName =
				exportBuildingId === 'all'
					? 'Tất cả tòa'
					: buildings.find((b) => String(b.id) === exportBuildingId)
							?.name || 'Tòa'
			const rName =
				exportRoomId === 'all'
					? 'Tất cả phòng'
					: exportRooms.find((r) => String(r.id) === exportRoomId)
							?.roomName || 'Phòng'
			const scopeParts =
				exportKind === 'thuc_luc_don_vi'
					? [
							unitScopeLabel ? `Đơn vị ${unitScopeLabel}` : null,
							exportFrom || exportTo
								? `${exportFrom || '…'} → ${exportTo || '…'}`
								: null
						].filter(Boolean)
					: exportKind === 'thuc_luc_nganh'
						? [
								selectedNganh
									? nganhLabel(selectedNganh)
									: 'Tất cả ngành',
								selectedCn
									? `${selectedCn.code} — ${selectedCn.name}`
									: null,
								exportFrom || exportTo
									? `${exportFrom || '…'} → ${exportTo || '…'}`
									: null
							].filter(Boolean)
						: [
								exportBuildingId !== 'all' ? bName : null,
								exportRoomId !== 'all' ? rName : null,
								exportFrom || exportTo
									? `${exportFrom || '…'} → ${exportTo || '…'}`
									: null
							].filter(Boolean)
			const scopeLabel =
				scopeParts.length > 0 ? scopeParts.join(' · ') : undefined

			const isMovementReport =
				exportKind === 'updates' ||
				exportKind === 'qd_transfer' ||
				exportKind === 'qd_recall'

			const isAssetReport =
				!isMovementReport &&
				(exportKind === 'thuc_luc' ||
					exportKind === 'tong_hop_ky' ||
					exportKind === 'thuc_luc_su_dung' ||
					exportKind === 'thuc_luc_nganh' ||
					exportKind === 'thuc_luc_don_vi' ||
					exportKind === 'warehouse' ||
					exportKind === 'kho_he_thong' ||
					exportKind === 'damaged')

			// ── Kho hệ thống KHO-VT ─────────────────────────────
			if (exportKind === 'kho_he_thong') {
				const wh = await GetWarehouseRoom()
				const assets = await GetRoomAssets(wh.id)
				const tree = await GetBuildingTree()
				let bCode = 'KHO'
				let bName = 'Kho vật tư'
				let fName = ''
				let fId = 0
				let bId = 0
				for (const b of tree) {
					for (const f of b.floors ?? []) {
						for (const r of f.rooms ?? []) {
							if (r.id === wh.id) {
								bCode = b.code
								bName = b.name
								fName = f.name
								fId = f.id
								bId = b.id
							}
						}
					}
				}
				const rows: WarehouseAssetRow[] = assets
					.filter((a) => (a.quantity ?? 0) > 0)
					.map((a) => ({
						...a,
						roomCode: wh.roomCode,
						roomName: wh.roomName,
						floorName: fName,
						floorId: fId,
						buildingCode: bCode,
						buildingName: bName,
						buildingId: bId
					}))
				if (!rows.length) {
					toast.error('Kho hệ thống (KHO-VT) đang trống')
					return
				}
				const stable = rows.filter((a) => {
					const g = Number(a.grade ?? 1)
					const st = a.status || 'NORMAL'
					return g <= 4 && st !== 'BROKEN' && st !== 'REPAIRING'
				})
				const broken = rows.filter((a) => {
					const g = Number(a.grade ?? 1)
					const st = a.status || 'NORMAL'
					return g >= 5 || st === 'BROKEN' || st === 'REPAIRING'
				})
				const whMeta = wordMeta(
					`Kho hệ thống ${wh.roomCode} — ${wh.roomName}`,
					{
						reportTitle:
							'BÁO CÁO KHO VẬT TƯ HỆ THỐNG (THU HỒI / TRẢ TRÊN)',
						filename:
							exportFormat === 'word'
								? 'bao-cao-kho-he-thong-kho-vt.docx'
								: 'bao-cao-kho-he-thong-kho-vt.xlsx'
					}
				)
				if (exportFormat === 'word') {
					await exportWarehouseAssetsWord(stable, broken, whMeta)
				} else {
					await exportWarehouseAssetsExcel(stable, broken, {
						scopeLabel: whMeta.scopeLabel,
						filename: whMeta.filename
					})
				}
				toast.success(
					`Đã xuất kho hệ thống KHO-VT (${rows.length} dòng) — ${exportFormat === 'word' ? 'Word' : 'Excel'}`
				)
				setExportOpen(false)
				return
			}

			if (isAssetReport) {
				// Báo cáo 2/3/đơn vị/ngành: không lọc tòa-phòng lúc lấy VT
				// Báo cáo 1 / kho / hư hại: lọc tòa / phòng nếu chọn
				const skipLocFilter =
					exportKind === 'tong_hop_ky' ||
					exportKind === 'thuc_luc_su_dung' ||
					exportKind === 'thuc_luc_don_vi' ||
					exportKind === 'thuc_luc_nganh'
				const buildingFilter =
					skipLocFilter || exportBuildingId === 'all'
						? undefined
						: Number(exportBuildingId)
				const roomFilter =
					skipLocFilter || exportRoomId === 'all'
						? undefined
						: Number(exportRoomId)
				const nganhFilter =
					exportKind === 'thuc_luc_nganh' && exportNganhCode !== 'all'
						? exportNganhCode.toUpperCase()
						: undefined

				const [assets, tree] = await Promise.all([
					GetRoomAssets(roomFilter),
					GetBuildingTree()
				])
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
						roomType: string
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
								buildingId: b.id,
								roomType:
									(r as { roomType?: string }).roomType || ''
							})
						}
					}
				}
				// Xuất theo đúng VT trong tòa/phòng: không áp dụng bộ lọc «loại» trên trang
				// (tránh số liệu Word khác với danh sách đang có trong tòa).
				const rows: WarehouseAssetRow[] = []
				for (const a of assets) {
					const L = loc.get(a.roomId)
					if (!L) continue
					if (
						buildingFilter != null &&
						L.buildingId !== buildingFilter
					)
						continue
					if (roomFilter != null && a.roomId !== roomFilter) continue
					if ((a.quantity ?? 0) <= 0) continue
					// Thanh lý không còn trong kiểm kê hiện có
					if (String(a.status || '').toUpperCase() === 'DISPOSED')
						continue
					// Lọc ngành thô (báo cáo khác); báo cáo theo ngành lọc lại theo danh mục materials
					if (nganhFilter) {
						const base = extractMaterialBaseCode(a.code)
						if (!base || !base.startsWith(nganhFilter)) continue
					}
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
				const stable = rows.filter((a) => {
					const g = Number(a.grade ?? 1)
					const st = a.status || 'NORMAL'
					return g <= 4 && st !== 'BROKEN' && st !== 'REPAIRING'
				})
				const broken = rows.filter((a) => {
					const g = Number(a.grade ?? 1)
					const st = a.status || 'NORMAL'
					return g >= 5 || st === 'BROKEN' || st === 'REPAIRING'
				})

				if (exportKind === 'damaged') {
					if (!broken.length) {
						toast.error(
							'Không có vật tư hư hại / đang sửa chữa để xuất'
						)
						return
					}
				} else if (
					exportKind !== 'thuc_luc_nganh' &&
					!stable.length &&
					!broken.length
				) {
					toast.error('Không có dữ liệu vật tư để xuất')
					return
				}

				const isWord = exportFormat === 'word'
				const meta = wordMeta(scopeLabel)

				const toThucRows = (): ThucLucAssetRow[] =>
					rows.map((a) => {
						const L = loc.get(a.roomId)
						const roomLabel = `${L?.roomType || ''} ${L?.roomName || ''} ${L?.roomCode || ''}`
						const bldLabel = `${L?.buildingName || a.buildingName || ''} ${L?.buildingCode || a.buildingCode || ''}`
						// Chỉ đánh dấu kho khi phòng/tòa thực sự là kho (không vì thiếu holdingUnitId)
						const isWarehouse =
							/\bkho\b/i.test(roomLabel) ||
							/kho\s*vật\s*tư/i.test(roomLabel) ||
							/\bkho\b/i.test(bldLabel)
						return {
							...a,
							holdingUnitId:
								(a as { holdingUnitId?: number | null })
									.holdingUnitId ?? null,
							roomType: L?.roomType,
							roomCode: a.roomCode || L?.roomCode,
							roomName: a.roomName || L?.roomName,
							buildingName: a.buildingName || L?.buildingName,
							buildingCode: a.buildingCode || L?.buildingCode,
							floorName: a.floorName || L?.floorName,
							isWarehouse
						}
					})

				// 1. Thống kê VT hiện có (tòa/phòng) — tòa → phòng → ngành → VT
				if (exportKind === 'thuc_luc') {
					const thucRows = toThucRows()
					const hienCoMeta: MilitaryReportMeta = {
						...meta,
						reportTitle:
							'BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ, TRANG BỊ KỸ THUẬT HIỆN CÓ',
						filename:
							exportLayout === 'vi_tri'
								? `bao-cao-thuc-luc-hien-co-theo-vi-tri${isWord ? '.docx' : '.xlsx'}`
								: `bao-cao-thuc-luc-hien-co-tong-the${isWord ? '.docx' : '.xlsx'}`
					}
					if (isWord) {
						// Location-first: 1. tòa · phòng · ngành · tên VT
						await exportThucLucTheoDonViWord(
							thucRows,
							reportUnits,
							hienCoMeta,
							exportLayout === 'vi_tri' ? 'vi_tri' : 'tong_hop'
						)
					} else if (exportLayout === 'tong_hop') {
						await exportThucLucTongHopExcel(
							thucRows,
							reportUnits,
							hienCoMeta
						)
					} else {
						await exportThucLucTheoViTriExcel(
							thucRows,
							reportUnits,
							hienCoMeta
						)
					}
					toast.success(
						exportLayout === 'vi_tri'
							? `Đã xuất thực lực hiện có — theo vị trí lắp đặt (${isWord ? 'Word' : 'Excel'})`
							: `Đã xuất thực lực hiện có — tổng thể (${isWord ? 'Word' : 'Excel'})`
					)
				} else if (exportKind === 'tong_hop_ky') {
					// 2. Tổng hợp theo kỳ: thực lực (tăng/giảm) hoặc form tăng-giảm
					if (
						exportKyScope === 'nganh' &&
						exportNganhCode === 'all'
					) {
						toast.error('Chọn ngành trước khi xuất')
						return
					}
					if (exportKyScope === 'don_vi' && !exportUnitId) {
						toast.error('Chọn đơn vị trước khi xuất')
						return
					}
					const thucRows = toThucRows()
					let scope: PeriodScope = { kind: 'all' }
					let scopeLb = 'Toàn trường'
					if (exportKyScope === 'nganh') {
						scope = { kind: 'nganh', nganhCode: exportNganhCode }
						const n = NGANH_LIST.find(
							(x) => x.code === exportNganhCode
						)
						scopeLb = n ? nganhLabel(n) : exportNganhCode
					} else if (exportKyScope === 'don_vi') {
						const uid = Number(exportUnitId)
						scope = { kind: 'don_vi', unitId: uid }
						const u = reportUnits.find((x) => x.id === uid)
						scopeLb = u
							? `${(u.alias || u.name).toUpperCase()}${u.alias ? ` — ${u.name}` : ''}`
							: `Đơn vị #${uid}`
					}
					const moveRows = await GetAssetMovementReport({
						fromDate: exportFrom || undefined,
						toDate: exportTo || undefined
					})
					const periodRows = buildPeriodAggregate(
						thucRows,
						moveRows,
						reportUnits,
						{
							fromDate: exportFrom || undefined,
							toDate: exportTo || undefined,
							scope
						}
					)
					if (!periodRows.length) {
						toast.error(
							'Không có dữ liệu trong phạm vi / kỳ đã chọn'
						)
						return
					}
					const kyMeta = {
						...meta,
						scopeLabel: scopeLb,
						fromDate: exportFrom || undefined,
						toDate: exportTo || undefined,
						filename:
							exportKyMode === 'tang_giam'
								? 'bao-cao-tang-giam-thuc-luc-vat-tu.docx'
								: 'bao-cao-tong-hop-thuc-luc-theo-ky.docx'
					}
					if (!isWord) {
						toast.error(
							'Báo cáo tổng hợp kỳ hiện xuất Word. Chọn định dạng Word.'
						)
						return
					}
					if (exportKyMode === 'tang_giam') {
						await exportPeriodTangGiamWord(periodRows, kyMeta)
						toast.success(
							'Đã xuất báo cáo tăng/giảm thực lực (Word)'
						)
					} else {
						await exportPeriodThucLucWord(
							periodRows,
							reportUnits,
							kyMeta
						)
						toast.success(
							'Đã xuất báo cáo tổng hợp thực lực theo kỳ (Word)'
						)
					}
				} else if (exportKind === 'thuc_luc_su_dung') {
					// 3. VT đang sử dụng — toàn bộ hoặc 1 đơn vị; vị trí / tổng thể
					const allRows = toThucRows()
					const isAllUnits = !exportUnitId || exportUnitId === 'all'
					let unitRows = allRows
					let oneUnit = reportUnits
					let unitLb = 'Toàn bộ đơn vị'
					if (!isAllUnits) {
						if (exportUnitId === 'kho') {
							unitRows = allRows.filter((a) => !!a.isWarehouse)
							oneUnit = []
							unitLb = 'KHO'
						} else {
							const uid = Number(exportUnitId)
							unitRows = allRows.filter(
								(a) =>
									!a.isWarehouse &&
									a.holdingUnitId != null &&
									a.holdingUnitId === uid
							)
							const su = reportUnits.find((u) => u.id === uid)
							oneUnit = su
								? [su]
								: reportUnits.filter((u) => u.id === uid)
							unitLb = su
								? `${(su.alias || su.name).toUpperCase()}`
								: `ĐV #${uid}`
						}
					}
					if (!unitRows.length) {
						toast.error(
							`Không có vật tư đang sử dụng (${unitLb}) để xuất`
						)
						return
					}
					const sdMeta: MilitaryReportMeta = {
						...meta,
						reportTitle:
							'BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ, TRANG BỊ KỸ THUẬT HIỆN CÓ',
						scopeLabel: `Đơn vị sử dụng: ${unitLb}`,
						filename:
							exportLayout === 'vi_tri'
								? `bao-cao-vt-dang-su-dung-vi-tri.docx`
								: `bao-cao-vt-dang-su-dung-tong-the.docx`
					}
					if (isWord) {
						await exportThucLucTheoDonViWord(
							unitRows,
							isAllUnits ? reportUnits : oneUnit,
							sdMeta,
							exportLayout === 'vi_tri' ? 'vi_tri' : 'tong_hop'
						)
					} else if (exportLayout === 'tong_hop') {
						await exportThucLucTongHopExcel(
							unitRows,
							isAllUnits ? reportUnits : oneUnit,
							sdMeta
						)
					} else {
						await exportThucLucTheoViTriExcel(
							unitRows,
							isAllUnits ? reportUnits : oneUnit,
							sdMeta
						)
					}
					toast.success(
						`Đã xuất VT đang sử dụng (${unitLb}) — ${
							exportLayout === 'vi_tri'
								? 'vị trí lắp đặt'
								: 'tổng thể'
						} (${isWord ? 'Word' : 'Excel'})`
					)
				} else if (exportKind === 'thuc_luc_nganh') {
					// 2. Theo chuyên ngành = đúng danh mục materials, không dump hết room_assets
					if (!exportChuyenNganhCode) {
						toast.error(
							'Chọn chuyên ngành trước khi xuất (vd. HC2A01 Máy tính để bàn = 13 thiết bị danh mục)'
						)
						return
					}

					const catalog = await GetAssetCatalog({
						nganhCode:
							exportNganhCode !== 'all'
								? exportNganhCode
								: undefined,
						chuyenNganhCode: exportChuyenNganhCode
					})
					const matList = catalog.materials
					if (!matList.length) {
						toast.error(
							'Danh mục không có thiết bị nào cho chuyên ngành đã chọn'
						)
						return
					}

					const matsByCode = new Map<string, CatalogMaterial>()
					for (const m of matList) {
						matsByCode.set(m.code.toUpperCase(), m)
					}

					// Tồn hiện có: gộp room_assets theo mã danh mục + phân cấp + đơn vị giữ
					type InvAcc = {
						material: CatalogMaterial
						grade: number
						byHolding: Map<number | 'none', number>
						sample: (typeof assets)[number] | null
					}
					const inv = new Map<string, InvAcc>()

					const resolveMat = (
						code: string | null | undefined
					): CatalogMaterial | undefined => {
						const base = extractMaterialBaseCode(code)
						if (base && matsByCode.has(base))
							return matsByCode.get(base)
						for (const m of matList) {
							if (assetMatchesMaterialCode(code, m.code)) return m
						}
						return undefined
					}

					for (const a of assets) {
						if ((a.quantity ?? 0) <= 0) continue
						if (String(a.status || '').toUpperCase() === 'DISPOSED')
							continue
						const mat = resolveMat(a.code)
						if (!mat) continue
						const gradeRaw = Number(a.grade ?? 1)
						const grade =
							gradeRaw >= 1 && gradeRaw <= 5
								? Math.round(gradeRaw)
								: 1
						const key = `${mat.code.toUpperCase()}|${grade}`
						let acc = inv.get(key)
						if (!acc) {
							acc = {
								material: mat,
								grade,
								byHolding: new Map(),
								sample: a
							}
							inv.set(key, acc)
						}
						const hid =
							(a as { holdingUnitId?: number | null })
								.holdingUnitId ?? 'none'
						const q = Number(a.quantity) || 0
						acc.byHolding.set(
							hid,
							(acc.byHolding.get(hid) || 0) + q
						)
					}

					const thucRows: ThucLucAssetRow[] = []
					const materialsWithInv = new Set<string>()

					const pushRow = (
						m: CatalogMaterial,
						grade: number,
						qty: number,
						holdingUnitId: number | null,
						sample: (typeof assets)[number] | null
					) => {
						const L = sample ? loc.get(sample.roomId) : undefined
						thucRows.push({
							id: sample?.id ?? m.id,
							createdAt: sample?.createdAt ?? '',
							updatedAt: sample?.updatedAt ?? '',
							roomId: sample?.roomId ?? 0,
							code: m.code,
							name: m.name,
							// Nhóm section = chuyên ngành (đúng danh mục Excel)
							category: `${m.categoryCode} — ${m.categoryName}`,
							quantity: qty,
							brokenQuantity: 0,
							unit: m.unit,
							holdingUnitId,
							grade,
							status: 'NORMAL',
							roomCode: L?.roomCode,
							roomName: L?.roomName,
							buildingName: L?.buildingName,
							buildingCode: L?.buildingCode,
							floorName: L?.floorName,
							isWarehouse: false
						} as ThucLucAssetRow)
					}

					for (const acc of inv.values()) {
						materialsWithInv.add(acc.material.code.toUpperCase())
						for (const [hid, qty] of acc.byHolding) {
							pushRow(
								acc.material,
								acc.grade,
								qty,
								hid === 'none' ? null : hid,
								acc.sample
							)
						}
					}

					// Liệt kê đủ thiết bị danh mục chuyên ngành (kể cả SL=0) — vd. HC2A01 = 13
					for (const m of matList) {
						if (materialsWithInv.has(m.code.toUpperCase())) continue
						pushRow(m, 1, 0, null, null)
					}

					if (!thucRows.length) {
						toast.error(
							'Không có vật tư thuộc chuyên ngành đã chọn'
						)
						return
					}

					const fileBase = `bao-cao-thuc-luc-theo-chuyen-nganh-${exportChuyenNganhCode.toLowerCase()}`
					const cnMeta: MilitaryReportMeta = {
						...meta,
						reportTitle:
							'BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ HIỆN CÓ THEO CHUYÊN NGÀNH',
						filename:
							exportLayout === 'tong_hop'
								? `${fileBase}${isWord ? '.docx' : '.xlsx'}`
								: `${fileBase}-vi-tri${isWord ? '.docx' : '.xlsx'}`,
						includeZeroQuantity: true
					}

					if (exportLayout === 'tong_hop') {
						if (isWord) {
							await exportThucLucTongHopWord(
								thucRows,
								reportUnits,
								cnMeta
							)
						} else {
							await exportThucLucTongHopExcel(
								thucRows,
								reportUnits,
								cnMeta
							)
						}
						toast.success(
							`Đã xuất theo chuyên ngành — ${matList.length} thiết bị danh mục` +
								(selectedCn
									? ` · ${selectedCn.code} ${selectedCn.name}`
									: '') +
								` (${isWord ? 'Word' : 'Excel'})`
						)
					} else {
						const withQty = thucRows.filter(
							(r) => (Number(r.quantity) || 0) > 0
						)
						if (!withQty.length) {
							toast.error(
								'Không có SL hiện có để xuất theo vị trí'
							)
							return
						}
						if (isWord) {
							await exportThucLucTheoViTriWord(
								withQty,
								reportUnits,
								cnMeta
							)
						} else {
							await exportThucLucTheoViTriExcel(
								withQty,
								reportUnits,
								cnMeta
							)
						}
						toast.success(
							`Đã xuất theo chuyên ngành — vị trí lắp đặt (chỉ VT có SL) (${isWord ? 'Word' : 'Excel'})`
						)
					}
				} else if (exportKind === 'thuc_luc_don_vi') {
					// 3. Theo từng đơn vị = giống xuất tổng nhưng chỉ 1 đơn vị đã chọn
					const allRows = toThucRows()
					const isKhoSel = exportUnitId === 'kho'
					const uid = isKhoSel ? null : Number(exportUnitId)
					const unitRows = allRows.filter((a) => {
						// KHO = VT đang ở kho; ĐV = VT gán holdingUnitId đúng đơn vị
						// (không còn coi «chưa gán ĐV» là kho — VT vẫn thuộc tòa/phòng)
						if (isKhoSel) return !!a.isWarehouse
						return (
							!a.isWarehouse &&
							a.holdingUnitId != null &&
							a.holdingUnitId === uid
						)
					})
					if (!unitRows.length) {
						toast.error(
							`Không có vật tư thuộc đơn vị ${unitScopeLabel || ''} để xuất`
						)
						return
					}
					// Cột đơn vị chỉ còn đúng đơn vị đang chọn (KHO = bảng không cột ĐV)
					const oneUnit = isKhoSel
						? []
						: selectedUnit
							? [selectedUnit]
							: reportUnits.filter((u) => u.id === uid)

					const dvBase = `bao-cao-thuc-luc-don-vi-${(unitScopeLabel || 'dv').toLowerCase()}`
					const dvMeta: MilitaryReportMeta = {
						...meta,
						filename:
							exportLayout === 'tong_hop'
								? `${dvBase}${isWord ? '.docx' : '.xlsx'}`
								: `${dvBase}-vi-tri${isWord ? '.docx' : '.xlsx'}`
					}

					if (exportLayout === 'tong_hop') {
						if (isWord) {
							await exportThucLucTongHopWord(
								unitRows,
								oneUnit,
								dvMeta
							)
						} else {
							await exportThucLucTongHopExcel(
								unitRows,
								oneUnit,
								dvMeta
							)
						}
					} else {
						if (isWord) {
							await exportThucLucTheoViTriWord(
								unitRows,
								oneUnit,
								dvMeta
							)
						} else {
							await exportThucLucTheoViTriExcel(
								unitRows,
								oneUnit,
								dvMeta
							)
						}
					}
					toast.success(
						exportLayout === 'tong_hop'
							? `Đã xuất thực lực đơn vị ${unitScopeLabel} — tổng hợp (${isWord ? 'Word' : 'Excel'})`
							: `Đã xuất thực lực đơn vị ${unitScopeLabel} — theo vị trí (${isWord ? 'Word' : 'Excel'})`
					)
				} else if (exportKind === 'damaged') {
					if (isWord) {
						if (exportLayout === 'vi_tri') {
							await exportDamagedRepairGroupedWord(broken, {
								groupBy: 'room',
								...meta
							})
						} else {
							await exportDamagedRepairAssetsWord(broken, meta)
						}
					} else {
						if (exportLayout === 'vi_tri') {
							await exportDamagedRepairGroupedExcel(broken, {
								groupBy: 'room',
								scopeLabel
							})
						} else {
							await exportDamagedRepairAssetsExcel(broken, {
								scopeLabel
							})
						}
					}
					toast.success(
						`Đã xuất báo cáo hư hại / sửa chữa (${broken.length} dòng) — ${isWord ? 'Word' : 'Excel'}`
					)
				} else {
					// 3. Báo cáo kho
					if (isWord) {
						await exportWarehouseAssetsWord(stable, broken, meta)
					} else {
						await exportWarehouseAssetsExcel(stable, broken, {
							scopeLabel
						})
					}
					toast.success(
						`Đã xuất báo cáo kho — ${isWord ? 'Word' : 'Excel'}`
					)
				}
			} else if (isMovementReport) {
				const allRows = await GetAssetMovementReport({
					buildingId:
						exportBuildingId === 'all'
							? undefined
							: Number(exportBuildingId),
					roomId:
						exportRoomId === 'all'
							? undefined
							: Number(exportRoomId),
					fromDate: exportFrom || undefined,
					toDate: exportTo || undefined
				})

				const matchQd = (
					decision: string | null | undefined,
					query: string
				) => {
					if (!query.trim()) return true
					if (decision == null || !String(decision).trim())
						return false
					const d = String(decision).trim().toLocaleLowerCase('vi')
					const qq = query.trim().toLocaleLowerCase('vi')
					if (d === qq || d.includes(qq)) return true
					const strip = (s: string) => s.replace(/^0+/, '') || '0'
					return strip(d) === strip(qq)
				}

				// Quyết định điều động
				if (exportKind === 'qd_transfer') {
					let rows = allRows.filter(
						(r) => r.movementType === 'TRANSFER'
					)
					if (exportDecisionNumber.trim()) {
						rows = rows.filter((r) =>
							matchQd(r.decisionNumber, exportDecisionNumber)
						)
					}
					if (!rows.length) {
						toast.error(
							exportDecisionNumber.trim()
								? `Không có QĐ điều động khớp «${exportDecisionNumber.trim()}»`
								: 'Không có nhật ký điều động trong khoảng ngày'
						)
						return
					}
					const meta = wordMeta(
						[
							scopeLabel,
							exportDecisionNumber.trim()
								? `QĐ ${exportDecisionNumber.trim()}`
								: null
						]
							.filter(Boolean)
							.join(' · ') || undefined,
						{ filename: 'bao-cao-quyet-dinh-dieu-dong.docx' }
					)
					if (exportFormat === 'word') {
						await exportTransferRecallLogsWord(rows, meta)
					} else {
						await exportAssetMovementsExcel(
							rows,
							'bao-cao-quyet-dinh-dieu-dong.xlsx'
						)
					}
					toast.success(
						`Đã xuất QĐ điều động (${rows.length} dòng) — ${exportFormat === 'word' ? 'Word' : 'Excel'}`
					)
				} else if (exportKind === 'qd_recall') {
					// Quyết định thu hồi / trả về
					let rows = allRows.filter(
						(r) => r.movementType === 'RECALL'
					)
					if (exportDecisionNumber.trim()) {
						rows = rows.filter((r) =>
							matchQd(r.decisionNumber, exportDecisionNumber)
						)
					}
					if (!rows.length) {
						toast.error(
							exportDecisionNumber.trim()
								? `Không có QĐ thu hồi/trả về khớp «${exportDecisionNumber.trim()}»`
								: 'Không có nhật ký thu hồi / trả về trong khoảng ngày'
						)
						return
					}
					const meta = wordMeta(
						[
							scopeLabel,
							exportDecisionNumber.trim()
								? `QĐ ${exportDecisionNumber.trim()}`
								: null
						]
							.filter(Boolean)
							.join(' · ') || undefined,
						{ filename: 'bao-cao-quyet-dinh-thu-hoi-tra-ve.docx' }
					)
					if (exportFormat === 'word') {
						await exportTransferRecallLogsWord(rows, meta)
					} else {
						await exportAssetMovementsExcel(
							rows,
							'bao-cao-quyet-dinh-thu-hoi-tra-ve.xlsx'
						)
					}
					toast.success(
						`Đã xuất QĐ thu hồi/trả về (${rows.length} dòng) — ${exportFormat === 'word' ? 'Word' : 'Excel'}`
					)
				} else {
					// Cập nhật tăng / giảm — lọc hướng + lý do
					let rows = allRows.filter((r) =>
						UPDATE_MOVEMENT_TYPES.has(r.movementType)
					)
					if (exportUpdateDir === 'INCREASE') {
						rows = rows.filter((r) => r.movementType === 'INCREASE')
					} else if (exportUpdateDir === 'DECREASE') {
						rows = rows.filter((r) => r.movementType === 'DECREASE')
					}
					if (exportUpdateReason !== 'all') {
						rows = rows.filter(
							(r) =>
								(r.reasonCode || '').toUpperCase() ===
								exportUpdateReason
						)
					}
					if (!rows.length) {
						toast.error(
							'Không có nhật ký cập nhật khớp hướng/lý do trong khoảng ngày'
						)
						return
					}
					const dirLb =
						exportUpdateDir === 'INCREASE'
							? 'tăng'
							: exportUpdateDir === 'DECREASE'
								? 'giảm'
								: 'tăng-giảm'
					const reasonLb =
						exportUpdateReason !== 'all'
							? INCREASE_REASON_LABELS[exportUpdateReason] ||
								DECREASE_REASON_LABELS[exportUpdateReason] ||
								exportUpdateReason
							: null
					const meta = wordMeta(
						[scopeLabel, dirLb, reasonLb]
							.filter(Boolean)
							.join(' · ') || undefined
					)
					if (exportFormat === 'word') {
						await exportAssetMovementsWord(rows, meta)
					} else {
						await exportAssetMovementsExcel(
							rows,
							'bao-cao-cap-nhat-vat-tu.xlsx'
						)
					}
					toast.success(
						`Đã xuất cập nhật ${dirLb}${reasonLb ? ` · ${reasonLb}` : ''} (${rows.length} dòng) — ${exportFormat === 'word' ? 'Word' : 'Excel'}`
					)
				}
			}
			setExportOpen(false)
		} catch (e) {
			toast.error(
				exportFormat === 'word'
					? 'Xuất Word thất bại'
					: 'Xuất Excel thất bại',
				{
					description: (e as Error).message
				}
			)
		} finally {
			setExportPending(false)
		}
	}

	return (
		<div className='space-y-6 p-6 md:p-8'>
			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Báo cáo vật tư
					</h1>
					{bghOnly && (
						<p className='text-sm text-muted-foreground mt-1'>
							Ban Giám Hiệu: xem <strong>thống kê</strong> và{' '}
							<strong>kho</strong> — không xem nhật ký / lịch sử
							sửa chữa.
						</p>
					)}
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button variant='outline' asChild>
						<Link to='/vat-tu'>Danh mục tòa nhà</Link>
					</Button>
					<Button variant='outline' onClick={refetchAll}>
						<RefreshCw className='w-4 h-4 mr-2' />
						Làm mới
					</Button>
					<Button onClick={openExportDialog}>
						<FileText className='w-4 h-4 mr-2' />
						Xuất báo cáo
					</Button>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='text-base'>Bộ lọc</CardTitle>
					<CardDescription>
						Áp dụng cho thống kê, kho, hỏng/sửa, hết hạn. Khoảng
						ngày dùng cho lịch sử SC, nhật ký cập nhật và khi xuất
						báo cáo.
					</CardDescription>
				</CardHeader>
				<CardContent className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
					<div className='space-y-2'>
						<Label>Tòa nhà</Label>
						<SearchableSelect
							value={buildingId}
							onValueChange={(v) => {
								setBuildingId(v)
								setFloorId('all')
								setMovementRoomId('all')
							}}
							placeholder='Tất cả tòa'
							searchPlaceholder='Gõ tên tòa…'
							emptyText='Không có tòa khớp'
							options={[
								{
									value: 'all',
									label: 'Tất cả',
									keywords: 'tat ca all'
								},
								...buildings.map((b) => ({
									value: String(b.id),
									label: b.name,
									keywords: [b.name, b.code]
										.filter(Boolean)
										.join(' ')
								}))
							]}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Tầng</Label>
						<SearchableSelect
							value={floorId}
							onValueChange={setFloorId}
							disabled={buildingId === 'all'}
							placeholder='Tất cả tầng'
							searchPlaceholder='Gõ tên tầng…'
							emptyText='Không có tầng khớp'
							options={[
								{
									value: 'all',
									label: 'Tất cả',
									keywords: 'tat ca all'
								},
								...floors.map((f) => ({
									value: String(f.id),
									label: f.name,
									keywords: [f.name, f.code]
										.filter(Boolean)
										.join(' ')
								}))
							]}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Loại / nhóm vật tư</Label>
						<Input
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							placeholder='VD: IT, Điện lạnh'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Từ ngày</Label>
						<Input
							type='date'
							value={fromDate}
							onChange={(e) => setFromDate(e.target.value)}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Đến ngày</Label>
						<Input
							type='date'
							value={toDate}
							onChange={(e) => setToDate(e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Dialog xuất báo cáo */}
			<Dialog open={exportOpen} onOpenChange={setExportOpen}>
				<DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Xuất báo cáo</DialogTitle>
						<p className='text-xs text-muted-foreground pt-1'>
							Đầu / cuối trang Word lấy từ{' '}
							<Link
								to='/vat-tu/mau-bao-cao'
								className='text-primary underline-offset-2 hover:underline'
								onClick={() => setExportOpen(false)}
							>
								Mẫu báo cáo Word
							</Link>{' '}
							(sửa một lần → mọi file Word đổi theo).
						</p>
					</DialogHeader>
					<div className='space-y-4 py-1'>
						<div className='space-y-2'>
							<Label>Định dạng</Label>
							<Select
								value={exportFormat}
								onValueChange={(v) =>
									setExportFormat(v as 'excel' | 'word')
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='word'>
										Word (.docx) — mẫu báo cáo quân đội VN
									</SelectItem>
									<SelectItem value='excel'>
										Excel (.xlsx) — đầy đủ chi tiết
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-2'>
							<Label>Loại báo cáo</Label>
							<Select
								value={exportKind}
								onValueChange={(v) => {
									const kind = v as ExportKind
									setExportKind(kind)
									setExportRoomId('all')
									setExportNganhCode('all')
									setExportChuyenNganhCode('')
									setExportDecisionNumber('')
									setExportUpdateDir('all')
									setExportUpdateReason('all')
									if (kind === 'thuc_luc_nganh') {
										void loadChuyenNganhForExport('all')
									} else {
										setCatalogChuyenNganh([])
									}
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='thuc_luc'>
										1. Thống kê VT hiện có (tòa / phòng)
									</SelectItem>
									<SelectItem value='tong_hop_ky'>
										2. Tổng hợp thực lực / tăng-giảm theo kỳ
									</SelectItem>
									<SelectItem value='thuc_luc_su_dung'>
										3. Vật tư đang sử dụng (toàn bộ / đơn
										vị)
									</SelectItem>
									<SelectItem value='warehouse'>
										4. Báo cáo kho (ổn định / hư hại)
									</SelectItem>
									<SelectItem value='kho_he_thong'>
										5. Kho hệ thống KHO-VT (thu hồi / trả
										trên)
									</SelectItem>
									{!bghOnly && (
										<>
											<SelectItem value='qd_transfer'>
												6. Quyết định điều động
											</SelectItem>
											<SelectItem value='qd_recall'>
												7. Quyết định thu hồi / trả về
											</SelectItem>
											<SelectItem value='damaged'>
												8. Vật tư đang hư hại / sửa chữa
											</SelectItem>
											<SelectItem value='updates'>
												9. Cập nhật tăng / giảm
											</SelectItem>
										</>
									)}
								</SelectContent>
							</Select>
							<p className='text-xs text-muted-foreground'>
								{exportKind === 'thuc_luc' &&
									'Mẫu thực lực hiện có: tòa → phòng → ngành → tên VT. Lọc tòa/phòng tùy chọn (Tất cả = toàn trường).'}
								{exportKind === 'tong_hop_ky' &&
									'Phạm vi Tất cả / Ngành / Đơn vị. «Thực lực» hoặc «Tăng giảm». Điền từ–đến ngày. Chỉ Word.'}
								{exportKind === 'thuc_luc_su_dung' &&
									'VT đang sử dụng. Chọn Toàn bộ hoặc 1 đơn vị. Vị trí lắp đặt hoặc tổng thể.'}
								{exportKind === 'warehouse' &&
									'Kho ổn định / hư hại theo tòa–phòng (tồn hiện có).'}
								{exportKind === 'kho_he_thong' &&
									'Toàn bộ VT trong kho hệ thống KHO-VT (sau thu hồi / trả trên).'}
								{exportKind === 'qd_transfer' &&
									'Nhật ký điều động. Có thể nhập số QĐ (để trống = tất cả trong kỳ).'}
								{exportKind === 'qd_recall' &&
									'Nhật ký thu hồi / trả về kho. Có thể nhập số QĐ (để trống = tất cả trong kỳ).'}
								{exportKind === 'damaged' &&
									'Chỉ vật tư hư hại / đang sửa chữa.'}
								{exportKind === 'updates' &&
									'Chọn tăng hoặc giảm, rồi lý do (mua sắm, thanh lý…). Lọc theo khoảng ngày.'}
							</p>
						</div>

						{/* QĐ điều động / thu hồi: số quyết định */}
						{(exportKind === 'qd_transfer' ||
							exportKind === 'qd_recall') && (
							<div className='space-y-2'>
								<Label>Số quyết định (tùy chọn)</Label>
								<Input
									placeholder='VD: 009 — để trống = tất cả trong kỳ'
									value={exportDecisionNumber}
									onChange={(e) =>
										setExportDecisionNumber(e.target.value)
									}
								/>
								<p className='text-xs text-muted-foreground'>
									Nhập số QĐ để lọc đúng phiếu; để trống sẽ
									xuất toàn bộ điều động/thu hồi trong khoảng
									ngày.
								</p>
							</div>
						)}

						{/* Cập nhật tăng/giảm: hướng + lý do */}
						{exportKind === 'updates' && (
							<>
								<div className='space-y-2'>
									<Label>Muốn xem</Label>
									<Select
										value={exportUpdateDir}
										onValueChange={(v) => {
											setExportUpdateDir(
												v as ExportUpdateDir
											)
											setExportUpdateReason('all')
										}}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='all'>
												Tất cả (tăng + giảm)
											</SelectItem>
											<SelectItem value='INCREASE'>
												Chỉ tăng
											</SelectItem>
											<SelectItem value='DECREASE'>
												Chỉ giảm
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className='space-y-2'>
									<Label>
										{exportUpdateDir === 'INCREASE'
											? 'Tăng về (lý do)'
											: exportUpdateDir === 'DECREASE'
												? 'Giảm về (lý do)'
												: 'Lý do (tùy chọn)'}
									</Label>
									<Select
										value={exportUpdateReason}
										onValueChange={setExportUpdateReason}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='all'>
												Tất cả lý do
											</SelectItem>
											{(exportUpdateDir === 'DECREASE'
												? Object.entries(
														DECREASE_REASON_LABELS
													).filter(
														([k]) =>
															k !== 'ADJUST' &&
															k !== 'GRADE_UP'
													)
												: exportUpdateDir === 'INCREASE'
													? Object.entries(
															INCREASE_REASON_LABELS
														)
													: [
															...Object.entries(
																INCREASE_REASON_LABELS
															).map(
																([k, v]) =>
																	[
																		k,
																		`Tăng: ${v}`
																	] as const
															),
															...Object.entries(
																DECREASE_REASON_LABELS
															)
																.filter(
																	([k]) =>
																		k !==
																			'ADJUST' &&
																		k !==
																			'GRADE_UP'
																)
																.map(
																	([k, v]) =>
																		[
																			k,
																			`Giảm: ${v}`
																		] as const
																)
														]
											).map(([k, v]) => (
												<SelectItem key={k} value={k}>
													{v}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</>
						)}

						{/* Báo cáo 2: phạm vi tất cả / ngành / đơn vị + chế độ */}
						{exportKind === 'tong_hop_ky' ? (
							<>
								<div className='space-y-2'>
									<Label>
										Phạm vi
										<span className='text-destructive'>
											{' '}
											*
										</span>
									</Label>
									<Select
										value={exportKyScope}
										onValueChange={(v) => {
											setExportKyScope(v as ExportKyScope)
											if (v !== 'nganh')
												setExportNganhCode('all')
											if (v !== 'don_vi')
												setExportUnitId('')
										}}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='all'>
												Tất cả (toàn trường)
											</SelectItem>
											<SelectItem value='nganh'>
												Theo ngành
											</SelectItem>
											<SelectItem value='don_vi'>
												Theo đơn vị
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{exportKyScope === 'nganh' && (
									<div className='space-y-2'>
										<Label>
											Ngành
											<span className='text-destructive'>
												{' '}
												*
											</span>
										</Label>
										<Select
											value={
												exportNganhCode === 'all'
													? undefined
													: exportNganhCode
											}
											onValueChange={setExportNganhCode}
										>
											<SelectTrigger
												className={
													exportNganhCode === 'all'
														? 'border-destructive/60'
														: undefined
												}
											>
												<SelectValue placeholder='— Chọn ngành —' />
											</SelectTrigger>
											<SelectContent>
												{NGANH_LIST.map((n) => (
													<SelectItem
														key={n.code}
														value={n.code}
													>
														{nganhLabel(n)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
								{exportKyScope === 'don_vi' && (
									<div className='space-y-2'>
										<Label>
											Đơn vị
											<span className='text-destructive'>
												{' '}
												*
											</span>
										</Label>
										<Select
											value={exportUnitId || undefined}
											onValueChange={setExportUnitId}
										>
											<SelectTrigger
												className={
													!exportUnitId
														? 'border-destructive/60'
														: undefined
												}
											>
												<SelectValue placeholder='— Chọn đơn vị —' />
											</SelectTrigger>
											<SelectContent>
												{reportUnits.map((u) => (
													<SelectItem
														key={u.id}
														value={String(u.id)}
													>
														{(
															u.alias || u.name
														).toUpperCase()}
														{u.alias
															? ` — ${u.name}`
															: ''}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
								<div className='space-y-2 rounded-md border p-3'>
									<Label>Loại báo cáo kỳ</Label>
									<label className='flex items-start gap-2 text-sm cursor-pointer'>
										<input
											type='radio'
											name='exportKyMode'
											className='mt-1'
											checked={
												exportKyMode === 'thuc_luc'
											}
											onChange={() =>
												setExportKyMode('thuc_luc')
											}
										/>
										<span>
											<strong>Thực lực vật tư</strong>
											<span className='block text-xs text-muted-foreground'>
												Đầu kỳ · Tăng · Giảm · Cuối kỳ +
												cột đơn vị (mẫu tổng hợp).
											</span>
										</span>
									</label>
									<label className='flex items-start gap-2 text-sm cursor-pointer'>
										<input
											type='radio'
											name='exportKyMode'
											className='mt-1'
											checked={
												exportKyMode === 'tang_giam'
											}
											onChange={() =>
												setExportKyMode('tang_giam')
											}
										/>
										<span>
											<strong>Tăng giảm vật tư</strong>
											<span className='block text-xs text-muted-foreground'>
												Bảng giải thích tăng/giảm theo
												lý do (mua sắm, thanh lý…).
											</span>
										</span>
									</label>
								</div>
							</>
						) : exportKind === 'thuc_luc_su_dung' ? (
							<div className='space-y-2'>
								<Label>
									Đơn vị sử dụng
									<span className='text-destructive'> *</span>
								</Label>
								<Select
									value={exportUnitId || 'all'}
									onValueChange={setExportUnitId}
								>
									<SelectTrigger>
										<SelectValue placeholder='Toàn bộ / chọn đơn vị' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>
											Tất cả (toàn bộ đơn vị)
										</SelectItem>
										{reportUnits.map((u) => (
											<SelectItem
												key={u.id}
												value={String(u.id)}
											>
												{(
													u.alias || u.name
												).toUpperCase()}
												{u.alias ? ` — ${u.name}` : ''}
											</SelectItem>
										))}
										<SelectItem value='kho'>KHO</SelectItem>
									</SelectContent>
								</Select>
								<p className='text-xs text-muted-foreground'>
									Chọn Tất cả hoặc một đơn vị. Cuối form tích
									vị trí lắp đặt hoặc tổng thể.
								</p>
							</div>
						) : exportKind === 'thuc_luc_nganh' ? (
							<>
								<div className='space-y-2'>
									<Label>Ngành (lọc danh sách)</Label>
									<Select
										value={exportNganhCode}
										onValueChange={(v) => {
											setExportNganhCode(v)
											setExportChuyenNganhCode('')
											void loadChuyenNganhForExport(v)
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder='Tất cả ngành' />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='all'>
												Tất cả ngành
											</SelectItem>
											{NGANH_LIST.map((n) => (
												<SelectItem
													key={n.code}
													value={n.code}
												>
													{nganhLabel(n)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className='space-y-2'>
									<Label>
										Chuyên ngành
										<span className='text-destructive'>
											{' '}
											*
										</span>
									</Label>
									<SearchableSelect
										value={exportChuyenNganhCode}
										onValueChange={setExportChuyenNganhCode}
										placeholder='— Chọn chuyên ngành (bắt buộc) —'
										searchPlaceholder='Gõ mã/tên (vd: máy in, HC2A05)…'
										emptyText='Không có chuyên ngành khớp'
										className={
											!exportChuyenNganhCode
												? 'border-destructive/60'
												: undefined
										}
										options={catalogChuyenNganh.map(
											(c) => ({
												value: c.code,
												label: `${c.code} — ${c.name}`,
												keywords: `${c.code} ${c.name}`
											})
										)}
									/>
									<p className='text-xs text-muted-foreground'>
										Bắt buộc: chỉ xuất đúng thiết bị trong
										chuyên ngành (danh mục Excel). Ví dụ
										HC2A01 Máy tính để bàn = 13 mục, không
										xuất lẫn chuyên ngành khác.
									</p>
								</div>
							</>
						) : exportKind === 'kho_he_thong' ||
						  exportKind === 'qd_transfer' ||
						  exportKind === 'qd_recall' ||
						  exportKind === 'updates' ? null : (
							<>
								<div className='space-y-2'>
									<Label>Tòa nhà</Label>
									<SearchableSelect
										value={exportBuildingId}
										onValueChange={(v) => {
											setExportBuildingId(v)
											setExportRoomId('all')
										}}
										placeholder='Tất cả tòa'
										searchPlaceholder='Gõ tên tòa…'
										emptyText='Không có tòa khớp'
										options={[
											{
												value: 'all',
												label: 'Tất cả tòa',
												keywords: 'tat ca all'
											},
											...buildings.map((b) => ({
												value: String(b.id),
												label: b.name,
												keywords: [b.name, b.code]
													.filter(Boolean)
													.join(' ')
											}))
										]}
									/>
								</div>

								<div className='space-y-2'>
									<Label>Phòng</Label>
									<SearchableSelect
										value={exportRoomId}
										onValueChange={setExportRoomId}
										placeholder='Tất cả phòng'
										searchPlaceholder='Gõ tên/mã phòng (vd: Chính)…'
										emptyText='Không có phòng khớp'
										options={[
											{
												value: 'all',
												label:
													exportBuildingId !== 'all'
														? 'Tất cả phòng (trong tòa)'
														: 'Tất cả phòng',
												keywords: 'tat ca all'
											},
											...exportRooms.map((r) => ({
												value: String(r.id),
												label:
													exportBuildingId === 'all'
														? `${r.roomName} — ${r.buildingName}`
														: r.roomName,
												keywords: [
													r.roomName,
													r.roomCode,
													r.buildingName
												]
													.filter(Boolean)
													.join(' ')
											}))
										]}
									/>
									<p className='text-xs text-muted-foreground'>
										Gõ để lọc tòa/phòng (không phân biệt
										hoa/thường). Dùng khi xuất báo cáo cập
										nhật và các báo cáo khác.
									</p>
								</div>
							</>
						)}

						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label>Từ ngày</Label>
								<Input
									type='date'
									value={exportFrom}
									onChange={(e) =>
										setExportFrom(e.target.value)
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Đến ngày</Label>
								<Input
									type='date'
									value={exportTo}
									onChange={(e) =>
										setExportTo(e.target.value)
									}
								/>
							</div>
						</div>
						<p className='text-xs text-muted-foreground'>
							{exportKind === 'tong_hop_ky'
								? 'Bắt buộc cho báo cáo kỳ: từ ngày–đến ngày (tính tăng/giảm trong khoảng). Nên chọn đủ cả hai.'
								: exportKind === 'updates'
									? 'Lọc nhật ký theo ngày thực hiện (để trống = tất cả).'
									: 'Khoảng ngày ghi phạm vi trên header (để trống = đến hôm nay).'}
						</p>

						{/* Cách xuất: vị trí lắp đặt | tổng thể — báo cáo 1, 3, hư hại */}
						{(exportKind === 'thuc_luc' ||
							exportKind === 'thuc_luc_su_dung' ||
							exportKind === 'damaged') && (
							<div className='space-y-2 rounded-md border p-3'>
								<Label>Cách xuất file</Label>
								<div className='space-y-2'>
									<label className='flex items-start gap-2 text-sm cursor-pointer'>
										<input
											type='radio'
											name='exportLayout'
											className='mt-1'
											checked={exportLayout === 'vi_tri'}
											onChange={() =>
												setExportLayout('vi_tri')
											}
										/>
										<span>
											<strong>Theo vị trí lắp đặt</strong>
											<span className='block text-xs text-muted-foreground'>
												{exportKind === 'damaged'
													? 'Tách theo từng phòng / lớp.'
													: 'Tòa → phòng (mã phòng) → ngành → tên VT + cột đơn vị.'}
											</span>
										</span>
									</label>
									<label className='flex items-start gap-2 text-sm cursor-pointer'>
										<input
											type='radio'
											name='exportLayout'
											className='mt-1'
											checked={
												exportLayout === 'tong_hop'
											}
											onChange={() =>
												setExportLayout('tong_hop')
											}
										/>
										<span>
											<strong>Tổng thể</strong>
											<span className='block text-xs text-muted-foreground'>
												{exportKind === 'damaged'
													? 'Gộp một bảng tổng hợp.'
													: 'Gộp theo tòa (không tách phòng): tòa → ngành → tên VT.'}
											</span>
										</span>
									</label>
								</div>
							</div>
						)}

						{exportFormat === 'excel' && (
							<p className='text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2'>
								{exportKind === 'thuc_luc' ||
								exportKind === 'thuc_luc_nganh' ||
								exportKind === 'thuc_luc_don_vi'
									? 'File .xlsx gồm: bảng chính (tổng hợp hoặc vị trí) · sheet Chi tiết (pivot/lọc) · sheet đơn vị (mã cột).'
									: exportKind === 'warehouse'
										? 'File .xlsx: báo cáo kho (ổn định + hư hại) và các sheet chi tiết.'
										: exportKind === 'damaged'
											? 'File .xlsx: danh sách VT hư hại / sửa chữa (lý do, ngày hư, vị trí).'
											: 'File .xlsx: nhật ký cập nhật (tăng / giảm / điều chỉnh).'}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setExportOpen(false)}
							disabled={exportPending}
						>
							Hủy
						</Button>
						<Button
							onClick={handleExportConfirm}
							disabled={exportPending}
						>
							{exportPending
								? 'Đang xuất…'
								: exportFormat === 'word'
									? 'Xuất Word'
									: 'Xuất Excel'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Tabs defaultValue='stats' className='w-full'>
				<TabsList className='flex flex-wrap h-auto gap-1'>
					<TabsTrigger value='stats' className='gap-1.5'>
						<BarChart3 className='w-3.5 h-3.5' />
						Thống kê
					</TabsTrigger>
					{/* BGH: không xem nhật ký hỏng / SC / cập nhật */}
					{!bghOnly && (
						<TabsTrigger value='broken' className='gap-1.5'>
							<AlertTriangle className='w-3.5 h-3.5' />
							Hỏng / Đang sửa
							{brokenQ.data || repairLogQ.data ? (
								<Badge variant='secondary' className='ml-1'>
									{(brokenQ.data?.length ?? 0) +
										(repairLogQ.data?.length ?? 0)}
								</Badge>
							) : null}
						</TabsTrigger>
					)}
					<TabsTrigger value='grade5' className='gap-1.5'>
						Kho ổn định / hư hỏng
						{grade5TotalQty + stableTotalQty > 0 ? (
							<Badge variant='secondary' className='ml-1'>
								{stableTotalQty}/{grade5TotalQty}
							</Badge>
						) : null}
					</TabsTrigger>
					{!bghOnly && (
						<>
							<TabsTrigger value='expiring' className='gap-1.5'>
								<CalendarClock className='w-3.5 h-3.5' />
								Sắp hết hạn
							</TabsTrigger>
							<TabsTrigger value='repairs' className='gap-1.5'>
								<Wrench className='w-3.5 h-3.5' />
								Lịch sử SC
							</TabsTrigger>
							<TabsTrigger value='movements' className='gap-1.5'>
								<FileSpreadsheet className='w-3.5 h-3.5' />
								Nhật ký cập nhật
								{movements.data ? (
									<Badge variant='secondary' className='ml-1'>
										{movements.data.length}
									</Badge>
								) : null}
							</TabsTrigger>
						</>
					)}
				</TabsList>

				{/* ── Stats ── */}
				<TabsContent value='stats' className='mt-4 space-y-4'>
					{statsQ.error ? (
						<ErrorState
							error={statsQ.error}
							onRetry={() => statsQ.refetch()}
						/>
					) : statsQ.isLoading || !statsQ.data ? (
						<div className='grid gap-4 sm:grid-cols-2'>
							<Skeleton className='h-28' />
							<Skeleton className='h-28' />
						</div>
					) : (
						<>
							<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
								<StatTile
									label='Tổng bản ghi vật tư'
									value={statsQ.data.totalAssets}
								/>
								<StatTile
									label='Tổng số lượng'
									value={statsQ.data.totalQuantity}
								/>
								<StatTile
									label='Số nhóm'
									value={statsQ.data.byCategory.length}
								/>
								<StatTile
									label='Số tòa (có VT)'
									value={statsQ.data.byBuilding.length}
								/>
							</div>
							<div className='grid gap-4 lg:grid-cols-2'>
								<ExpandableGroupTable
									title='Theo trạng thái'
									hint='Bấm dòng để xem thiết bị trong trạng thái'
									groups={statsQ.data.byStatus.map((g) => ({
										key: g.status,
										label:
											assetStatusLabel[g.status] ??
											g.status,
										count: g.count,
										quantity: g.quantity,
										items: g.items ?? []
									}))}
								/>
								<ExpandableGroupTable
									title='Theo loại'
									hint='Bấm dòng để xem thiết bị thuộc loại'
									groups={statsQ.data.byCategory.map((g) => ({
										key: g.category,
										label: g.category,
										count: g.count,
										quantity: g.quantity,
										items: g.items ?? []
									}))}
								/>
							</div>
						</>
					)}
				</TabsContent>

				{/* ── Broken / Repairing + nhật ký phiếu (giữ để xuất) ── */}
				<TabsContent value='broken' className='mt-4 space-y-4'>
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<div className='flex items-center gap-2 text-sm'>
							<Switch
								checked={includeRepairing}
								onCheckedChange={setIncludeRepairing}
								id='include-repairing'
							/>
							<Label htmlFor='include-repairing'>
								Gồm cả đang sửa (REPAIRING)
							</Label>
						</div>
						<div className='flex flex-wrap gap-2'>
							<Button
								variant='default'
								size='sm'
								disabled={!brokenLogRows.length}
								onClick={() =>
									exportBrokenEventLogCsv(
										brokenLogRows,
										'nhat-ky-vt-hong-can-sua.csv'
									)
								}
							>
								<Download className='w-4 h-4 mr-1' />
								CSV nhật ký hỏng/SC ({brokenLogRows.length})
							</Button>
							<Button
								variant='outline'
								size='sm'
								disabled={!repairLogRows.length}
								onClick={() =>
									exportRepairLogCsv(
										repairLogRows,
										'nhat-ky-bao-hong-sua-chua.csv'
									)
								}
							>
								<Download className='w-4 h-4 mr-1' />
								CSV phiếu BH ({repairLogRows.length})
							</Button>
							<Button
								variant='outline'
								size='sm'
								disabled={!brokenQ.data?.length}
								onClick={() => {
									if (!brokenQ.data?.length) return
									downloadCsv(
										'vat-tu-hong-hien-tai.csv',
										[
											'Tòa (mã)',
											'Tòa (tên)',
											'Tầng',
											'Phòng (mã)',
											'Phòng (tên)',
											'Mã VT',
											'Thiết bị',
											'Phân loại',
											'SL',
											'Trạng thái',
											'Ngày hư',
											'Ngày bắt đầu sửa',
											'Người sửa',
											'Đã hoàn thành',
											'Ngày hoàn thành'
										],
										brokenQ.data.map((r) => [
											r.buildingCode,
											r.buildingName,
											r.floorName,
											r.roomCode,
											r.roomName,
											r.code || '',
											r.name,
											r.category,
											r.quantity,
											assetStatusLabel[r.status] ??
												r.status,
											r.brokenAt,
											r.repairStartedAt,
											r.repairPerformer,
											r.repairCompleted ? 'Có' : 'Chưa',
											r.repairCompletedAt
										])
									)
									toast.success('Đã xuất CSV (hiện trạng)')
								}}
							>
								<Download className='w-4 h-4 mr-1' />
								CSV hiện trạng
							</Button>
							<Button
								size='sm'
								disabled={!brokenQ.data?.length}
								onClick={async () => {
									const rows = brokenQ.data ?? []
									if (!rows.length) {
										toast.error(
											'Không có dữ liệu hiện trạng'
										)
										return
									}
									try {
										await exportBrokenAssetsExcel(
											rows,
											'vat-tu-hong-hien-tai.xlsx'
										)
										toast.success(
											'Đã tải Excel (hiện trạng)'
										)
									} catch (e) {
										toast.error('Xuất Excel thất bại', {
											description: (e as Error).message
										})
									}
								}}
							>
								<FileSpreadsheet className='w-4 h-4 mr-1' />
								Excel hiện trạng
							</Button>
						</div>
					</div>

					<p className='text-sm text-muted-foreground'>
						<strong>Nhật ký hỏng / cần SC</strong> (đề xuất + báo
						hỏng) được <strong>lưu vĩnh viễn</strong> — đề xuất SC
						giữ nguyên cấp; báo hỏng phòng vẫn cấp 5 → sửa xong cấp
						2. Từ chối/hủy đều ghi snapshot để tải CSV.{' '}
						<strong>Hiện trạng</strong> chỉ VT còn đang hỏng / đang
						sửa.
					</p>

					{/* Nhật ký sự kiện hỏng/SC — vĩnh viễn */}
					{brokenLogsQ.error ? (
						<ErrorState
							error={brokenLogsQ.error}
							onRetry={() => brokenLogsQ.refetch()}
						/>
					) : brokenLogsQ.isLoading ? (
						<Skeleton className='h-32 w-full' />
					) : (
						<BrokenEventLogTable
							title='Nhật ký vật tư hỏng / cần sửa chữa'
							description='Lịch sử đầy đủ (đề xuất SC + báo hỏng phòng). Tải CSV để lưu/báo cáo.'
							rows={brokenLogRows}
							empty='Chưa có sự kiện hỏng/sửa. Khi đơn vị đề xuất SC hoặc báo hỏng, nhật ký sẽ hiện tại đây.'
							onExport={() =>
								exportBrokenEventLogCsv(
									brokenLogRows,
									'nhat-ky-vt-hong-can-sua.csv'
								)
							}
						/>
					)}

					{/* Nhật ký phiếu BH — persistent */}
					{repairLogQ.error ? (
						<ErrorState
							error={repairLogQ.error}
							onRetry={() => repairLogQ.refetch()}
						/>
					) : repairLogQ.isLoading ? (
						<Skeleton className='h-32 w-full' />
					) : (
						<>
							<RepairTicketLogTable
								title='Phiếu báo hỏng đang xử lý'
								description='Phiếu chờ phân công / đang sửa — luôn lưu để xuất'
								rows={repairLogOpen}
								empty='Không có phiếu đang mở.'
							/>
							<RepairTicketLogTable
								title='Phiếu báo hỏng đã hoàn thành / hủy'
								description='Lịch sử phiếu BH sau khi sửa xong hoặc hủy'
								rows={repairLogDone}
								empty='Chưa có phiếu hoàn thành / hủy.'
							/>
						</>
					)}

					{/* Hiện trạng kho hỏng (live assets) */}
					{brokenQ.error ? (
						<ErrorState
							error={brokenQ.error}
							onRetry={() => brokenQ.refetch()}
						/>
					) : brokenQ.isLoading ? (
						<Skeleton className='h-40 w-full' />
					) : (
						<>
							<RepairDetailTable
								title='Hiện trạng — Vật tư HỎNG (cấp 5 / BROKEN)'
								description='Còn trong kho hư hỏng (kể cả đã sửa xong phiếu, chưa tăng phân cấp)'
								rows={brokenOnly}
								empty='Không có vật tư hỏng theo bộ lọc.'
								mode='broken'
							/>
							{includeRepairing && (
								<RepairDetailTable
									title='Hiện trạng — Vật tư ĐANG SỬA'
									description='Người đang sửa và ngày bắt đầu sửa chữa'
									rows={repairingOnly}
									empty='Không có vật tư đang sửa theo bộ lọc.'
									mode='repairing'
								/>
							)}
						</>
					)}
				</TabsContent>

				{/* Expiring */}

				<TabsContent value='grade5' className='mt-4 space-y-4'>
					<p className='text-sm text-muted-foreground'>
						Số lượng theo từng thiết bị. Khi{' '}
						<strong>cập nhật giảm do hư hỏng</strong>: kho ổn định
						−N, kho hư hỏng +N. Khi <strong>tăng phân cấp</strong>{' '}
						sau sửa: hư hỏng −N, ổn định +N. Bấm làm mới sau khi cập
						nhật để thấy SL mới.
					</p>
					<div className='grid gap-4 sm:grid-cols-2'>
						<Card>
							<CardContent className='pt-4 pb-3 flex items-center justify-between gap-2'>
								<div>
									<p className='text-xs text-muted-foreground'>
										Tổng SL kho ổn định (cấp 1–4)
									</p>
									<p className='text-2xl font-semibold tabular-nums text-emerald-700'>
										{stableTotalQty}
									</p>
								</div>
								<Badge variant='secondary'>
									{stableItems.length} dòng
								</Badge>
							</CardContent>
						</Card>
						<Card className='border-red-200'>
							<CardContent className='pt-4 pb-3 flex items-center justify-between gap-2'>
								<div>
									<p className='text-xs text-muted-foreground'>
										Tổng SL kho hư hỏng (cấp 5)
									</p>
									<p className='text-2xl font-semibold tabular-nums text-red-700'>
										{grade5TotalQty}
									</p>
								</div>
								<Badge variant='destructive'>
									{grade5Items.length} dòng
								</Badge>
							</CardContent>
						</Card>
					</div>
					<div className='grid gap-4 lg:grid-cols-2'>
						<Card>
							<CardHeader className='pb-2'>
								<CardTitle className='text-base'>
									Vật tư ổn định (cấp 1–4)
								</CardTitle>
								<CardDescription>
									{stableItems.length} thiết bị · Tổng SL{' '}
									<strong className='text-foreground'>
										{stableTotalQty}
									</strong>
									{' · '}
									Giảm do hư hỏng sẽ trừ SL tại đây
								</CardDescription>
							</CardHeader>
							<CardContent>
								{warehouseQ.isLoading ? (
									<Skeleton className='h-24 w-full' />
								) : warehouseQ.error ? (
									<ErrorState
										error={warehouseQ.error}
										onRetry={() => warehouseQ.refetch()}
									/>
								) : stableItems.length === 0 ? (
									<p className='text-sm text-muted-foreground text-center py-6'>
										Không có dữ liệu (SL &gt; 0)
									</p>
								) : (
									<div className='overflow-x-auto max-h-96'>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>
														Tên thiết bị
													</TableHead>
													<TableHead className='text-right'>
														Số lượng
													</TableHead>
													<TableHead>
														Năm SX
													</TableHead>
													<TableHead>
														Năm SD
													</TableHead>
													<TableHead>
														Phân cấp
													</TableHead>
													<TableHead>
														Địa chỉ lắp đặt
													</TableHead>
													<TableHead>Mã</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{stableItems.map((r) => (
													<TableRow key={r.id}>
														<TableCell className='text-sm font-medium'>
															{r.name}
														</TableCell>
														<TableCell className='text-right font-semibold tabular-nums text-emerald-800'>
															{r.quantity ?? 0}
														</TableCell>
														<TableCell className='text-xs tabular-nums'>
															{r.manufactureYear ??
																'—'}
														</TableCell>
														<TableCell className='text-xs tabular-nums'>
															{r.usageYear ?? '—'}
														</TableCell>
														<TableCell className='text-xs tabular-nums text-center'>
															{r.grade ?? 1}
														</TableCell>
														<TableCell
															className='text-xs max-w-[200px] truncate'
															title={resolveInstallAddress(
																r
															)}
														>
															{resolveInstallAddress(
																r
															) || '—'}
														</TableCell>
														<TableCell className='font-mono text-xs text-muted-foreground'>
															{r.code || '—'}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
							</CardContent>
						</Card>

						<Card className='border-red-200'>
							<CardHeader className='pb-2'>
								<CardTitle className='text-base text-red-800 flex items-center gap-2'>
									<AlertTriangle className='w-4 h-4' />
									Vật tư hư hỏng / đang sửa chữa
								</CardTitle>
								<CardDescription>
									{grade5Items.length} thiết bị · Tổng SL{' '}
									<strong className='text-foreground'>
										{grade5TotalQty}
									</strong>
									{' · '}
									Tăng phân cấp sẽ trừ SL tại đây, cộng bên ổn
									định
								</CardDescription>
							</CardHeader>
							<CardContent>
								{warehouseQ.isLoading ? (
									<Skeleton className='h-24 w-full' />
								) : grade5Items.length === 0 ? (
									<p className='text-sm text-muted-foreground text-center py-6'>
										Không có vật tư cấp 5 (SL &gt; 0)
									</p>
								) : (
									<div className='overflow-x-auto max-h-96'>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>
														Tên thiết bị
													</TableHead>
													<TableHead className='text-right'>
														Số lượng
													</TableHead>
													<TableHead>
														Năm SX
													</TableHead>
													<TableHead>
														Năm SD
													</TableHead>
													<TableHead>
														Phân cấp
													</TableHead>
													<TableHead>
														Địa chỉ lắp đặt
													</TableHead>
													<TableHead>
														Lý do hỏng
													</TableHead>
													<TableHead>
														Ngày hư
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{grade5Items.map((r) => (
													<TableRow
														key={r.id}
														className='bg-red-50/50'
													>
														<TableCell className='text-sm font-medium'>
															{r.name}
														</TableCell>
														<TableCell className='text-right font-semibold tabular-nums text-red-800'>
															{r.quantity ?? 0}
														</TableCell>
														<TableCell className='text-xs tabular-nums'>
															{r.manufactureYear ??
																'—'}
														</TableCell>
														<TableCell className='text-xs tabular-nums'>
															{r.usageYear ?? '—'}
														</TableCell>
														<TableCell className='text-xs tabular-nums text-center'>
															{r.grade ?? 1}
														</TableCell>
														<TableCell
															className='text-xs max-w-[180px] truncate'
															title={resolveInstallAddress(
																r
															)}
														>
															{resolveInstallAddress(
																r
															) || '—'}
														</TableCell>
														<TableCell className='text-xs max-w-[180px]'>
															{r.description?.trim() ? (
																<span
																	title={
																		r.description
																	}
																>
																	{
																		r.description
																	}
																</span>
															) : (
																<span className='text-muted-foreground'>
																	—
																</span>
															)}
														</TableCell>
														<TableCell className='text-xs whitespace-nowrap'>
															{r.brokenAt || '—'}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
								<div className='mt-3 flex flex-wrap gap-2'>
									<Button variant='outline' size='sm' asChild>
										<Link to='/vat-tu/phan-cong'>
											Mở phân công sửa chữa
										</Link>
									</Button>
									<Button variant='outline' size='sm' asChild>
										<Link to='/vat-tu/cap-nhat'>
											Cập nhật vật tư
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value='expiring' className='mt-4 space-y-3'>
					<div className='flex flex-wrap items-end justify-between gap-3'>
						<div className='space-y-2 w-40'>
							<Label>Trong vòng (ngày)</Label>
							<Input
								type='number'
								min={1}
								max={3650}
								value={withinDays}
								onChange={(e) =>
									setWithinDays(
										Math.max(
											1,
											Number(e.target.value) || 30
										)
									)
								}
							/>
						</div>
					</div>
					{expiringQ.error ? (
						<ErrorState
							error={expiringQ.error}
							onRetry={() => expiringQ.refetch()}
						/>
					) : expiringQ.isLoading ? (
						<Skeleton className='h-40 w-full' />
					) : !(expiringQ.data?.length ?? 0) ? (
						<Card>
							<CardContent className='py-10 text-center text-sm text-muted-foreground'>
								Không có vật tư sắp hết hạn trong khoảng đã
								chọn.
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardContent className='pt-6 overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Thiết bị</TableHead>
											<TableHead>Loại</TableHead>
											<TableHead>Hết hạn</TableHead>
											<TableHead>Còn</TableHead>
											<TableHead>Phòng</TableHead>
											<TableHead>Tòa</TableHead>
											<TableHead />
										</TableRow>
									</TableHeader>
									<TableBody>
										{expiringQ.data!.map((r) => (
											<TableRow key={r.id}>
												<TableCell className='font-medium'>
													{r.name}
												</TableCell>
												<TableCell>
													{r.category}
												</TableCell>
												<TableCell>
													{r.expiryDate || '—'}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															r.daysUntilExpiry <=
															7
																? 'destructive'
																: 'outline'
														}
													>
														{r.daysUntilExpiry} ngày
													</Badge>
												</TableCell>
												<TableCell>
													{r.roomCode}
												</TableCell>
												<TableCell>
													{r.buildingCode}
												</TableCell>
												<TableCell>
													<Button
														size='sm'
														variant='link'
														asChild
													>
														<Link
															to='/vat-tu/phong/$roomId'
															params={{
																roomId: String(
																	r.roomId
																)
															}}
														>
															Hồ sơ
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				{/* Repair history logs */}
				<TabsContent value='repairs' className='mt-4 space-y-3'>
					<div className='flex flex-wrap items-end gap-3 justify-between'>
						<div className='flex flex-wrap gap-3'>
							<div className='space-y-2'>
								<Label>Từ ngày</Label>
								<Input
									type='date'
									value={fromDate}
									onChange={(e) =>
										setFromDate(e.target.value)
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Đến ngày</Label>
								<Input
									type='date'
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
								/>
							</div>
						</div>
					</div>
					{repairsQ.error ? (
						<ErrorState
							error={repairsQ.error}
							onRetry={() => repairsQ.refetch()}
						/>
					) : repairsQ.isLoading ? (
						<Skeleton className='h-40 w-full' />
					) : !(repairsQ.data?.length ?? 0) ? (
						<Card>
							<CardContent className='py-10 text-center text-sm text-muted-foreground'>
								Chưa có lịch sử sửa chữa theo bộ lọc.
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardContent className='pt-6 overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Ngày</TableHead>
											<TableHead>Vật tư</TableHead>
											<TableHead>Nội dung</TableHead>
											<TableHead>Người SC</TableHead>
											<TableHead>Phòng</TableHead>
											<TableHead>Tòa</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{repairsQ.data!.map((r) => (
											<TableRow key={r.id}>
												<TableCell>
													{r.repairDate}
												</TableCell>
												<TableCell className='font-medium'>
													{r.assetName}
												</TableCell>
												<TableCell className='max-w-[220px] truncate'>
													{r.content}
												</TableCell>
												<TableCell>
													{r.performer || '—'}
												</TableCell>
												<TableCell>
													{r.roomCode}
												</TableCell>
												<TableCell>
													{r.buildingCode}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value='movements' className='mt-4 space-y-3'>
					{/* Bộ lọc nhật ký cập nhật — admin + mọi user có tab này */}
					<Card>
						<CardHeader className='pb-3'>
							<div className='flex flex-wrap items-start justify-between gap-3'>
								<div>
									<CardTitle className='text-base'>
										Bộ lọc nhật ký cập nhật
									</CardTitle>
									<CardDescription>
										Từ ngày — đến ngày, tìm kiếm, ngành,
										loại biến động, đơn vị sử dụng, phòng
										(phòng theo đơn vị). Áp dụng bảng + xuất
										file.
									</CardDescription>
								</div>
								<div className='flex flex-wrap gap-2'>
									<Button
										variant='outline'
										size='sm'
										onClick={() => {
											setFromDate('')
											setToDate('')
											setMovementSearch('')
											setMovementNganh('all')
											setMovementTypeFilter('all')
											setMovementUnitId('all')
											setMovementRoomId('all')
										}}
									>
										Xóa lọc
									</Button>
									<Button
										variant='outline'
										size='sm'
										onClick={() => {
											const rows = filteredMovements
											if (!rows.length) {
												toast.error('Không có dữ liệu')
												return
											}
											downloadCsv(
												'nhat-ky-cap-nhat-vat-tu.csv',
												[
													'Ngày',
													'Loại',
													'Ngành',
													'Đơn vị sử dụng',
													'Tòa',
													'Phòng',
													'Mã VT',
													'Tên',
													'SL',
													'Trước',
													'Sau',
													'Cấp',
													'Lý do',
													'Quyết định',
													'Diễn giải'
												],
												rows.map((r) => {
													const u = reportUnits.find(
														(x) =>
															x.id ===
															r.holdingUnitId
													)
													return [
														r.executedAt,
														movementTypeLabel(
															r.movementType
														),
														extractNganhCode(
															r.assetCode
														) || '',
														u
															? u.alias
																? `${u.alias} — ${u.name}`
																: u.name
															: r.holdingUnitId !=
																  null
																? String(
																		r.holdingUnitId
																	)
																: '',
														r.buildingCode,
														r.roomCode,
														r.assetCode ?? '',
														r.assetName,
														r.quantity,
														r.quantityBefore,
														r.quantityAfter,
														r.grade,
														formatMovementReason(r),
														r.decisionNumber || '',
														r.explanation ||
															r.note ||
															''
													]
												})
											)
											toast.success('Đã xuất CSV')
										}}
									>
										<Download className='w-4 h-4 mr-2' />
										Xuất CSV
									</Button>
									<Button
										size='sm'
										onClick={async () => {
											const rows = filteredMovements
											if (!rows.length) {
												toast.error(
													'Không có dữ liệu để xuất'
												)
												return
											}
											try {
												await exportAssetMovementsExcel(
													rows
												)
												toast.success(
													'Đã tải file Excel'
												)
											} catch (err) {
												toast.error(
													'Xuất Excel thất bại',
													{
														description: (
															err as Error
														).message
													}
												)
											}
										}}
									>
										<FileSpreadsheet className='w-4 h-4 mr-2' />
										Xuất Excel
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
							<div className='space-y-2'>
								<Label>Từ ngày</Label>
								<Input
									type='date'
									value={fromDate}
									onChange={(e) =>
										setFromDate(e.target.value)
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Đến ngày</Label>
								<Input
									type='date'
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
								/>
							</div>
							<div className='space-y-2 sm:col-span-2'>
								<Label>Tìm kiếm</Label>
								<Input
									value={movementSearch}
									onChange={(e) =>
										setMovementSearch(e.target.value)
									}
									placeholder='Tên VT, mã, phòng, tòa, lý do…'
								/>
							</div>
							<div className='space-y-2'>
								<Label>Ngành</Label>
								<SearchableSelect
									value={movementNganh}
									onValueChange={setMovementNganh}
									placeholder='Tất cả ngành'
									searchPlaceholder='Gõ HC2A, CNTT…'
									emptyText='Không có ngành'
									options={[
										{
											value: 'all',
											label: 'Tất cả ngành',
											keywords: 'tat ca all'
										},
										...NGANH_LIST.map((n) => ({
											value: n.code,
											label: nganhLabel(n),
											keywords: `${n.code} ${n.name}`
										}))
									]}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Loại biến động</Label>
								<Select
									value={movementTypeFilter}
									onValueChange={setMovementTypeFilter}
								>
									<SelectTrigger>
										<SelectValue placeholder='Tất cả loại' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>
											Tất cả (tăng / giảm / ĐC)
										</SelectItem>
										<SelectItem value='INCREASE'>
											Tăng
										</SelectItem>
										<SelectItem value='DECREASE'>
											Giảm
										</SelectItem>
										<SelectItem value='ADJUST'>
											Điều chỉnh
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2 sm:col-span-2'>
								<Label>Đơn vị sử dụng</Label>
								<SearchableSelect
									value={movementUnitId}
									onValueChange={(v) => {
										setMovementUnitId(v)
										// Đổi đơn vị → reset phòng (danh sách phòng đổi theo ĐV)
										setMovementRoomId('all')
									}}
									placeholder='Tất cả đơn vị'
									searchPlaceholder='Gõ D1, BGH, alias…'
									emptyText='Không có đơn vị'
									options={[
										{
											value: 'all',
											label: 'Tất cả đơn vị',
											keywords: 'tat ca all'
										},
										...reportUnits.map((u) => ({
											value: String(u.id),
											label: u.alias
												? `${u.alias} — ${u.name}`
												: u.name,
											keywords: `${u.alias || ''} ${u.name}`
										}))
									]}
								/>
							</div>
							<div className='space-y-2 sm:col-span-2'>
								<Label>Phòng</Label>
								<SearchableSelect
									value={movementRoomId}
									onValueChange={setMovementRoomId}
									placeholder={
										movementUnitId !== 'all'
											? 'Phòng của đơn vị đã chọn'
											: 'Tất cả phòng'
									}
									searchPlaceholder='Gõ mã / tên phòng…'
									emptyText={
										movementUnitId !== 'all'
											? 'Đơn vị chưa có phòng (theo VT gán)'
											: 'Không có phòng'
									}
									options={[
										{
											value: 'all',
											label:
												movementUnitId !== 'all'
													? 'Tất cả phòng của đơn vị'
													: 'Tất cả phòng',
											keywords: 'tat ca all'
										},
										...movementRooms.map((r) => ({
											value: String(r.id),
											label: r.label,
											keywords: r.keywords
										}))
									]}
								/>
								<p className='text-[11px] text-muted-foreground'>
									Chọn đơn vị sử dụng → chỉ hiện phòng có VT
									gán đơn vị đó. Có thể thu hẹp theo tòa ở bộ
									lọc chung.
								</p>
							</div>
						</CardContent>
					</Card>

					<p className='text-xs text-muted-foreground'>
						Hiển thị <strong>{filteredMovements.length}</strong>
						{updateMovements.length !== filteredMovements.length
							? ` / ${updateMovements.length}`
							: ''}{' '}
						dòng
						{movementSearch.trim()
							? ` khớp «${movementSearch.trim()}»`
							: ''}
						.
					</p>
					<Card>
						<CardHeader>
							<CardTitle className='text-base'>
								Nhật ký cập nhật vật tư (tăng / giảm / điều
								chỉnh)
							</CardTitle>
							<CardDescription>
								Chỉ log tăng / giảm / điều chỉnh. Điều động và
								thu hồi xem tại trang Điều động / thu hồi.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{movements.isLoading ? (
								<Skeleton className='h-32 w-full' />
							) : movements.error ? (
								<ErrorState
									error={movements.error}
									onRetry={() => movements.refetch()}
								/>
							) : updateMovements.length === 0 ? (
								<p className='text-sm text-muted-foreground text-center py-8'>
									Chưa có biến động tăng / giảm / điều chỉnh.
								</p>
							) : filteredMovements.length === 0 ? (
								<p className='text-sm text-muted-foreground text-center py-8'>
									Không có dòng khớp «{movementSearch.trim()}
									». Thử từ khóa khác.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='whitespace-nowrap'>
												Ngày giờ
											</TableHead>
											<TableHead>Loại</TableHead>
											<TableHead>Vị trí</TableHead>
											<TableHead>Mã</TableHead>
											<TableHead>Tên</TableHead>
											<TableHead>SL</TableHead>
											<TableHead>Trước→Sau</TableHead>
											<TableHead>Cấp</TableHead>
											<TableHead>Lý do</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredMovements.map((r) => (
											<TableRow key={r.id}>
												<TableCell className='text-sm font-mono tabular-nums whitespace-nowrap'>
													{formatMovementDateTime(
														r.executedAt,
														r.createdAt
													)}
												</TableCell>
												<TableCell>
													<Badge variant='outline'>
														{movementTypeLabel(
															r.movementType
														)}
													</Badge>
												</TableCell>
												<TableCell className='text-sm'>
													{r.buildingCode} /{' '}
													{r.roomCode}
												</TableCell>
												<TableCell className='font-mono text-xs'>
													{r.assetCode || '—'}
												</TableCell>
												<TableCell>
													{r.assetName}
												</TableCell>
												<TableCell>
													{r.quantity}
												</TableCell>
												<TableCell className='text-sm'>
													{r.quantityBefore} →{' '}
													{r.quantityAfter}
												</TableCell>
												<TableCell className='text-sm tabular-nums text-center'>
													{r.grade ?? 1}
												</TableCell>
												<TableCell
													className='text-sm max-w-[220px] truncate'
													title={formatMovementReason(
														r
													)}
												>
													{formatMovementReason(r)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}

function StatTile({ label, value }: { label: string; value: number | string }) {
	return (
		<Card>
			<CardHeader className='pb-2'>
				<CardDescription>{label}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className='text-2xl font-bold'>{value}</div>
			</CardContent>
		</Card>
	)
}

/** Bảng nhóm (loại / trạng thái) — expand để xem thiết bị bên trong */
function ExpandableGroupTable({
	title,
	hint,
	groups
}: {
	title: string
	hint: string
	groups: Array<{
		key: string
		label: string
		count: number
		quantity: number
		items: AssetDetailRow[]
	}>
}) {
	const [openKey, setOpenKey] = useState<string | null>(null)

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base'>{title}</CardTitle>
				<CardDescription>{hint}</CardDescription>
			</CardHeader>
			<CardContent className='space-y-2'>
				{groups.length === 0 ? (
					<p className='text-sm text-muted-foreground'>
						Không có dữ liệu
					</p>
				) : (
					groups.map((g) => {
						const open = openKey === g.key
						return (
							<div
								key={g.key}
								className='rounded-lg border overflow-hidden'
							>
								<button
									type='button'
									className='w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors'
									onClick={() =>
										setOpenKey(open ? null : g.key)
									}
								>
									<span className='flex items-center gap-2 font-medium'>
										{open ? (
											<ChevronDown className='w-4 h-4' />
										) : (
											<ChevronRight className='w-4 h-4' />
										)}
										{g.label}
									</span>
									<span className='text-sm text-muted-foreground'>
										{g.count} SP · SL {g.quantity}
									</span>
								</button>
								{open && (
									<div className='border-t bg-muted/20 px-2 py-2 overflow-x-auto'>
										{(g.items?.length ?? 0) === 0 ? (
											<p className='text-xs text-muted-foreground p-2'>
												Không có thiết bị
											</p>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Thiết bị
														</TableHead>
														<TableHead>
															Loại
														</TableHead>
														<TableHead>
															SL
														</TableHead>
														<TableHead>
															TT
														</TableHead>
														<TableHead>
															Phòng
														</TableHead>
														<TableHead>
															Tầng
														</TableHead>
														<TableHead>
															Tòa
														</TableHead>
														<TableHead />
													</TableRow>
												</TableHeader>
												<TableBody>
													{g.items.map((item) => (
														<TableRow key={item.id}>
															<TableCell className='font-medium'>
																{item.name}
															</TableCell>
															<TableCell>
																{item.category}
															</TableCell>
															<TableCell>
																{item.quantity}
															</TableCell>
															<TableCell>
																<Badge variant='outline'>
																	{assetStatusLabel[
																		item
																			.status
																	] ??
																		item.status}
																</Badge>
															</TableCell>
															<TableCell>
																{item.roomCode}
															</TableCell>
															<TableCell>
																{item.floorName}
															</TableCell>
															<TableCell>
																{
																	item.buildingCode
																}
															</TableCell>
															<TableCell>
																<Button
																	size='sm'
																	variant='link'
																	asChild
																>
																	<Link
																		to='/vat-tu/phong/$roomId'
																		params={{
																			roomId: String(
																				item.roomId
																			)
																		}}
																	>
																		Hồ sơ
																	</Link>
																</Button>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										)}
									</div>
								)}
							</div>
						)
					})
				)}
			</CardContent>
		</Card>
	)
}

/** Bảng nhật ký phiếu báo hỏng / sửa — dữ liệu từ repair_requests (lưu lâu dài) */
function BrokenEventLogTable({
	title,
	description,
	rows,
	empty,
	onExport
}: {
	title: string
	description: string
	rows: AssetBrokenLog[]
	empty: string
	onExport: () => void
}) {
	const eventLb: Record<string, string> = {
		BROKEN: 'Hỏng (cấp 5)',
		COMPLETED: 'Sửa xong (cấp 2)',
		CANCELLED: 'Hủy',
		REJECTED: 'Từ chối'
	}
	const srcLb: Record<string, string> = {
		PROPOSAL: 'Đề xuất',
		REPAIR_REQUEST: 'Báo hỏng',
		OTHER: 'Khác'
	}
	if (!rows.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-base'>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className='text-sm text-muted-foreground'>
					{empty}
				</CardContent>
			</Card>
		)
	}
	return (
		<Card className='border-amber-200/80'>
			<CardHeader className='flex flex-row items-start justify-between gap-2'>
				<div>
					<CardTitle className='text-base'>{title}</CardTitle>
					<CardDescription>
						{description} · {rows.length} sự kiện
					</CardDescription>
				</div>
				<Button variant='outline' size='sm' onClick={onExport}>
					<Download className='w-4 h-4 mr-1' />
					Tải CSV
				</Button>
			</CardHeader>
			<CardContent className='overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Ngày</TableHead>
							<TableHead>Sự kiện</TableHead>
							<TableHead>Nguồn</TableHead>
							<TableHead>Thiết bị</TableHead>
							<TableHead>Mã gốc</TableHead>
							<TableHead className='text-right'>SL</TableHead>
							<TableHead>Cấp</TableHead>
							<TableHead>Phòng</TableHead>
							<TableHead>ĐV / Ngành</TableHead>
							<TableHead>Ghi chú</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.slice(0, 200).map((r) => (
							<TableRow key={r.id}>
								<TableCell className='whitespace-nowrap text-xs'>
									{(r.eventAt || r.createdAt || '').slice(
										0,
										16
									)}
								</TableCell>
								<TableCell>
									<Badge
										variant={
											r.eventType === 'BROKEN'
												? 'destructive'
												: r.eventType === 'COMPLETED'
													? 'default'
													: 'secondary'
										}
										className='text-[10px]'
									>
										{eventLb[r.eventType] || r.eventType}
									</Badge>
								</TableCell>
								<TableCell className='text-xs'>
									{srcLb[r.sourceType] || r.sourceType}
									{r.proposalId != null
										? ` #${r.proposalId}`
										: r.repairRequestId != null
											? ` #${r.repairRequestId}`
											: ''}
								</TableCell>
								<TableCell className='font-medium text-sm max-w-[12rem] truncate'>
									{r.assetName}
								</TableCell>
								<TableCell className='font-mono text-xs'>
									{r.originalCode || r.assetCode || '—'}
								</TableCell>
								<TableCell className='text-right tabular-nums'>
									{r.quantity}
								</TableCell>
								<TableCell className='text-xs whitespace-nowrap'>
									{r.originalGrade != null
										? `${r.originalGrade}`
										: '?'}
									{' → '}
									{r.gradeAfter ?? '—'}
								</TableCell>
								<TableCell className='text-xs max-w-[8rem] truncate'>
									{[r.roomCode, r.roomName]
										.filter(Boolean)
										.join(' ') || '—'}
								</TableCell>
								<TableCell className='text-xs max-w-[8rem] truncate'>
									{[r.unitName, r.nganhCode]
										.filter(Boolean)
										.join(' · ') || '—'}
								</TableCell>
								<TableCell className='text-xs text-muted-foreground max-w-[12rem] truncate'>
									{[r.reason, r.resultNote, r.performer]
										.filter(Boolean)
										.join(' · ') || '—'}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{rows.length > 200 && (
					<p className='text-xs text-muted-foreground mt-2'>
						Hiển thị 200/{rows.length} — tải CSV để xem đủ.
					</p>
				)}
			</CardContent>
		</Card>
	)
}

function RepairTicketLogTable({
	title,
	description,
	rows,
	empty
}: {
	title: string
	description: string
	rows: RepairRequest[]
	empty: string
}) {
	const statusLb: Record<string, string> = {
		PENDING: 'Chờ phân công',
		ASSIGNED: 'Đã gán',
		IN_PROGRESS: 'Đang sửa',
		COMPLETED: 'Hoàn thành',
		CANCELLED: 'Đã hủy'
	}
	if (!rows.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-base'>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className='text-sm text-muted-foreground'>
					{empty}
				</CardContent>
			</Card>
		)
	}
	return (
		<Card>
			<CardHeader className='flex flex-row items-start justify-between gap-2'>
				<div>
					<CardTitle className='text-base'>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<Button
					variant='outline'
					size='sm'
					onClick={() => {
						const statusMap = statusLb
						downloadCsv(
							`nhat-ky-${title.slice(0, 20)}.csv`,
							[
								'Mã phiếu',
								'Thiết bị',
								'Phân loại',
								'SL',
								'Tòa',
								'Tầng',
								'Phòng',
								'Ngày hư',
								'Người báo',
								'Trạng thái',
								'Bắt đầu sửa',
								'Người sửa',
								'Hoàn thành',
								'Mô tả'
							],
							rows.map((r) => [
								r.id,
								r.assetName,
								r.category || '',
								r.quantity ?? 1,
								`${r.buildingCode || ''} ${r.buildingName || ''}`.trim(),
								r.floorName || '',
								`${r.roomCode || ''} ${r.roomName || ''}`.trim(),
								r.brokenAt || '',
								r.reportedByName || '',
								statusMap[r.status] || r.status,
								r.repairStartedAt || '',
								r.assignedToName || '',
								r.completedAt || '',
								[r.description, r.adminNote]
									.filter(Boolean)
									.join(' | ')
							])
						)
					}}
				>
					<Download className='w-3.5 h-3.5 mr-1' />
					CSV ({rows.length})
				</Button>
			</CardHeader>
			<CardContent className='overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Phiếu</TableHead>
							<TableHead>Thiết bị</TableHead>
							<TableHead>Phân loại</TableHead>
							<TableHead>Tòa</TableHead>
							<TableHead>Tầng</TableHead>
							<TableHead>Phòng</TableHead>
							<TableHead>Ngày hư</TableHead>
							<TableHead>Ngày bắt đầu sửa</TableHead>
							<TableHead>Người sửa</TableHead>
							<TableHead>Trạng thái</TableHead>
							<TableHead>Hoàn thành</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((r) => (
							<TableRow key={r.id}>
								<TableCell className='font-mono text-xs'>
									#{r.id}
								</TableCell>
								<TableCell className='font-medium'>
									{r.assetName}
									<span className='text-muted-foreground text-xs ml-1'>
										×{r.quantity ?? 1}
									</span>
								</TableCell>
								<TableCell>{r.category || '—'}</TableCell>
								<TableCell className='text-sm'>
									{r.buildingCode || '—'} ·{' '}
									{r.buildingName || ''}
								</TableCell>
								<TableCell>{r.floorName || '—'}</TableCell>
								<TableCell className='text-sm'>
									{r.roomCode || '—'} · {r.roomName || ''}
								</TableCell>
								<TableCell>{r.brokenAt || '—'}</TableCell>
								<TableCell>
									{r.repairStartedAt || '—'}
								</TableCell>
								<TableCell>{r.assignedToName || '—'}</TableCell>
								<TableCell>
									<Badge
										variant={
											r.status === 'COMPLETED'
												? 'default'
												: r.status === 'CANCELLED'
													? 'outline'
													: 'destructive'
										}
									>
										{statusLb[r.status] || r.status}
									</Badge>
								</TableCell>
								<TableCell>{r.completedAt || '—'}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}

function RepairDetailTable({
	title,
	description,
	rows,
	empty,
	mode
}: {
	title: string
	description: string
	rows: AssetDetailRow[]
	empty: string
	mode: 'broken' | 'repairing'
}) {
	if (!rows.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='text-base'>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className='text-sm text-muted-foreground'>
					{empty}
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base'>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className='overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Thiết bị</TableHead>
							<TableHead>Phân loại</TableHead>
							<TableHead>Tòa</TableHead>
							<TableHead>Tầng</TableHead>
							<TableHead>Phòng</TableHead>
							<TableHead>Ngày hư</TableHead>
							<TableHead>Ngày bắt đầu sửa</TableHead>
							<TableHead>Người sửa</TableHead>
							{mode === 'broken' && (
								<>
									<TableHead>Đã hoàn thành</TableHead>
									<TableHead>Ngày HT</TableHead>
								</>
							)}
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((r) => (
							<TableRow key={r.id}>
								<TableCell className='font-medium'>
									{r.name}
								</TableCell>
								<TableCell>{r.category}</TableCell>
								<TableCell>
									{r.buildingCode} · {r.buildingName}
								</TableCell>
								<TableCell>{r.floorName}</TableCell>
								<TableCell>
									{r.roomCode} · {r.roomName}
								</TableCell>
								<TableCell>{r.brokenAt || '—'}</TableCell>
								<TableCell>
									{r.repairStartedAt || '—'}
								</TableCell>
								<TableCell>
									{r.repairPerformer || '—'}
								</TableCell>
								{mode === 'broken' && (
									<>
										<TableCell>
											<Badge
												variant={
													r.repairCompleted
														? 'default'
														: 'destructive'
												}
											>
												{r.repairCompleted
													? 'Đã xong'
													: 'Chưa xong'}
											</Badge>
										</TableCell>
										<TableCell>
											{r.repairCompletedAt || '—'}
										</TableCell>
									</>
								)}
								<TableCell>
									<Button size='sm' variant='link' asChild>
										<Link
											to='/vat-tu/phong/$roomId'
											params={{
												roomId: String(r.roomId)
											}}
										>
											Hồ sơ
										</Link>
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
