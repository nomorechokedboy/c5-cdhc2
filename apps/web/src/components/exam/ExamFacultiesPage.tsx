import {
	CreateExamSubject,
	CreateExamFaculty,
	DeleteExamFaculty,
	DeleteExamFacultyHead,
	DeleteExamSubject,
	type ExamSubject,
	ListExamFaculties,
	ListExamFacultyHeads,
	ListExamFacultyOptions,
	ListExamSubjects,
	ListExamTeacherCatalog,
	UpdateExamFaculty,
	UpdateExamSubject,
	UpsertExamFacultyHead
} from '@/api/exam'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
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
import { canManageExamCatalog } from '@/lib/exam-roles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
	BookOpen,
	Loader2,
	Pencil,
	Plus,
	ShieldCheck,
	Trash2,
	Users
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

export default function ExamFacultiesPage() {
	const qc = useQueryClient()
	const canManage = canManageExamCatalog('exam-faculties')
	const [editingCode, setEditingCode] = useState<string | null>(null)
	const [facultyEditorOpen, setFacultyEditorOpen] = useState(false)
	const [facultyEditorMode, setFacultyEditorMode] = useState<
		'create' | 'edit'
	>('edit')
	const [managingCode, setManagingCode] = useState<string | null>(null)
	const [subjectEditorOpen, setSubjectEditorOpen] = useState(false)
	const [editingSubjectId, setEditingSubjectId] = useState<number | null>(
		null
	)
	const [form, setForm] = useState({ code: '', name: '', headUserId: 'none' })
	const [subjectForm, setSubjectForm] = useState({
		baseCode: '',
		name: '',
		creditHours: '0',
		lessonHours: '0'
	})

	const optionsQ = useQuery({
		queryKey: ['exam-faculty-options'],
		queryFn: ListExamFacultyOptions
	})
	const facultiesQ = useQuery({
		queryKey: ['exam-faculties'],
		queryFn: () => ListExamFaculties()
	})
	const subjectsQ = useQuery({
		queryKey: ['exam-subjects'],
		queryFn: () => ListExamSubjects()
	})
	const teachersQ = useQuery({
		queryKey: ['exam-teacher-catalog'],
		queryFn: () => ListExamTeacherCatalog()
	})
	const headsQ = useQuery({
		queryKey: ['exam-faculty-heads'],
		queryFn: ListExamFacultyHeads
	})

	const rows = useMemo(() => {
		return (optionsQ.data || []).map((faculty) => {
			const uniqueSubjects = new Map<
				string,
				NonNullable<typeof subjectsQ.data>[number]
			>()
			for (const subject of (subjectsQ.data || []).filter(
				(s) => s.facultyCode === faculty.code
			)) {
				const key = (subject.baseCode || subject.name)
					.trim()
					.toUpperCase()
				if (!uniqueSubjects.has(key)) uniqueSubjects.set(key, subject)
			}
			return {
				...faculty,
				subjects: [...uniqueSubjects.values()].sort((a, b) =>
					a.name.localeCompare(b.name, 'vi')
				),
				teachers: (teachersQ.data || []).filter(
					(t) => t.facultyCode === faculty.code
				),
				head:
					(headsQ.data || []).find(
						(h) => h.facultyCode === faculty.code
					) || null
			}
		})
	}, [optionsQ.data, subjectsQ.data, teachersQ.data, headsQ.data])

	const save = useMutation({
		mutationFn: async () => {
			if (!editingCode) throw new Error('Thiếu khoa cần sửa')
			const records = (facultiesQ.data || []).filter(
				(faculty) =>
					faculty.code.toUpperCase() === editingCode.toUpperCase()
			)
			const facultyUpdates = Promise.all(
				records.map((faculty) =>
					UpdateExamFaculty(faculty.id, {
						code: form.code,
						name: form.name
					})
				)
			)
			const oldHead = (headsQ.data || []).find(
				(h) => h.facultyCode === editingCode
			)
			const newHeadId =
				form.headUserId === 'none' ? null : Number(form.headUserId)
			const headUpdate = newHeadId
				? oldHead?.userId === newHeadId
					? Promise.resolve(null)
					: UpsertExamFacultyHead({
							userId: newHeadId,
							facultyCode: form.code
						})
				: oldHead
					? DeleteExamFacultyHead(editingCode)
					: Promise.resolve(null)
			return Promise.all([facultyUpdates, headUpdate]).then(
				([updated]) => updated
			)
		},
		onSuccess: (records) => {
			toast.success(`Đã cập nhật khoa trên ${records.length} ngành`)
			setEditingCode(null)
			void qc.invalidateQueries({ queryKey: ['exam-faculties'] })
			void qc.invalidateQueries({ queryKey: ['exam-faculty-options'] })
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
			void qc.invalidateQueries({ queryKey: ['exam-faculty-heads'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})
	const createFaculty = useMutation({
		mutationFn: () =>
			CreateExamFaculty({
				code: form.code.trim(),
				name: form.name.trim(),
				// Keep the request compatible with API revisions where the nullable
				// field was required during decoding. Standalone faculties are not
				// attached to a specific major.
				majorId: null
			}),
		onSuccess: () => {
			toast.success('Đã thêm khoa')
			setFacultyEditorOpen(false)
			void qc.invalidateQueries({ queryKey: ['exam-faculties'] })
			void qc.invalidateQueries({ queryKey: ['exam-faculty-options'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})
	const deleteFaculty = useMutation({
		mutationFn: async (code: string) => {
			const records = (facultiesQ.data || []).filter(
				(f) => f.code === code
			)
			for (const record of records) await DeleteExamFaculty(record.id)
		},
		onSuccess: () => {
			toast.success('Đã xóa khoa')
			void qc.invalidateQueries({ queryKey: ['exam-faculties'] })
			void qc.invalidateQueries({ queryKey: ['exam-faculty-options'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})

	const managedFaculty = rows.find((faculty) => faculty.code === managingCode)
	const managedRecords = (facultiesQ.data || []).filter(
		(faculty) => faculty.code === managingCode
	)
	const managedSubjects = (subjectsQ.data || [])
		.filter((subject) => subject.facultyCode === managingCode)
		.sort((a, b) => a.name.localeCompare(b.name, 'vi'))

	const openCreateSubject = () => {
		setEditingSubjectId(null)
		setSubjectForm({
			baseCode: '',
			name: '',
			creditHours: '0',
			lessonHours: '0'
		})
		setSubjectEditorOpen(true)
	}

	const openEditSubject = (subject: ExamSubject) => {
		setEditingSubjectId(subject.id)
		setSubjectForm({
			baseCode: subject.baseCode || subject.code.split('_').pop() || '',
			name: subject.name,
			creditHours: String(subject.creditHours || 0),
			lessonHours: String(subject.lessonHours || 0)
		})
		setSubjectEditorOpen(true)
	}

	const saveSubject = useMutation({
		mutationFn: () => {
			const editing = (subjectsQ.data || []).find(
				(subject) => subject.id === editingSubjectId
			)
			const facultyId = editing?.facultyId || managedRecords[0]?.id
			if (!facultyId) throw new Error('Không tìm thấy khoa phụ trách')
			const body = {
				facultyId,
				baseCode: subjectForm.baseCode,
				name: subjectForm.name,
				creditHours: Number(subjectForm.creditHours) || 0,
				lessonHours: Number(subjectForm.lessonHours) || 0
			}
			return editingSubjectId == null
				? CreateExamSubject(body)
				: UpdateExamSubject(editingSubjectId, body)
		},
		onSuccess: () => {
			toast.success(
				editingSubjectId == null
					? 'Đã thêm môn học'
					: 'Đã cập nhật môn học'
			)
			setSubjectEditorOpen(false)
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})

	const removeSubject = useMutation({
		mutationFn: (id: number) => DeleteExamSubject(id),
		onSuccess: () => {
			toast.success('Đã xóa môn học')
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})

	const loading =
		optionsQ.isLoading ||
		subjectsQ.isLoading ||
		teachersQ.isLoading ||
		headsQ.isLoading
	const error =
		optionsQ.error || subjectsQ.error || teachersQ.error || headsQ.error

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Danh mục khoa
					</h1>
					<p className='text-muted-foreground text-sm'>
						Khoa quản lý môn học, giáo viên thuộc khoa và Chủ nhiệm
						khoa duyệt đề.
					</p>
				</div>
				{canManage && (
					<Button
						onClick={() => {
							setFacultyEditorMode('create')
							setForm({ code: '', name: '', headUserId: 'none' })
							setFacultyEditorOpen(true)
						}}
					>
						<Plus className='mr-2 h-4 w-4' /> Thêm khoa
					</Button>
				)}
			</div>
			{error && (
				<div className='rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
					{error.message}
				</div>
			)}
			{loading ? (
				<div className='flex justify-center py-12'>
					<Loader2 className='h-8 w-8 animate-spin' />
				</div>
			) : (
				<div className='grid gap-4 lg:grid-cols-2'>
					{rows.map((faculty) => (
						<Card key={faculty.code}>
							<CardHeader className='pb-3'>
								<div className='flex items-start justify-between gap-2'>
									<div>
										<CardTitle className='flex items-center gap-2'>
											<Badge variant='outline'>
												{faculty.code}
											</Badge>
											{faculty.name}
										</CardTitle>
										<CardDescription className='mt-1'>
											{faculty.subjects.length} môn ·{' '}
											{faculty.teachers.length} giáo viên
										</CardDescription>
									</div>
									{canManage && (
										<div className='flex gap-1'>
											<Button
												size='icon'
												variant='ghost'
												title='Sửa khoa'
												onClick={() => {
													setEditingCode(faculty.code)
													setForm({
														code: faculty.code,
														name: faculty.name,
														headUserId: faculty.head
															? String(
																	faculty.head
																		.userId
																)
															: 'none'
													})
												}}
											>
												<Pencil className='h-4 w-4' />
											</Button>
											<Button
												size='icon'
												variant='ghost'
												title='Xóa khoa'
												onClick={() =>
													window.confirm(
														`Xóa khoa ${faculty.code}?`
													) &&
													deleteFaculty.mutate(
														faculty.code
													)
												}
											>
												<Trash2 className='h-4 w-4 text-destructive' />
											</Button>
										</div>
									)}
								</div>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='rounded-md border p-3'>
									<div className='flex items-center justify-between gap-3'>
										<div>
											<div className='mb-2 flex items-center gap-2 text-sm font-medium'>
												<ShieldCheck className='h-4 w-4' />{' '}
												Chủ nhiệm khoa
											</div>
											<p className='text-muted-foreground text-sm'>
												{faculty.head?.displayName ||
													faculty.head?.username ||
													'Chưa phân công'}
											</p>
										</div>
										{canManage && (
											<Button
												size='sm'
												variant='outline'
												onClick={() => {
													setEditingCode(faculty.code)
													setForm({
														code: faculty.code,
														name: faculty.name,
														headUserId: faculty.head
															? String(
																	faculty.head
																		.userId
																)
															: 'none'
													})
												}}
											>
												<Pencil className='mr-2 h-3.5 w-3.5' />
												{faculty.head
													? 'Thay đổi'
													: 'Phân công'}
											</Button>
										)}
									</div>
								</div>
								<div>
									<div className='mb-2 flex items-center gap-2 text-sm font-medium'>
										<BookOpen className='h-4 w-4' /> Môn học
									</div>
									<div className='max-h-40 space-y-1 overflow-auto'>
										{faculty.subjects.length ? (
											faculty.subjects.map((subject) => (
												<div
													key={subject.id}
													className='rounded border px-2 py-1.5 text-xs'
												>
													<span className='font-mono'>
														{subject.code}
													</span>{' '}
													— {subject.name}
												</div>
											))
										) : (
											<p className='text-muted-foreground text-sm'>
												Chưa có môn.
											</p>
										)}
									</div>
								</div>
								<div>
									<div className='mb-2 flex items-center gap-2 text-sm font-medium'>
										<Users className='h-4 w-4' /> Giáo viên
									</div>
									<div className='flex flex-wrap gap-1'>
										{faculty.teachers.length ? (
											faculty.teachers.map((teacher) => (
												<Badge
													key={teacher.id}
													variant='secondary'
												>
													{teacher.displayName ||
														teacher.username}
												</Badge>
											))
										) : (
											<p className='text-muted-foreground text-sm'>
												Chưa có giáo viên.
											</p>
										)}
									</div>
								</div>
								<div className='flex gap-2'>
									<Button asChild size='sm' variant='outline'>
										<Link to='/de-thi/giao-vien'>
											Quản lý giáo viên
										</Link>
									</Button>
									<Button
										size='sm'
										variant='outline'
										onClick={() =>
											setManagingCode(faculty.code)
										}
									>
										Quản lý môn học
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<Dialog
				open={managingCode != null}
				onOpenChange={(open) => !open && setManagingCode(null)}
			>
				<DialogContent className='max-h-[90vh] max-w-6xl overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>
							Quản lý môn học — {managedFaculty?.code}{' '}
							{managedFaculty?.name}
						</DialogTitle>
					</DialogHeader>
					<div className='flex items-center justify-between gap-3'>
						<p className='text-muted-foreground text-sm'>
							{managedSubjects.length} môn học thuộc khoa
						</p>
						{canManage && (
							<Button size='sm' onClick={openCreateSubject}>
								<Plus className='mr-2 h-4 w-4' /> Thêm môn học
							</Button>
						)}
					</div>
					<div className='overflow-x-auto rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mã môn</TableHead>
									<TableHead>Tên môn</TableHead>
									<TableHead>Ngành đào tạo</TableHead>
									<TableHead className='text-center'>
										Tín chỉ
									</TableHead>
									<TableHead className='text-center'>
										Số tiết
									</TableHead>
									{canManage && (
										<TableHead className='text-right'>
											Thao tác
										</TableHead>
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{managedSubjects.map((subject) => (
									<TableRow key={subject.id}>
										<TableCell>
											<div className='font-mono font-medium'>
												{subject.code}
											</div>
											{subject.baseCode && (
												<div className='text-muted-foreground font-mono text-xs'>
													Mã gốc: {subject.baseCode}
												</div>
											)}
										</TableCell>
										<TableCell className='font-medium'>
											{subject.name}
										</TableCell>
										<TableCell>
											<div>
												{subject.majorName || '—'}
											</div>
											<div className='text-muted-foreground text-xs'>
												{subject.majorCode || ''}
											</div>
										</TableCell>
										<TableCell className='text-center'>
											{subject.creditHours ?? 0}
										</TableCell>
										<TableCell className='text-center'>
											{subject.lessonHours ?? 0}
										</TableCell>
										{canManage && (
											<TableCell>
												<div className='flex justify-end gap-1'>
													<Button
														size='icon'
														variant='ghost'
														title='Sửa môn học'
														onClick={() =>
															openEditSubject(
																subject
															)
														}
													>
														<Pencil className='h-4 w-4' />
													</Button>
													<Button
														size='icon'
														variant='ghost'
														title='Xóa môn học'
														onClick={() => {
															if (
																window.confirm(
																	`Xóa môn ${subject.name}?`
																)
															)
																removeSubject.mutate(
																	subject.id
																)
														}}
													>
														<Trash2 className='h-4 w-4 text-destructive' />
													</Button>
												</div>
											</TableCell>
										)}
									</TableRow>
								))}
								{!managedSubjects.length && (
									<TableRow>
										<TableCell
											colSpan={canManage ? 6 : 5}
											className='text-muted-foreground h-24 text-center'
										>
											Khoa chưa có môn học.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</DialogContent>
			</Dialog>
			<Dialog
				open={facultyEditorOpen}
				onOpenChange={setFacultyEditorOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{facultyEditorMode === 'create'
								? 'Thêm khoa'
								: 'Sửa khoa'}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-3'>
						<div>
							<Label>Mã khoa *</Label>
							<Input
								value={form.code}
								onChange={(e) =>
									setForm((o) => ({
										...o,
										code: e.target.value.toUpperCase()
									}))
								}
								placeholder='K1'
							/>
						</div>
						<div>
							<Label>Tên khoa *</Label>
							<Input
								value={form.name}
								onChange={(e) =>
									setForm((o) => ({
										...o,
										name: e.target.value
									}))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setFacultyEditorOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={
								!form.code.trim() ||
								!form.name.trim() ||
								createFaculty.isPending ||
								save.isPending
							}
							onClick={() => {
								if (facultyEditorMode === 'create')
									createFaculty.mutate()
								else {
									setFacultyEditorOpen(false)
									save.mutate()
								}
							}}
						>
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={subjectEditorOpen}
				onOpenChange={setSubjectEditorOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingSubjectId == null
								? 'Thêm môn học'
								: 'Sửa môn học'}
						</DialogTitle>
					</DialogHeader>
					<div className='grid gap-4 py-2 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label>Mã môn *</Label>
							<Input
								value={subjectForm.baseCode}
								onChange={(event) =>
									setSubjectForm((old) => ({
										...old,
										baseCode:
											event.target.value.toUpperCase()
									}))
								}
								placeholder='M001K1'
							/>
						</div>
						<div className='space-y-2'>
							<Label>Tên môn *</Label>
							<Input
								value={subjectForm.name}
								onChange={(event) =>
									setSubjectForm((old) => ({
										...old,
										name: event.target.value
									}))
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Số tín chỉ</Label>
							<Input
								type='number'
								min='0'
								value={subjectForm.creditHours}
								onChange={(event) =>
									setSubjectForm((old) => ({
										...old,
										creditHours: event.target.value
									}))
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Số tiết</Label>
							<Input
								type='number'
								min='0'
								value={subjectForm.lessonHours}
								onChange={(event) =>
									setSubjectForm((old) => ({
										...old,
										lessonHours: event.target.value
									}))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setSubjectEditorOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveSubject.isPending ||
								!subjectForm.baseCode.trim() ||
								!subjectForm.name.trim()
							}
							onClick={() => saveSubject.mutate()}
						>
							{saveSubject.isPending
								? 'Đang lưu…'
								: 'Lưu môn học'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={editingCode != null}
				onOpenChange={(open) => !open && setEditingCode(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Sửa khoa và phân công Chủ nhiệm khoa
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-3'>
						<div>
							<Label>Mã khoa</Label>
							<Input
								value={form.code}
								onChange={(e) =>
									setForm((old) => ({
										...old,
										code: e.target.value.toUpperCase()
									}))
								}
							/>
						</div>
						<div>
							<Label>Tên khoa</Label>
							<Input
								value={form.name}
								onChange={(e) =>
									setForm((old) => ({
										...old,
										name: e.target.value
									}))
								}
							/>
						</div>
						<div>
							<Label>Chủ nhiệm khoa</Label>
							<Select
								value={form.headUserId}
								onValueChange={(v) =>
									setForm((old) => ({
										...old,
										headUserId: v
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn giáo viên' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='none'>
										Chưa phân công
									</SelectItem>
									{(teachersQ.data || [])
										.filter(
											(teacher) =>
												teacher.facultyCode ===
												editingCode
										)
										.map((teacher) => (
											<SelectItem
												key={teacher.userId}
												value={String(teacher.userId)}
											>
												{teacher.displayName ||
													teacher.username}{' '}
												·{' '}
												{teacher.facultyName ||
													teacher.facultyCode}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							<p className='mt-1 text-xs text-muted-foreground'>
								Có thể thay đổi khi phân công nhân sự theo năm.
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setEditingCode(null)}
						>
							Hủy
						</Button>
						<Button
							disabled={
								save.isPending ||
								!form.code.trim() ||
								!form.name.trim()
							}
							onClick={() => save.mutate()}
						>
							{save.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
