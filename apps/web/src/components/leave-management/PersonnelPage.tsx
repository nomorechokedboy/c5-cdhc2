import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateLeavePersonnel,
	DeleteLeavePersonnel,
	GetLeaveMeta,
	ListLeavePersonnel,
	ListLeavePositions,
	ListLeaveClasses,
	ListLeaveUnits,
	UpdateLeavePersonnel,
	type LeaveObjectType,
	type LeavePersonnel
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
import { Badge } from '@/components/ui/badge'
import ImportPersonnelDialog from './ImportPersonnelDialog'
import LocalityPicker from './LocalityPicker'
import DateInput from '@/components/date-input'
import { rankOptions, userRankOptions } from '@/data/ethnics'
import useUserData from '@/hooks/useUsers'

/** Cấp bậc: hạ sĩ quan/binh sĩ + sĩ quan + CN */
const RANK_OPTIONS = (() => {
	const seen = new Set<string>()
	const out: { label: string; value: string }[] = []
	for (const o of [...rankOptions, ...userRankOptions]) {
		if (seen.has(o.value)) continue
		seen.add(o.value)
		out.push(o)
	}
	return out
})()

const FALLBACK_OBJECT_TYPES: { code: LeaveObjectType; label: string }[] = [
	{ code: 'SQ', label: 'Sỹ quan' },
	{ code: 'QNCN', label: 'Quân nhân chuyên nghiệp' },
	{ code: 'CNQP', label: 'Công nhân quốc phòng' },
	{ code: 'VCQP', label: 'Viên chức quốc phòng' },
	{ code: 'HSQBS', label: 'Hạ sỹ quan, Binh sỹ' },
	{ code: 'HV', label: 'Học viên' },
	{ code: 'KHAC', label: 'Đối tượng khác' }
]

const emptyForm = {
	fullName: '',
	enlistmentDate: '',
	recruitment: '',
	objectType: 'SQ' as LeaveObjectType,
	rank: '',
	position: '',
	classId: '' as string,
	unitId: '' as string,
	unitName: '',
	hometown: '',
	permanentResidence: '',
	email: '',
	commanderUserId: '' as string
}

