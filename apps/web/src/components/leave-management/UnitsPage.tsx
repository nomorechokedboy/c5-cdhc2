import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateLeaveUnit,
	CreateLeaveClass,
	DeleteLeaveUnit,
	ListLeaveClasses,
	ListLeavePersonnel,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'

export default function UnitsPage() {
	const qc = useQueryClient()
	const [search, setSearch] = useState('')
	const [open, setOpen] = useState(false)
	const [editing, setEditing] = useState<LeaveUnit | null>(null)
	const [name, setName] = useState('')
	const [code, setCode] = useState('')
	const [createKind, setCreateKind] = useState<
		'agency' | 'battalion' | 'company' | 'class'
	>('agency')
	const [parentId, setParentId] = useState('')

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
	const { data: personnel = [] } = useQuery({
		queryKey: ['leave-personnel', 'unit-tree-count'],
		queryFn: () => ListLeavePersonnel()
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
			if (createKind === 'class') {
				if (!parentId) throw new Error('Chọn đại đội cha')
				return CreateLeaveClass({
					unitId: Number(parentId),
					name: name.trim()
				})
			}
			if (createKind === 'company' && !parentId)
				throw new Error('Chọn tiểu đoàn cha')
			return CreateLeaveUnit({
				name: name.trim(),
				code: code.trim() || null,
				level: createKind === 'agency' ? null : createKind,
				parentId: createKind === 'company' ? Number(parentId) : null
			})
		},
		onSuccess: () => {
			toast.success(editing ? 'Đã cập nhật' : 'Đã thêm đơn vị')
			qc.invalidateQueries({ queryKey: ['leave-units'] })
			qc.invalidateQueries({ queryKey: ['leave-classes'] })
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
		setCreateKind('agency')
		setParentId('')
		setOpen(true)
	}

	function openEdit(u: LeaveUnit) {
		setEditing(u)
		setName(u.name)
		setCode(u.code || '')
		setCreateKind((u.level as 'battalion' | 'company') || 'agency')
		setParentId(u.parentId != null ? String(u.parentId) : '')
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
	const personnelCount = (classId: number) =>
		personnel.filter((p) => p.classId === classId).length

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh mục đơn vị
					</h2>
					<p className='text-sm text-muted-foreground'>
						Biên chế dạng cây: Tiểu đoàn → Đại đội → Lớp học viên
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
							<Fragment key={u.id}>
								<TableRow
									className={
										u.parentId == null
											? 'bg-muted/25 font-semibold'
											: ''
									}
								>
									<TableCell className='font-mono text-sm'>
										{u.code || '—'}
									</TableCell>
									<TableCell>
										{u.parentId != null ? (
											<div className='flex items-center pl-8'>
												<span className='mr-2 font-mono text-muted-foreground'>
													├──
												</span>
												<span>{u.name}</span>
											</div>
										) : (
											<span>{u.name}</span>
										)}
									</TableCell>
									<TableCell>
										{u.level
											? levelLabel[u.level] || u.level
											: 'Cơ quan / phòng ban'}
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
										<TableCell>
											<div className='flex items-center pl-16'>
												<span className='mr-2 font-mono text-muted-foreground'>
													│&nbsp;&nbsp;└──
												</span>
												<span>
													Lớp {c.name} —{' '}
													{personnelCount(c.id)} học
													viên
												</span>
											</div>
										</TableCell>
										<TableCell>Lớp học viên</TableCell>
										<TableCell>—</TableCell>
										<TableCell>Hoạt động</TableCell>
										<TableCell />
									</TableRow>
								))}
							</Fragment>
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
						{!editing && (
							<div>
								<Label>Loại cần thêm *</Label>
								<Select
									value={createKind}
									onValueChange={(v) => {
										setCreateKind(v as typeof createKind)
										setParentId('')
										setName('')
										setCode('')
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='agency'>
											Cơ quan / phòng ban
										</SelectItem>
										<SelectItem value='battalion'>
											Tiểu đoàn
										</SelectItem>
										<SelectItem value='company'>
											Đại đội
										</SelectItem>
										<SelectItem value='class'>
											Lớp học viên
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
						{!editing && createKind === 'company' && (
							<div>
								<Label>Tiểu đoàn cha *</Label>
								<Select
									value={parentId}
									onValueChange={setParentId}
								>
									<SelectTrigger>
										<SelectValue placeholder='Chọn tiểu đoàn…' />
									</SelectTrigger>
									<SelectContent>
										{data
											.filter(
												(u) => u.level === 'battalion'
											)
											.map((u) => (
												<SelectItem
													key={u.id}
													value={String(u.id)}
												>
													{u.code
														? `${u.code} — `
														: ''}
													{u.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>
						)}
						{!editing && createKind === 'class' && (
							<div>
								<Label>Đại đội cha *</Label>
								<Select
									value={parentId}
									onValueChange={setParentId}
								>
									<SelectTrigger>
										<SelectValue placeholder='Chọn đại đội…' />
									</SelectTrigger>
									<SelectContent>
										{data
											.filter(
												(u) => u.level === 'company'
											)
											.map((u) => (
												<SelectItem
													key={u.id}
													value={String(u.id)}
												>
													{u.code
														? `${u.code} — `
														: ''}
													{u.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>
						)}
						<div>
							<Label>Tên *</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={
									createKind === 'class'
										? 'Ví dụ: A11, Lớp đào tạo 1…'
										: createKind === 'company'
											? 'Ví dụ: Đại đội 1'
											: createKind === 'battalion'
												? 'Ví dụ: Tiểu đoàn 1'
												: 'Ví dụ: Phòng Tham mưu, Ban Hậu cần…'
								}
							/>
						</div>
						<div
							className={
								createKind === 'class' && !editing
									? 'hidden'
									: ''
							}
						>
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
