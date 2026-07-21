import { useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	ArrowLeftRight,
	ArrowRightLeft,
	Download,
	Eye,
	FileText,
	PackageMinus,
	Plus,
	RefreshCw,
	Truck
} from 'lucide-react'
import { toast } from 'sonner'

import {
	CreateTransferRecall,
	GetAssetMovementReport,
	GetRoomAssets,
	GetWarehouseRoom
} from '@/api/asset'
import { exportAssetMovementsExcel } from '@/lib/export-asset-excel'
import type { TransferDecisionExportInput } from '@/lib/export-asset-word'
import {
	exportTransferRecallLogsWord,
	inferAssetUnit
} from '@/lib/export-asset-word'

/** Chỉ tên đơn vị — bỏ mã alias (PTMHC — Phòng … → Phòng …) */
function unitNameOnly(label: string): string {
	const s = String(label || '').trim()
	if (!s) return s
	// "ALIAS — Tên đầy đủ"
	const em = s.split(/\s*[—–]\s*/)
	if (em.length > 1) {
		const tail = em[em.length - 1]?.trim()
		if (tail) return tail
	}
	// "ALIAS (Tên)"
	const paren = s.match(/\(([^)]+)\)\s*$/)
	if (paren?.[1]?.trim()) return paren[1].trim()
	return s
}
import { ErrorState } from '@/components/error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useBuildingTree } from '@/hooks/useBuildings'
import useUnitsData from '@/hooks/useUnitsData'
import type {
	AssetMovementReportRow,
	CreateTransferRecallBody,
	RoomAsset
} from '@/types/asset'

type Mode = 'TRANSFER' | 'RECALL'

/** Dòng điều động trong form (gợi ý từ VT phòng nguồn) */
type LineDraft = {
	roomAssetId: number
	selected: boolean
	quantity: number
	note: string
}

function today() {
	return new Date().toISOString().slice(0, 10)
}

function typeLabel(t: string) {
	if (t === 'TRANSFER') return 'Điều động'
	if (t === 'RECALL') return 'Thu hồi'
	return t
}

function DetailField({
	label,
	value,
	className = ''
}: {
	label: string
	value: ReactNode
	className?: string
}) {
	return (
		<div className={`min-w-0 space-y-1 ${className}`}>
			<div className='text-xs font-medium text-muted-foreground'>
				{label}
			</div>
			<div className='text-sm break-words'>{value || '—'}</div>
		</div>
	)
}

