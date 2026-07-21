/**
 * Đơn vị: tạo + theo dõi đề xuất sửa chữa / thu hồi-trả / thanh lý.
 * Chọn VT tại phòng, ghi lý do + vị trí → gửi cơ quan quản lý.
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	CheckCircle2,
	FilePlus2,
	Loader2,
	Plus,
	RefreshCw,
	Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateAssetProposal,
	GetAssetCatalog,
	GetRoomAssets,
	GetRooms,
	ListAssetProposals,
	type AssetProposal,
	type AssetProposalType
} from '@/api/asset'
import type { Room, RoomAsset } from '@/types/asset'
import { cn, isDonViUser } from '@/lib/utils'
import useAuth from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { SearchableSelect } from '@/components/ui/searchable-select'

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
			if (proposalType === 'REPAIR')
				return 'BGH đã duyệt — ngành đang xử lý'
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

type DraftItem = {
	key: string
	roomAssetId: number
	materialName: string
	materialCode: string
	category: string
	quantity: number
	maxQty: number
	unit: string
	fromRoomId: number
	fromRoomCode: string
	fromRoomName: string
	locationNote: string
	note: string
}

/** Banner kết quả SC chỉ hiện ~1 phút (đã có chuông thông báo) */
const RESULT_BANNER_MS = 60_000

function completedAtMs(p: AssetProposal): number | null {
	const raw = (p.completedAt || p.updatedAt || p.decisionAt || '').trim()
	if (!raw) return null
	// ISO hoặc «YYYY-MM-DD HH:mm:ss» / «YYYY-MM-DDTHH:mm»
	const t = Date.parse(raw.includes('T') ? raw : raw.replace(' ', 'T'))
	return Number.isFinite(t) ? t : null
}

