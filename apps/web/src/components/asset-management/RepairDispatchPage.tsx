import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
	useRepairRequestMutations,
	useRepairRequests
} from '@/hooks/useRepairRequests'
import type { RepairRequest } from '@/api/asset'
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { UserCog, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

const statusLabel: Record<string, string> = {
	PENDING: 'Chờ phân công',
	ASSIGNED: 'Đã gán',
	IN_PROGRESS: 'Đang sửa',
	COMPLETED: 'Hoàn thành',
	CANCELLED: 'Đã hủy'
}

const statusVariant: Record<
	string,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	PENDING: 'destructive',
	ASSIGNED: 'secondary',
	IN_PROGRESS: 'default',
	COMPLETED: 'outline',
	CANCELLED: 'outline'
}

function today() {
	return new Date().toISOString().slice(0, 10)
}

export default function RepairDispatchPage() {
	const [statusFilter, setStatusFilter] = useState<string>('open')
	const queryStatus =
		statusFilter === 'all'
			? undefined
			: statusFilter === 'open'
				? undefined
				: statusFilter

	const {
		data = [],
		isLoading,
		error,
		refetch
	} = useRepairRequests(queryStatus ? { status: queryStatus } : undefined)

	const filtered = useMemo(() => {
		if (statusFilter === 'open') {
			return data.filter((r) =>
				['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status)
			)
		}
		return data
	}, [data, statusFilter])

	const { assign, complete, cancel } = useRepairRequestMutations()

	const [assignOpen, setAssignOpen] = useState(false)
	const [selected, setSelected] = useState<RepairRequest | null>(null)
	const [assignedToName, setAssignedToName] = useState('')
	const [repairStartedAt, setRepairStartedAt] = useState(today())
	const [adminNote, setAdminNote] = useState('')

	function openAssign(row: RepairRequest) {
		setSelected(row)
		setAssignedToName(row.assignedToName || '')
		setRepairStartedAt(row.repairStartedAt || today())
		setAdminNote(row.adminNote || '')
		setAssignOpen(true)
	}

	async function handleAssign() {
		if (!selected) return
		if (!assignedToName.trim()) {
			toast.error('Nhập tên người đi sửa')
			return
		}
		try {
			await assign.mutateAsync({
				id: selected.id,
				assignedToName: assignedToName.trim(),
				repairStartedAt,
				adminNote: adminNote || undefined,
				startRepair: true
			})
			toast.success('Đã phân công người sửa')
			setAssignOpen(false)
		} catch (e) {
			toast.error('Phân công thất bại', {
				description: (e as Error).message
			})
		}
	}

	async function handleComplete(row: RepairRequest) {
		try {
			await complete.mutateAsync({ id: row.id })
			toast.success(
				`Đã đánh dấu sửa xong «${row.assetName}». Vật tư vẫn ở kho hư hỏng (cấp 5) — vào Cập nhật VT chọn «Tăng phân cấp» để đưa về cấp 2.`
			)
		} catch (e) {
			toast.error('Thất bại', { description: (e as Error).message })
		}
	}

	async function handleCancel(row: RepairRequest) {
		try {
			await cancel.mutateAsync({ id: row.id })
			toast.success('Đã hủy phiếu')
		} catch (e) {
			toast.error('Thất bại', { description: (e as Error).message })
		}
	}

	if (error) {
		return <ErrorState error={error} onRetry={() => refetch()} />
	}

	const pendingCount = data.filter((r) => r.status === 'PENDING').length

	return (
		<div className='space-y-6 p-6 md:p-8'>
			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Phân công sửa chữa
					</h1>
					<p className='text-sm text-muted-foreground mt-1'>
						Báo hỏng → kho hư hỏng (cấp 5, mã -HONG-) → phân công
						sửa → <strong>Hoàn thành chỉ đánh dấu đã sửa</strong>{' '}
						(vẫn kho hỏng). Đưa về kho ổn định cấp 2 chỉ khi{' '}
						<strong>Cập nhật VT → Tăng phân cấp</strong>. Đang chờ:{' '}
						<strong>{pendingCount}</strong> phiếu.
					</p>
				</div>
				<div className='flex gap-2'>
					<Button variant='outline' asChild>
						<Link to='/vat-tu'>Danh mục</Link>
					</Button>
					<Button variant='outline' onClick={() => refetch()}>
						<RefreshCw className='w-4 h-4 mr-2' />
						Làm mới
					</Button>
				</div>
			</div>

			<div className='flex flex-wrap items-end gap-3'>
				<div className='space-y-2 w-56'>
					<Label>Lọc trạng thái</Label>
					<Select
						value={statusFilter}
						onValueChange={setStatusFilter}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='open'>
								Đang mở (chờ + đang xử lý)
							</SelectItem>
							<SelectItem value='PENDING'>
								Chờ phân công
							</SelectItem>
							<SelectItem value='IN_PROGRESS'>
								Đang sửa
							</SelectItem>
							<SelectItem value='COMPLETED'>
								Hoàn thành
							</SelectItem>
							<SelectItem value='CANCELLED'>Đã hủy</SelectItem>
							<SelectItem value='all'>Tất cả</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{isLoading ? (
				<Skeleton className='h-48 w-full' />
			) : filtered.length === 0 ? (
				<Card>
					<CardContent className='py-12 text-center text-muted-foreground text-sm'>
						Không có phiếu báo hỏng theo bộ lọc.
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>
							Danh sách phiếu ({filtered.length})
						</CardTitle>
						<CardDescription>
							Chọn &quot;Phân công&quot; để gán kỹ thuật viên /
							người đi sửa.
						</CardDescription>
					</CardHeader>
					<CardContent className='overflow-x-auto'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>TT</TableHead>
									<TableHead>Thiết bị</TableHead>
									<TableHead className='text-center'>
										SL hỏng
									</TableHead>
									<TableHead>Phòng / Tầng / Tòa</TableHead>
									<TableHead>Ngày hư</TableHead>
									<TableHead>Người báo</TableHead>
									<TableHead>Người sửa</TableHead>
									<TableHead>Bắt đầu sửa</TableHead>
									<TableHead className='text-right'>
										Thao tác
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((r) => (
									<TableRow key={r.id}>
										<TableCell>
											<Badge
												variant={
													statusVariant[r.status] ??
													'outline'
												}
											>
												{statusLabel[r.status] ??
													r.status}
											</Badge>
										</TableCell>
										<TableCell>
											<div className='font-medium'>
												{r.assetName}
											</div>
											<div className='text-xs text-muted-foreground'>
												{r.category || '—'}
												{r.description
													? ` · ${r.description}`
													: ''}
											</div>
										</TableCell>
										<TableCell className='text-center font-semibold'>
											{r.quantity ?? 1}
										</TableCell>
										<TableCell className='text-sm'>
											<div>
												{r.roomCode} · {r.roomName}
											</div>
											<div className='text-xs text-muted-foreground'>
												{r.floorName} · {r.buildingCode}{' '}
												{r.buildingName}
											</div>
											{r.roomId && (
												<Link
													to='/vat-tu/phong/$roomId'
													params={{
														roomId: String(r.roomId)
													}}
													className='text-xs text-primary underline'
												>
													Hồ sơ phòng
												</Link>
											)}
										</TableCell>
										<TableCell>{r.brokenAt}</TableCell>
										<TableCell>
											{r.reportedByName}
										</TableCell>
										<TableCell>
											{r.assignedToName || '—'}
										</TableCell>
										<TableCell>
											{r.repairStartedAt || '—'}
										</TableCell>
										<TableCell className='text-right space-x-1'>
											{r.status !== 'COMPLETED' &&
												r.status !== 'CANCELLED' && (
													<>
														<Button
															size='sm'
															variant='default'
															onClick={() =>
																openAssign(r)
															}
														>
															<UserCog className='w-3.5 h-3.5 mr-1' />
															Phân công
														</Button>
														{(r.status ===
															'ASSIGNED' ||
															r.status ===
																'IN_PROGRESS') && (
															<Button
																size='sm'
																variant='outline'
																onClick={() =>
																	handleComplete(
																		r
																	)
																}
															>
																<CheckCircle2 className='w-3.5 h-3.5 mr-1' />
																Xong
															</Button>
														)}
														{r.status ===
															'PENDING' && (
															<Button
																size='sm'
																variant='ghost'
																className='text-destructive'
																onClick={() =>
																	handleCancel(
																		r
																	)
																}
															>
																<XCircle className='w-3.5 h-3.5' />
															</Button>
														)}
													</>
												)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			<Dialog open={assignOpen} onOpenChange={setAssignOpen}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>Phân công người sửa</DialogTitle>
					</DialogHeader>
					{selected && (
						<div className='space-y-3 text-sm'>
							<p>
								<strong>{selected.assetName}</strong> — phòng{' '}
								{selected.roomCode} ({selected.buildingCode})
							</p>
							<p className='text-muted-foreground'>
								Báo bởi {selected.reportedByName} · hư ngày{' '}
								{selected.brokenAt}
							</p>
							<div className='space-y-2'>
								<Label>Người đi sửa *</Label>
								<Input
									value={assignedToName}
									onChange={(e) =>
										setAssignedToName(e.target.value)
									}
									placeholder='VD: KTV Minh / Tổ CSVC'
								/>
							</div>
							<div className='space-y-2'>
								<Label>Ngày bắt đầu sửa</Label>
								<Input
									type='date'
									value={repairStartedAt}
									onChange={(e) =>
										setRepairStartedAt(e.target.value)
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Ghi chú admin</Label>
								<Textarea
									value={adminNote}
									onChange={(e) =>
										setAdminNote(e.target.value)
									}
									rows={2}
								/>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setAssignOpen(false)}
						>
							Hủy
						</Button>
						<Button
							onClick={handleAssign}
							disabled={assign.isPending}
						>
							{assign.isPending
								? 'Đang lưu…'
								: 'Xác nhận phân công'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
