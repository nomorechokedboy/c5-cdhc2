/**
 * Màn Thanh lý: toàn bộ VT các đơn vị đề nghị thanh lý.
 * Sau QĐ cấp trên: nhập số QĐ, ngành, cấp BH, người ký → giảm VT lý do «Thanh lý».
 * Lưu trữ để thống kê / xuất báo cáo theo năm.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Download, Gavel, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
	DecideAssetProposal,
	GetAssetCatalog,
	ListAssetProposals,
	ListLiquidationAssets,
	type AssetProposal,
	type LiquidationAssetRow
} from '@/api/asset'
import { cn } from '@/lib/utils'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { NGANH_LIST, nganhLabel } from '@/lib/nganh'

function statusLabel(s: string) {
	switch (s) {
		case 'PENDING':
			return 'Chờ duyệt'
		case 'APPROVED':
			return 'Đã duyệt — chờ nhập QĐ (chưa giảm VT)'
		case 'REJECTED':
			return 'Từ chối'
		case 'COMPLETED':
			return 'Đã thanh lý (đã giảm VT)'
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

export default function LiquidationPage() {
	const yearNow = new Date().getFullYear()
	const [statusFilter, setStatusFilter] = useState<string>('ALL')
	const [yearFilter, setYearFilter] = useState<string>('ALL')
	const [selectedProposal, setSelectedProposal] =
		useState<AssetProposal | null>(null)
	const [decideOpen, setDecideOpen] = useState(false)

	const qc = useQueryClient()

	const rowsQ = useQuery({
		queryKey: ['liquidation-assets', statusFilter, yearFilter],
		queryFn: () =>
			ListLiquidationAssets({
				status: statusFilter === 'ALL' ? undefined : statusFilter,
				year: yearFilter === 'ALL' ? undefined : Number(yearFilter),
				limit: 2000
			}),
		refetchInterval: 30_000
	})

	const years = useMemo(() => {
		const ys = new Set<number>()
		ys.add(yearNow)
		for (const r of rowsQ.data || []) {
			const d = r.decisionAt || r.completedAt || r.proposedAt || ''
			const y = Number(d.slice(0, 4))
			if (y > 2000) ys.add(y)
		}
		return Array.from(ys).sort((a, b) => b - a)
	}, [rowsQ.data, yearNow])

	const pendingProposals = useMemo(() => {
		const map = new Map<number, LiquidationAssetRow[]>()
		for (const r of rowsQ.data || []) {
			if (
				r.proposalStatus !== 'PENDING' &&
				r.proposalStatus !== 'APPROVED'
			)
				continue
			const list = map.get(r.proposalId) || []
			list.push(r)
			map.set(r.proposalId, list)
		}
		return map
	}, [rowsQ.data])

	const invalidate = async () => {
		await qc.invalidateQueries({ queryKey: ['liquidation-assets'] })
		await qc.invalidateQueries({ queryKey: ['asset-proposals'] })
		await qc.invalidateQueries({ queryKey: ['pending-proposals'] })
		await qc.invalidateQueries({ queryKey: ['asset-catalog'] })
		await qc.invalidateQueries({ queryKey: ['catalog-stock-logs'] })
		await qc.invalidateQueries({ queryKey: ['room-assets'] })
	}

	const openDecide = async (proposalId: number) => {
		try {
			const list = await ListAssetProposals({
				proposalType: 'LIQUIDATION',
				limit: 300
			})
			const p = list.find((x) => x.id === proposalId)
			if (!p) {
				toast.error('Không tìm thấy đề xuất')
				return
			}
			setSelectedProposal(p)
			setDecideOpen(true)
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Lỗi tải đề xuất')
		}
	}

	const exportCsv = () => {
		const rows = rowsQ.data || []
		if (!rows.length) {
			toast.error('Không có dữ liệu xuất')
			return
		}
		const header = [
			'Năm',
			'Số QĐ',
			'Ngày QĐ',
			'Ngành TL',
			'Cấp BH',
			'Người ký',
			'Đề xuất #',
			'Tiêu đề',
			'Trạng thái',
			'Đơn vị',
			'Mã VT',
			'Tên VT',
			'SL',
			'ĐVT',
			'Phòng',
			'Vị trí',
			'Người đề nghị',
			'Ngày đề nghị'
		]
		const lines = rows.map((r) => {
			const y = (
				r.decisionAt ||
				r.completedAt ||
				r.proposedAt ||
				''
			).slice(0, 4)
			return [
				y,
				r.decisionNumber || '',
				r.decisionAt || '',
				r.decisionNganhCode || r.nganhCode || '',
				r.decisionIssuingLevel || '',
				r.decisionSigner || '',
				r.proposalId,
				`"${(r.proposalTitle || '').replace(/"/g, '""')}"`,
				r.proposalStatus,
				`"${(r.unitName || '').replace(/"/g, '""')}"`,
				r.materialCode || '',
				`"${(r.materialName || '').replace(/"/g, '""')}"`,
				r.quantity,
				r.unit || '',
				`${r.fromRoomCode || ''} ${r.fromRoomName || ''}`.trim(),
				`"${(r.locationNote || '').replace(/"/g, '""')}"`,
				r.proposedByDisplayName || '',
				r.proposedAt?.slice(0, 16) || ''
			].join(',')
		})
		const bom = '\uFEFF'
		const blob = new Blob([bom + [header.join(','), ...lines].join('\n')], {
			type: 'text/csv;charset=utf-8'
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		const yPart = yearFilter === 'ALL' ? 'all' : yearFilter
		a.download = `thanh-ly-vat-tu-${yPart}-${new Date().toISOString().slice(0, 10)}.csv`
		a.click()
		URL.revokeObjectURL(url)
		toast.success('Đã xuất CSV thanh lý')
	}

	const rows = rowsQ.data || []
	const completedCount = rows.filter(
		(r) => r.proposalStatus === 'COMPLETED'
	).length
	const pendingCount = rows.filter(
		(r) => r.proposalStatus === 'PENDING' || r.proposalStatus === 'APPROVED'
	).length

	return (
		<div className='p-4 md:p-6 space-y-4 max-w-7xl mx-auto'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-sm font-medium flex items-center gap-2'>
						<Gavel className='w-5 h-5' />
						Thanh lý vật tư
					</h1>
					<p className='text-sm text-muted-foreground mt-1 max-w-2xl'>
						Hiển thị toàn bộ vật tư các đơn vị đề nghị thanh lý. Khi
						có quyết định cho phép: nhập số QĐ, ngành, cấp ban hành,
						người ký — hệ thống giảm VT với lý do «Thanh lý» và lưu
						để thống kê / xuất báo cáo theo năm.
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button variant='outline' onClick={exportCsv}>
						<Download className='w-4 h-4 mr-1.5' />
						Xuất CSV
					</Button>
					<Button
						variant='outline'
						onClick={() => void rowsQ.refetch()}
					>
						<RefreshCw
							className={cn(
								'w-3.5 h-3.5 mr-1',
								rowsQ.isFetching && 'animate-spin'
							)}
						/>
						Làm mới
					</Button>
				</div>
			</div>

			<div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
				<Card>
					<CardHeader className='pb-2 pt-4 px-4'>
						<CardDescription>Dòng VT (bộ lọc)</CardDescription>
						<CardTitle className='text-xl tabular-nums'>
							{rows.length}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className='pb-2 pt-4 px-4'>
						<CardDescription>Chờ / đã duyệt</CardDescription>
						<CardTitle className='text-xl tabular-nums text-amber-600'>
							{pendingCount}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className='pb-2 pt-4 px-4'>
						<CardDescription>Đã thanh lý</CardDescription>
						<CardTitle className='text-xl tabular-nums text-emerald-600'>
							{completedCount}
						</CardTitle>
					</CardHeader>
				</Card>
			</div>

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
							<SelectItem value='PENDING'>Chờ duyệt</SelectItem>
							<SelectItem value='APPROVED'>Đã duyệt</SelectItem>
							<SelectItem value='COMPLETED'>
								Đã thanh lý
							</SelectItem>
							<SelectItem value='REJECTED'>Từ chối</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className='space-y-1'>
					<Label className='text-xs'>Năm (QĐ / đề nghị)</Label>
					<Select value={yearFilter} onValueChange={setYearFilter}>
						<SelectTrigger className='w-[140px]'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='ALL'>Tất cả năm</SelectItem>
							{years.map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{pendingProposals.size > 0 && (
				<Card className='border-amber-200 bg-amber-50/40 dark:bg-amber-950/20'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm'>
							Đề nghị chờ xử lý ({pendingProposals.size})
						</CardTitle>
						<CardDescription>
							Phê duyệt BGH chưa giảm VT. Bấm «Cho thanh lý» và
							nhập số QĐ để ghi giảm trong nhật ký tăng giảm.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-2'>
						{Array.from(pendingProposals.entries()).map(
							([pid, its]) => (
								<div
									key={pid}
									className='flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2'
								>
									<div className='text-base'>
										<span className='font-medium'>
											#{pid}
										</span>{' '}
										{its[0]?.proposalTitle}{' '}
										<span className='text-muted-foreground'>
											· {its.length} VT ·{' '}
											{its[0]?.unitName ||
												its[0]?.proposedByDisplayName ||
												'—'}
										</span>
									</div>
									<Button
										size='sm'
										onClick={() => void openDecide(pid)}
									>
										<CheckCircle2 className='w-3.5 h-3.5 mr-1' />
										Cho thanh lý (nhập QĐ)
									</Button>
								</div>
							)
						)}
					</CardContent>
				</Card>
			)}

			{rowsQ.isLoading ? (
				<div className='space-y-2'>
					<Skeleton className='h-12 w-full' />
					<Skeleton className='h-12 w-full' />
				</div>
			) : !rows.length ? (
				<Card>
					<CardContent className='py-12 text-center text-muted-foreground'>
						Chưa có vật tư đề nghị thanh lý trong bộ lọc.
					</CardContent>
				</Card>
			) : (
				<div className='rounded-xl border overflow-x-auto bg-card'>
					<Table>
						<TableHeader>
							<TableRow className='bg-muted/20'>
								<TableHead>Trạng thái</TableHead>
								<TableHead>QĐ</TableHead>
								<TableHead>Mã VT</TableHead>
								<TableHead>Tên</TableHead>
								<TableHead className='text-right'>SL</TableHead>
								<TableHead>Vị trí</TableHead>
								<TableHead>Đơn vị</TableHead>
								<TableHead>Đề xuất</TableHead>
								<TableHead>Ngày</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((r) => (
								<TableRow key={`${r.proposalId}-${r.itemId}`}>
									<TableCell>
										<Badge
											variant={statusVariant(
												r.proposalStatus
											)}
										>
											{statusLabel(r.proposalStatus)}
										</Badge>
									</TableCell>
									<TableCell className='text-xs font-mono whitespace-nowrap'>
										{r.decisionNumber || '—'}
										{r.decisionAt ? (
											<div className='text-muted-foreground'>
												{r.decisionAt}
											</div>
										) : null}
									</TableCell>
									<TableCell className='font-mono text-xs'>
										{r.materialCode || '—'}
									</TableCell>
									<TableCell className='font-medium max-w-[200px]'>
										{r.materialName}
										{r.category ? (
											<div className='text-xs text-muted-foreground'>
												{r.category}
											</div>
										) : null}
									</TableCell>
									<TableCell className='text-right tabular-nums'>
										{r.quantity} {r.unit || ''}
									</TableCell>
									<TableCell className='text-xs'>
										{[r.fromRoomCode, r.fromRoomName]
											.filter(Boolean)
											.join(' ')}
										{r.locationNote ? (
											<div className='text-muted-foreground'>
												{r.locationNote}
											</div>
										) : null}
									</TableCell>
									<TableCell className='text-base'>
										{r.unitName || '—'}
									</TableCell>
									<TableCell className='text-xs'>
										#{r.proposalId}
										<div className='text-muted-foreground line-clamp-1'>
											{r.proposalTitle}
										</div>
									</TableCell>
									<TableCell className='text-xs whitespace-nowrap'>
										{(r.decisionAt || r.proposedAt)?.slice(
											0,
											10
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{decideOpen && selectedProposal && (
				<LiquidationDecideDialog
					proposal={selectedProposal}
					onClose={() => {
						setDecideOpen(false)
						setSelectedProposal(null)
					}}
					onDone={async () => {
						setDecideOpen(false)
						setSelectedProposal(null)
						await invalidate()
					}}
				/>
			)}
		</div>
	)
}

function LiquidationDecideDialog({
	proposal,
	onClose,
	onDone
}: {
	proposal: AssetProposal
	onClose: () => void
	onDone: () => Promise<void>
}) {
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

	const nganhQ = useQuery({
		queryKey: ['asset-catalog', 'nganh-liq'],
		queryFn: () => GetAssetCatalog()
	})
	/** API full list (BGH) + fallback danh mục tĩnh nếu catalog rỗng */
	const nganhOpts = useMemo(() => {
		const fromApi = nganhQ.data?.nganh || []
		const list =
			fromApi.length > 0
				? fromApi.map((n) => ({ code: n.code, name: n.name }))
				: NGANH_LIST
		return list.map((n) => ({
			value: n.code,
			label: nganhLabel(n),
			keywords: `${n.code} ${n.name}`
		}))
	}, [nganhQ.data])

	const mut = useMutation({
		mutationFn: () =>
			DecideAssetProposal(proposal.id, {
				decision: 'COMPLETED',
				adminNote: adminNote || undefined,
				decisionNumber,
				decisionNganhCode: decisionNganh,
				decisionIssuingLevel: issuing,
				decisionSigner: signer,
				decisionAt
			}),
		onSuccess: async () => {
			toast.success(
				'Đã thanh lý — VT giảm (lý do Thanh lý), đã lưu QĐ để báo cáo'
			)
			await onDone()
		},
		onError: (e: Error) => toast.error(e.message || 'Lỗi thanh lý')
	})

	const ready =
		decisionNumber.trim() &&
		decisionNganh.trim() &&
		issuing.trim() &&
		signer.trim() &&
		!mut.isPending

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>
						Quyết định thanh lý — đề xuất #{proposal.id}
					</DialogTitle>
				</DialogHeader>
				<div className='space-y-3 text-base'>
					<div className='rounded-md border bg-muted/30 p-2 text-xs'>
						{proposal.title} · {proposal.items?.length ?? 0} VT
					</div>
					<div className='space-y-1.5'>
						<Label>Số QĐ thanh lý *</Label>
						<Input
							value={decisionNumber}
							onChange={(e) => setDecisionNumber(e.target.value)}
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
							onChange={(e) => setDecisionAt(e.target.value)}
						/>
					</div>
					<div className='space-y-1.5'>
						<Label>Ghi chú</Label>
						<Textarea
							value={adminNote}
							onChange={(e) => setAdminNote(e.target.value)}
							rows={2}
						/>
					</div>
					<p className='text-xs text-muted-foreground'>
						Sau xác nhận: giảm VT phòng (nếu còn) + giảm danh mục
						với lý do «Thanh lý»; lưu QĐ để tìm kiếm / xuất báo cáo
						năm.
					</p>
				</div>
				<DialogFooter>
					<Button variant='outline' onClick={onClose}>
						Hủy
					</Button>
					<Button disabled={!ready} onClick={() => mut.mutate()}>
						{mut.isPending ? (
							<Loader2 className='w-4 h-4 animate-spin' />
						) : (
							'Xác nhận thanh lý'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
