/**
 * Admin: Đề xuất (sửa chữa / thu hồi-trả / thanh lý)
 * Tab 1: danh sách đề xuất + duyệt
 * Tab 2: đã phê duyệt — bảng chờ sửa chữa → hoàn thành khi sửa xong
 * Tab 3: log + xuất CSV
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	CheckCircle2,
	Download,
	FileText,
	History,
	Loader2,
	RefreshCw,
	Wrench,
	XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
	DecideAssetProposal,
	GetAssetCatalog,
	GetRooms,
	ListAssetProposalLogs,
	ListAssetProposals,
	type AssetProposal,
	type AssetProposalLog
} from '@/api/asset'
import {
	cn,
	isBghAdminUser,
	isBghOnlyUser,
	isNganhUser,
	isSuperAdmin
} from '@/lib/utils'
import { NGANH_LIST, nganhLabel } from '@/lib/nganh'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'

function typeLabel(t: string) {
	switch (t) {
		case 'REPAIR':
			return 'Sửa chữa'
		case 'RECALL':
			return 'Thu hồi / trả'
		case 'LIQUIDATION':
			return 'Thanh lý'
		default:
			return t
	}
}

function statusLabel(s: string, proposalType?: string) {
	switch (s) {
		case 'PENDING':
			return 'Chờ BGH phê duyệt'
		case 'APPROVED':
			if (proposalType === 'REPAIR') return 'BGH đã duyệt — chờ ngành sửa'
			if (proposalType === 'LIQUIDATION')
				return 'BGH đã duyệt — chờ nhập QĐ (chưa giảm VT)'
			if (proposalType === 'RECALL')
				return 'BGH đã duyệt — chờ thu hồi về kho'
			return 'BGH đã duyệt'
		case 'REJECTED':
			return 'Từ chối'
		case 'COMPLETED':
			if (proposalType === 'LIQUIDATION')
				return 'Đã thanh lý (đã giảm VT)'
			if (proposalType === 'RECALL') return 'Đã thu hồi về kho'
			if (proposalType === 'REPAIR') return 'Đã sửa xong'
			return 'Hoàn thành'
		default:
			return s
	}
}

function statusVariant(
	s: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
	if (s === 'PENDING') return 'default'
	if (s === 'REJECTED') return 'destructive'
	if (s === 'COMPLETED') return 'secondary'
	return 'outline'
}

/**
 * Hành động tiếng Việt + vai trò:
 * «User tạo» · «Admin phê duyệt» · «Admin hoàn thành» …
 */
function actionLabel(
	a: string,
	opts?: { actorIsAdmin?: boolean; actorName?: string | null }
) {
	const name = (opts?.actorName || '').trim().toLowerCase()
	const isAdmin = !!opts?.actorIsAdmin
	const who = isAdmin
		? 'BGH'
		: name === 'ngành' || name === 'nganh'
			? 'Ngành'
			: name.includes('đơn vị') ||
				  name.includes('don_vi') ||
				  name === 'don_vi'
				? 'Đơn vị'
				: 'User'
	switch ((a || '').toUpperCase()) {
		case 'CREATE':
			return `${who} tạo`
		case 'APPROVED':
			return `${who} phê duyệt`
		case 'REJECTED':
			return `${who} từ chối`
		case 'COMPLETED':
			return `${who} hoàn thành`
		case 'RECALL_COMPLETE':
			return `${who} thu hồi về kho`
		case 'LIQUIDATE':
			return `${who} thanh lý`
		default:
			return a
	}
}

/** Loại đề xuất — luôn tiếng Việt */
function logTypeLabel(t: string | null | undefined) {
	switch ((t || '').toUpperCase()) {
		case 'REPAIR':
			return 'Sửa chữa'
		case 'RECALL':
			return 'Thu hồi / trả'
		case 'LIQUIDATION':
			return 'Thanh lý'
		default:
			return t || '—'
	}
}

/** Lấy tên đề xuất từ tóm tắt cũ (bỏ VT/ĐV/Ngành/cấp/bởi…) */
function extractProposalTitle(summary: string): string {
	let s = (summary || '').trim()
	if (!s) return ''
	// Format mới: … đề xuất #n «title»
	const mNew = s.match(/đề xuất\s*#\d+\s*[«"]([^»"]+)[»"]/i)
	if (mNew?.[1]) return mNew[1].trim()
	s = s
		.replace(
			/^Tạo đề xuất\s+(Sửa chữa|Thu hồi\s*\/\s*trả|Thanh lý)\s*:\s*/i,
			''
		)
		.replace(/\s*\(\d+\s*VT\)\s*/gi, ' ')
		.replace(/\s*ĐV:[^→]*?(?=(→|$))/gi, ' ')
		.replace(/\s*→\s*Ngành\s*/gi, ' ')
		.replace(/\s*→\s*cấp\s*\d+[^\s]*/gi, ' ')
		.replace(/\s*bởi\s+.+$/i, '')
		.replace(/\s+/g, ' ')
		.trim()
	return s
}

/**
 * Chuẩn hóa tóm tắt (UI + CSV/JSON).
 * - Phê duyệt: «{Người} đã phê duyệt đề xuất #n «tên»»
 * - Hoàn thành SC: «Đã hoàn thành sửa chữa đề xuất #n «tên»»
 */
function displaySummary(
	summary: string,
	action: string,
	opts?: {
		proposalId?: number | null
		proposalType?: string | null
		actorName?: string | null
		actorIsAdmin?: boolean
	}
): string {
	let s = (summary || '').trim()
	if (!s) return '—'

	// Đã đúng format mới — giữ nguyên
	if (
		/đã phê duyệt đề xuất\s*#/i.test(s) ||
		/đã từ chối đề xuất\s*#/i.test(s) ||
		/đã hoàn thành\s+(sửa chữa|thu hồi|thanh lý)?\s*đề xuất\s*#/i.test(s)
	) {
		return s
	}

	const act = (action || '').toUpperCase()
	const pid = opts?.proposalId
	const title = extractProposalTitle(s)
	const ref =
		pid != null
			? `đề xuất #${pid}${title ? ` «${title}»` : ''}`
			: title
				? `đề xuất «${title}»`
				: 'đề xuất'
	const actor =
		(opts?.actorName || '').trim() ||
		(opts?.actorIsAdmin ? 'Admin' : 'Ngành')

	if (act === 'APPROVED') {
		return `${actor} đã phê duyệt ${ref}`
	}
	if (act === 'REJECTED') {
		return `${actor} đã từ chối ${ref}`
	}
	if (act === 'COMPLETED') {
		const ptype = (opts?.proposalType || '').toUpperCase()
		if (ptype === 'REPAIR') return `Đã hoàn thành sửa chữa ${ref}`
		if (ptype === 'RECALL') return `Đã hoàn thành thu hồi ${ref}`
		if (ptype === 'LIQUIDATION') return `Đã hoàn thành thanh lý ${ref}`
		return `Đã hoàn thành ${ref}`
	}
	if (act === 'CREATE') {
		return title || s
	}

	// Fallback: dọn hậu tố cũ
	s = s
		.replace(
			/^Tạo đề xuất\s+(Sửa chữa|Thu hồi\s*\/\s*trả|Thanh lý)\s*:\s*/i,
			''
		)
		.replace(/\s+bởi\s+.+$/i, '')
		.replace(/\s*→\s*cấp\s*\d+[^\s]*/gi, '')
		.replace(/\s+/g, ' ')
		.trim()
	return s || summary
}

/**
 * Chuẩn hóa chi tiết: thiết bị · phòng · lý do
 * (bỏ chuyển cấp, KQ, mã tạm)
 */
function displayDetails(details: string | null | undefined): string {
	if (!details?.trim()) return '—'
	let d = details.trim()
	// Bỏ đoạn chuyển cấp / KQ (log cũ)
	d = d.replace(
		/;\s*[^;]*:\s*cấp\s*\d+\s*→\s*cấp\s*5\s*\(hỏng\)\s*→\s*cấp\s*2\s*\(đã sửa\)/gi,
		''
	)
	d = d.replace(/;\s*KQ:\s*.*$/i, '')
	d = d.replace(/\s*\[mã[^\]]*hỏng cấp 5\]/gi, '')
	// Bỏ mã VT đầu (HC2A… / mã-có-gạch)
	d = d.replace(/^[A-Z0-9][A-Z0-9._-]{2,}\s+/i, '')
	// «×1@H1.101» → khoảng trắng trước phòng
	d = d.replace(/\s*×\d+\s*@/gi, ' ')
	// «@H1.101» → « Phòng H1.101»
	d = d.replace(/@([A-Za-z0-9._-]+)/g, ' Phòng $1')
	// Gộp khoảng trắng
	d = d.replace(/\s+/g, ' ').trim()
	d = d.replace(/;\s*;+/g, '; ').replace(/^;\s*|\s*;$/g, '')
	// Tránh «Phòng H1.101 Phòng H1.101»
	d = d.replace(/(Phòng\s+([A-Za-z0-9._-]+))\s+\1/gi, '$1')
	d = d.replace(/(Phòng\s+([A-Za-z0-9._-]+))\s+Phòng\s+\2/gi, 'Phòng $2')
	return d || '—'
}

