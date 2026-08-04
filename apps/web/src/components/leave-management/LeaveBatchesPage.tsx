import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateLeaveBatch,
	DeleteLeaveBatch,
	ListLeaveBatches,
	ListLeaveAuditLogs,
	UpdateLeaveBatch,
	type LeaveBatch
} from '@/api/leave'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import dayjs from 'dayjs'

function getBatchProgress(batch: LeaveBatch) {
	if (!batch.startDate || batch.totalDays <= 0) {
		return { usedDays: 0, remainingDays: Math.max(0, batch.totalDays) }
	}
	const start = dayjs(batch.startDate).startOf('day')
	const today = dayjs().startOf('day')
	const elapsedDays = today.isBefore(start) ? 0 : today.diff(start, 'day') + 1
	const usedDays = Math.min(batch.totalDays, Math.max(0, elapsedDays))
	return {
		usedDays,
		remainingDays: Math.max(0, batch.totalDays - usedDays)
	}
}

export default function LeaveBatchesPage() {
	const qc = useQueryClient()
	const [requestId, setRequestId] = useState<string>('')
	const [showAddDialog, setShowAddDialog] = useState(false)
	const [editingBatch, setEditingBatch] = useState<LeaveBatch | null>(null)
	const [newBatchLabel, setNewBatchLabel] = useState('')
	const [newStartDate, setNewStartDate] = useState('')
	const [newEndDate, setNewEndDate] = useState('')
	const [newTotalDays, setNewTotalDays] = useState(0)

	const { data: fetchedBatches = [], isLoading } = useQuery({
		queryKey: ['leave-batches', requestId],
		queryFn: () =>
			ListLeaveBatches(
				requestId && Number(requestId) > 0
					? Number(requestId)
					: undefined
			)
	})
	const batches = fetchedBatches
	const { data: auditLogs = [] } = useQuery({
		queryKey: ['leave-audit-logs', 'LEAVE_BATCH'],
		queryFn: () => ListLeaveAuditLogs('LEAVE_BATCH')
	})

	const createMut = useMutation({
		mutationFn: () =>
			CreateLeaveBatch({
				requestId: Number(requestId),
				batchLabel: newBatchLabel,
				startDate: newStartDate,
				endDate: newEndDate,
				totalDays: newTotalDays
			}),
		onSuccess: () => {
			toast.success('Đã thêm đợt')
			setShowAddDialog(false)
			setNewBatchLabel('')
			setNewStartDate('')
			setNewEndDate('')
			setNewTotalDays(0)
			qc.invalidateQueries({ queryKey: ['leave-batches', requestId] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const updateMut = useMutation({
		mutationFn: (vars: {
			id: number
			body: Partial<
				Pick<
					LeaveBatch,
					'batchLabel' | 'startDate' | 'endDate' | 'totalDays'
				>
			>
		}) => UpdateLeaveBatch(vars.id, vars.body),
		onSuccess: () => {
			toast.success('Đã cập nhật đợt')
			setEditingBatch(null)
			qc.invalidateQueries({ queryKey: ['leave-batches', requestId] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const deleteMut = useMutation({
		mutationFn: (id: number) => DeleteLeaveBatch(id),
		onSuccess: () => {
			toast.success('Đã xóa đợt')
			qc.invalidateQueries({ queryKey: ['leave-batches', requestId] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	function handleAdd() {
		if (
			!newBatchLabel ||
			!newStartDate ||
			!newEndDate ||
			newTotalDays < 1
		) {
			toast.error('Vui lòng điền đầy đủ thông tin')
			return
		}
		createMut.mutate()
	}

	function handleUpdate(batch: LeaveBatch) {
		updateMut.mutate({ id: batch.id, body: batch })
	}

	return (
		<div className='space-y-4'>
			<div>
				<h2 className='text-2xl font-bold tracking-tight'>
					Quản lý đợt nghỉ phép
				</h2>
			</div>

			<div className='flex items-center gap-2'>
				<div className='min-w-[200px] flex-1'>
					<Label>Mã đơn phép</Label>
					<Input
						placeholder='Để trống để xem tất cả đợt nghỉ...'
						value={requestId}
						onChange={(e) => setRequestId(e.target.value)}
					/>
				</div>
			</div>

			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-lg font-semibold'>Các đợt nghỉ phép</h3>
					<Button
						size='sm'
						disabled={!requestId || Number(requestId) < 1}
						onClick={() => setShowAddDialog(true)}
					>
						<Plus className='mr-1 h-4 w-4' />
						Thêm đợt
					</Button>
				</div>

				<div className='rounded-md border'>
					<div className='border-b px-4 py-3 font-semibold'>
						Nhật ký quản lý đợt nghỉ
					</div>
					<div className='max-h-72 overflow-auto'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Thời gian</TableHead>
									<TableHead>Thao tác</TableHead>
									<TableHead>Mã đợt</TableHead>
									<TableHead>Chi tiết</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{auditLogs.map((log) => (
									<TableRow key={log.id}>
										<TableCell>
											{dayjs(log.createdAt).format(
												'DD/MM/YYYY HH:mm'
											)}
										</TableCell>
										<TableCell>{log.action}</TableCell>
										<TableCell>
											#{log.entityId || '—'}
										</TableCell>
										<TableCell className='text-xs'>
											{log.details || '—'}
										</TableCell>
									</TableRow>
								))}
								{auditLogs.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={4}
											className='text-center text-muted-foreground'
										>
											Chưa có nhật ký
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</div>

				{isLoading ? (
					<div className='flex justify-center p-8'>
						<Loader2 className='h-6 w-6 animate-spin' />
					</div>
				) : batches.length === 0 ? (
					<p className='text-sm text-muted-foreground'>
						Chưa có đợt nghỉ phép nào
					</p>
				) : (
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mã đơn</TableHead>
									<TableHead>Quân nhân</TableHead>
									<TableHead>Đợt</TableHead>
									<TableHead>Ngày bắt đầu</TableHead>
									<TableHead>Ngày kết thúc</TableHead>
									<TableHead>Tổng ngày</TableHead>
									<TableHead>Đã đi</TableHead>
									<TableHead>Còn lại</TableHead>
									<TableHead className='w-20' />
								</TableRow>
							</TableHeader>
							<TableBody>
								{batches.map((batch) => {
									const progress = getBatchProgress(batch)
									return (
										<TableRow key={batch.id}>
											<TableCell>
												#{batch.requestId}
											</TableCell>
											<TableCell>
												{batch.personnelName || '—'}
												{batch.personnelCode
													? ` (${batch.personnelCode})`
													: ''}
											</TableCell>
											<TableCell className='font-medium'>
												{batch.batchLabel}
											</TableCell>
											<TableCell>
												{batch.startDate
													? dayjs(
															batch.startDate
														).format('DD/MM/YYYY')
													: '—'}
											</TableCell>
											<TableCell>
												{batch.endDate
													? dayjs(
															batch.endDate
														).format('DD/MM/YYYY')
													: '—'}
											</TableCell>
											<TableCell className='font-medium'>
												{batch.totalDays}
											</TableCell>
											<TableCell>
												{progress.usedDays}
											</TableCell>
											<TableCell className='font-semibold'>
												{progress.remainingDays}
											</TableCell>
											<TableCell>
												<div className='flex items-center gap-1'>
													<Button
														size='icon'
														variant='ghost'
														title='Chỉnh sửa'
														onClick={() =>
															setEditingBatch(
																batch
															)
														}
													>
														<Plus className='h-4 w-4' />
													</Button>
													<Button
														size='icon'
														variant='ghost'
														title='Xóa'
														onClick={() =>
															deleteMut.mutate(
																batch.id
															)
														}
													>
														<Trash2 className='h-4 w-4' />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Thêm đợt nghỉ phép</DialogTitle>
					</DialogHeader>
					<div className='space-y-4 py-4'>
						<div>
							<Label>Nhãn đợt</Label>
							<Input
								value={newBatchLabel}
								onChange={(e) =>
									setNewBatchLabel(e.target.value)
								}
								placeholder='VD: Đợt 1'
							/>
						</div>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<Label>Ngày bắt đầu</Label>
								<Input
									type='date'
									value={newStartDate}
									onChange={(e) =>
										setNewStartDate(e.target.value)
									}
								/>
							</div>
							<div>
								<Label>Ngày kết thúc</Label>
								<Input
									type='date'
									value={newEndDate}
									onChange={(e) =>
										setNewEndDate(e.target.value)
									}
								/>
							</div>
						</div>
						<div>
							<Label>Tổng số ngày</Label>
							<Input
								type='number'
								min={1}
								value={newTotalDays}
								onChange={(e) =>
									setNewTotalDays(Number(e.target.value))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setShowAddDialog(false)}
						>
							Hủy
						</Button>
						<Button
							onClick={handleAdd}
							disabled={createMut.isPending}
						>
							{createMut.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Thêm đợt
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!editingBatch}
				onOpenChange={(open) => !open && setEditingBatch(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Chỉnh sửa đợt nghỉ phép</DialogTitle>
					</DialogHeader>
					{editingBatch && (
						<div className='space-y-4 py-4'>
							<div>
								<Label>Nhãn đợt</Label>
								<Input
									value={editingBatch.batchLabel}
									onChange={(e) =>
										setEditingBatch({
											...editingBatch,
											batchLabel: e.target.value
										})
									}
								/>
							</div>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<Label>Ngày bắt đầu</Label>
									<Input
										type='date'
										value={editingBatch.startDate || ''}
										onChange={(e) =>
											setEditingBatch({
												...editingBatch,
												startDate: e.target.value
											})
										}
									/>
								</div>
								<div>
									<Label>Ngày kết thúc</Label>
									<Input
										type='date'
										value={editingBatch.endDate || ''}
										onChange={(e) =>
											setEditingBatch({
												...editingBatch,
												endDate: e.target.value
											})
										}
									/>
								</div>
							</div>
							<div>
								<Label>Tổng số ngày</Label>
								<Input
									type='number'
									min={1}
									value={editingBatch.totalDays}
									onChange={(e) =>
										setEditingBatch({
											...editingBatch,
											totalDays: Number(e.target.value)
										})
									}
								/>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setEditingBatch(null)}
						>
							Hủy
						</Button>
						<Button
							disabled={!editingBatch || updateMut.isPending}
							onClick={() =>
								editingBatch && handleUpdate(editingBatch)
							}
						>
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