export default function PersonnelPage() {
	const qc = useQueryClient()
	const [search, setSearch] = useState('')
	const [open, setOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)
	const [editing, setEditing] = useState<LeavePersonnel | null>(null)
	const [form, setForm] = useState(emptyForm)
	const { data: users = [] } = useUserData()

	const { data = [], isLoading } = useQuery({
		queryKey: ['leave-personnel', search],
		queryFn: () => ListLeavePersonnel({ search: search || undefined })
	})
	const { data: meta } = useQuery({
		queryKey: ['leave-meta'],
		queryFn: GetLeaveMeta
	})
	const { data: units = [] } = useQuery({
		queryKey: ['leave-units'],
		queryFn: () => ListLeaveUnits()
	})
	const { data: positions = [] } = useQuery({
		queryKey: ['leave-positions'],
		queryFn: () => ListLeavePositions(true)
	})
	const { data: classes = [] } = useQuery({
		queryKey: ['leave-classes', form.unitId],
		queryFn: () => ListLeaveClasses(Number(form.unitId)),
		enabled: form.objectType === 'HV' && Boolean(form.unitId)
	})
	const OBJECT_TYPES = meta?.objectTypes?.length
		? meta.objectTypes
		: FALLBACK_OBJECT_TYPES

	const saveMut = useMutation({
		mutationFn: async () => {
			const unitId = form.unitId ? Number(form.unitId) : null
			const unit = units.find((u) => u.id === unitId)
			const selectedClass = classes.find(
				(c) => c.id === Number(form.classId)
			)
			// Chỉ huy CQ cố định theo đơn vị
			const commanderId =
				unit?.commanderUserId ??
				(form.commanderUserId ? Number(form.commanderUserId) : null)
			const commander = users.find((u) => u.id === commanderId)
			const body = {
				fullName: form.fullName.trim(),
				enlistmentDate: form.enlistmentDate || null,
				recruitment: form.recruitment || null,
				objectType: form.objectType,
				rank: form.rank || null,
				position: form.position || null,
				classId: form.classId ? Number(form.classId) : null,
				className:
					selectedClass?.name ||
					(editing?.classId === Number(form.classId)
						? editing.className
						: null),
				unitId,
				unitName: unit?.name || form.unitName || null,
				hometown: form.hometown || null,
				permanentResidence: form.permanentResidence || null,
				userId: editing?.userId ?? null,
				email: form.email.trim() || null,
				commanderUserId: commanderId,
				commanderName:
					unit?.commanderName ||
					(commander
						? commander.displayName || commander.username
						: null)
			}
			if (editing) {
				return UpdateLeavePersonnel(editing.id, {
					...body,
					code: editing.code
				})
			}
			// code omitted → backend auto-generates
			return CreateLeavePersonnel(body)
		},
		onSuccess: () => {
			toast.success(editing ? 'Đã cập nhật' : 'Đã thêm quân nhân')
			qc.invalidateQueries({ queryKey: ['leave-personnel'] })
			setOpen(false)
			setEditing(null)
			setForm(emptyForm)
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delMut = useMutation({
		mutationFn: (id: number) => DeleteLeavePersonnel(id),
		onSuccess: () => {
			toast.success('Đã xóa')
			qc.invalidateQueries({ queryKey: ['leave-personnel'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const objectLabel = useMemo(() => {
		const m = Object.fromEntries(OBJECT_TYPES.map((o) => [o.code, o.label]))
		return (c: string) => m[c] || c
	}, [OBJECT_TYPES])

	function openCreate() {
		setEditing(null)
		setForm(emptyForm)
		setOpen(true)
	}

	function openEdit(p: LeavePersonnel) {
		setEditing(p)
		setForm({
			fullName: p.fullName,
			enlistmentDate: p.enlistmentDate || '',
			recruitment: p.recruitment || '',
			objectType: p.objectType,
			rank: p.rank || '',
			position: p.position || '',
			classId: p.classId != null ? String(p.classId) : '',
			unitId: p.unitId != null ? String(p.unitId) : '',
			unitName: p.unitName || '',
			hometown: p.hometown || '',
			permanentResidence: p.permanentResidence || '',
			email: p.email || '',
			commanderUserId:
				p.commanderUserId != null ? String(p.commanderUserId) : ''
		})
		setOpen(true)
	}

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh sách quân nhân
					</h2>
					<p className='text-sm text-muted-foreground'>
						Cập nhật email + chỉ huy cơ quan để luồng duyệt phép và
						thông báo mail hoạt động
					</p>
				</div>
				<div className='flex gap-2'>
					<Input
						placeholder='Tìm mã / tên…'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className='w-56'
					/>
					<Button
						variant='outline'
						onClick={() => setImportOpen(true)}
					>
						<Upload className='mr-1 h-4 w-4' />
						Import
					</Button>
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
							<TableHead>Tên</TableHead>
							<TableHead>Nhập ngũ</TableHead>
							<TableHead>Tuyển dụng</TableHead>
							<TableHead>Đối tượng</TableHead>
							<TableHead>Cấp bậc</TableHead>
							<TableHead>Chức vụ</TableHead>
							<TableHead>Lớp</TableHead>
							<TableHead>Đơn vị</TableHead>
							<TableHead>Quê quán</TableHead>
							<TableHead>Thường trú</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Cơ quan quản lý</TableHead>
							<TableHead>Chỉ huy CQ</TableHead>
							<TableHead className='w-24' />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && (
							<TableRow>
								<TableCell colSpan={15} className='text-center'>
									<Loader2 className='mx-auto h-5 w-5 animate-spin' />
								</TableCell>
							</TableRow>
						)}
						{!isLoading && data.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={15}
									className='text-center text-muted-foreground'
								>
									Chưa có dữ liệu
								</TableCell>
							</TableRow>
						)}
						{data.map((p) => (
							<TableRow key={p.id}>
								<TableCell className='font-mono text-sm'>
									{p.code}
								</TableCell>
								<TableCell>{p.fullName}</TableCell>
								<TableCell>{p.enlistmentDate || '—'}</TableCell>
								<TableCell>{p.recruitment || '—'}</TableCell>
								<TableCell>
									<Badge variant='secondary'>
										{objectLabel(p.objectType)}
									</Badge>
								</TableCell>
								<TableCell>{p.rank || '—'}</TableCell>
								<TableCell>{p.position || '—'}</TableCell>
								<TableCell>{p.className || '—'}</TableCell>
								<TableCell>{p.unitName || '—'}</TableCell>
								<TableCell className='max-w-[150px] truncate text-sm'>
									{p.hometown || '—'}
								</TableCell>
								<TableCell className='max-w-[150px] truncate text-sm'>
									{p.permanentResidence || '—'}
								</TableCell>
								<TableCell className='max-w-[140px] truncate text-sm'>
									{p.email || '—'}
								</TableCell>
								<TableCell>
									{p.managementArea === 'quân_lực'
										? 'Quân lực'
										: 'Cán bộ'}
								</TableCell>
								<TableCell className='max-w-[140px] truncate text-sm'>
									{p.commanderName || '—'}
								</TableCell>
								<TableCell>
									<div className='flex gap-1'>
										<Button
											size='icon'
											variant='ghost'
											onClick={() => openEdit(p)}
										>
											<Pencil className='h-4 w-4' />
										</Button>
										<Button
											size='icon'
											variant='ghost'
											onClick={() => {
												if (
													confirm(
														`Xóa ${p.fullName}?`
													)
												)
													delMut.mutate(p.id)
											}}
										>
											<Trash2 className='h-4 w-4 text-destructive' />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className='flex !h-auto max-h-[90vh] max-w-lg flex-col overflow-hidden p-0'>
					<DialogHeader className='shrink-0 border-b px-6 py-4'>
						<DialogTitle>
							{editing ? 'Sửa quân nhân' : 'Thêm quân nhân'}
						</DialogTitle>
					</DialogHeader>
					<div className='grid flex-1 gap-3 overflow-y-auto overscroll-contain px-6 py-4'>
						{editing && (
							<div>
								<Label>Mã</Label>
								<Input value={editing.code} disabled />
								<p className='mt-1 text-xs text-muted-foreground'>
									Mã do hệ thống sinh, không chỉnh sửa
								</p>
							</div>
						)}
						{!editing && (
							<p className='text-xs text-muted-foreground'>
								Mã quân nhân sẽ được hệ thống tự sinh khi lưu
								(dạng QN-000001).
							</p>
						)}
						<div>
							<Label>Tên *</Label>
							<Input
								value={form.fullName}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										fullName: e.target.value
									}))
								}
							/>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<Label>Ngày nhập ngũ</Label>
								<DateInput
									value={form.enlistmentDate}
									onChange={(v) =>
										setForm((f) => ({
											...f,
											enlistmentDate: v
										}))
									}
									placeholder='Chọn ngày nhập ngũ'
								/>
							</div>
							<div>
								<Label>Tuyển dụng</Label>
								<Input
									value={form.recruitment}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											recruitment: e.target.value
										}))
									}
								/>
							</div>
						</div>
						<div>
							<Label>Đối tượng *</Label>
							<Select
								value={form.objectType}
								onValueChange={(v) =>
									setForm((f) => ({
										...f,
										objectType: v as LeaveObjectType,
										classId: v === 'HV' ? f.classId : ''
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{OBJECT_TYPES.map((o) => (
										<SelectItem key={o.code} value={o.code}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<Label>Cấp bậc</Label>
								<Select
									value={form.rank || undefined}
									onValueChange={(v) =>
										setForm((f) => ({
											...f,
											rank: v
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder='Chọn cấp bậc' />
									</SelectTrigger>
									<SelectContent>
										{/* allow clearing via re-select if value not in list */}
										{form.rank &&
											!RANK_OPTIONS.some(
												(o) => o.value === form.rank
											) && (
												<SelectItem value={form.rank}>
													{form.rank}
												</SelectItem>
											)}
										{RANK_OPTIONS.map((o) => (
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
							<div>
								<Label>Chức vụ</Label>
								<Select
									value={form.position || undefined}
									onValueChange={(v) =>
										setForm((f) => ({
											...f,
											position: v
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder='Chọn chức vụ' />
									</SelectTrigger>
									<SelectContent>
										{form.position &&
											!positions.some(
												(p) => p.name === form.position
											) && (
												<SelectItem
													value={form.position}
												>
													{form.position} (dữ liệu cũ)
												</SelectItem>
											)}
										{positions.map((p) => (
											<SelectItem
												key={p.id}
												value={p.name}
											>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div>
							<Label>Đơn vị (danh mục)</Label>
							<Select
								value={form.unitId || undefined}
								onValueChange={(v) => {
									const u = units.find(
										(x) => x.id === Number(v)
									)
									setForm((f) => ({
										...f,
										unitId: v,
										classId: '',
										unitName: u?.name || f.unitName,
										// Chỉ huy CQ cố định theo đơn vị
										commanderUserId:
											u?.commanderUserId != null
												? String(u.commanderUserId)
												: ''
									}))
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn đơn vị từ danh mục…' />
								</SelectTrigger>
								<SelectContent>
									{units.map((u) => (
										<SelectItem
											key={u.id}
											value={String(u.id)}
										>
											{u.name}
											{u.code ? ` (${u.code})` : ''}
											{u.commanderName
												? ` — CH: ${u.commanderName}`
												: ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className='mt-1 text-xs text-muted-foreground'>
								Quản lý danh mục + gán chỉ huy tại «Danh mục đơn
								vị».
							</p>
						</div>
						{form.objectType === 'HV' && (
							<div>
								<Label>Lớp</Label>
								<Select
									value={form.classId || undefined}
									onValueChange={(v) =>
										setForm((f) => ({
											...f,
											classId: v
										}))
									}
									disabled={!form.unitId}
								>
									<SelectTrigger>
										<SelectValue
											placeholder={
												form.unitId
													? 'Chọn lớp…'
													: 'Chọn đơn vị trước'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{classes
											.filter((c) => c.isActive)
											.map((c) => (
												<SelectItem
													key={c.id}
													value={String(c.id)}
												>
													{c.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								{form.unitId && classes.length === 0 && (
									<p className='mt-1 text-xs text-muted-foreground'>
										Đơn vị này chưa có lớp trong danh mục.
									</p>
								)}
							</div>
						)}
						<div>
							<Label>Quê quán</Label>
							<LocalityPicker
								value={form.hometown}
								onChange={(v) =>
									setForm((f) => ({ ...f, hometown: v }))
								}
								placeholder='Chọn xã/phường quê quán…'
							/>
						</div>
						<div>
							<Label>Thường trú</Label>
							<LocalityPicker
								value={form.permanentResidence}
								onChange={(v) =>
									setForm((f) => ({
										...f,
										permanentResidence: v
									}))
								}
								placeholder='Chọn xã/phường thường trú…'
							/>
						</div>
						<div>
							<Label>
								Email (nhận thông báo duyệt / trả đơn)
							</Label>
							<Input
								type='email'
								placeholder='email@example.com'
								value={form.email}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										email: e.target.value
									}))
								}
							/>
						</div>
						<div>
							<Label>Chỉ huy cơ quan (theo đơn vị)</Label>
							<Input
								value={
									form.commanderUserId
										? (() => {
												const u = users.find(
													(x) =>
														x.id ===
														Number(
															form.commanderUserId
														)
												)
												const unit = units.find(
													(x) =>
														String(x.id) ===
														form.unitId
												)
												return (
													u
														? `${u.displayName || u.username}`
														: unit?.commanderName ||
															'—'
												) as string
											})()
										: form.unitId
											? units.find(
													(x) =>
														String(x.id) ===
														form.unitId
												)?.commanderName ||
												'Đơn vị chưa gán chỉ huy'
											: 'Chọn đơn vị trước'
								}
								disabled
								readOnly
								className='bg-muted/40'
							/>
							<p className='mt-1 text-xs text-muted-foreground'>
								Cố định theo đơn vị — không chọn tay. Gán chỉ
								huy tại «Danh mục đơn vị».
							</p>
						</div>
					</div>
					<DialogFooter className='shrink-0 border-t px-6 py-4'>
						<Button
							variant='outline'
							onClick={() => setOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveMut.isPending || !form.fullName.trim()
							}
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

			<ImportPersonnelDialog
				open={importOpen}
				onOpenChange={setImportOpen}
			/>
		</div>
	)
}
