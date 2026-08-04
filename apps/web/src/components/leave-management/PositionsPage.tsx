import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateLeavePosition,
	DeleteLeavePosition,
	ListLeavePositions,
	UpdateLeavePosition,
	type LeavePosition
} from '@/api/leave'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'

const emptyForm = { name: '', sortOrder: 1, isActive: true }

export default function PositionsPage() {
	const qc = useQueryClient()
	const [open, setOpen] = useState(false)
	const [editing, setEditing] = useState<LeavePosition | null>(null)
	const [form, setForm] = useState(emptyForm)
	const { data = [], isLoading } = useQuery({
		queryKey: ['leave-positions'],
		queryFn: () => ListLeavePositions(false)
	})
	const save = useMutation({
		mutationFn: () =>
			editing
				? UpdateLeavePosition(editing.id, form)
				: CreateLeavePosition(form),
		onSuccess: () => {
			toast.success(editing ? 'Đã cập nhật chức vụ' : 'Đã thêm chức vụ')
			setOpen(false)
			qc.invalidateQueries({ queryKey: ['leave-positions'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})
	const remove = useMutation({
		mutationFn: DeleteLeavePosition,
		onSuccess: () => {
			toast.success('Đã xóa chức vụ')
			qc.invalidateQueries({ queryKey: ['leave-positions'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})
	const showCreate = () => {
		setEditing(null)
		setForm(emptyForm)
		setOpen(true)
	}
	const showEdit = (p: LeavePosition) => {
		setEditing(p)
		setForm({ name: p.name, sortOrder: p.sortOrder, isActive: p.isActive })
		setOpen(true)
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='text-2xl font-bold'>Danh mục chức vụ</h2>
					<p className='text-sm text-muted-foreground'>
						Quản lý các chức vụ sử dụng trong hồ sơ quân nhân.
					</p>
				</div>
				<Button onClick={showCreate}>
					<Plus className='mr-2 h-4 w-4' />
					Thêm
				</Button>
			</div>
			<div className='rounded-md border'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>STT</TableHead>
							<TableHead>Tên chức vụ</TableHead>
							<TableHead>Thứ tự</TableHead>
							<TableHead>Trạng thái</TableHead>
							<TableHead className='w-28' />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={5}>Đang tải...</TableCell>
							</TableRow>
						) : data.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className='text-center'>
									Chưa có chức vụ
								</TableCell>
							</TableRow>
						) : (
							data.map((p, i) => (
								<TableRow key={p.id}>
									<TableCell>{i + 1}</TableCell>
									<TableCell className='font-medium'>
										{p.name}
									</TableCell>
									<TableCell>{p.sortOrder}</TableCell>
									<TableCell>
										<Badge
											variant={
												p.isActive
													? 'default'
													: 'secondary'
											}
										>
											{p.isActive ? 'Đang dùng' : 'Đã ẩn'}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											size='icon'
											variant='ghost'
											onClick={() => showEdit(p)}
										>
											<Pencil className='h-4 w-4' />
										</Button>
										<Button
											size='icon'
											variant='ghost'
											onClick={() => remove.mutate(p.id)}
										>
											<Trash2 className='h-4 w-4' />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editing ? 'Sửa chức vụ' : 'Thêm chức vụ'}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-4 py-2'>
						<div>
							<Label>Tên chức vụ</Label>
							<Input
								value={form.name}
								onChange={(e) =>
									setForm({ ...form, name: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Thứ tự</Label>
							<Input
								type='number'
								value={form.sortOrder}
								onChange={(e) =>
									setForm({
										...form,
										sortOrder: Number(e.target.value)
									})
								}
							/>
						</div>
						<label className='flex items-center gap-2'>
							<Checkbox
								checked={form.isActive}
								onCheckedChange={(v) =>
									setForm({ ...form, isActive: v === true })
								}
							/>
							Đang sử dụng
						</label>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={!form.name.trim() || save.isPending}
							onClick={() => save.mutate()}
						>
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
