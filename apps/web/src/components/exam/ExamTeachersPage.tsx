/**
 * Danh mục giáo viên theo khoa.
 * Mỗi giáo viên = 1 tài khoản riêng (không trùng user).
 * CNK/admin: thêm (tạo TK mới hoặc gắn user), sửa khoa/tên, gỡ khỏi danh mục.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, Pencil, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateExamTeacherCatalog,
	DeleteExamTeacherCatalog,
	ListExamFacultyOptions,
	ListExamTeacherCandidates,
	ListExamTeacherCatalog,
	UpdateExamTeacherCatalog
} from '@/api/exam'
import {
	canManageTeachingAssignments,
	canViewTeachingAssignments
} from '@/lib/exam-roles'
import { canSeeUsernames } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

function personName(displayName?: string | null, username?: string | null) {
	let s = (displayName || '').trim()
	if (!s) return username || '—'
	s = s.replace(/^GV\s*[—–-]\s*/i, '').trim()
	return s || username || '—'
}

/** Gợi ý username từ họ tên: Nguyễn Văn An → gv.nguyenvanan */
function suggestUsername(fullName: string): string {
	const slug = fullName
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/gi, 'd')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '')
	return slug ? `gv.${slug}` : ''
}

export default function ExamTeachersPage() {
	const qc = useQueryClient()
	const canView = canViewTeachingAssignments()
	const canManage = canManageTeachingAssignments()

	const [filterFac, setFilterFac] = useState<string>('all')
	const [keyword, setKeyword] = useState('')
	const [open, setOpen] = useState(false)
	const [editId, setEditId] = useState<number | null>(null)
	/** new_account | existing */
	const [mode, setMode] = useState<'new_account' | 'existing'>('new_account')
	const [form, setForm] = useState({
		facultyCode: '',
		displayName: '',
		username: '',
		password: 'User@123',
		userId: '',
		note: ''
	})

	const facultiesQ = useQuery({
		queryKey: ['exam-faculty-options'],
		queryFn: () => ListExamFacultyOptions(),
		enabled: canView
	})
	const catalogQ = useQuery({
		queryKey: ['exam-teacher-catalog', filterFac, keyword],
		queryFn: () =>
			ListExamTeacherCatalog({
				facultyCode: filterFac !== 'all' ? filterFac : undefined,
				q: keyword.trim() || undefined
			}),
		enabled: canView
	})
	const candidatesQ = useQuery({
		queryKey: ['exam-teacher-candidates'],
		queryFn: () => ListExamTeacherCandidates(),
		enabled: canView && canManage && open && mode === 'existing'
	})

	const faculties = facultiesQ.data || []
	const teachers = catalogQ.data || []
	const candidates = candidatesQ.data || []

	const byFaculty = useMemo(() => {
		const map = new Map<string, number>()
		for (const t of teachers) {
			map.set(t.facultyCode, (map.get(t.facultyCode) || 0) + 1)
		}
		return map
	}, [teachers])

	function resetForm() {
		setForm({
			facultyCode: '',
			displayName: '',
			username: '',
			password: 'User@123',
			userId: '',
			note: ''
		})
		setMode('new_account')
		setEditId(null)
	}

	const createMut = useMutation({
		mutationFn: () => {
			if (!form.facultyCode) throw new Error('Chọn khoa')
			if (mode === 'new_account') {
				const name = form.displayName.trim()
				if (!name) throw new Error('Nhập họ tên giáo viên')
				const username = form.username.trim().toLowerCase()
				if (!username) throw new Error('Nhập username đăng nhập')
				if (!form.password || form.password.length < 6) {
					throw new Error('Mật khẩu tối thiểu 6 ký tự')
				}
				return CreateExamTeacherCatalog({
					username,
					password: form.password,
					displayName: name.startsWith('GV') ? name : `GV — ${name}`,
					facultyCode: form.facultyCode,
					note: form.note || undefined
				})
			}
			if (!form.userId) throw new Error('Chọn tài khoản')
			return CreateExamTeacherCatalog({
				userId: Number(form.userId),
				displayName: form.displayName.trim() || undefined,
				facultyCode: form.facultyCode,
				note: form.note || undefined
			})
		},
		onSuccess: () => {
			toast.success(
				mode === 'new_account'
					? 'Đã tạo tài khoản GV và thêm vào danh mục khoa'
					: 'Đã thêm giáo viên vào danh mục khoa'
			)
			setOpen(false)
			resetForm()
			void qc.invalidateQueries({ queryKey: ['exam-teacher-catalog'] })
			void qc.invalidateQueries({ queryKey: ['exam-teachers'] })
			void qc.invalidateQueries({ queryKey: ['exam-teacher-candidates'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const updateMut = useMutation({
		mutationFn: () => {
			if (editId == null) throw new Error('Thiếu id')
			const name = form.displayName.trim()
			if (!name) throw new Error('Nhập họ tên')
			if (!form.facultyCode) throw new Error('Chọn khoa')
			return UpdateExamTeacherCatalog(editId, {
				facultyCode: form.facultyCode,
				displayName: name.startsWith('GV') ? name : `GV — ${name}`,
				note: form.note || null
			})
		},
		onSuccess: () => {
			toast.success('Đã cập nhật giáo viên')
			setOpen(false)
			resetForm()
			void qc.invalidateQueries({ queryKey: ['exam-teacher-catalog'] })
			void qc.invalidateQueries({ queryKey: ['exam-teachers'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delMut = useMutation({
		mutationFn: (id: number) => DeleteExamTeacherCatalog(id),
		onSuccess: () => {
			toast.success('Đã gỡ khỏi danh mục (tài khoản vẫn còn)')
			void qc.invalidateQueries({ queryKey: ['exam-teacher-catalog'] })
			void qc.invalidateQueries({ queryKey: ['exam-teachers'] })
			void qc.invalidateQueries({ queryKey: ['exam-teacher-candidates'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	if (!canView) {
		return (
			<div className='p-6'>
				<h1 className='text-xl font-semibold'>Không có quyền</h1>
				<p className='text-muted-foreground text-sm'>
					Chỉ khoa / admin / BGH được xem danh mục giáo viên.
				</p>
			</div>
		)
	}

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Danh mục giáo viên
					</h1>
					<p className='text-muted-foreground text-sm'>
						Mỗi giáo viên của khoa có{' '}
						<strong>một tài khoản riêng</strong> — không trùng. Dùng
						khi phân công môn giảng dạy.
					</p>
				</div>
				{canManage ? (
					<Button
						onClick={() => {
							resetForm()
							setOpen(true)
						}}
					>
						<Plus className='mr-2 h-4 w-4' />
						Thêm giáo viên
					</Button>
				) : (
					<Badge variant='secondary'>Chỉ xem</Badge>
				)}
			</div>

			<div className='flex flex-wrap gap-2'>
				{faculties.map((f) => (
					<Badge
						key={f.code}
						variant={filterFac === f.code ? 'default' : 'outline'}
						className='cursor-pointer'
						onClick={() =>
							setFilterFac(filterFac === f.code ? 'all' : f.code)
						}
					>
						{f.name}
						{byFaculty.has(f.code)
							? ` (${byFaculty.get(f.code)})`
							: ''}
					</Badge>
				))}
				{filterFac !== 'all' && (
					<Button
						variant='ghost'
						size='sm'
						className='h-6'
						onClick={() => setFilterFac('all')}
					>
						Tất cả khoa
					</Button>
				)}
			</div>

			<Card>
				<CardHeader className='pb-2'>
					<div className='flex flex-wrap items-center justify-between gap-2'>
						<div>
							<CardTitle className='text-base flex items-center gap-2'>
								<Users className='h-4 w-4' />
								Giáo viên theo khoa ({teachers.length})
							</CardTitle>
							<CardDescription>
								Tên hiển thị + khoa phụ trách · 1 user = 1 dòng
							</CardDescription>
						</div>
						<Input
							className='max-w-xs'
							placeholder={
								canSeeUsernames()
									? 'Tìm tên / username…'
									: 'Tìm theo họ tên…'
							}
							value={keyword}
							onChange={(e) => setKeyword(e.target.value)}
						/>
					</div>
				</CardHeader>
				<CardContent>
					{catalogQ.isLoading ? (
						<div className='flex justify-center py-12'>
							<Loader2 className='h-7 w-7 animate-spin' />
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Họ và tên</TableHead>
									{canSeeUsernames() && (
										<TableHead>Tài khoản</TableHead>
									)}
									<TableHead>Khoa</TableHead>
									<TableHead>Ghi chú</TableHead>
									{canManage && (
										<TableHead className='w-28' />
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{teachers.map((t) => (
									<TableRow key={t.id}>
										<TableCell className='font-medium'>
											{personName(
												t.displayName,
												t.username
											)}
										</TableCell>
										{canSeeUsernames() && (
											<TableCell className='text-muted-foreground font-mono text-xs'>
												{t.username || '—'}
											</TableCell>
										)}
										<TableCell>
											{t.facultyName || t.facultyCode}
										</TableCell>
										<TableCell className='text-muted-foreground text-xs'>
											{t.note || '—'}
										</TableCell>
										{canManage && (
											<TableCell>
												<div className='flex gap-1'>
													<Button
														size='icon'
														variant='ghost'
														className='h-8 w-8'
														onClick={() => {
															setEditId(t.id)
															setForm({
																facultyCode:
																	t.facultyCode,
																displayName:
																	personName(
																		t.displayName,
																		t.username
																	),
																username:
																	t.username ||
																	'',
																password: '',
																userId: String(
																	t.userId
																),
																note:
																	t.note || ''
															})
															setOpen(true)
														}}
													>
														<Pencil className='h-3.5 w-3.5' />
													</Button>
													<Button
														size='icon'
														variant='ghost'
														className='h-8 w-8'
														onClick={() => {
															if (
																confirm(
																	`Gỡ ${personName(t.displayName, t.username)} khỏi danh mục khoa?`
																)
															)
																delMut.mutate(
																	t.id
																)
														}}
													>
														<Trash2 className='text-destructive h-3.5 w-3.5' />
													</Button>
												</div>
											</TableCell>
										)}
									</TableRow>
								))}
								{!teachers.length && (
									<TableRow>
										<TableCell
											colSpan={
												(canSeeUsernames() ? 4 : 3) +
												(canManage ? 1 : 0)
											}
											className='text-muted-foreground text-center'
										>
											Chưa có giáo viên trong danh mục
											{canManage
												? ' — bấm «Thêm giáo viên» (tạo tài khoản riêng)'
												: ''}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={open}
				onOpenChange={(v) => {
					setOpen(v)
					if (!v) resetForm()
				}}
			>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>
							{editId != null
								? 'Sửa giáo viên'
								: 'Thêm giáo viên vào khoa'}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-3'>
						{editId == null && (
							<Tabs
								value={mode}
								onValueChange={(v) =>
									setMode(v as 'new_account' | 'existing')
								}
							>
								<TabsList className='grid w-full grid-cols-2'>
									<TabsTrigger value='new_account'>
										Tạo TK mới
									</TabsTrigger>
									<TabsTrigger value='existing'>
										Gắn TK có sẵn
									</TabsTrigger>
								</TabsList>
							</Tabs>
						)}

						<div>
							<Label>Khoa *</Label>
							<Select
								value={form.facultyCode || undefined}
								onValueChange={(v) =>
									setForm((f) => ({
										...f,
										facultyCode: v
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn khoa' />
								</SelectTrigger>
								<SelectContent>
									{faculties.map((f) => (
										<SelectItem key={f.code} value={f.code}>
											{f.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{editId != null || mode === 'new_account' ? (
							<>
								<div>
									<Label>Họ và tên *</Label>
									<Input
										value={form.displayName}
										onChange={(e) => {
											const name = e.target.value
											setForm((f) => ({
												...f,
												displayName: name,
												// Tự gợi ý username theo họ tên (chỉ khi tạo mới)
												username:
													editId == null
														? suggestUsername(name)
														: f.username
											}))
										}}
										placeholder='Nguyễn Văn An'
									/>
								</div>
								{editId == null && (
									<>
										<div>
											<Label>Username đăng nhập *</Label>
											<Input
												value={form.username}
												onChange={(e) =>
													setForm((f) => ({
														...f,
														username: e.target.value
													}))
												}
												placeholder='gv.nguyenvanan'
												autoComplete='off'
											/>
											<p className='text-muted-foreground mt-1 text-xs'>
												Mỗi GV một TK riêng theo họ tên
												(không dùng gv.k1 — 1 khoa có
												nhiều GV)
											</p>
										</div>
										<div>
											<Label>Mật khẩu *</Label>
											<Input
												type='text'
												value={form.password}
												onChange={(e) =>
													setForm((f) => ({
														...f,
														password: e.target.value
													}))
												}
												placeholder='User@123'
											/>
										</div>
									</>
								)}
							</>
						) : (
							<div>
								<Label>
									Tài khoản GV (chưa trong danh mục)
								</Label>
								<Select
									value={form.userId || undefined}
									onValueChange={(v) => {
										const c = candidates.find(
											(x) => String(x.id) === v
										)
										setForm((f) => ({
											...f,
											userId: v,
											displayName:
												c?.displayName ||
												c?.username ||
												f.displayName
										}))
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder='Chọn tài khoản' />
									</SelectTrigger>
									<SelectContent>
										{candidates.map((c) => (
											<SelectItem
												key={c.id}
												value={String(c.id)}
											>
												{personName(
													c.displayName,
													c.username
												)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{!candidates.length && (
									<p className='text-muted-foreground mt-1 text-xs'>
										Không còn TK GV ngoài danh mục — hãy tạo
										TK mới.
									</p>
								)}
							</div>
						)}

						<div>
							<Label>Ghi chú</Label>
							<Input
								value={form.note}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										note: e.target.value
									}))
								}
								placeholder='Tuỳ chọn'
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
							disabled={
								createMut.isPending || updateMut.isPending
							}
							onClick={() => {
								if (editId != null) updateMut.mutate()
								else createMut.mutate()
							}}
						>
							{(createMut.isPending || updateMut.isPending) && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							{editId != null ? 'Lưu' : 'Thêm vào khoa'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