/** Tham số chuẩn hóa tóm tắt từ 1 dòng log */
function summaryOpts(l: {
	proposalId?: number | null
	proposalType?: string | null
	actorDisplayName?: string | null
	actorUsername?: string | null
	actorIsAdmin?: boolean
}) {
	return {
		proposalId: l.proposalId,
		proposalType: l.proposalType,
		actorName: l.actorDisplayName || l.actorUsername,
		actorIsAdmin: l.actorIsAdmin
	}
}

export default function ProposalsPage() {
	const [tab, setTab] = useState<'list' | 'repair-queue' | 'logs'>('list')
	const [statusFilter, setStatusFilter] = useState<string>('PENDING')
	const [typeFilter, setTypeFilter] = useState<string>('ALL')
	const [selected, setSelected] = useState<AssetProposal | null>(null)
	const [decideMode, setDecideMode] = useState<
		'APPROVED' | 'REJECTED' | 'COMPLETED' | null
	>(null)

	/**
	 * BGH thuần: phê duyệt/từ chối PENDING; thanh lý/thu hồi được nhập QĐ hoàn thành.
	 * «Sửa xong» (REPAIR) — chỉ ngành (hoặc super), không phải BGH thuần.
	 */
	const bghOnly = isBghOnlyUser()
	const canBghApprovePending = isBghAdminUser() || isSuperAdmin()
	/** Ngành / super: hoàn thành SC sau khi BGH duyệt */
	const canFinishRepair = isSuperAdmin() || isNganhUser()
	/**
	 * Thanh lý / thu hồi: BGH, ngành hoặc super nhập QĐ / thu hồi về kho
	 * → lúc đó mới ghi nhật ký tăng giảm (DECREASE LIQUIDATION / RECALL).
	 */
	const canFinishLiquidationOrRecall =
		isSuperAdmin() || isNganhUser() || isBghAdminUser()
	/** Hủy sau khi đã duyệt (REPAIR): ngành hoặc super */
	const canActOnApproved = isSuperAdmin() || isNganhUser()

	const qc = useQueryClient()
	const listQ = useQuery({
		queryKey: ['asset-proposals', statusFilter, typeFilter],
		queryFn: () =>
			ListAssetProposals({
				status: statusFilter === 'ALL' ? undefined : statusFilter,
				proposalType: typeFilter === 'ALL' ? undefined : typeFilter,
				limit: 300
			}),
		refetchInterval: 20_000
	})

	/** Bảng chờ sửa: REPAIR + APPROVED (đã phê duyệt, chưa sửa xong) */
	const repairQueueQ = useQuery({
		queryKey: ['asset-proposals', 'repair-queue'],
		queryFn: () =>
			ListAssetProposals({
				status: 'APPROVED',
				proposalType: 'REPAIR',
				limit: 300
			}),
		refetchInterval: 15_000
	})

	/** Bộ lọc nhật ký đề xuất (BGH / ngành / admin) */
	const [logFromDate, setLogFromDate] = useState('')
	const [logToDate, setLogToDate] = useState('')
	const [logNganh, setLogNganh] = useState<string>('all')
	const [logUnit, setLogUnit] = useState<string>('all')
	const [logSearch, setLogSearch] = useState('')

	const logsQ = useQuery({
		queryKey: ['asset-proposal-logs', logFromDate, logToDate],
		queryFn: () =>
			ListAssetProposalLogs({
				limit: 1000,
				fromDate: logFromDate || undefined,
				toDate: logToDate || undefined
			}),
		// BGH + ngành + super: tab Log
		enabled: true,
		staleTime: 15_000
	})

	const repairQueueCount = repairQueueQ.data?.length ?? 0

	const invalidate = async () => {
		await qc.invalidateQueries({ queryKey: ['asset-proposals'] })
		await qc.invalidateQueries({ queryKey: ['asset-proposal-logs'] })
		await qc.invalidateQueries({ queryKey: ['pending-proposals'] })
		await qc.invalidateQueries({ queryKey: ['asset-catalog'] })
		await qc.invalidateQueries({ queryKey: ['catalog-stock-logs'] })
	}

	/** Đơn vị xuất hiện trong log (dropdown lọc) */
	const logUnitOptions = useMemo(() => {
		const set = new Set<string>()
		for (const l of logsQ.data || []) {
			const u = (l.unitName || '').trim()
			if (u) set.add(u)
		}
		return [...set].sort((a, b) => a.localeCompare(b, 'vi'))
	}, [logsQ.data])

	/** Ngành trong log + danh mục chuẩn */
	const logNganhOptions = useMemo(() => {
		const set = new Set(NGANH_LIST.map((n) => n.code))
		for (const l of logsQ.data || []) {
			const c = (l.nganhCode || '').trim().toUpperCase()
			if (c) set.add(c)
		}
		return [...set].sort()
	}, [logsQ.data])

	const displayLogs = useMemo(() => {
		let rows = logsQ.data || []
		if (logNganh !== 'all') {
			const ng = logNganh.toUpperCase()
			rows = rows.filter(
				(l) => (l.nganhCode || '').trim().toUpperCase() === ng
			)
		}
		if (logUnit !== 'all') {
			rows = rows.filter((l) => (l.unitName || '').trim() === logUnit)
		}
		// Lọc thêm theo ngày (client) nếu API so sánh chuỗi lỏng
		if (logFromDate) {
			rows = rows.filter((l) => (l.createdAt || '') >= logFromDate)
		}
		if (logToDate) {
			const end = logToDate + 'z'
			rows = rows.filter((l) => (l.createdAt || '') <= end)
		}
		const q = logSearch
			.trim()
			.toLocaleLowerCase('vi')
			.split(/\s+/)
			.filter(Boolean)
		if (q.length) {
			rows = rows.filter((l) => {
				const hay = [
					l.createdAt,
					l.action,
					l.proposalType,
					l.summary,
					l.details,
					l.unitName,
					l.nganhCode,
					String(l.proposalId ?? ''),
					l.actorDisplayName,
					l.actorUsername
				]
					.filter(Boolean)
					.join(' ')
					.toLocaleLowerCase('vi')
				return q.every((part) => hay.includes(part))
			})
		}
		return rows
	}, [logsQ.data, logNganh, logUnit, logFromDate, logToDate, logSearch])

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}

	/** Dòng log đã chuẩn hóa — dùng chung CSV + JSON */
	function mapLogExportRow(l: AssetProposalLog) {
		return {
			thoiGian: l.createdAt,
			hanhDong: actionLabel(l.action, {
				actorIsAdmin: l.actorIsAdmin,
				actorName: l.actorDisplayName || l.actorUsername
			}),
			loaiDeXuat: logTypeLabel(l.proposalType),
			deXuatId: l.proposalId ?? null,
			donViDeXuat: l.unitName?.trim() || null,
			nganh: l.nganhCode?.trim() || null,
			tomTat: displaySummary(l.summary, l.action, summaryOpts(l)),
			chiTiet: displayDetails(l.details),
			nguoiThucHien: l.actorDisplayName || l.actorUsername || null
		}
	}

	const exportLogsCsv = () => {
		const logs = displayLogs
		if (!logs.length) {
			toast.error('Không có log để xuất')
			return
		}
		const header = [
			'Thời gian',
			'Hành động',
			'Loại đề xuất',
			'Đề xuất #',
			'Đơn vị đề xuất',
			'Ngành',
			'Tóm tắt',
			'Chi tiết',
			'Người thực hiện'
		]
		const lines = logs.map((l: AssetProposalLog) => {
			const r = mapLogExportRow(l)
			return [
				r.thoiGian,
				r.hanhDong,
				r.loaiDeXuat,
				r.deXuatId ?? '',
				`"${(r.donViDeXuat || '—').replace(/"/g, '""')}"`,
				r.nganh || '',
				`"${(r.tomTat || '—').replace(/"/g, '""')}"`,
				`"${(r.chiTiet || '—').replace(/"/g, '""')}"`,
				r.nguoiThucHien || ''
			].join(',')
		})
		const bom = '\uFEFF'
		downloadBlob(
			new Blob([bom + [header.join(','), ...lines].join('\n')], {
				type: 'text/csv;charset=utf-8'
			}),
			`log-de-xuat-${new Date().toISOString().slice(0, 10)}.csv`
		)
		toast.success('Đã xuất CSV log đề xuất (tóm tắt đã chuẩn hóa)')
	}

	const exportLogsJson = () => {
		const logs = displayLogs
		if (!logs.length) {
			toast.error('Không có log để xuất')
			return
		}
		const rows = logs.map(mapLogExportRow)
		const payload = {
			xuatLuc: new Date().toISOString(),
			tongSo: rows.length,
			moTa: 'Tóm tắt đã chuẩn hóa: phê duyệt = người + đã phê duyệt + đề xuất #; hoàn thành SC = đã hoàn thành sửa chữa đề xuất #. Chi tiết = thiết bị · phòng · lý do (không ghi chuyển cấp/KQ).',
			data: rows
		}
		const bom = '\uFEFF'
		downloadBlob(
			new Blob([bom + JSON.stringify(payload, null, 2)], {
				type: 'application/json;charset=utf-8'
			}),
			`log-de-xuat-${new Date().toISOString().slice(0, 10)}.json`
		)
		toast.success('Đã xuất JSON log đề xuất (tóm tắt đã chuẩn hóa)')
	}

	const exportLogs = exportLogsCsv

	return (
		<div
			className={cn(
				'p-4 md:p-6 space-y-4 mx-auto w-full',
				tab === 'logs' ? 'max-w-7xl' : 'max-w-7xl'
			)}
		>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-xl font-semibold flex items-center gap-2'>
						<FileText className='w-5 h-5 shrink-0' />
						Đề xuất
					</h1>
					<p className='text-sm text-muted-foreground mt-1 max-w-3xl'>
						Luồng: Đơn vị gửi → <strong>BGH phê duyệt</strong> → đẩy
						xuống <strong>ngành</strong> sửa → ngành báo kết quả cho
						BGH &amp; đơn vị. Đề xuất sửa chữa: giữ nguyên cấp khi
						gửi và khi sửa xong.
					</p>
				</div>
				<Button
					variant='outline'
					onClick={() => {
						void listQ.refetch()
						void repairQueueQ.refetch()
						void logsQ.refetch()
					}}
				>
					<RefreshCw
						className={`w-4 h-4 mr-1.5 ${listQ.isFetching || repairQueueQ.isFetching ? 'animate-spin' : ''}`}
					/>
					Làm mới
				</Button>
			</div>

			<div className='inline-flex flex-wrap rounded-lg border bg-muted/40 p-1 gap-1'>
				<button
					type='button'
					onClick={() => setTab('list')}
					className={cn(
						'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
						tab === 'list'
							? 'bg-background shadow-sm'
							: 'text-muted-foreground hover:bg-background/50'
					)}
				>
					<FileText className='w-4 h-4' />
					Đề xuất
				</button>
				<button
					type='button'
					onClick={() => setTab('repair-queue')}
					className={cn(
						'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
						tab === 'repair-queue'
							? 'bg-background shadow-sm'
							: 'text-muted-foreground hover:bg-background/50'
					)}
				>
					<Wrench className='w-4 h-4' />
					Chờ sửa chữa
					{repairQueueCount > 0 ? (
						<Badge
							className='ml-0.5 h-5 min-w-5 px-1.5 text-xs'
							variant='default'
						>
							{repairQueueCount}
						</Badge>
					) : null}
				</button>
				<button
					type='button'
					onClick={() => setTab('logs')}
					className={cn(
						'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
						tab === 'logs'
							? 'bg-background shadow-sm'
							: 'text-muted-foreground hover:bg-background/50'
					)}
				>
					<History className='w-4 h-4' />
					Log
				</button>
			</div>

			{tab === 'repair-queue' ? (
				<>
					<Card className='border-amber-200/80 bg-amber-50/30 dark:bg-amber-950/10'>
						<CardHeader className='pb-2'>
							<CardTitle className='text-base font-semibold flex items-center gap-2'>
								<Wrench className='w-5 h-5' />
								Đã phê duyệt — chờ / đang sửa chữa
							</CardTitle>
							<CardDescription>
								{bghOnly
									? 'BGH đã phê duyệt — đang chờ ngành sửa chữa. BGH chỉ xem; khi ngành bấm «Sửa xong» sẽ có thông báo về BGH và đơn vị.'
									: 'VT đang chờ/sửa (giữ nguyên cấp). Ngành bấm «Sửa xong» → về trạng thái bình thường, cùng cấp, thông báo BGH và đơn vị.'}
							</CardDescription>
						</CardHeader>
					</Card>
					{repairQueueQ.isLoading ? (
						<div className='space-y-2'>
							<Skeleton className='h-12 w-full' />
							<Skeleton className='h-12 w-full' />
						</div>
					) : !(repairQueueQ.data || []).length ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								Không có đề xuất sửa chữa đang chờ. Phê duyệt đề
								xuất loại «Sửa chữa» để đưa vào bảng này.
							</CardContent>
						</Card>
					) : (
						<div className='rounded-xl border overflow-x-auto bg-card'>
							<Table className='min-w-[1080px] w-full'>
								<TableHeader>
									<TableRow className='bg-muted/20'>
										<TableHead className='w-12 whitespace-nowrap'>
											#
										</TableHead>
										<TableHead className='min-w-[160px] w-[18%]'>
											Tiêu đề
										</TableHead>
										<TableHead className='min-w-[200px] w-[22%]'>
											Vật tư / vị trí
										</TableHead>
										<TableHead className='min-w-[150px] w-[16%]'>
											Đơn vị / User
										</TableHead>
										<TableHead className='min-w-[120px] w-[12%]'>
											Lý do
										</TableHead>
										<TableHead className='min-w-[100px] whitespace-nowrap'>
											Duyệt lúc
										</TableHead>
										<TableHead className='min-w-[160px] w-[14%]'>
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(repairQueueQ.data || []).map((p) => (
										<TableRow
											key={p.id}
											className='align-top'
										>
											<TableCell className='tabular-nums text-muted-foreground'>
												{p.id}
											</TableCell>
											<TableCell className='font-medium'>
												<div className='break-words leading-snug'>
													{p.title}
												</div>
												<div className='mt-1'>
													<Badge variant='secondary'>
														{statusLabel(
															p.status,
															p.proposalType
														)}
													</Badge>
												</div>
											</TableCell>
											<TableCell className='text-sm'>
												{(p.items || []).map((it) => (
													<div
														key={it.id}
														className='mb-2 last:mb-0 space-y-0.5'
													>
														<div className='font-medium break-words leading-snug'>
															{it.materialName}
															<span className='text-muted-foreground font-normal'>
																{' '}
																×{it.quantity}
															</span>
														</div>
														<div className='text-xs text-muted-foreground break-words leading-snug'>
															{[
																it.fromRoomCode,
																it.fromRoomName
															]
																.filter(Boolean)
																.join(' — ') ||
																'—'}
														</div>
														{it.locationNote ? (
															<div className='text-xs text-muted-foreground/90 break-words leading-snug'>
																{
																	it.locationNote
																}
															</div>
														) : null}
													</div>
												))}
											</TableCell>
											<TableCell className='text-sm'>
												<div className='font-medium break-words leading-snug'>
													{p.unitName || '—'}
												</div>
												<div className='text-xs text-muted-foreground break-words leading-snug mt-0.5'>
													{p.proposedByDisplayName ||
														p.proposedByUsername ||
														'—'}
												</div>
											</TableCell>
											<TableCell className='text-sm text-muted-foreground'>
												<div className='break-words leading-snug'>
													{p.description ||
														p.items?.[0]?.note ||
														'—'}
												</div>
											</TableCell>
											<TableCell className='text-sm whitespace-nowrap tabular-nums text-muted-foreground'>
												{p.decisionAt ||
													p.updatedAt?.slice(0, 16) ||
													'—'}
											</TableCell>
											<TableCell>
												<div className='flex flex-col sm:flex-row flex-wrap gap-1.5'>
													<Button
														size='sm'
														variant='secondary'
														className='shrink-0'
														onClick={() =>
															setSelected(p)
														}
													>
														Chi tiết
													</Button>
													{/* Chỉ ngành / super — BGH chỉ xem chờ sửa */}
													{canFinishRepair ? (
														<Button
															size='sm'
															className='shrink-0'
															onClick={() => {
																setSelected(p)
																setDecideMode(
																	'COMPLETED'
																)
															}}
														>
															<CheckCircle2 className='w-3.5 h-3.5 mr-1' />
															Sửa xong
														</Button>
													) : bghOnly ? (
														<span className='text-xs text-muted-foreground self-center'>
															Chờ ngành sửa xong
														</span>
													) : null}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</>
			) : tab === 'list' ? (
				<>
					<div className='flex flex-wrap gap-3'>
						<div className='space-y-1'>
							<Label className='text-xs'>Trạng thái</Label>
							<Select
								value={statusFilter}
								onValueChange={setStatusFilter}
							>
								<SelectTrigger className='w-[160px]'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='ALL'>Tất cả</SelectItem>
									<SelectItem value='PENDING'>
										Chờ duyệt
									</SelectItem>
									<SelectItem value='APPROVED'>
										Đã duyệt
									</SelectItem>
									<SelectItem value='COMPLETED'>
										Hoàn thành
									</SelectItem>
									<SelectItem value='REJECTED'>
										Từ chối
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-1'>
							<Label className='text-xs'>Loại</Label>
							<Select
								value={typeFilter}
								onValueChange={setTypeFilter}
							>
								<SelectTrigger className='w-[180px]'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='ALL'>Tất cả</SelectItem>
									<SelectItem value='LIQUIDATION'>
										Thanh lý
									</SelectItem>
									<SelectItem value='REPAIR'>
										Sửa chữa
									</SelectItem>
									<SelectItem value='RECALL'>
										Thu hồi / trả
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{listQ.isLoading ? (
						<div className='space-y-2'>
							<Skeleton className='h-12 w-full' />
							<Skeleton className='h-12 w-full' />
						</div>
					) : !(listQ.data || []).length ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								Không có đề xuất trong bộ lọc.
							</CardContent>
						</Card>
					) : (
						<div className='rounded-xl border overflow-x-auto bg-card'>
							<Table>
								<TableHeader>
									<TableRow className='bg-muted/20'>
										<TableHead className='w-10'>
											#
										</TableHead>
										<TableHead>Loại</TableHead>
										<TableHead>Tiêu đề</TableHead>
										<TableHead>User</TableHead>
										<TableHead>Ngành</TableHead>
										<TableHead className='text-center'>
											SL VT
										</TableHead>
										<TableHead>Trạng thái</TableHead>
										<TableHead>Ngày</TableHead>
										<TableHead className='w-40'>
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(listQ.data || []).map((p) => (
										<TableRow key={p.id}>
											<TableCell className='tabular-nums'>
												{p.id}
											</TableCell>
											<TableCell>
												<Badge variant='outline'>
													{typeLabel(p.proposalType)}
												</Badge>
											</TableCell>
											<TableCell className='font-medium max-w-[220px]'>
												{p.title}
											</TableCell>
											<TableCell className='text-sm'>
												{p.proposedByDisplayName ||
													p.proposedByUsername ||
													'—'}
											</TableCell>
											<TableCell className='font-mono text-sm'>
												{p.nganhCode ||
													p.decisionNganhCode ||
													'—'}
											</TableCell>
											<TableCell className='text-center tabular-nums'>
												{p.items?.length ?? 0}
											</TableCell>
											<TableCell>
												<Badge
													variant={statusVariant(
														p.status
													)}
												>
													{statusLabel(
														p.status,
														p.proposalType
													)}
												</Badge>
											</TableCell>
											<TableCell className='text-sm whitespace-nowrap'>
												{p.createdAt?.slice(0, 16)}
											</TableCell>
											<TableCell>
												<div className='flex flex-wrap gap-1'>
													<Button
														size='sm'
														variant='secondary'
														onClick={() =>
															setSelected(p)
														}
													>
														Chi tiết
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</>
			) : (
				<div className='space-y-3'>
					<div className='flex flex-wrap items-start justify-between gap-2'>
						<div>
							<h2 className='text-sm font-semibold'>
								Nhật ký đề xuất
							</h2>
							<p className='text-sm text-muted-foreground mt-0.5'>
								Lọc theo ngành, đơn vị, ngày giờ; xuất CSV /
								JSON theo bộ lọc hiện tại.
							</p>
						</div>
						<div className='flex flex-wrap gap-2'>
							<Button
								variant='outline'
								onClick={exportLogsCsv}
								disabled={!displayLogs.length}
							>
								<Download className='w-4 h-4 mr-1.5' />
								Xuất CSV
							</Button>
							<Button
								variant='outline'
								onClick={exportLogsJson}
								disabled={!displayLogs.length}
							>
								<Download className='w-4 h-4 mr-1.5' />
								Xuất JSON
							</Button>
						</div>
					</div>

					{/* Bộ lọc log — BGH / ngành / admin */}
					<Card>
						<CardHeader className='pb-3'>
							<div className='flex flex-wrap items-center justify-between gap-2'>
								<div>
									<CardTitle className='text-base'>
										Bộ lọc nhật ký
									</CardTitle>
									<CardDescription>
										Ngành, đơn vị, từ ngày — đến ngày, tìm
										kiếm trong tóm tắt / chi tiết.
									</CardDescription>
								</div>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => {
										setLogFromDate('')
										setLogToDate('')
										setLogNganh('all')
										setLogUnit('all')
										setLogSearch('')
									}}
								>
									Xóa lọc
								</Button>
							</div>
						</CardHeader>
						<CardContent className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
							<div className='space-y-2'>
								<Label>Từ ngày</Label>
								<Input
									type='date'
									value={logFromDate}
									onChange={(e) =>
										setLogFromDate(e.target.value)
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Đến ngày</Label>
								<Input
									type='date'
									value={logToDate}
									onChange={(e) =>
										setLogToDate(e.target.value)
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Ngành</Label>
								<SearchableSelect
									value={logNganh}
									onValueChange={setLogNganh}
									placeholder='Tất cả ngành'
									searchPlaceholder='Gõ HC2A…'
									emptyText='Không có ngành'
									options={[
										{
											value: 'all',
											label: 'Tất cả ngành',
											keywords: 'tat ca all'
										},
										...logNganhOptions.map((code) => {
											const n = NGANH_LIST.find(
												(x) => x.code === code
											)
											return {
												value: code,
												label: n ? nganhLabel(n) : code,
												keywords: `${code} ${n?.name || ''}`
											}
										})
									]}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Đơn vị</Label>
								<SearchableSelect
									value={logUnit}
									onValueChange={setLogUnit}
									placeholder='Tất cả đơn vị'
									searchPlaceholder='Gõ tên đơn vị…'
									emptyText='Không có đơn vị'
									options={[
										{
											value: 'all',
											label: 'Tất cả đơn vị',
											keywords: 'tat ca all'
										},
										...logUnitOptions.map((u) => ({
											value: u,
											label: u,
											keywords: u
										}))
									]}
								/>
							</div>
							<div className='space-y-2 sm:col-span-2'>
								<Label>Tìm kiếm</Label>
								<Input
									value={logSearch}
									onChange={(e) =>
										setLogSearch(e.target.value)
									}
									placeholder='Tóm tắt, chi tiết, #đề xuất, người…'
								/>
							</div>
						</CardContent>
					</Card>

					<p className='text-xs text-muted-foreground'>
						Hiển thị <strong>{displayLogs.length}</strong>
						{(logsQ.data?.length ?? 0) !== displayLogs.length
							? ` / ${logsQ.data?.length ?? 0}`
							: ''}{' '}
						dòng log
						{logSearch.trim() ? ` · tìm «${logSearch.trim()}»` : ''}
						.
					</p>

					{logsQ.isLoading ? (
						<Skeleton className='h-40 w-full' />
					) : !(logsQ.data || []).length ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								Chưa có log đề xuất.
							</CardContent>
						</Card>
					) : !displayLogs.length ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								Không có dòng khớp bộ lọc. Thử xóa lọc hoặc đổi
								điều kiện.
							</CardContent>
						</Card>
					) : (
						<div className='rounded-xl border bg-card shadow-sm overflow-x-auto'>
							<Table className='min-w-[1200px] w-full table-fixed'>
								<TableHeader>
									<TableRow className='bg-muted/40 hover:bg-muted/40'>
										<TableHead className='w-[150px] px-3 py-2 text-sm font-semibold whitespace-nowrap'>
											Thời gian
										</TableHead>
										<TableHead className='w-[140px] px-3 py-2 text-sm font-semibold whitespace-nowrap'>
											Hành động
										</TableHead>
										<TableHead className='w-[120px] px-3 py-2 text-sm font-semibold whitespace-nowrap'>
											Loại đề xuất
										</TableHead>
										<TableHead className='w-[90px] px-3 py-2 text-sm font-semibold text-center whitespace-nowrap'>
											Đề xuất #
										</TableHead>
										<TableHead className='w-[130px] px-3 py-2 text-sm font-semibold whitespace-nowrap'>
											Đơn vị
										</TableHead>
										<TableHead className='w-[90px] px-3 py-2 text-sm font-semibold whitespace-nowrap'>
											Ngành
										</TableHead>
										<TableHead className='w-[20%] px-3 py-2 text-sm font-semibold'>
											Tóm tắt
										</TableHead>
										<TableHead className='w-[22%] px-3 py-2 text-sm font-semibold'>
											Chi tiết
										</TableHead>
										<TableHead className='w-[140px] px-3 py-2 text-sm font-semibold whitespace-nowrap'>
											User
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{displayLogs.map((l) => (
										<TableRow
											key={l.id}
											className='align-top'
										>
											<TableCell className='px-3 py-2 text-sm whitespace-nowrap tabular-nums text-muted-foreground'>
												{l.createdAt}
											</TableCell>
											<TableCell className='px-3 py-2'>
												<span className='inline-flex items-center rounded-md border bg-muted/40 px-2.5 py-1 text-sm font-medium whitespace-nowrap'>
													{actionLabel(l.action, {
														actorIsAdmin:
															l.actorIsAdmin,
														actorName:
															l.actorDisplayName ||
															l.actorUsername
													})}
												</span>
											</TableCell>
											<TableCell className='px-3 py-2 text-sm font-medium whitespace-nowrap'>
												{logTypeLabel(l.proposalType)}
											</TableCell>
											<TableCell className='px-3 py-2 text-center tabular-nums font-semibold text-sm'>
												{l.proposalId ?? '—'}
											</TableCell>
											<TableCell className='px-3 py-2 text-sm leading-normal break-words whitespace-normal font-medium'>
												{l.unitName?.trim() || '—'}
											</TableCell>
											<TableCell className='px-3 py-2 text-sm font-mono whitespace-nowrap'>
												{l.nganhCode?.trim() || '—'}
											</TableCell>
											<TableCell className='px-3 py-2 text-sm leading-normal break-words whitespace-normal'>
												{displaySummary(
													l.summary,
													l.action,
													summaryOpts(l)
												)}
											</TableCell>
											<TableCell className='px-3 py-2 text-sm leading-normal break-words whitespace-normal text-foreground/90'>
												{displayDetails(l.details)}
											</TableCell>
											<TableCell className='px-3 py-2 text-sm leading-normal break-words whitespace-normal'>
												{l.actorDisplayName ||
													l.actorUsername ||
													'—'}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			)}

			{/* Chi tiết đề xuất */}
			<Dialog
				open={!!selected && !decideMode}
				onOpenChange={(o) => {
					if (!o) setSelected(null)
				}}
			>
				<DialogContent className='max-w-6xl w-[min(96vw,80rem)] max-h-[92vh] overflow-y-auto text-base leading-relaxed sm:max-w-6xl'>
					<DialogHeader>
						<DialogTitle className='text-xl'>
							Đề xuất #{selected?.id} —{' '}
							{typeLabel(selected?.proposalType || '')}
						</DialogTitle>
					</DialogHeader>
					{selected && (
						<div className='space-y-4 text-base'>
							<div className='flex flex-wrap items-center gap-2'>
								<Badge
									variant={statusVariant(selected.status)}
									className='text-sm px-2.5 py-1'
								>
									{statusLabel(
										selected.status,
										selected.proposalType
									)}
								</Badge>
								<span className='text-muted-foreground text-sm'>
									{selected.proposedByDisplayName ||
										selected.proposedByUsername}{' '}
									· {selected.createdAt}
								</span>
							</div>
							<p className='font-medium text-lg'>
								{selected.title}
							</p>
							{selected.description && (
								<p className='text-muted-foreground'>
									{selected.description}
								</p>
							)}
							{selected.decisionNumber && (
								<div className='rounded-md border p-4 bg-muted/30 space-y-1.5 text-base'>
									<div>
										QĐ:{' '}
										<strong>
											{selected.decisionNumber}
										</strong>
									</div>
									<div>
										Ngành TL:{' '}
										{selected.decisionNganhCode || '—'}
									</div>
									<div>
										Cấp BH:{' '}
										{selected.decisionIssuingLevel || '—'}
									</div>
									<div>
										Ký: {selected.decisionSigner || '—'}
									</div>
									<div>
										Ngày: {selected.decisionAt || '—'}
									</div>
								</div>
							)}
							<div className='rounded-lg border overflow-x-auto'>
								<Table className='text-base'>
									<TableHeader>
										<TableRow className='hover:bg-transparent'>
											<TableHead className='h-12 px-4 text-base font-semibold'>
												Mã
											</TableHead>
											<TableHead className='h-12 px-4 text-base font-semibold'>
												Tên
											</TableHead>
											<TableHead className='h-12 px-4 text-base font-semibold min-w-[14rem]'>
												Vị trí
											</TableHead>
											<TableHead className='h-12 px-4 text-base font-semibold text-right w-28'>
												SL
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{selected.items.map((it) => (
											<TableRow key={it.id}>
												<TableCell className='px-4 py-3.5 font-mono text-base whitespace-nowrap'>
													{it.materialCode || '—'}
												</TableCell>
												<TableCell className='px-4 py-3.5 text-base'>
													{it.materialName}
													{it.note ? (
														<div className='text-sm text-muted-foreground mt-0.5'>
															{it.note}
														</div>
													) : null}
												</TableCell>
												<TableCell className='px-4 py-3.5 text-base'>
													{[
														it.fromRoomCode,
														it.fromRoomName
													]
														.filter(Boolean)
														.join(' ') || '—'}
													{it.locationNote ? (
														<div className='text-sm text-muted-foreground mt-0.5'>
															{it.locationNote}
														</div>
													) : null}
													{it.targetRoomCode ||
													it.targetRoomName ? (
														<div className='text-emerald-700 dark:text-emerald-400 text-sm mt-0.5'>
															→{' '}
															{[
																it.targetRoomCode,
																it.targetRoomName
															]
																.filter(Boolean)
																.join(' ')}
														</div>
													) : null}
												</TableCell>
												<TableCell className='px-4 py-3.5 text-right text-base font-medium whitespace-nowrap'>
													{it.quantity} {it.unit}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
					<DialogFooter className='flex-wrap gap-2'>
						{/* BGH: chỉ phê duyệt / từ chối khi PENDING → vào chờ sửa */}
						{selected?.status === 'PENDING' &&
							canBghApprovePending && (
								<>
									<Button
										variant='destructive'
										onClick={() =>
											setDecideMode('REJECTED')
										}
									>
										<XCircle className='w-4 h-4 mr-1' />
										Từ chối
									</Button>
									{selected.proposalType === 'LIQUIDATION' ? (
										<>
											<Button
												variant='secondary'
												onClick={() =>
													setDecideMode('APPROVED')
												}
											>
												BGH phê duyệt (chưa giảm VT)
											</Button>
											{/* BGH / ngành / super: nhập QĐ → mới giảm VT trong nhật ký */}
											{canFinishLiquidationOrRecall && (
												<Button
													onClick={() =>
														setDecideMode(
															'COMPLETED'
														)
													}
												>
													<CheckCircle2 className='w-4 h-4 mr-1' />
													Cho thanh lý (nhập QĐ — giảm
													VT)
												</Button>
											)}
										</>
									) : selected.proposalType === 'RECALL' ? (
										<>
											<Button
												variant='secondary'
												onClick={() =>
													setDecideMode('APPROVED')
												}
											>
												BGH phê duyệt
											</Button>
											{canFinishLiquidationOrRecall && (
												<Button
													onClick={() =>
														setDecideMode(
															'COMPLETED'
														)
													}
												>
													Thu hồi về kho
												</Button>
											)}
										</>
									) : (
										/* REPAIR: BGH duyệt → chờ ngành sửa */
										<Button
											onClick={() =>
												setDecideMode('APPROVED')
											}
										>
											<CheckCircle2 className='w-4 h-4 mr-1' />
											BGH phê duyệt (chuyển ngành chờ sửa)
										</Button>
									)}
								</>
							)}
						{selected?.status === 'PENDING' &&
							!canBghApprovePending && (
								<p className='text-sm text-muted-foreground w-full order-first'>
									Đang chờ Ban Giám Hiệu phê duyệt — ngành
									chưa xử lý được ở bước này.
								</p>
							)}
						{/* Ngành: sửa xong sau khi BGH duyệt — BGH chỉ xem */}
						{selected?.status === 'APPROVED' &&
							selected.proposalType === 'REPAIR' && (
								<>
									{canActOnApproved && (
										<>
											<Button
												variant='destructive'
												onClick={() =>
													setDecideMode('REJECTED')
												}
											>
												Hủy / từ chối
											</Button>
											{canFinishRepair && (
												<Button
													onClick={() =>
														setDecideMode(
															'COMPLETED'
														)
													}
												>
													<CheckCircle2 className='w-4 h-4 mr-1' />
													Ngành sửa xong — hoàn thành
												</Button>
											)}
										</>
									)}
									{bghOnly && (
										<p className='text-sm text-muted-foreground w-full rounded-md border bg-muted/40 px-3 py-2'>
											Đã chuyển ngành — đang{' '}
											<strong>chờ sửa chữa</strong>. Ban
											Giám Hiệu không bấm «Sửa xong»; khi
											ngành hoàn thành sẽ có thông báo về
											BGH và đơn vị.
										</p>
									)}
								</>
							)}
						{/* Thanh lý đã duyệt: BGH / ngành nhập QĐ → mới ghi DECREASE */}
						{selected?.status === 'APPROVED' &&
							selected.proposalType === 'LIQUIDATION' && (
								<>
									{canFinishLiquidationOrRecall ? (
										<div className='flex w-full flex-col gap-2 order-first'>
											<p className='text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3 py-2'>
												BGH đã phê duyệt nhưng{' '}
												<strong>
													chưa giảm vật tư
												</strong>
												. Cần bấm «Nhập QĐ thanh lý» (số
												QĐ, ngành, cấp BH, người ký) —
												sau đó mới có dòng Giảm / Thanh
												lý trong nhật ký tăng giảm.
											</p>
											<Button
												onClick={() =>
													setDecideMode('COMPLETED')
												}
											>
												<CheckCircle2 className='w-4 h-4 mr-1' />
												Nhập QĐ thanh lý (giảm VT)
											</Button>
										</div>
									) : (
										<p className='text-sm text-muted-foreground w-full order-first rounded-md border bg-muted/40 px-3 py-2'>
											Đã duyệt — chờ BGH/ngành nhập quyết
											định thanh lý để giảm vật tư.
										</p>
									)}
								</>
							)}
						{selected?.status === 'APPROVED' &&
							selected.proposalType === 'RECALL' &&
							canFinishLiquidationOrRecall && (
								<Button
									onClick={() => setDecideMode('COMPLETED')}
								>
									Thu hồi về kho
								</Button>
							)}
						<Button
							variant='outline'
							onClick={() => setSelected(null)}
						>
							Đóng
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{selected && decideMode && (
				<DecideDialog
					proposal={selected}
					mode={decideMode}
					onClose={() => setDecideMode(null)}
					onDone={async () => {
						setDecideMode(null)
						setSelected(null)
						await invalidate()
					}}
				/>
			)}
		</div>
	)
}

function DecideDialog({
	proposal,
	mode,
	onClose,
	onDone
}: {
	proposal: AssetProposal
	mode: 'APPROVED' | 'REJECTED' | 'COMPLETED'
	onClose: () => void
	onDone: () => Promise<void>
}) {
	const isLiq =
		mode === 'COMPLETED' && proposal.proposalType === 'LIQUIDATION'
	const isRecall = mode === 'COMPLETED' && proposal.proposalType === 'RECALL'
	const isRepairDone =
		mode === 'COMPLETED' && proposal.proposalType === 'REPAIR'
	const [adminNote, setAdminNote] = useState('')
	const [decisionNumber, setDecisionNumber] = useState('')
	const [decisionNganh, setDecisionNganh] = useState(
		proposal.nganhCode || proposal.decisionNganhCode || ''
	)
	const [issuing, setIssuing] = useState('')
	const [signer, setSigner] = useState('')
	const [decisionAt, setDecisionAt] = useState(
		new Date().toISOString().slice(0, 10)
	)
	const [targetRoomId, setTargetRoomId] = useState(
		String(proposal.items.find((i) => i.targetRoomId)?.targetRoomId || '')
	)

	const nganhQ = useQuery({
		queryKey: ['asset-catalog', 'nganh-decide'],
		queryFn: () => GetAssetCatalog(),
		enabled: isLiq
	})
	/** API (BGH full list) + fallback NGANH_LIST nếu catalog rỗng / lỗi */
	const nganhOpts = useMemo(() => {
		const fromApi = nganhQ.data?.nganh || []
		const list =
			fromApi.length > 0
				? fromApi.map((n) => ({
						code: n.code,
						name: n.name
					}))
				: NGANH_LIST
		return list.map((n) => ({
			value: n.code,
			label: nganhLabel(n),
			keywords: `${n.code} ${n.name}`
		}))
	}, [nganhQ.data])

	const roomsQ = useQuery({
		queryKey: ['rooms', 'recall-target'],
		queryFn: () => GetRooms(),
		enabled: isRecall
	})
	const roomOpts = useMemo(() => {
		const rooms = roomsQ.data || []
		// Ưu tiên phòng kho (tên/loại chứa «Kho»)
		const sorted = [...rooms].sort((a, b) => {
			const score = (r: {
				roomName?: string
				roomType?: string | null
			}) =>
				/kho/i.test(r.roomName || '') || /kho/i.test(r.roomType || '')
					? 0
					: 1
			return score(a) - score(b)
		})
		return sorted.map((r) => ({
			value: String(r.id),
			label: `${r.roomCode} — ${r.roomName}${
				/kho/i.test(r.roomName || '') || /kho/i.test(r.roomType || '')
					? ' (Kho)'
					: ''
			}`,
			keywords: `${r.roomCode} ${r.roomName} ${r.roomType || ''}`
		}))
	}, [roomsQ.data])

	const mut = useMutation({
		mutationFn: () =>
			DecideAssetProposal(proposal.id, {
				decision: mode,
				adminNote: adminNote || undefined,
				...(isLiq
					? {
							decisionNumber,
							decisionNganhCode: decisionNganh,
							decisionIssuingLevel: issuing,
							decisionSigner: signer,
							decisionAt
						}
					: {}),
				...(isRecall && targetRoomId
					? {
							targetRoomId: Number(targetRoomId),
							decisionAt
						}
					: {})
			}),
		onSuccess: async () => {
			toast.success(
				isLiq
					? 'Đã thanh lý — VT đã giảm (lý do Thanh lý) trong nhật ký tăng giảm'
					: isRecall
						? 'Đã thu hồi — giảm tại đơn vị, tăng tại kho'
						: mode === 'REJECTED'
							? 'Đã từ chối — đã báo user'
							: isRepairDone
								? 'Đã hoàn thành — kết quả đã gửi cho user đề xuất'
								: mode === 'APPROVED' &&
									  proposal.proposalType === 'REPAIR'
									? 'Đã phê duyệt — vào bảng chờ sửa (đã báo user)'
									: mode === 'APPROVED' &&
										  proposal.proposalType ===
												'LIQUIDATION'
										? 'Đã phê duyệt — chưa giảm VT. Mở lại đề xuất → «Nhập QĐ thanh lý» để giảm trong nhật ký'
										: mode === 'APPROVED'
											? 'Đã phê duyệt đề xuất'
											: 'Đã cập nhật đề xuất'
			)
			await onDone()
		},
		onError: (e: Error) => toast.error(e.message || 'Lỗi')
	})

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className='max-w-xl w-[min(96vw,36rem)] max-h-[92vh] overflow-y-auto text-base leading-relaxed sm:max-w-xl'>
				<DialogHeader>
					<DialogTitle className='text-xl'>
						{isLiq
							? 'Quyết định thanh lý'
							: isRecall
								? 'Thu hồi về kho'
								: mode === 'REJECTED'
									? 'Từ chối đề xuất'
									: mode === 'APPROVED' &&
										  proposal.proposalType === 'REPAIR'
										? 'Phê duyệt — đưa vào bảng chờ sửa'
										: mode === 'APPROVED'
											? 'Duyệt đề xuất'
											: isRepairDone
												? 'Sửa xong — trả kết quả'
												: 'Hoàn thành đề xuất'}
					</DialogTitle>
				</DialogHeader>
				<div className='space-y-3'>
					{isRecall && (
						<>
							<div className='space-y-1.5'>
								<Label>Kho / phòng đích *</Label>
								<SearchableSelect
									value={targetRoomId}
									onValueChange={setTargetRoomId}
									options={roomOpts}
									placeholder='Chọn kho nhận VT…'
									searchPlaceholder='Gõ mã/tên kho…'
									emptyText='Không có phòng'
								/>
							</div>
							<p className='text-sm text-muted-foreground'>
								Mỗi VT sẽ giảm tại vị trí nguồn và tăng tại kho
								đích (log «Thu hồi»). Đơn vị giữ được bỏ gán khi
								về kho.
							</p>
						</>
					)}
					{isLiq && (
						<>
							<p className='text-sm text-muted-foreground rounded-md border bg-muted/40 px-3 py-2'>
								Chỉ khi hoàn thành bước này (có số QĐ) hệ thống
								mới ghi <strong>Giảm · Thanh lý</strong> vào
								nhật ký tăng giảm và trừ số lượng vật tư. Phê
								duyệt BGH một mình chưa giảm VT.
							</p>
							<div className='space-y-1.5'>
								<Label>Số QĐ thanh lý *</Label>
								<Input
									value={decisionNumber}
									onChange={(e) =>
										setDecisionNumber(e.target.value)
									}
									placeholder='vd. 123/QĐ-CDHC2'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Ngành thanh lý *</Label>
								<SearchableSelect
									value={decisionNganh}
									onValueChange={setDecisionNganh}
									options={nganhOpts}
									placeholder='Chọn ngành…'
									searchPlaceholder='Gõ mã/tên…'
									emptyText='Không có'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Cấp ban hành QĐ *</Label>
								<Input
									value={issuing}
									onChange={(e) => setIssuing(e.target.value)}
									placeholder='vd. Trường / Bộ Tư lệnh…'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Người ký QĐ *</Label>
								<Input
									value={signer}
									onChange={(e) => setSigner(e.target.value)}
									placeholder='Họ tên người ký'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Ngày QĐ</Label>
								<Input
									type='date'
									value={decisionAt}
									onChange={(e) =>
										setDecisionAt(e.target.value)
									}
								/>
							</div>
							<p className='text-sm text-muted-foreground'>
								Sau khi xác nhận, toàn bộ VT giảm (phòng + danh
								mục) với lý do «Thanh lý» và lưu QĐ để thống kê
								/ xuất báo cáo theo năm.
							</p>
						</>
					)}
					{mode === 'APPROVED' &&
						proposal.proposalType === 'REPAIR' && (
							<p className='text-sm text-muted-foreground rounded-md border bg-muted/30 p-2'>
								Khi đơn vị gửi đề xuất, VT giữ nguyên cấp (chỉ
								chuyển trạng thái chờ/sửa). Sau phê duyệt vào
								tab «Chờ sửa chữa». Sửa xong → hoàn thành: vẫn
								cùng cấp + báo kết quả.
							</p>
						)}
					<div className='space-y-1.5'>
						<Label>
							{isRepairDone
								? 'Kết quả sửa chữa (báo user) *'
								: 'Ghi chú admin'}
						</Label>
						<Textarea
							value={adminNote}
							onChange={(e) => setAdminNote(e.target.value)}
							rows={3}
							placeholder={
								isRepairDone
									? 'vd. Đã thay mainboard, hoạt động bình thường — user sẽ nhận kết quả này'
									: undefined
							}
						/>
						{isRepairDone && (
							<p className='text-sm text-muted-foreground'>
								Bắt buộc. User sẽ thấy kết quả trên «Đề xuất của
								tôi» và chuông thông báo.
							</p>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant='outline' onClick={onClose}>
						Hủy
					</Button>
					<Button
						size='sm'
						className='h-10 text-base px-3'
						disabled={
							mut.isPending ||
							(isRecall && !targetRoomId) ||
							(isRepairDone && !adminNote.trim())
						}
						onClick={() => mut.mutate()}
					>
						{mut.isPending ? (
							<Loader2 className='w-5 h-5 animate-spin' />
						) : (
							'Xác nhận'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