export default function UserProposalsPage() {
	const [open, setOpen] = useState(false)
	const [detail, setDetail] = useState<AssetProposal | null>(null)
	/** Tick mỗi vài giây để ẩn banner sau 1 phút */
	const [nowMs, setNowMs] = useState(() => Date.now())
	const qc = useQueryClient()
	const listQ = useQuery({
		queryKey: ['asset-proposals', 'mine'],
		queryFn: () => ListAssetProposals({ mine: true, limit: 500 }),
		// Poll để nhận kết quả sửa chữa khi admin hoàn thành
		refetchInterval: 20_000
	})

	useEffect(() => {
		const id = window.setInterval(() => setNowMs(Date.now()), 5_000)
		return () => window.clearInterval(id)
	}, [])

	/** Chỉ REPAIR vừa hoàn thành trong 1 phút gần nhất */
	const recentRepairResults = useMemo(() => {
		const rows = (listQ.data || []).filter((p) => {
			if (p.status !== 'COMPLETED' || p.proposalType !== 'REPAIR')
				return false
			if (!(p.adminNote || '').trim()) return false
			const at = completedAtMs(p)
			if (at == null) return false
			return nowMs - at >= 0 && nowMs - at < RESULT_BANNER_MS
		})
		// Mới nhất trước, tối đa 3 banner
		return rows
			.sort((a, b) => (completedAtMs(b) ?? 0) - (completedAtMs(a) ?? 0))
			.slice(0, 3)
	}, [listQ.data, nowMs])

	const proposalCount = (listQ.data || []).length

	return (
		<div className='p-4 md:p-6 flex flex-col gap-4 max-w-6xl mx-auto h-full min-h-0'>
			<div className='flex flex-wrap items-start justify-between gap-3 shrink-0'>
				<div>
					<h1 className='text-xl font-semibold flex items-center gap-2'>
						<FilePlus2 className='w-5 h-5' />
						Đề xuất của tôi
					</h1>
					<p className='text-sm text-muted-foreground mt-1 max-w-2xl'>
						Gửi đề xuất sửa chữa (giữ nguyên cấp), thu hồi/trả về
						kho, hoặc thanh lý. Sửa xong vẫn cùng cấp; kết quả báo
						qua chuông (banner trên trang chỉ hiện ~1 phút).
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button onClick={() => setOpen(true)}>
						<Plus className='w-4 h-4 mr-1.5' />
						Tạo đề xuất
					</Button>
					<Button
						variant='ghost'
						size='icon'
						onClick={() => listQ.refetch()}
					>
						<RefreshCw
							className={cn(
								'w-4 h-4',
								listQ.isFetching && 'animate-spin'
							)}
						/>
					</Button>
				</div>
			</div>

			{recentRepairResults.length > 0 && (
				<div className='space-y-3 shrink-0'>
					{recentRepairResults.map((p) => (
						<div
							key={p.id}
							className='rounded-xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-800 px-3 py-4 flex flex-wrap items-start gap-4'
						>
							<CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
							<div className='min-w-0 flex-1'>
								<div className='text-sm font-semibold text-emerald-900 dark:text-emerald-100'>
									Kết quả sửa chữa — đề xuất #{p.id}
								</div>
								<div className='text-sm mt-1'>{p.title}</div>
								<div className='text-sm mt-2 rounded-lg bg-background/70 border px-4 py-3 leading-normal'>
									<span className='font-semibold'>
										Kết quả:{' '}
									</span>
									{p.adminNote}
								</div>
								{(p.decidedByDisplayName ||
									p.decidedByUsername) && (
									<div className='text-sm text-muted-foreground mt-2'>
										Người xử lý:{' '}
										{p.decidedByDisplayName ||
											p.decidedByUsername}
										{p.completedAt
											? ` · ${p.completedAt.slice(0, 16)}`
											: ''}
										<span className='ml-2 text-xs opacity-70'>
											(tự ẩn sau ~1 phút)
										</span>
									</div>
								)}
							</div>
							<Button
								size='default'
								variant='outline'
								className='h-9 text-base'
								onClick={() => setDetail(p)}
							>
								Xem
							</Button>
						</div>
					))}
				</div>
			)}

			{listQ.isLoading ? (
				<Skeleton className='h-40 w-full shrink-0' />
			) : !(listQ.data || []).length ? (
				<Card className='shrink-0'>
					<CardContent className='py-14 text-center text-sm text-muted-foreground'>
						Chưa có đề xuất nào. Bấm «Tạo đề xuất» để gửi.
					</CardContent>
				</Card>
			) : (
				<div className='rounded-xl border bg-card flex flex-col min-h-0 flex-1 overflow-hidden'>
					<div className='flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/20 shrink-0'>
						<span className='text-sm text-muted-foreground'>
							{proposalCount} đề xuất · lướt xuống để xem các đề
							xuất cũ
						</span>
					</div>
					{/* Một khung cuộn (x + y): header sticky khi lướt đề xuất cũ */}
					<div className='overflow-auto flex-1 min-h-0 max-h-[calc(100dvh-14rem)] overscroll-contain'>
						<table className='w-full min-w-[900px] caption-bottom text-[1.05rem] leading-relaxed'>
							<TableHeader className='sticky top-0 z-10 bg-card shadow-sm'>
								<TableRow className='bg-muted/40 hover:bg-muted/40'>
									<TableHead className='text-sm font-medium'>
										#
									</TableHead>
									<TableHead className='text-sm font-medium'>
										Loại
									</TableHead>
									<TableHead className='text-sm font-medium'>
										Tiêu đề
									</TableHead>
									<TableHead className='text-sm font-medium text-center'>
										VT
									</TableHead>
									<TableHead className='text-sm font-medium'>
										Trạng thái
									</TableHead>
									<TableHead className='text-sm font-medium'>
										Ngày
									</TableHead>
									<TableHead className='text-sm font-medium'>
										Kết quả / QĐ
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(listQ.data || []).map((p) => (
									<TableRow
										key={p.id}
										className='cursor-pointer hover:bg-muted/30'
										onClick={() => setDetail(p)}
									>
										<TableCell className='px-3 py-3 text-sm tabular-nums font-medium'>
											{p.id}
										</TableCell>
										<TableCell className='px-3 py-2.5'>
											<Badge
												variant='outline'
												className='text-xs'
											>
												{typeLabel(p.proposalType)}
											</Badge>
										</TableCell>
										<TableCell className='px-3 py-2.5 font-semibold text-sm max-w-[280px] whitespace-normal'>
											{p.title}
											{p.description ? (
												<div className='text-sm font-normal text-muted-foreground line-clamp-2 mt-1 leading-normal'>
													{p.description}
												</div>
											) : null}
										</TableCell>
										<TableCell className='px-3 py-2.5 text-center text-sm font-medium'>
											{p.items?.length ?? 0}
										</TableCell>
										<TableCell className='px-3 py-2.5'>
											<Badge
												className='text-xs'
												variant={
													p.status === 'PENDING'
														? 'default'
														: p.status ===
															  'REJECTED'
															? 'destructive'
															: p.status ===
																  'APPROVED'
																? 'outline'
																: 'secondary'
												}
											>
												{statusLabel(
													p.status,
													p.proposalType
												)}
											</Badge>
										</TableCell>
										<TableCell className='px-3 py-3 text-sm whitespace-nowrap'>
											{p.createdAt?.slice(0, 16)}
										</TableCell>
										<TableCell className='px-3 py-3 text-sm max-w-[260px] leading-normal whitespace-normal'>
											{p.status === 'COMPLETED' &&
											p.adminNote ? (
												<div className='text-emerald-700 dark:text-emerald-400 font-semibold'>
													{p.adminNote}
												</div>
											) : p.decisionNumber ? (
												<span className='font-mono'>
													{p.decisionNumber}
												</span>
											) : p.status === 'COMPLETED' ? (
												'Đã xong'
											) : (
												'—'
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</table>
					</div>
				</div>
			)}

			{open && (
				<CreateProposalDialog
					onClose={() => setOpen(false)}
					onDone={async () => {
						setOpen(false)
						await qc.invalidateQueries({
							queryKey: ['asset-proposals']
						})
						await qc.invalidateQueries({
							queryKey: ['pending-proposals']
						})
					}}
				/>
			)}

			{detail && (
				<Dialog open onOpenChange={(o) => !o && setDetail(null)}>
					<DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
						<DialogHeader>
							<DialogTitle>
								Đề xuất #{detail.id} —{' '}
								{typeLabel(detail.proposalType)}
							</DialogTitle>
						</DialogHeader>
						<div className='space-y-4'>
							<div className='flex flex-wrap gap-2 items-center'>
								<Badge
									className='text-xs'
									variant={
										detail.status === 'COMPLETED'
											? 'secondary'
											: detail.status === 'REJECTED'
												? 'destructive'
												: 'default'
									}
								>
									{statusLabel(
										detail.status,
										detail.proposalType
									)}
								</Badge>
								<span className='text-muted-foreground text-sm'>
									{detail.createdAt}
								</span>
							</div>
							<p className='font-bold text-sm'>{detail.title}</p>
							{detail.description && (
								<p className='text-muted-foreground text-sm leading-normal'>
									{detail.description}
								</p>
							)}
							{detail.status === 'COMPLETED' &&
								detail.adminNote && (
									<div className='rounded-xl border border-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/40 p-4 space-y-2'>
										<div className='font-bold text-base text-emerald-800 dark:text-emerald-200 flex items-center gap-2'>
											<CheckCircle2 className='w-4 h-4' />
											Kết quả sửa chữa
										</div>
										<p className='text-sm leading-normal'>
											{detail.adminNote}
										</p>
										{(detail.decidedByDisplayName ||
											detail.decidedByUsername) && (
											<p className='text-xs text-muted-foreground'>
												Người xử lý:{' '}
												{detail.decidedByDisplayName ||
													detail.decidedByUsername}
											</p>
										)}
									</div>
								)}
							{detail.status === 'REJECTED' &&
								detail.adminNote && (
									<div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3'>
										<div className='font-semibold text-destructive'>
											Lý do từ chối
										</div>
										<p className='text-base mt-1'>
											{detail.adminNote}
										</p>
									</div>
								)}
							<div className='rounded-lg border overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Vật tư</TableHead>
											<TableHead>Vị trí</TableHead>
											<TableHead className='text-right'>
												SL
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(detail.items || []).map((it) => (
											<TableRow key={it.id}>
												<TableCell>
													{it.materialName}
												</TableCell>
												<TableCell className='text-xs'>
													{[
														it.fromRoomCode,
														it.fromRoomName
													]
														.filter(Boolean)
														.join(' ') || '—'}
												</TableCell>
												<TableCell className='text-right'>
													{it.quantity}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant='outline'
								onClick={() => setDetail(null)}
							>
								Đóng
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	)
}

function CreateProposalDialog({
	onClose,
	onDone
}: {
	onClose: () => void
	onDone: () => Promise<void>
}) {
	const { user } = useAuth()
	// User đơn vị sử dụng (role) hoặc user có unitId nhưng không phải admin/ngành
	const donVi = isDonViUser()
	const fixedUnitId = donVi ? (user?.unitId ?? null) : null
	const fixedUnitLabel =
		user?.unitName || (fixedUnitId != null ? `Đơn vị #${fixedUnitId}` : '')

	const [ptype, setPtype] = useState<AssetProposalType>('REPAIR')
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [unitName, setUnitName] = useState(fixedUnitLabel)
	const [nganhCode, setNganhCode] = useState('')
	const [items, setItems] = useState<DraftItem[]>([])

	const [pickRoomId, setPickRoomId] = useState<string>('')
	const [pickAssetId, setPickAssetId] = useState<string>('')
	const [pickQty, setPickQty] = useState(1)
	const [pickLocNote, setPickLocNote] = useState('')

	const catalogQ = useQuery({
		queryKey: ['asset-catalog', 'proposal-nganh'],
		queryFn: () => GetAssetCatalog(),
		staleTime: 60_000
	})
	const nganhOpts = useMemo(() => {
		const list = catalogQ.data?.nganh ?? []
		return list.map((n) => ({
			value: n.code,
			label: `${n.code} — ${n.name}`,
			keywords: `${n.code} ${n.name}`
		}))
	}, [catalogQ.data])

	const roomsQ = useQuery({
		queryKey: ['rooms', 'proposal-create'],
		queryFn: () => GetRooms()
	})
	/**
	 * VT toàn bộ (hoặc theo đơn vị) — dùng để:
	 * 1) Lọc phòng có VT đúng ngành (+ ĐV nếu có)
	 * 2) Fallback khi chưa chọn phòng
	 */
	const allAssetsQ = useQuery({
		queryKey: ['room-assets', 'proposal-all', fixedUnitId],
		queryFn: () => GetRoomAssets(),
		staleTime: 30_000
	})

	/** VT ứng viên: SL>0, theo ĐV (nếu donVi), theo ngành (nếu đã chọn) */
	const assetsMatchingNganhUnit = useMemo(() => {
		let list = ((allAssetsQ.data || []) as RoomAsset[]).filter(
			(a) => (a.quantity || 0) > 0
		)
		if (donVi && fixedUnitId != null) {
			list = list.filter((a) => a.holdingUnitId === fixedUnitId)
		}
		if (nganhCode) {
			const prefix = nganhCode.toUpperCase()
			list = list.filter((a) =>
				(a.code || '').toUpperCase().startsWith(prefix)
			)
		}
		return list
	}, [allAssetsQ.data, donVi, fixedUnitId, nganhCode])

	/** Phòng có VT đúng ngành (+ ĐV) — bắt buộc chọn ngành trước khi lọc */
	const roomIdsForNganh = useMemo(() => {
		const ids = new Set<number>()
		for (const a of assetsMatchingNganhUnit) {
			if (a.roomId != null) ids.add(a.roomId)
		}
		return ids
	}, [assetsMatchingNganhUnit])

	const rooms = useMemo(() => {
		const all = (roomsQ.data || []) as Room[]
		// Chưa chọn ngành: chưa lọc phòng (sẽ disable UI)
		if (!nganhCode) return all
		if (!roomIdsForNganh.size) return []
		return all.filter((r) => roomIdsForNganh.has(r.id))
	}, [roomsQ.data, nganhCode, roomIdsForNganh])

	const roomOpts = useMemo(
		() =>
			rooms.map((r) => ({
				value: String(r.id),
				label: `${r.roomCode} — ${r.roomName}`,
				keywords: `${r.roomCode} ${r.roomName} ${r.roomType || ''}`
			})),
		[rooms]
	)

	/** VT trong phòng đã chọn ∩ ngành ∩ đơn vị (REPAIR: chỉ dòng đang dùng, không hỏng) */
	const assets = useMemo(() => {
		if (!pickRoomId || !nganhCode) return []
		const roomId = Number(pickRoomId)
		return assetsMatchingNganhUnit.filter((a) => {
			if (a.roomId !== roomId && Number(a.roomId) !== roomId) return false
			if (ptype === 'REPAIR') {
				const st = String(a.status || 'NORMAL').toUpperCase()
				const g = Number(a.grade ?? 1)
				if (st === 'BROKEN' || st === 'REPAIRING' || st === 'DISPOSED')
					return false
				if (g >= 5) return false
				if ((Number(a.quantity) || 0) <= 0) return false
			}
			return true
		})
	}, [assetsMatchingNganhUnit, pickRoomId, nganhCode, ptype])

	const assetOpts = useMemo(
		() =>
			assets.map((a) => ({
				value: String(a.id),
				label: `${a.code || '—'} · ${a.name} · cấp ${a.grade ?? 1} (SL ${a.quantity})`,
				keywords: `${a.code || ''} ${a.name} ${a.category}`
			})),
		[assets]
	)

	const selectedAsset = assets.find((a) => String(a.id) === pickAssetId)
	const selectedRoom = rooms.find((r) => String(r.id) === pickRoomId)

	const addItem = () => {
		if (!nganhCode) {
			toast.error('Chọn ngành trước')
			return
		}
		if (!selectedRoom) {
			toast.error('Chọn phòng (có VT thuộc ngành đã chọn)')
			return
		}
		if (!selectedAsset) {
			toast.error('Chọn vật tư trong phòng đó')
			return
		}
		// Chặn VT không thuộc phòng / ngành (phòng thủ)
		const codeOk = (selectedAsset.code || '')
			.toUpperCase()
			.startsWith(nganhCode.toUpperCase())
		if (!codeOk) {
			toast.error('Vật tư không thuộc ngành đã chọn')
			return
		}
		if (
			selectedAsset.roomId != null &&
			Number(selectedAsset.roomId) !== selectedRoom.id
		) {
			toast.error('Vật tư không thuộc phòng đã chọn')
			return
		}
		const qty = Math.min(
			Math.max(1, Math.floor(pickQty) || 1),
			selectedAsset.quantity
		)
		if (items.some((i) => i.roomAssetId === selectedAsset.id)) {
			toast.error('VT này đã có trong danh sách')
			return
		}
		setItems((prev) => [
			...prev,
			{
				key: `${selectedAsset.id}-${Date.now()}`,
				roomAssetId: selectedAsset.id,
				materialName: selectedAsset.name,
				materialCode: selectedAsset.code || '',
				category: selectedAsset.category,
				quantity: qty,
				maxQty: selectedAsset.quantity,
				unit: selectedAsset.unit || 'Bộ',
				fromRoomId: selectedRoom.id,
				fromRoomCode: selectedRoom.roomCode,
				fromRoomName: selectedRoom.roomName,
				locationNote:
					pickLocNote.trim() || selectedAsset.installAddress || '',
				note: ''
			}
		])
		setPickAssetId('')
		setPickQty(1)
		setPickLocNote('')
	}

	const mut = useMutation({
		mutationFn: () =>
			CreateAssetProposal({
				proposalType: ptype,
				title: title.trim(),
				description: description.trim() || undefined,
				unitId: fixedUnitId ?? undefined,
				unitName: donVi
					? fixedUnitLabel || unitName.trim() || undefined
					: unitName.trim() || undefined,
				nganhCode: nganhCode || undefined,
				items: items.map((it) => ({
					roomAssetId: it.roomAssetId,
					materialName: it.materialName,
					materialCode: it.materialCode || undefined,
					category: it.category,
					quantity: it.quantity,
					unit: it.unit,
					nganhCode: nganhCode || undefined,
					fromRoomId: it.fromRoomId,
					fromRoomCode: it.fromRoomCode,
					fromRoomName: it.fromRoomName,
					locationNote: it.locationNote || undefined,
					// Ghi lý do chung (mô tả đề xuất) vào note item → log chi tiết
					note: it.note || description.trim() || undefined
				}))
			}),
		onSuccess: async () => {
			toast.success(
				donVi
					? 'Đã gửi đề xuất lên ngành — chờ xử lý'
					: 'Đã gửi đề xuất — chờ cơ quan quản lý xử lý'
			)
			await onDone()
		},
		onError: (e: Error) => toast.error(e.message || 'Lỗi gửi đề xuất')
	})

	const canSubmit =
		title.trim().length > 0 &&
		items.length > 0 &&
		!mut.isPending &&
		(!donVi || !!nganhCode)

	const typeHint =
		ptype === 'REPAIR'
			? 'Đề nghị sửa chữa: giữ nguyên cấp khi gửi và khi sửa xong (chỉ chuyển trạng thái chờ/sửa, mã tạm). Sửa xong → báo kết quả.'
			: ptype === 'RECALL'
				? 'Đề nghị thu hồi/trả: khi hoàn tất, VT tự chuyển về kho hệ thống KHO-VT (bỏ gán đơn vị).'
				: 'Đề nghị thanh lý: sau khi có QĐ, VT giảm với lý do «Thanh lý» và lưu để báo cáo.'

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className='!max-w-4xl w-[min(96vw,56rem)] max-h-[92vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Tạo đề xuất</DialogTitle>
				</DialogHeader>
				<div className='space-y-4'>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label className='text-sm font-semibold'>
								Loại đề xuất *
							</Label>
							<Select
								value={ptype}
								onValueChange={(v) =>
									setPtype(v as AssetProposalType)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='REPAIR'>
										Sửa chữa
									</SelectItem>
									<SelectItem value='RECALL'>
										Thu hồi / trả về kho
									</SelectItem>
									<SelectItem value='LIQUIDATION'>
										Thanh lý
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-1.5'>
							<Label>
								Đơn vị đề xuất
								{donVi ? (
									<span className='text-muted-foreground font-normal'>
										{' '}
										(cố định)
									</span>
								) : null}
							</Label>
							{donVi ? (
								<div className='h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-medium'>
									{fixedUnitLabel || '—'}
								</div>
							) : (
								<Input
									value={unitName}
									onChange={(e) =>
										setUnitName(e.target.value)
									}
									placeholder='vd. Đại đội 1 / Khoa CNTT'
								/>
							)}
						</div>
					</div>
					<div className='space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-3'>
						<Label className='text-sm font-semibold'>
							Ngành nhận đề xuất
							<span className='text-destructive'> *</span>
						</Label>
						{catalogQ.isLoading ? (
							<p className='text-sm text-muted-foreground py-2'>
								Đang tải danh sách ngành…
							</p>
						) : catalogQ.isError ? (
							<p className='text-sm text-destructive py-1'>
								Không tải được ngành.{' '}
								<button
									type='button'
									className='underline'
									onClick={() => catalogQ.refetch()}
								>
									Thử lại
								</button>
							</p>
						) : nganhOpts.length === 0 ? (
							<p className='text-sm text-destructive py-1'>
								Chưa có ngành trong danh mục. Admin cần thêm
								ngành trước.
							</p>
						) : (
							<SearchableSelect
								value={nganhCode}
								onValueChange={(v) => {
									setNganhCode(v)
									setPickRoomId('')
									setPickAssetId('')
									setItems([])
								}}
								options={nganhOpts}
								placeholder='Chọn ngành (HC2A, HC2B…)…'
								searchPlaceholder='Gõ mã/tên ngành…'
								emptyText='Không có ngành khớp'
								className='h-10'
							/>
						)}
						{nganhCode ? (
							<p className='text-[11px] text-muted-foreground'>
								Đã chọn:{' '}
								<strong className='text-foreground'>
									{nganhOpts.find(
										(o) => o.value === nganhCode
									)?.label || nganhCode}
								</strong>
								{' — '}
								user ngành này sẽ nhận đề xuất.
							</p>
						) : (
							<p className='text-[11px] text-muted-foreground'>
								Bắt buộc chọn ngành để gửi đề xuất (user ngành
								tương ứng nhận thông báo).
							</p>
						)}
					</div>
					<p className='text-xs text-muted-foreground rounded-md border bg-muted/30 p-2'>
						{typeHint}
					</p>
					<div className='space-y-1.5'>
						<Label>Tiêu đề *</Label>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder={
								ptype === 'REPAIR'
									? 'vd. Đề nghị sửa máy tính phòng E-DV-CNTT'
									: ptype === 'RECALL'
										? 'vd. Thu hồi VT hỏng về kho'
										: 'vd. Đề nghị thanh lý VT hết hạn sử dụng'
							}
						/>
					</div>
					<div className='space-y-1.5'>
						<Label>Lý do / mô tả</Label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
							placeholder='Loại hỏng, lý do thu hồi/thanh lý…'
						/>
					</div>

					<div className='rounded-lg border p-3 space-y-2 bg-muted/10'>
						<div className='font-semibold text-sm'>Thêm vật tư</div>
						<p className='text-[11px] text-muted-foreground'>
							Thứ tự: <strong>Ngành</strong> →{' '}
							<strong>Phòng</strong> (có VT ngành đó) →{' '}
							<strong>Vật tư</strong> trong phòng đó.
							{donVi
								? ' Chỉ hiện VT thuộc đơn vị sử dụng của bạn.'
								: null}
						</p>
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
							<div className='space-y-1.5'>
								<Label className='text-sm'>
									Phòng / vị trí *
								</Label>
								<SearchableSelect
									value={pickRoomId}
									onValueChange={(v) => {
										setPickRoomId(v)
										setPickAssetId('')
									}}
									options={roomOpts}
									placeholder={
										!nganhCode
											? 'Chọn ngành trước…'
											: 'Chọn phòng (theo ngành)…'
									}
									searchPlaceholder='Gõ mã/tên phòng…'
									emptyText={
										!nganhCode
											? 'Chọn ngành trước'
											: 'Không có phòng có VT ngành này'
									}
									disabled={!nganhCode}
								/>
							</div>
							<div className='space-y-1'>
								<Label className='text-sm'>
									Vật tư (theo ngành + phòng) *
								</Label>
								<SearchableSelect
									value={pickAssetId}
									onValueChange={setPickAssetId}
									options={assetOpts}
									placeholder={
										!nganhCode
											? 'Chọn ngành trước…'
											: !pickRoomId
												? 'Chọn phòng trước…'
												: 'Chọn VT trong phòng…'
									}
									searchPlaceholder='Gõ mã/tên…'
									emptyText={
										!nganhCode || !pickRoomId
											? 'Chọn ngành và phòng trước'
											: 'Phòng này không có VT ngành đã chọn'
									}
									disabled={!nganhCode || !pickRoomId}
								/>
							</div>
							<div className='space-y-1'>
								<Label className='text-sm'>Số lượng</Label>
								<Input
									type='number'
									min={1}
									max={selectedAsset?.quantity || 999}
									value={pickQty}
									onChange={(e) =>
										setPickQty(Number(e.target.value) || 1)
									}
									disabled={!pickAssetId}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label className='text-sm'>
									Vị trí chi tiết
								</Label>
								<Input
									className='h-9 text-base'
									value={pickLocNote}
									onChange={(e) =>
										setPickLocNote(e.target.value)
									}
									placeholder='Tầng / góc phòng / địa chỉ lắp…'
								/>
							</div>
						</div>
						{nganhCode && pickRoomId ? (
							<p className='text-[11px] text-muted-foreground'>
								{assetOpts.length} VT khớp ngành{' '}
								<strong>{nganhCode}</strong> tại phòng đã chọn
								{donVi && fixedUnitLabel
									? ` · ĐV ${fixedUnitLabel}`
									: ''}
								.
							</p>
						) : null}
						<Button
							type='button'
							variant='secondary'
							size='default'
							className='h-9 text-base'
							onClick={addItem}
							disabled={!nganhCode || !pickRoomId || !pickAssetId}
						>
							<Plus className='w-4 h-4 mr-2' />
							Thêm vào danh sách
						</Button>
					</div>

					{items.length > 0 && (
						<div className='rounded-lg border overflow-x-auto'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>VT</TableHead>
										<TableHead>Vị trí</TableHead>
										<TableHead className='text-right'>
											SL
										</TableHead>
										<TableHead className='w-10' />
									</TableRow>
								</TableHeader>
								<TableBody>
									{items.map((it) => (
										<TableRow key={it.key}>
											<TableCell>
												<div className='font-medium'>
													{it.materialName}
												</div>
												<div className='text-xs text-muted-foreground font-mono'>
													{it.materialCode || '—'}
												</div>
											</TableCell>
											<TableCell className='text-xs'>
												{it.fromRoomCode}{' '}
												{it.fromRoomName}
												{it.locationNote ? (
													<div className='text-muted-foreground'>
														{it.locationNote}
													</div>
												) : null}
											</TableCell>
											<TableCell className='text-right tabular-nums'>
												<Input
													className='w-16 h-8 ml-auto text-right'
													type='number'
													min={1}
													max={it.maxQty}
													value={it.quantity}
													onChange={(e) => {
														const q = Math.min(
															it.maxQty,
															Math.max(
																1,
																Number(
																	e.target
																		.value
																) || 1
															)
														)
														setItems((prev) =>
															prev.map((x) =>
																x.key === it.key
																	? {
																			...x,
																			quantity:
																				q
																		}
																	: x
															)
														)
													}}
												/>
											</TableCell>
											<TableCell>
												<Button
													variant='ghost'
													size='icon'
													className='h-8 w-8'
													onClick={() =>
														setItems((prev) =>
															prev.filter(
																(x) =>
																	x.key !==
																	it.key
															)
														)
													}
												>
													<Trash2 className='w-3.5 h-3.5 text-destructive' />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
				<DialogFooter className='gap-2 sm:gap-3'>
					<Button
						variant='outline'
						size='default'
						className='h-10 text-base'
						onClick={onClose}
					>
						Hủy
					</Button>
					<Button
						size='default'
						className='h-10 text-base px-3'
						disabled={!canSubmit}
						onClick={() => mut.mutate()}
					>
						{mut.isPending ? (
							<Loader2 className='w-4 h-4 animate-spin' />
						) : (
							'Gửi đề xuất'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
