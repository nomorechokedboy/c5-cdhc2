/**
 * Tìm kiếm:
 * - Quyết định điều động
 * - Quyết định thu hồi / trả về
 * - Cập nhật tăng / giảm (lý do)
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSearch, RefreshCw, Search } from 'lucide-react'
import { GetAssetMovementReport } from '@/api/asset'
import {
	DECREASE_REASON_LABELS,
	INCREASE_REASON_LABELS,
	formatMovementReason,
	movementTypeLabel
} from '@/lib/asset-movement-labels'
import { formatMovementDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import type { AssetMovementReportRow } from '@/types/asset'
import { cn } from '@/lib/utils'

type SearchKind = 'QD_TRANSFER' | 'QD_RECALL' | 'UPDATES'

type UpdateDirection = 'INCREASE' | 'DECREASE' | 'all'

function matchQd(decision: string | null | undefined, query: string) {
	if (decision == null || String(decision).trim() === '') return false
	const d = String(decision).trim().toLocaleLowerCase('vi')
	const qq = query.trim().toLocaleLowerCase('vi')
	if (!qq) return true
	if (d === qq || d.includes(qq)) return true
	const strip = (s: string) => s.replace(/^0+/, '') || '0'
	return strip(d) === strip(qq)
}

function reasonLabel(code: string | null | undefined, type: string) {
	if (!code) return '—'
	const u = code.toUpperCase()
	if (type === 'INCREASE') return INCREASE_REASON_LABELS[u] || u
	if (type === 'DECREASE') return DECREASE_REASON_LABELS[u] || u
	return INCREASE_REASON_LABELS[u] || DECREASE_REASON_LABELS[u] || u
}

export default function AssetSearchPage() {
	const [kind, setKind] = useState<SearchKind>('QD_TRANSFER')
	const [decisionNumber, setDecisionNumber] = useState('')
	const [direction, setDirection] = useState<UpdateDirection>('all')
	const [reasonCode, setReasonCode] = useState<string>('all')
	const [fromDate, setFromDate] = useState('')
	const [toDate, setToDate] = useState('')
	const [submitted, setSubmitted] = useState(false)

	const movementsQ = useQuery({
		queryKey: ['asset-reports', 'movements', 'search', fromDate, toDate],
		queryFn: () =>
			GetAssetMovementReport({
				fromDate: fromDate || undefined,
				toDate: toDate || undefined
			})
	})

	const reasonOptions = useMemo(() => {
		if (direction === 'INCREASE') {
			return Object.entries(INCREASE_REASON_LABELS).map(([k, v]) => ({
				value: k,
				label: v
			}))
		}
		if (direction === 'DECREASE') {
			return Object.entries(DECREASE_REASON_LABELS)
				.filter(([k]) => k !== 'ADJUST' && k !== 'GRADE_UP')
				.map(([k, v]) => ({ value: k, label: v }))
		}
		return [
			...Object.entries(INCREASE_REASON_LABELS).map(([k, v]) => ({
				value: k,
				label: `Tăng: ${v}`
			})),
			...Object.entries(DECREASE_REASON_LABELS)
				.filter(([k]) => k !== 'ADJUST' && k !== 'GRADE_UP')
				.map(([k, v]) => ({
					value: k,
					label: `Giảm: ${v}`
				}))
		]
	}, [direction])

	const results = useMemo(() => {
		if (!submitted) return [] as AssetMovementReportRow[]
		const all = movementsQ.data ?? []

		if (kind === 'QD_TRANSFER' || kind === 'QD_RECALL') {
			const type = kind === 'QD_TRANSFER' ? 'TRANSFER' : 'RECALL'
			const qd = decisionNumber.trim()
			if (!qd) return []
			return all.filter(
				(r) => r.movementType === type && matchQd(r.decisionNumber, qd)
			)
		}

		// UPDATES: tăng / giảm
		let rows = all.filter(
			(r) =>
				r.movementType === 'INCREASE' || r.movementType === 'DECREASE'
		)
		if (direction === 'INCREASE') {
			rows = rows.filter((r) => r.movementType === 'INCREASE')
		} else if (direction === 'DECREASE') {
			rows = rows.filter((r) => r.movementType === 'DECREASE')
		}
		if (reasonCode !== 'all') {
			rows = rows.filter(
				(r) => (r.reasonCode || '').toUpperCase() === reasonCode
			)
		}
		return rows
	}, [
		submitted,
		movementsQ.data,
		kind,
		decisionNumber,
		direction,
		reasonCode
	])

	function onSearch() {
		if (kind === 'QD_TRANSFER' || kind === 'QD_RECALL') {
			if (!decisionNumber.trim()) {
				setSubmitted(false)
				return
			}
		}
		setSubmitted(true)
		void movementsQ.refetch()
	}

	const kindNeedsQd = kind === 'QD_TRANSFER' || kind === 'QD_RECALL'

	return (
		<div className='p-4 md:p-6 max-w-6xl mx-auto space-y-4'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-xl font-semibold flex items-center gap-2'>
						<FileSearch className='w-5 h-5' />
						Tìm kiếm vật tư
					</h1>
					<p className='text-sm text-muted-foreground mt-1 max-w-2xl'>
						Tìm quyết định điều động, thu hồi/trả về, hoặc nhật ký
						cập nhật tăng/giảm theo lý do.
					</p>
				</div>
				<Button
					variant='ghost'
					size='icon'
					onClick={() => movementsQ.refetch()}
				>
					<RefreshCw
						className={cn(
							'w-4 h-4',
							movementsQ.isFetching && 'animate-spin'
						)}
					/>
				</Button>
			</div>

			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>Điều kiện tìm</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label>Loại tìm kiếm</Label>
						<Select
							value={kind}
							onValueChange={(v) => {
								setKind(v as SearchKind)
								setSubmitted(false)
								setReasonCode('all')
								setDirection('all')
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='QD_TRANSFER'>
									Tìm kiếm quyết định điều động
								</SelectItem>
								<SelectItem value='QD_RECALL'>
									Tìm kiếm quyết định thu hồi / trả về
								</SelectItem>
								<SelectItem value='UPDATES'>
									Tìm kiếm cập nhật tăng / giảm
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{kindNeedsQd && (
						<div className='space-y-2'>
							<Label>
								Số quyết định
								<span className='text-destructive'> *</span>
							</Label>
							<Input
								placeholder='VD: 009, 01/QĐ-…'
								value={decisionNumber}
								onChange={(e) => {
									setDecisionNumber(e.target.value)
									setSubmitted(false)
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') onSearch()
								}}
							/>
							<p className='text-xs text-muted-foreground'>
								Nhập số QĐ rồi bấm Tìm — kết quả hiện bên dưới.
							</p>
						</div>
					)}

					{kind === 'UPDATES' && (
						<>
							<div className='space-y-2'>
								<Label>Muốn xem</Label>
								<Select
									value={direction}
									onValueChange={(v) => {
										setDirection(v as UpdateDirection)
										setReasonCode('all')
										setSubmitted(false)
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
									{direction === 'INCREASE'
										? 'Tăng về (lý do)'
										: direction === 'DECREASE'
											? 'Giảm về (lý do)'
											: 'Lý do (tùy chọn)'}
								</Label>
								<Select
									value={reasonCode}
									onValueChange={(v) => {
										setReasonCode(v)
										setSubmitted(false)
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>
											Tất cả lý do
										</SelectItem>
										{reasonOptions.map((o) => (
											<SelectItem
												key={o.value}
												value={o.value}
											>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</>
					)}

					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label>Từ ngày</Label>
							<Input
								type='date'
								value={fromDate}
								onChange={(e) => {
									setFromDate(e.target.value)
									setSubmitted(false)
								}}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Đến ngày</Label>
							<Input
								type='date'
								value={toDate}
								onChange={(e) => {
									setToDate(e.target.value)
									setSubmitted(false)
								}}
							/>
						</div>
					</div>

					<Button
						onClick={onSearch}
						disabled={kindNeedsQd && !decisionNumber.trim()}
						className='w-full sm:w-auto'
					>
						<Search className='w-4 h-4 mr-1.5' />
						Tìm kiếm
					</Button>
				</CardContent>
			</Card>

			{/* Kết quả */}
			{submitted && (
				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='text-base flex items-center justify-between gap-2'>
							<span>
								Kết quả
								{kindNeedsQd
									? ` · QĐ «${decisionNumber.trim()}»`
									: ''}
							</span>
							<Badge variant='secondary'>
								{results.length} dòng
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{movementsQ.isLoading ? (
							<div className='space-y-2'>
								<Skeleton className='h-10 w-full' />
								<Skeleton className='h-10 w-full' />
							</div>
						) : movementsQ.isError ? (
							<ErrorState
								error={movementsQ.error}
								onRetry={() => movementsQ.refetch()}
							/>
						) : results.length === 0 ? (
							<p className='text-sm text-muted-foreground py-8 text-center'>
								Không có kết quả khớp điều kiện.
							</p>
						) : (
							<div className='rounded-lg border overflow-x-auto max-h-[min(70vh,640px)] overflow-y-auto'>
								<Table>
									<TableHeader className='sticky top-0 z-10 bg-card'>
										<TableRow className='bg-muted/40'>
											<TableHead>Ngày</TableHead>
											<TableHead>Loại</TableHead>
											<TableHead>Mã / Tên</TableHead>
											<TableHead className='text-center'>
												SL
											</TableHead>
											<TableHead>Lý do</TableHead>
											<TableHead>Số QĐ</TableHead>
											<TableHead>Người TH</TableHead>
											<TableHead>Vị trí</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{results.map((r) => (
											<TableRow key={r.id}>
												<TableCell className='text-sm whitespace-nowrap'>
													{formatMovementDate(
														r.executedAt,
														r.createdAt
													)}
												</TableCell>
												<TableCell>
													<Badge
														variant='outline'
														className='text-xs'
													>
														{movementTypeLabel(
															r.movementType
														)}
													</Badge>
												</TableCell>
												<TableCell className='text-sm max-w-[220px]'>
													<div className='font-medium'>
														{r.assetName}
													</div>
													{r.assetCode ? (
														<div className='text-xs text-muted-foreground font-mono'>
															{r.assetCode}
														</div>
													) : null}
												</TableCell>
												<TableCell className='text-center tabular-nums font-medium'>
													{r.quantity}
												</TableCell>
												<TableCell className='text-sm max-w-[200px]'>
													{r.movementType ===
														'INCREASE' ||
													r.movementType ===
														'DECREASE'
														? formatMovementReason(
																r
															)
														: reasonLabel(
																r.reasonCode,
																r.movementType
															)}
													{r.reasonOther &&
													r.movementType !==
														'INCREASE' &&
													r.movementType !==
														'DECREASE' ? (
														<div className='text-xs text-muted-foreground mt-0.5'>
															{r.reasonOther}
														</div>
													) : null}
												</TableCell>
												<TableCell className='font-mono text-sm'>
													{r.decisionNumber || '—'}
												</TableCell>
												<TableCell className='text-sm'>
													{r.performer ||
														r.signer ||
														'—'}
												</TableCell>
												<TableCell className='text-sm text-muted-foreground max-w-[160px]'>
													{[
														r.buildingCode ||
															r.buildingName,
														r.roomCode || r.roomName
													]
														.filter(Boolean)
														.join(' / ') || '—'}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