export default function TransferRecallPage() {
	const qc = useQueryClient()
	const [search, setSearch] = useState('')
	const [typeFilter, setTypeFilter] = useState<'all' | Mode>('all')
	const [fromDate, setFromDate] = useState('')
	const [toDate, setToDate] = useState('')

	const [dialogOpen, setDialogOpen] = useState(false)
	const [mode, setMode] = useState<Mode>('TRANSFER')
	/** Xem chi tiết 1 dòng nhật ký */
	const [detailLog, setDetailLog] = useState<AssetMovementReportRow | null>(
		null
	)
	const [exporting, setExporting] = useState(false)

	const movements = useQuery({
		queryKey: [
			'asset-reports',
			'movements',
			'transfer-recall',
			fromDate,
			toDate
		],
		queryFn: () =>
			GetAssetMovementReport({
				fromDate: fromDate || undefined,
				toDate: toDate || undefined
			})
	})

	const assetsQ = useQuery({
		queryKey: ['room-assets', 'all'],
		queryFn: () => GetRoomAssets()
	})

	const treeQ = useBuildingTree()
	const unitsQ = useUnitsData()
	/** Kho hệ thống — đích mặc định khi thu hồi */
	const warehouseQ = useQuery({
		queryKey: ['rooms', 'warehouse'],
		queryFn: () => GetWarehouseRoom()
	})

	const roomOptions = useMemo(() => {
		const tree = treeQ.data ?? []
		const opts: { value: string; label: string; keywords?: string }[] = []
		for (const b of tree) {
			for (const f of b.floors ?? []) {
				for (const r of f.rooms ?? []) {
					opts.push({
						value: String(r.id),
						label: `${b.code} / ${r.roomCode} — ${r.roomName}`,
						keywords: `${b.code} ${b.name} ${f.name} ${r.roomCode} ${r.roomName} ${r.roomType ?? ''}`
					})
				}
			}
		}
		return opts
	}, [treeQ.data])

	const roomById = useMemo(() => {
		const map = new Map<number, string>()
		for (const o of roomOptions) map.set(Number(o.value), o.label)
		return map
	}, [roomOptions])

	const unitOptions = useMemo(() => {
		const opts: { value: string; label: string; keywords?: string }[] = []
		const walk = (nodes: typeof unitsQ.data) => {
			for (const u of nodes ?? []) {
				const alias = (u.alias ?? '').trim()
				const name = (u.name ?? '').trim()
				// keywords: alias, tên đầy đủ, từng từ trong tên (tài / chính / tham / mưu…)
				const nameWords = name.split(/[\s/&,—–-]+/).filter(Boolean)
				opts.push({
					value: String(u.id),
					label: alias ? `${alias} — ${name}` : name,
					keywords: [alias, name, ...nameWords]
						.filter(Boolean)
						.join(' ')
				})
				if (u.children?.length) walk(u.children)
			}
		}
		walk(unitsQ.data)
		return opts
	}, [unitsQ.data])

	const assetById = useMemo(() => {
		const m = new Map<number, RoomAsset>()
		for (const a of assetsQ.data ?? []) m.set(a.id, a)
		return m
	}, [assetsQ.data])

	const logs = useMemo(() => {
		const rows = (movements.data ?? []).filter(
			(r) => r.movementType === 'TRANSFER' || r.movementType === 'RECALL'
		)
		const filtered =
			typeFilter === 'all'
				? rows
				: rows.filter((r) => r.movementType === typeFilter)

		const raw = search.trim()
		if (!raw) return filtered

		const q = raw.toLocaleLowerCase('vi')

		/** So khớp số QĐ: "01" = "1" = "00" không; "00" = "0" + leading zeros */
		const matchQd = (
			decision: string | null | undefined,
			query: string
		) => {
			if (decision == null || String(decision).trim() === '') return false
			const d = String(decision).trim().toLocaleLowerCase('vi')
			const qq = query.trim().toLocaleLowerCase('vi')
			if (d === qq || d.includes(qq)) return true
			// Bỏ zero đầu: "01" ↔ "1", "001" ↔ "1" — không khớp "00" với "01"
			const strip = (s: string) => s.replace(/^0+/, '') || '0'
			return strip(d) === strip(qq)
		}

		// Gõ thuần số / "QĐ 01" / "số 01" → chỉ lọc theo số quyết định
		// (tránh "01" dính mã VT kiểu HC2A0105)
		const qdRaw = raw.replace(/^(số\s*)?(qđ[-\s:]*)?/i, '').trim()
		if (
			/^\d{1,8}$/.test(raw) ||
			(/^\d{1,8}$/.test(qdRaw) && /qđ|số/i.test(raw))
		) {
			return filtered.filter((r) =>
				matchQd(r.decisionNumber, qdRaw || raw)
			)
		}

		// Tìm chữ: từng từ phải khớp (AND)
		const parts = q.split(/\s+/).filter(Boolean)
		return filtered.filter((r) => {
			const hay = [
				r.assetName,
				r.assetCode,
				r.buildingCode,
				r.buildingName,
				r.roomCode,
				r.roomName,
				r.explanation,
				r.note,
				r.decisionNumber,
				r.performer,
				r.signer,
				r.executingUnit,
				r.reasonOther,
				typeLabel(r.movementType)
			]
				.filter(Boolean)
				.join(' ')
				.toLocaleLowerCase('vi')
			return parts.every((p) => hay.includes(p))
		})
	}, [movements.data, typeFilter, search])

	// ── Form state (giữ các field cũ + thêm phòng nguồn + nhiều dòng) ──
	const [sourceRoomId, setSourceRoomId] = useState('')
	const [targetRoomId, setTargetRoomId] = useState('')
	const [lines, setLines] = useState<LineDraft[]>([])
	const [lineSearch, setLineSearch] = useState('')
	/** Chọn nhanh 1 VT trong phòng nguồn */
	const [quickAssetId, setQuickAssetId] = useState('')
	const [executedAt, setExecutedAt] = useState(today())
	/** Đơn vị thực hiện — chọn từ danh sách đơn vị */
	const [executingUnitId, setExecutingUnitId] = useState('')
	const [decisionDate, setDecisionDate] = useState('')
	/** Số quyết định — in trên Word (Số: …/QĐ-…) */
	const [decisionNumber, setDecisionNumber] = useState('')
	const [signer, setSigner] = useState('')
	const [performer, setPerformer] = useState('')
	/** Theo đề nghị của Trưởng đơn vị nào */
	const [proposedByUnitId, setProposedByUnitId] = useState('')
	/** Ghi chú thêm cho lý do (tùy chọn) */
	const [reasonOther, setReasonOther] = useState('')
	const [note, setNote] = useState('')

	const unitLabelById = useMemo(() => {
		const m = new Map<number, string>()
		for (const o of unitOptions) m.set(Number(o.value), o.label)
		return m
	}, [unitOptions])

	/** VT còn SL trong phòng nguồn — gợi ý bảng */
	const sourceRoomAssets = useMemo(() => {
		if (!sourceRoomId) return [] as RoomAsset[]
		const rid = Number(sourceRoomId)
		return (assetsQ.data ?? []).filter(
			(a) => a.roomId === rid && (a.quantity ?? 0) > 0
		)
	}, [assetsQ.data, sourceRoomId])

	/**
	 * Gợi ý trang bị (ô tìm nhanh): CHỈ VT thuộc phòng nguồn.
	 */
	const sourceRoomAssetOptions = useMemo(() => {
		return sourceRoomAssets.map((a) => ({
			value: String(a.id),
			label: `${a.code || '—'} · ${a.name} (SL ${a.quantity}, cấp ${a.grade ?? 1}, ĐVT ${a.unit || '—'})`,
			keywords: `${a.code ?? ''} ${a.name} ${a.category} ${a.unit ?? ''}`,
			asset: a
		}))
	}, [sourceRoomAssets])

	const filteredSourceAssets = useMemo(() => {
		const q = lineSearch.trim().toLocaleLowerCase('vi')
		if (!q) return sourceRoomAssets
		return sourceRoomAssets.filter((a) => {
			const hay = [
				a.code,
				a.name,
				a.category,
				a.unit,
				String(a.grade ?? 1),
				a.description
			]
				.filter(Boolean)
				.join(' ')
				.toLocaleLowerCase('vi')
			return hay.includes(q)
		})
	}, [sourceRoomAssets, lineSearch])

	function buildLinesForRoom(roomId: string): LineDraft[] {
		if (!roomId) return []
		const rid = Number(roomId)
		return (assetsQ.data ?? [])
			.filter((a) => a.roomId === rid && (a.quantity ?? 0) > 0)
			.map((a) => ({
				roomAssetId: a.id,
				selected: false,
				quantity: 1,
				note: ''
			}))
	}

	function openDialog(m: Mode) {
		setMode(m)
		setSourceRoomId('')
		// Thu hồi → mặc định kho KHO-VT
		const whId = warehouseQ.data?.id
		setTargetRoomId(m === 'RECALL' && whId != null ? String(whId) : '')
		setLines([])
		setLineSearch('')
		setQuickAssetId('')
		setExecutedAt(today())
		setExecutingUnitId('')
		setDecisionDate('')
		setDecisionNumber('')
		setSigner('')
		setPerformer('')
		setProposedByUnitId('')
		setReasonOther('')
		setNote('')
		setDialogOpen(true)
	}

	function onSourceRoomChange(v: string) {
		setSourceRoomId(v)
		setLines(buildLinesForRoom(v))
		setLineSearch('')
		setQuickAssetId('')
	}

	function updateLine(
		roomAssetId: number,
		patch: Partial<Pick<LineDraft, 'selected' | 'quantity' | 'note'>>
	) {
		setLines((prev) =>
			prev.map((l) =>
				l.roomAssetId === roomAssetId ? { ...l, ...patch } : l
			)
		)
	}

	function selectAllVisible(checked: boolean) {
		const ids = new Set(filteredSourceAssets.map((a) => a.id))
		setLines((prev) =>
			prev.map((l) =>
				ids.has(l.roomAssetId) ? { ...l, selected: checked } : l
			)
		)
	}

	/** Tick chọn VT từ gợi ý nhanh — chỉ trong phòng nguồn */
	function addQuickAsset() {
		if (!sourceRoomId) {
			toast.error('Chọn phòng nguồn trước')
			return
		}
		if (!quickAssetId) return
		const a = assetById.get(Number(quickAssetId))
		if (!a || a.roomId !== Number(sourceRoomId)) {
			toast.error('Chỉ chọn trang bị thuộc phòng nguồn')
			return
		}
		if ((a.quantity ?? 0) <= 0) {
			toast.error('Vật tư hết số lượng')
			return
		}
		setLines((prev) => {
			const exists = prev.find((l) => l.roomAssetId === a.id)
			if (exists) {
				return prev.map((l) =>
					l.roomAssetId === a.id ? { ...l, selected: true } : l
				)
			}
			return [
				...prev,
				{
					roomAssetId: a.id,
					selected: true,
					quantity: 1,
					note: ''
				}
			]
		})
		setQuickAssetId('')
		toast.success(`Đã chọn «${a.name}» trong phòng nguồn`)
	}

	const selectedLines = useMemo(
		() => lines.filter((l) => l.selected && l.quantity >= 1),
		[lines]
	)

	const routeSummary =
		sourceRoomId && targetRoomId
			? `${roomById.get(Number(sourceRoomId)) || `#${sourceRoomId}`} → ${roomById.get(Number(targetRoomId)) || `#${targetRoomId}`}`
			: null

	/** Đơn vị giữ/sử dụng = tên phòng đích (tự động, không chọn) */
	const holdingUnitAutoLabel = targetRoomId
		? roomById.get(Number(targetRoomId)) || `phòng #${targetRoomId}`
		: ''

	function buildDecisionExportInput(): TransferDecisionExportInput {
		if (!sourceRoomId) throw new Error('Chọn phòng nguồn')
		const effectiveTarget =
			targetRoomId ||
			(mode === 'RECALL' && warehouseQ.data?.id
				? String(warehouseQ.data.id)
				: '')
		if (!effectiveTarget) throw new Error('Chọn phòng đích')
		if (selectedLines.length === 0) {
			throw new Error('Chọn ít nhất một trang bị để xuất Quyết định')
		}
		const sourceRoomLabel =
			roomById.get(Number(sourceRoomId)) || `phòng #${sourceRoomId}`
		const targetRoomLabel =
			mode === 'RECALL' &&
			warehouseQ.data &&
			Number(effectiveTarget) === warehouseQ.data.id
				? `${warehouseQ.data.roomCode} — ${warehouseQ.data.roomName}`
				: roomById.get(Number(effectiveTarget)) ||
					`phòng #${effectiveTarget}`
		const proposedLabel = proposedByUnitId
			? unitLabelById.get(Number(proposedByUnitId)) ||
				`đơn vị #${proposedByUnitId}`
			: undefined
		const execLabel = executingUnitId
			? unitLabelById.get(Number(executingUnitId)) ||
				`đơn vị #${executingUnitId}`
			: undefined
		const exportLines = selectedLines.map((line) => {
			const a = assetById.get(line.roomAssetId)
			const name = a?.name || `Vật tư #${line.roomAssetId}`
			return {
				name,
				// Ưu tiên ĐVT trên VT; không có thì suy theo tên/loại
				unit:
					(a?.unit && String(a.unit).trim()) ||
					inferAssetUnit(name, a?.category),
				grade: a?.grade ?? 1,
				quantity: line.quantity,
				note: [line.note, note].filter(Boolean).join(' | ') || undefined
			}
		})
		return {
			mode,
			sourceRoomLabel,
			targetRoomLabel,
			lines: exportLines,
			// Chỉ tên: «Trưởng Phòng Tham mưu Hậu cần» (không PTMHC)
			proposedBy: proposedLabel
				? `Trưởng ${unitNameOnly(proposedLabel)}`
				: undefined,
			reasonExtra: reasonOther.trim() || undefined,
			decisionDate: decisionDate || executedAt,
			decisionNumber: decisionNumber.trim() || undefined,
			executedAt,
			signer: signer || undefined,
			performer: performer || undefined,
			executingUnit: execLabel,
			recipients: [
				sourceRoomLabel,
				targetRoomLabel,
				...(execLabel ? [execLabel] : []),
				'Lưu: VT, Hồ sơ.'
			]
		}
	}

	const mutation = useMutation({
		mutationFn: async () => {
			if (!sourceRoomId) throw new Error('Chọn phòng nguồn')
			// Thu hồi: luôn KHO-VT (API cũng ép lại)
			let wh = warehouseQ.data
			if (mode === 'RECALL' && !wh) {
				wh = await GetWarehouseRoom()
			}
			const effectiveTarget =
				mode === 'RECALL' ? (wh ? String(wh.id) : '') : targetRoomId
			if (mode === 'TRANSFER' && !effectiveTarget) {
				throw new Error('Chọn phòng đích')
			}
			if (mode === 'RECALL' && !effectiveTarget) {
				throw new Error('Không lấy được kho hệ thống KHO-VT')
			}
			if (selectedLines.length === 0) {
				throw new Error(
					'Chọn ít nhất một trang bị (tick) và nhập số lượng ≥ 1'
				)
			}
			if (!proposedByUnitId || proposedByUnitId === '__none__') {
				throw new Error(
					'Chọn đơn vị (trưởng phòng) đề nghị — «Theo đề nghị của…»'
				)
			}
			if (!executingUnitId) {
				throw new Error('Chọn đơn vị thực hiện')
			}
			const proposedLabel =
				unitLabelById.get(Number(proposedByUnitId)) ||
				`đơn vị #${proposedByUnitId}`
			const proposedName = unitNameOnly(proposedLabel)
			const execLabelRaw =
				unitLabelById.get(Number(executingUnitId)) ||
				`đơn vị #${executingUnitId}`
			// Lưu log + QĐ: chỉ tên đơn vị, không mã
			const execLabel = unitNameOnly(execLabelRaw)
			const reasonText = [
				`Theo đề nghị của Trưởng ${proposedName}`,
				reasonOther.trim() || undefined
			]
				.filter(Boolean)
				.join(' — ')

			const wordInput = buildDecisionExportInput()

			const results = []
			for (const line of selectedLines) {
				const asset = assetById.get(line.roomAssetId)
				if (!asset) {
					throw new Error(`Không tìm thấy VT #${line.roomAssetId}`)
				}
				if (asset.roomId !== Number(sourceRoomId)) {
					throw new Error(
						`«${asset.name}» không thuộc phòng nguồn đã chọn`
					)
				}
				if (line.quantity > (asset.quantity ?? 0)) {
					throw new Error(
						`«${asset.name}»: không đủ SL (có ${asset.quantity}, chọn ${line.quantity})`
					)
				}
				const lineNote = [
					note,
					line.note,
					mode === 'RECALL' ? '→ Kho vật tư (KHO-VT)' : null
				]
					.filter(Boolean)
					.join(' | ')
				const body: CreateTransferRecallBody = {
					movementType: mode,
					// RECALL: có thể bỏ target → API dùng kho
					targetRoomId: effectiveTarget
						? Number(effectiveTarget)
						: undefined,
					quantity: line.quantity,
					executedAt,
					// Thu hồi về kho → bỏ gán đơn vị
					holdingUnitId: mode === 'RECALL' ? null : undefined,
					installAddress:
						mode === 'RECALL'
							? 'Kho vật tư (KHO-VT)'
							: holdingUnitAutoLabel || undefined,
					executingUnit: execLabel,
					decisionDate: decisionDate || undefined,
					decisionNumber: decisionNumber.trim() || undefined,
					signer: signer || undefined,
					performer: performer || undefined,
					reasonOther: reasonText,
					note: lineNote || undefined
				}
				results.push(await CreateTransferRecall(line.roomAssetId, body))
			}
			return { results, wordInput }
		},
		onSuccess: async ({ results, wordInput }) => {
			toast.success(
				mode === 'TRANSFER'
					? `Đã điều động ${results.length} khoản`
					: `Đã thu hồi ${results.length} khoản`
			)
			try {
				// Dynamic import — tránh lỗi load docx làm crash cả trang
				const { exportTransferDecisionWord } = await import(
					'@/lib/export-asset-word'
				)
				await exportTransferDecisionWord(wordInput)
				toast.success('Đã xuất file Word Quyết định')
			} catch (e) {
				console.error('exportTransferDecisionWord', e)
				toast.error('Đã lưu điều động nhưng xuất Word thất bại', {
					description: (e as Error).message
				})
			}
			setDialogOpen(false)
			qc.invalidateQueries({ queryKey: ['asset-reports', 'movements'] })
			qc.invalidateQueries({ queryKey: ['room-assets'] })
			qc.invalidateQueries({ queryKey: ['asset-reports'] })
		},
		onError: (e: Error) => {
			console.error('transfer-recall', e)
			toast.error('Thất bại', { description: e.message })
		}
	})

	const allVisibleSelected =
		filteredSourceAssets.length > 0 &&
		filteredSourceAssets.every((a) =>
			lines.find((l) => l.roomAssetId === a.id && l.selected)
		)

	async function exportLogsExcel() {
		if (logs.length === 0) {
			toast.error('Không có nhật ký để xuất')
			return
		}
		setExporting(true)
		try {
			const stamp = new Date().toISOString().slice(0, 10)
			await exportAssetMovementsExcel(
				logs,
				`nhat-ky-dieu-dong-thu-hoi-${stamp}.xlsx`
			)
			toast.success(`Đã xuất Excel ${logs.length} dòng nhật ký`)
		} catch (e) {
			console.error(e)
			toast.error('Xuất Excel thất bại', {
				description: (e as Error).message
			})
		} finally {
			setExporting(false)
		}
	}

	return (
		<div className='space-y-3 p-4 md:p-5'>
			{/* 1 dòng: tiêu đề + 2 nút chính */}
			<div className='flex items-center justify-between gap-3'>
				<h1 className='text-lg font-semibold tracking-tight flex items-center gap-2 min-w-0'>
					<ArrowLeftRight className='w-5 h-5 shrink-0' />
					<span className='truncate'>Điều động & thu hồi</span>
				</h1>
				<div className='flex items-center gap-2 shrink-0'>
					<Button size='sm' onClick={() => openDialog('TRANSFER')}>
						<Truck className='w-4 h-4 mr-1.5' />
						Điều động
					</Button>
					<Button
						size='sm'
						variant='secondary'
						onClick={() => openDialog('RECALL')}
					>
						<PackageMinus className='w-4 h-4 mr-1.5' />
						Thu hồi
					</Button>
				</div>
			</div>

			{/* Khung Bộ lọc */}
			<div className='relative rounded-md border bg-card px-3 pb-2.5 pt-3'>
				<span className='absolute -top-2 left-3 bg-background px-1.5 text-xs font-medium text-muted-foreground'>
					Bộ lọc
				</span>
				<div className='flex flex-wrap items-end gap-2'>
					<div className='space-y-1'>
						<span className='text-[11px] text-muted-foreground'>
							Loại
						</span>
						<Select
							value={typeFilter}
							onValueChange={(v) =>
								setTypeFilter(v as 'all' | Mode)
							}
						>
							<SelectTrigger className='h-8 w-[130px] text-sm'>
								<SelectValue placeholder='Loại' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Tất cả</SelectItem>
								<SelectItem value='TRANSFER'>
									Điều động
								</SelectItem>
								<SelectItem value='RECALL'>Thu hồi</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-1'>
						<span className='text-[11px] text-muted-foreground'>
							Từ ngày
						</span>
						<Input
							type='date'
							className='h-8 w-[11.5rem] min-w-[11.5rem] text-sm'
							value={fromDate}
							onChange={(e) => setFromDate(e.target.value)}
							aria-label='Từ ngày'
						/>
					</div>
					<div className='space-y-1'>
						<span className='text-[11px] text-muted-foreground'>
							Đến ngày
						</span>
						<Input
							type='date'
							className='h-8 w-[11.5rem] min-w-[11.5rem] text-sm'
							value={toDate}
							onChange={(e) => setToDate(e.target.value)}
							aria-label='Đến ngày'
						/>
					</div>
					<div className='space-y-1 min-w-[160px] flex-1 max-w-sm'>
						<span className='text-[11px] text-muted-foreground'>
							Tìm kiếm (số QĐ / tên VT / phòng)
						</span>
						<Input
							className='h-8 text-sm'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder='Số QĐ (vd: 00, 01) hoặc tên VT, phòng…'
						/>
					</div>
					<div className='flex flex-wrap items-center gap-1.5 shrink-0 pb-px'>
						<Button
							variant='outline'
							size='sm'
							className='h-8 text-xs'
							onClick={() => {
								movements.refetch()
								assetsQ.refetch()
								toast.success('Đã làm mới nhật ký')
							}}
						>
							<RefreshCw className='w-3.5 h-3.5 mr-1.5' />
							Làm mới
						</Button>
						<Button
							variant='outline'
							size='sm'
							className='h-8 text-xs'
							disabled={exporting || logs.length === 0}
							onClick={() => void exportLogsExcel()}
							title='Xuất bảng nhật ký đang lọc ra Excel'
						>
							<Download className='w-3.5 h-3.5 mr-1.5' />
							Xuất Excel
						</Button>
						<Button
							variant='ghost'
							size='sm'
							className='h-8 text-xs'
							asChild
						>
							<Link to='/vat-tu'>← Danh mục</Link>
						</Button>
					</div>
				</div>
			</div>

			{movements.isLoading ? (
				<Skeleton className='h-40 w-full' />
			) : movements.error ? (
				<ErrorState
					error={movements.error}
					onRetry={() => movements.refetch()}
				/>
			) : logs.length === 0 ? (
				<Card>
					<CardContent className='py-8 text-center text-muted-foreground text-sm'>
						Chưa có nhật ký
						{search.trim() ? ' khớp tìm kiếm' : ''}. Bấm{' '}
						<strong>Điều động</strong> / <strong>Thu hồi</strong>.
					</CardContent>
				</Card>
			) : (
				<Card className='overflow-hidden'>
					<div className='flex items-center justify-between gap-2 border-b px-3 py-2'>
						<div className='text-sm font-medium'>
							Nhật ký{' '}
							<span className='text-muted-foreground font-normal'>
								({logs.length})
							</span>
						</div>
						<span className='text-[11px] text-muted-foreground hidden sm:inline'>
							Bấm dòng hoặc Chi tiết để xem đủ
						</span>
					</div>
					<div className='overflow-x-auto max-h-[calc(100vh-11rem)] overflow-y-auto'>
						<Table>
							<TableHeader className='sticky top-0 z-10 bg-card'>
								<TableRow className='text-xs'>
									<TableHead className='h-9 py-1.5'>
										Ngày
									</TableHead>
									<TableHead className='h-9 py-1.5'>
										Loại
									</TableHead>
									<TableHead className='h-9 py-1.5'>
										Mã / Tên
									</TableHead>
									<TableHead className='h-9 py-1.5 text-center'>
										Cấp
									</TableHead>
									<TableHead className='h-9 py-1.5 text-center'>
										SL
									</TableHead>
									<TableHead className='h-9 py-1.5'>
										Phòng đích
									</TableHead>
									<TableHead className='h-9 py-1.5'>
										Diễn giải
									</TableHead>
									<TableHead className='h-9 py-1.5'>
										QĐ
									</TableHead>
									<TableHead className='h-9 py-1.5'>
										Người TH
									</TableHead>
									<TableHead className='h-9 py-1.5 w-12 text-right' />
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.map((r: AssetMovementReportRow) => (
									<TableRow
										key={r.id}
										className='cursor-pointer hover:bg-muted/50'
										onClick={() => setDetailLog(r)}
									>
										<TableCell className='py-1.5 text-xs whitespace-nowrap'>
											{r.executedAt}
										</TableCell>
										<TableCell className='py-1.5'>
											<Badge
												variant={
													r.movementType ===
													'TRANSFER'
														? 'default'
														: 'secondary'
												}
												className='text-[10px] px-1.5 py-0'
											>
												{typeLabel(r.movementType)}
											</Badge>
										</TableCell>
										<TableCell className='py-1.5'>
											<div className='font-mono text-[10px] text-muted-foreground leading-tight'>
												{r.assetCode || '—'}
											</div>
											<div className='text-sm font-medium leading-tight'>
												{r.assetName}
											</div>
										</TableCell>
										<TableCell className='py-1.5 text-center text-xs tabular-nums'>
											{r.grade ?? 1}
										</TableCell>
										<TableCell className='py-1.5 text-center text-sm font-semibold tabular-nums'>
											{r.quantity}
										</TableCell>
										<TableCell className='py-1.5 text-xs'>
											<div className='leading-tight'>
												{r.buildingCode}/{r.roomCode}
											</div>
											<div className='text-[10px] text-muted-foreground leading-tight'>
												{r.roomName}
											</div>
										</TableCell>
										<TableCell className='py-1.5 text-xs max-w-[200px]'>
											<div
												className='truncate'
												title={r.explanation || ''}
											>
												{r.explanation || '—'}
											</div>
										</TableCell>
										<TableCell className='py-1.5 text-xs'>
											{r.decisionNumber || '—'}
										</TableCell>
										<TableCell className='py-1.5 text-xs max-w-[100px] truncate'>
											{r.performer || '—'}
										</TableCell>
										<TableCell className='py-1.5 text-right'>
											<Button
												size='icon'
												variant='ghost'
												className='h-7 w-7'
												title='Chi tiết'
												onClick={(e) => {
													e.stopPropagation()
													setDetailLog(r)
												}}
											>
												<Eye className='w-3.5 h-3.5' />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</Card>
			)}

			{/* Chi tiết nhật ký */}
			<Dialog
				open={!!detailLog}
				onOpenChange={(open) => {
					if (!open) setDetailLog(null)
				}}
			>
				<DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle className='flex items-center gap-2'>
							{detailLog ? (
								<>
									<Badge
										variant={
											detailLog.movementType ===
											'TRANSFER'
												? 'default'
												: 'secondary'
										}
									>
										{typeLabel(detailLog.movementType)}
									</Badge>
									Chi tiết nhật ký #{detailLog.id}
								</>
							) : (
								'Chi tiết nhật ký'
							)}
						</DialogTitle>
					</DialogHeader>
					{detailLog ? (
						<div className='space-y-4 text-sm'>
							<div className='grid gap-4 sm:grid-cols-2'>
								<DetailField
									label='Ngày thực hiện'
									value={detailLog.executedAt}
								/>
								<DetailField
									label='Loại'
									value={typeLabel(detailLog.movementType)}
								/>
								<DetailField
									label='Mã vật tư'
									value={
										<span className='font-mono'>
											{detailLog.assetCode || '—'}
										</span>
									}
								/>
								<DetailField
									label='Tên trang bị'
									value={
										<span className='font-medium'>
											{detailLog.assetName}
										</span>
									}
								/>
								<DetailField
									label='Số lượng'
									value={
										<span className='font-semibold tabular-nums text-base'>
											{detailLog.quantity}
										</span>
									}
								/>
								<DetailField
									label='SL trước → sau (phòng đích)'
									value={`${detailLog.quantityBefore} → ${detailLog.quantityAfter}`}
								/>
								<DetailField
									label='Phân cấp'
									value={detailLog.grade ?? 1}
								/>
								<DetailField
									label='Năm SX / Năm SD'
									value={[
										detailLog.manufactureYear || '—',
										detailLog.usageYear || '—'
									].join(' / ')}
								/>
							</div>

							<div className='rounded-md border bg-muted/30 p-3 space-y-2'>
								<div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
									Vị trí (phòng đích sau khi chuyển)
								</div>
								<div className='grid gap-3 sm:grid-cols-2'>
									<DetailField
										label='Tòa'
										value={`${detailLog.buildingCode} — ${detailLog.buildingName}`}
									/>
									<DetailField
										label='Tầng'
										value={detailLog.floorName}
									/>
									<DetailField
										label='Phòng'
										value={`${detailLog.roomCode} — ${detailLog.roomName}`}
										className='sm:col-span-2'
									/>
								</div>
							</div>

							<div className='grid gap-4 sm:grid-cols-2'>
								<DetailField
									label='Đơn vị thực hiện'
									value={detailLog.executingUnit}
								/>
								<DetailField
									label='Địa chỉ lắp đặt / giữ'
									value={detailLog.installAddress}
								/>
								<DetailField
									label='Số quyết định'
									value={detailLog.decisionNumber}
								/>
								<DetailField
									label='Ngày quyết định'
									value={detailLog.decisionDate}
								/>
								<DetailField
									label='Người ký'
									value={detailLog.signer}
								/>
								<DetailField
									label='Người thực hiện'
									value={detailLog.performer}
								/>
							</div>

							<div className='space-y-3'>
								<DetailField
									label='Diễn giải (nguồn → đích)'
									value={
										<span className='whitespace-pre-wrap'>
											{detailLog.explanation || '—'}
										</span>
									}
								/>
								<DetailField
									label='Lý do / đề nghị'
									value={
										detailLog.reasonOther ||
										detailLog.reasonCode ||
										'—'
									}
								/>
								<DetailField
									label='Ghi chú'
									value={
										<span className='whitespace-pre-wrap'>
											{detailLog.note || '—'}
										</span>
									}
								/>
							</div>

							<div className='text-xs text-muted-foreground border-t pt-3'>
								Ghi lúc {detailLog.createdAt}
								{detailLog.updatedAt &&
								detailLog.updatedAt !== detailLog.createdAt
									? ` · Cập nhật ${detailLog.updatedAt}`
									: ''}
							</div>
						</div>
					) : null}
					<DialogFooter className='gap-2 flex-wrap sm:justify-between'>
						<div className='flex flex-col gap-1.5 items-start'>
							<div className='flex flex-wrap gap-2'>
								<Button
									variant='outline'
									size='sm'
									disabled={!detailLog || exporting}
									onClick={async () => {
										if (!detailLog) return
										setExporting(true)
										try {
											await exportAssetMovementsExcel(
												[detailLog],
												`chi-tiet-log-${detailLog.id}.xlsx`
											)
											toast.success(
												'Đã xuất Excel 1 dòng log'
											)
										} catch (e) {
											toast.error('Xuất Excel thất bại', {
												description: (e as Error)
													.message
											})
										} finally {
											setExporting(false)
										}
									}}
									title='Xuất 1 dòng log này ra Excel'
								>
									<Download className='w-4 h-4 mr-2' />
									Excel (1 dòng)
								</Button>
								<Button
									variant='default'
									size='sm'
									disabled={!detailLog || exporting}
									onClick={async () => {
										if (!detailLog) return
										setExporting(true)
										try {
											await exportTransferRecallLogsWord(
												[detailLog],
												{
													filename: `quyet-dinh-log-${detailLog.id}.docx`
												}
											)
											toast.success(
												'Đã xuất Quyết định Word (1 phiếu)'
											)
										} catch (e) {
											toast.error('Xuất Word thất bại', {
												description: (e as Error)
													.message
											})
										} finally {
											setExporting(false)
										}
									}}
									title='Xuất file Quyết định Word cho phiếu này (mẫu hành chính)'
								>
									<FileText className='w-4 h-4 mr-2' />
									Xuất Quyết định (Word)
								</Button>
							</div>
							<p className='text-[11px] text-muted-foreground max-w-md'>
								<strong>Excel</strong>: 1 dòng nhật ký ·{' '}
								<strong>Quyết định Word</strong>: văn bản QĐ
								điều động/thu hồi (chỉ phiếu đang xem).
							</p>
						</div>
						<Button onClick={() => setDetailLog(null)}>Đóng</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className='sm:max-w-4xl max-h-[92vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle className='flex items-center gap-2'>
							{mode === 'TRANSFER' ? (
								<>
									<Truck className='w-5 h-5' />
									Điều động vật tư
								</>
							) : (
								<>
									<PackageMinus className='w-5 h-5' />
									Thu hồi vật tư
								</>
							)}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-4 text-sm'>
						<p className='text-muted-foreground text-xs'>
							{mode === 'TRANSFER'
								? 'Chọn phòng nguồn và phòng đích, tick các trang bị cần điều động (gợi ý: mã, tên, ĐVT, phân cấp, SL còn). Có thể nhiều dòng trong một lần.'
								: 'Thu hồi: chọn phòng đang giữ (nguồn) → tự động về kho hệ thống KHO-VT. Tick trang bị, nhập SL và ghi chú.'}
						</p>

						{/* Phòng nguồn → phòng đích */}
						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='space-y-1.5'>
								<Label>
									Phòng nguồn{' '}
									<span className='text-destructive'>*</span>
								</Label>
								<SearchableSelect
									options={roomOptions}
									value={sourceRoomId}
									onValueChange={onSourceRoomChange}
									placeholder='Chọn phòng nguồn…'
									searchPlaceholder='Gõ mã tòa / phòng…'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>
									{mode === 'RECALL'
										? 'Phòng đích (kho)'
										: 'Phòng đích'}{' '}
									<span className='text-destructive'>*</span>
								</Label>
								{mode === 'RECALL' ? (
									<div className='rounded-md border bg-muted/40 px-3 py-2 text-sm'>
										{warehouseQ.data
											? `${warehouseQ.data.roomCode} — ${warehouseQ.data.roomName}`
											: warehouseQ.isLoading
												? 'Đang tải kho…'
												: 'KHO-VT (tự tạo khi xác nhận)'}
										<p className='text-[11px] text-muted-foreground mt-1'>
											Thu hồi / trả về luôn vào kho hệ
											thống.
										</p>
									</div>
								) : (
									<SearchableSelect
										options={roomOptions}
										value={targetRoomId}
										onValueChange={setTargetRoomId}
										placeholder='Chọn phòng đích…'
										searchPlaceholder='Gõ mã tòa / phòng…'
									/>
								)}
							</div>
						</div>

						{routeSummary ? (
							<div className='rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium flex items-center gap-2'>
								<ArrowRightLeft className='w-4 h-4 shrink-0 text-primary' />
								<span>
									{mode === 'TRANSFER'
										? 'Điều động'
										: 'Thu hồi'}
									:{' '}
									<span className='text-primary'>
										{routeSummary}
									</span>
								</span>
							</div>
						) : (
							<p className='text-xs text-muted-foreground'>
								Chọn cả hai phòng để xem lộ trình điều động /
								thu hồi.
							</p>
						)}

						{/* Gợi ý nhanh — chỉ VT phòng nguồn */}
						<div className='flex flex-col sm:flex-row gap-2 items-end'>
							<div className='space-y-1.5 flex-1 min-w-0 w-full'>
								<Label>Gợi ý trang bị (chỉ phòng nguồn)</Label>
								<SearchableSelect
									options={sourceRoomAssetOptions}
									value={quickAssetId}
									onValueChange={setQuickAssetId}
									placeholder={
										sourceRoomId
											? 'Gõ mã / tên trang bị trong phòng nguồn…'
											: 'Chọn phòng nguồn trước…'
									}
									searchPlaceholder='Mã, tên, ĐVT…'
									disabled={!sourceRoomId}
								/>
								{sourceRoomId ? (
									<p className='text-xs text-muted-foreground'>
										{sourceRoomAssetOptions.length} trang bị
										còn SL tại phòng nguồn — không hiện VT
										phòng khác.
									</p>
								) : null}
							</div>
							<Button
								type='button'
								variant='outline'
								className='shrink-0'
								onClick={addQuickAsset}
								disabled={!sourceRoomId || !quickAssetId}
							>
								<Plus className='w-4 h-4 mr-1' />
								Chọn vào phiếu
							</Button>
						</div>

						{/* Bảng trang bị phòng nguồn */}
						<div className='space-y-2'>
							<div className='flex flex-wrap items-end justify-between gap-2'>
								<div>
									<Label className='text-sm'>
										Danh sách trang bị tại phòng nguồn
									</Label>
									<p className='text-xs text-muted-foreground'>
										{sourceRoomId
											? `${sourceRoomAssets.length} dòng còn SL · đã chọn ${selectedLines.length} khoản`
											: 'Chọn phòng nguồn để hiện gợi ý'}
									</p>
								</div>
								{sourceRoomId ? (
									<Input
										className='w-full sm:w-56'
										value={lineSearch}
										onChange={(e) =>
											setLineSearch(e.target.value)
										}
										placeholder='Lọc mã / tên / ĐVT…'
									/>
								) : null}
							</div>

							{!sourceRoomId ? (
								<div className='rounded-md border border-dashed py-8 text-center text-muted-foreground text-xs'>
									Chọn phòng nguồn để hiển thị bảng gợi ý
									trang bị.
								</div>
							) : filteredSourceAssets.length === 0 ? (
								<div className='rounded-md border py-8 text-center text-muted-foreground text-xs'>
									Không có vật tư còn SL trong phòng này
									{lineSearch.trim() ? ' (theo bộ lọc)' : ''}.
								</div>
							) : (
								<div className='rounded-md border overflow-x-auto max-h-[320px] overflow-y-auto'>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className='w-10'>
													<Checkbox
														checked={
															allVisibleSelected
														}
														onCheckedChange={(c) =>
															selectAllVisible(
																c === true
															)
														}
														aria-label='Chọn tất cả'
													/>
												</TableHead>
												<TableHead className='w-10'>
													STT
												</TableHead>
												<TableHead>Mã số</TableHead>
												<TableHead>
													Tên trang bị
												</TableHead>
												<TableHead>ĐVT</TableHead>
												<TableHead className='text-center'>
													Phân cấp
												</TableHead>
												<TableHead className='text-center'>
													SL còn
												</TableHead>
												<TableHead className='w-24 text-center'>
													SL ĐĐ
												</TableHead>
												<TableHead className='min-w-[120px]'>
													Ghi chú
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredSourceAssets.map(
												(a, idx) => {
													const line = lines.find(
														(l) =>
															l.roomAssetId ===
															a.id
													) ?? {
														roomAssetId: a.id,
														selected: false,
														quantity: 1,
														note: ''
													}
													return (
														<TableRow
															key={a.id}
															className={
																line.selected
																	? 'bg-primary/5'
																	: undefined
															}
														>
															<TableCell>
																<Checkbox
																	checked={
																		line.selected
																	}
																	onCheckedChange={(
																		c
																	) =>
																		updateLine(
																			a.id,
																			{
																				selected:
																					c ===
																					true
																			}
																		)
																	}
																/>
															</TableCell>
															<TableCell className='text-muted-foreground text-xs'>
																{idx + 1}
															</TableCell>
															<TableCell className='font-mono text-xs'>
																{a.code || '—'}
															</TableCell>
															<TableCell>
																<div className='font-medium'>
																	{a.name}
																</div>
																{a.category ? (
																	<div className='text-xs text-muted-foreground'>
																		{
																			a.category
																		}
																	</div>
																) : null}
															</TableCell>
															<TableCell>
																{a.unit || '—'}
															</TableCell>
															<TableCell className='text-center tabular-nums'>
																{a.grade ?? 1}
															</TableCell>
															<TableCell className='text-center font-semibold tabular-nums'>
																{a.quantity}
															</TableCell>
															<TableCell>
																<Input
																	type='number'
																	min={1}
																	max={
																		a.quantity
																	}
																	className='h-8 w-20 mx-auto text-center'
																	disabled={
																		!line.selected
																	}
																	value={
																		line.quantity
																	}
																	onChange={(
																		e
																	) =>
																		updateLine(
																			a.id,
																			{
																				quantity:
																					Math.min(
																						a.quantity,
																						Math.max(
																							1,
																							Number(
																								e
																									.target
																									.value
																							) ||
																								1
																						)
																					)
																			}
																		)
																	}
																/>
															</TableCell>
															<TableCell>
																<Input
																	className='h-8'
																	disabled={
																		!line.selected
																	}
																	value={
																		line.note
																	}
																	onChange={(
																		e
																	) =>
																		updateLine(
																			a.id,
																			{
																				note: e
																					.target
																					.value
																			}
																		)
																	}
																	placeholder='…'
																/>
															</TableCell>
														</TableRow>
													)
												}
											)}
										</TableBody>
									</Table>
								</div>
							)}
						</div>

						{/* Metadata */}
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1.5'>
								<Label>
									Ngày thực hiện{' '}
									<span className='text-destructive'>*</span>
								</Label>
								<Input
									type='date'
									value={executedAt}
									onChange={(e) =>
										setExecutedAt(e.target.value)
									}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Đơn vị sử dụng / giữ</Label>
								<Input
									value={
										holdingUnitAutoLabel ||
										(targetRoomId
											? ''
											: '— Chọn phòng đích trước —')
									}
									readOnly
									disabled
									className='bg-muted'
								/>
								<p className='text-xs text-muted-foreground'>
									Tự động = <strong>phòng đích</strong> (không
									chọn tay).
								</p>
							</div>
						</div>
						<div className='space-y-1.5'>
							<Label>
								Đơn vị thực hiện{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								options={unitOptions}
								value={executingUnitId}
								onValueChange={setExecutingUnitId}
								placeholder='Chọn đơn vị thực hiện…'
								searchPlaceholder='Gõ tên / mã… (vd: hành, PTMHC)'
								emptyText='Không có đơn vị khớp'
							/>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1.5'>
								<Label>Ngày quyết định</Label>
								<Input
									type='date'
									value={decisionDate}
									onChange={(e) =>
										setDecisionDate(e.target.value)
									}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Số quyết định</Label>
								<Input
									value={decisionNumber}
									onChange={(e) =>
										setDecisionNumber(e.target.value)
									}
									placeholder='VD: 12/QĐ-HC2'
								/>
								<p className='text-xs text-muted-foreground'>
									In trên Word: «Số: …» — để trống thì
									«....../QĐ-HC2».
								</p>
							</div>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1.5'>
								<Label>Người ký</Label>
								<Input
									value={signer}
									onChange={(e) => setSigner(e.target.value)}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Người thực hiện</Label>
								<Input
									value={performer}
									onChange={(e) =>
										setPerformer(e.target.value)
									}
								/>
							</div>
						</div>
						<div className='space-y-1.5'>
							<Label>
								Theo đề nghị của Trưởng đơn vị{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								options={unitOptions}
								value={proposedByUnitId}
								onValueChange={setProposedByUnitId}
								placeholder='Chọn đơn vị (trưởng đề nghị)…'
								searchPlaceholder='Gõ tên / mã… (vd: hành, tham mưu)'
								emptyText='Không có đơn vị khớp'
							/>
							{proposedByUnitId ? (
								<p className='text-xs text-muted-foreground'>
									Sẽ ghi: «Theo đề nghị của Trưởng{' '}
									{unitNameOnly(
										unitLabelById.get(
											Number(proposedByUnitId)
										) || ''
									)}
									»
								</p>
							) : null}
						</div>
						<div className='space-y-1.5'>
							<Label>Lý do bổ sung (tùy chọn)</Label>
							<Input
								value={reasonOther}
								onChange={(e) => setReasonOther(e.target.value)}
								placeholder='VD: nhu cầu biên chế / huấn luyện…'
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>
								Ghi chú chung (áp dụng mọi dòng đã chọn)
							</Label>
							<Textarea
								value={note}
								onChange={(e) => setNote(e.target.value)}
								rows={2}
								placeholder='Ghi chú phiếu — ghép với ghi chú từng dòng'
							/>
						</div>
					</div>
					<DialogFooter className='gap-2 flex-wrap sm:justify-between'>
						<div className='text-xs text-muted-foreground self-center'>
							{selectedLines.length > 0
								? `${selectedLines.length} khoản · tổng SL ${selectedLines.reduce((s, l) => s + l.quantity, 0)}`
								: 'Chưa chọn trang bị'}
						</div>
						<div className='flex flex-wrap gap-2'>
							<Button
								variant='outline'
								onClick={() => setDialogOpen(false)}
							>
								Hủy
							</Button>
							<Button
								disabled={mutation.isPending}
								onClick={() => mutation.mutate()}
							>
								<ArrowRightLeft className='w-4 h-4 mr-2' />
								{mutation.isPending
									? 'Đang lưu…'
									: mode === 'TRANSFER'
										? 'Xác nhận và xuất Word'
										: 'Xác nhận thu hồi và xuất Word'}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
