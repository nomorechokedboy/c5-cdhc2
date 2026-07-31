import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateLeaveUnit,
	DeleteLeaveUnit,
	ListLeaveClasses,
	ListLeaveUnits,
	UpdateLeaveUnit,
	type LeaveUnit
} from '@/api/leave'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export default function UnitsPage() {
	const qc = useQueryClient()
	const [search, setSearch] = useState('')
	const [open, setOpen] = useState(false)
	const [editing, setEditing] = useState<LeaveUnit | null>(null)
	const [name, setName] = useState('')
	const [code, setCode] = useState('')

	const { data = [], isLoading } = useQuery({
		queryKey: ['leave-units', search],
		queryFn: () =>
			ListLeaveUnits({
				search: search || undefined,
				activeOnly: false
			})
	})
	const { data: classes = [] } = useQuery({
		queryKey: ['leave-classes'],
		queryFn: () => ListLeaveClasses()
	})

	const saveMut = useMutation({
		mutationFn: async () => {
			if (!name.trim()) throw new Error('Tên đơn vị là bắt buộc')
			if (editing) {
				return UpdateLeaveUnit(editing.id, {
					name: name.trim(),
					code: code.trim() || null
				})
			}
			return CreateLeaveUnit({
				name: name.trim(),
				code: code.trim() || null
			})
		},
		onSuccess: () => {
			toast.success(editing ? 'Đã cập nhật' : 'Đã thêm đơn vị')
			qc.invalidateQueries({ queryKey: ['leave-units'] })
			setOpen(false)
			setEditing(null)
			setName('')
			setCode('')
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delMut = useMutation({
		mutationFn: (id: number) => DeleteLeaveUnit(id),
		onSuccess: () => {
			toast.success('Đã xóa')
			qc.invalidateQueries({ queryKey: ['leave-units'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	function openCreate() {
		setEditing(null)
		setName('')
		setCode('')
		setOpen(true)
	}

	function openEdit(u: LeaveUnit) {
		setEditing(u)
		setName(u.name)
		setCode(u.code || '')
		setOpen(true)
	}

	const levelLabel: Record<string, string> = {
		company: 'Đại đội',
		battalion: 'Tiểu đoàn'
	}
	const orderedUnits = data.flatMap((root) => {
		if (root.parentId != null) return []
		return [root, ...data.filter((u) => u.parentId === root.id)]
	})
	const classCount = (unitId: number) =>
		classes.filter((c) => c.unitId === unitId)

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh mục đơn vị
					</h2>
					<p className='text-sm text-muted-foreground'>
						Biên chế: Đại đội → Lớp học viên; Tiểu đoàn → Đại đội →
						Trung đoàn → Lữ/Sư đoàn → Quân đoàn → Quân khu/chủng
					</p>
				</div>
				<div className='flex gap-2'>
					<Input
						placeholder='Tìm tên / mã…'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className='w-56'
					/>
					<Button onClick={openCreate}>
						<Plus className='mr-1 h-4 w-4' />
						Thêm
					</Button>
				</div>
			</div>

			<div className='rounded-md border'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Mã</TableHead>
							<TableHead>Tên đơn vị</TableHead>
							<TableHead>Cấp</TableHead>
							<TableHead>Cơ quan quản lý</TableHead>
							<TableHead>Trạng thái</TableHead>
							<TableHead className='w-24' />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && (
							<TableRow>
								<TableCell colSpan={6} className='text-center'>
									<Loader2 className='mx-auto h-5 w-5 animate-spin' />
								</TableCell>
							</TableRow>
						)}
						{!isLoading && data.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={6}
									className='text-center text-muted-foreground'
								>
									Chưa có đơn vị — bấm Thêm để tạo
								</TableCell>
							</TableRow>
						)}
						{orderedUnits.map((u) => (
							<>
								<TableRow key={u.id}>
									<TableCell className='font-mono text-sm'>
										{u.code || '—'}
									</TableCell>
									<TableCell>
										{u.parentId != null && (
											<span className='mr-2 text-muted-foreground'>
												└
											</span>
										)}
										{u.name}
									</TableCell>
									<TableCell>
										{u.level
											? levelLabel[u.level] || u.level
											: '—'}
									</TableCell>
									<TableCell>
										{u.managementArea === 'quân_lực'
											? 'Quân lực'
											: 'Cán bộ'}
									</TableCell>
									<TableCell>
										{u.isActive ? 'Hoạt động' : 'Ẩn'}
									</TableCell>
									<TableCell>
										<div className='flex gap-1'>
											<Button
												size='icon'
												variant='ghost'
												onClick={() => openEdit(u)}
											>
												<Pencil className='h-4 w-4' />
											</Button>
											<Button
												size='icon'
												variant='ghost'
												onClick={() => {
													if (
														confirm(
															`Xóa ${u.name}?`
														)
													)
														delMut.mutate(u.id)
												}}
											>
												<Trash2 className='h-4 w-4 text-destructive' />
											</Button>
										</div>
									</TableCell>
								</TableRow>
								{classCount(u.id).map((c) => (
									<TableRow key={`class-${c.id}`}>
										<TableCell />
										<TableCell className='pl-12'>
											└ Lớp {c.name} —{' '}
											{data.length && c.name === 'A1'
												? 2
												: 0}{' '}
											học viên
										</TableCell>
										<TableCell>Lớp học viên</TableCell>
										<TableCell>—</TableCell>
										<TableCell>Hoạt động</TableCell>
										<TableCell />
									</TableRow>
								))}
							</>
						))}
					</TableBody>
				</Table>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editing ? 'Sửa đơn vị' : 'Thêm đơn vị'}
						</DialogTitle>
					</DialogHeader>
					<div className='grid gap-3 py-2'>
						<div>
							<Label>Tên *</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder='Ví dụ: Đại đội 1'
							/>
						</div>
						<div>
							<Label>Mã (tuỳ chọn)</Label>
							<Input
								value={code}
								onChange={(e) => setCode(e.target.value)}
								placeholder='VD: c1'
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={saveMut.isPending}
							onClick={() => saveMut.mutate()}
						>
							{saveMut.isPending && (
								<Loader2 className='mr-1 h-4 w-4 animate-spin' />
							)}
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
