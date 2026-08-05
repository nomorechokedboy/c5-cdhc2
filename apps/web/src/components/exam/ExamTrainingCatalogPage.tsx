import {
	CreateExamMajor,
	CreateExamSubject,
	CreateExamSystem,
	DeleteExamMajor,
	DeleteExamSubject,
	DeleteExamSystem,
	type ExamMajor,
	type ExamSubject,
	type ExamSystem,
	ListExamFaculties,
	ListExamMajors,
	ListExamSubjects,
	ListExamSystems,
	UpdateExamMajor,
	UpdateExamSubject,
	UpdateExamSystem
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
import {
	BookOpen,
	ChevronRight,
	Loader2,
	Pencil,
	Plus,
	Search,
	Trash2
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

const QUALIFICATION_OPTIONS = ['Sơ cấp', 'Trung cấp', 'Cao đẳng']
const TRAINING_FORM_OPTIONS = ['Chính quy', 'Liên thông', 'Chuyển loại']

export default function ExamTrainingCatalogPage() {
	const qc = useQueryClient()
	const canManage = canManageExamCatalog()
	const [systemOpen, setSystemOpen] = useState(false)
	const [editingSystemId, setEditingSystemId] = useState<number | null>(null)
	const [majorOpen, setMajorOpen] = useState(false)
	const [editingId, setEditingId] = useState<number | null>(null)
	const [subjectOpen, setSubjectOpen] = useState(false)
	const [editingSubjectId, setEditingSubjectId] = useState<number | null>(
		null
	)
	const [subjectMajorId, setSubjectMajorId] = useState<number | null>(null)
	const [majorSearch, setMajorSearch] = useState('')
	const [systemForm, setSystemForm] = useState({
		code: 'QS',
		name: 'Hệ quân sự',
		letter: 'A'
	})
	const [form, setForm] = useState({
		systemId: 0,
		catalogNumber: '',
		nationalMajorCode: '',
		name: '',
		qualification: '',
		trainingDuration: '',
		trainingForm: ''
	})
	const [subjectForm, setSubjectForm] = useState({
		sourceSubjectId: 0,
		baseCode: '',
		name: '',
		facultyId: 0,
		creditHours: '0',
		lessonHours: '0'
	})
	const systemsQ = useQuery({
		queryKey: ['exam-systems'],
		queryFn: () => ListExamSystems()
	})
	const majorsQ = useQuery({
		queryKey: ['exam-majors'],
		queryFn: () => ListExamMajors()
	})
	const subjectsQ = useQuery({
		queryKey: ['exam-subjects'],
		queryFn: () => ListExamSubjects()
	})
	const facultiesQ = useQuery({
		queryKey: ['exam-faculties'],
		queryFn: () => ListExamFaculties()
	})
	const systems = systemsQ.data || []
	const majors = majorsQ.data || []
	const subjects = subjectsQ.data || []
	const faculties = facultiesQ.data || []
	const loading =
		systemsQ.isLoading ||
		majorsQ.isLoading ||
		subjectsQ.isLoading ||
		facultiesQ.isLoading
	const error =
		systemsQ.error || majorsQ.error || subjectsQ.error || facultiesQ.error
	const visibleMajors = useMemo(() => {
		const keyword = majorSearch.trim().toLocaleLowerCase('vi')
		if (!keyword) return majors
		return majors.filter((major) =>
			[
				major.catalogNumber,
				major.nationalMajorCode,
				major.code,
				major.name,
				major.qualification,
				major.trainingForm
			].some((value) =>
				(value || '').toLocaleLowerCase('vi').includes(keyword)
			)
		)
	}, [majors, majorSearch])
	const facultyDirectory = useMemo(() => {
		const byCode = new Map<string, (typeof faculties)[number]>()
		for (const faculty of faculties) {
			const code = faculty.code.trim().toUpperCase()
			if (!byCode.has(code)) byCode.set(code, faculty)
		}
		return [...byCode.values()].sort((a, b) =>
			a.name.localeCompare(b.name, 'vi')
		)
	}, [faculties])
	const selectedFacultyCode = faculties.find(
		(faculty) => faculty.id === subjectForm.facultyId
	)?.code
	const subjectOptions = useMemo(() => {
		if (!selectedFacultyCode) return []
		const bySubject = new Map<string, ExamSubject>()
		for (const subject of subjects) {
			if (
				subject.facultyCode?.toUpperCase() !==
				selectedFacultyCode.toUpperCase()
			)
				continue
			const key = `${subject.baseCode || subject.code}|${subject.name}`
			if (!bySubject.has(key)) bySubject.set(key, subject)
		}
		return [...bySubject.values()].sort((a, b) =>
			a.name.localeCompare(b.name, 'vi')
		)
	}, [selectedFacultyCode, subjects])

	const majorsBySystem = useMemo(
		() =>
			new Map(
				systems.map((system) => [
					system.id,
					majors.filter((major) => major.systemId === system.id)
				])
			),
		[systems, majors]
	)

	const openCreate = () => {
		setEditingId(null)
		setForm({
			systemId: systems[0]?.id || 0,
			catalogNumber: '',
			nationalMajorCode: '',
			name: '',
			qualification: '',
			trainingDuration: '',
			trainingForm: 'Chính quy'
		})
		setMajorOpen(true)
	}

	const openCreateSystem = () => {
		setEditingSystemId(null)
		setSystemForm({ code: '', name: '', letter: '' })
		setSystemOpen(true)
	}

	const openEditSystem = (system: ExamSystem) => {
		setEditingSystemId(system.id)
		setSystemForm({
			code: system.code,
			name: system.name,
			letter: system.letter
		})
		setSystemOpen(true)
	}

	const saveSystem = useMutation({
		mutationFn: () => {
			const body = {
				code: systemForm.code.trim(),
				name: systemForm.name.trim(),
				letter: systemForm.letter.trim(),
				trainingTypeId: 1
			}
			return editingSystemId == null
				? CreateExamSystem(body)
				: UpdateExamSystem(editingSystemId, body)
		},
		onSuccess: (system) => {
			toast.success(
				editingSystemId == null
					? 'Đã thêm hệ đào tạo'
					: 'Đã cập nhật hệ đào tạo'
			)
			setSystemOpen(false)
			setEditingSystemId(null)
			setForm((old) => ({
				...old,
				systemId: old.systemId || system.id
			}))
			void qc.invalidateQueries({ queryKey: ['exam-systems'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})

	const removeSystem = useMutation({
		mutationFn: (id: number) => DeleteExamSystem(id),
		onSuccess: () => {
			toast.success('Đã xóa hệ đào tạo')
			void qc.invalidateQueries({ queryKey: ['exam-systems'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})

	const openEdit = (major: ExamMajor) => {
		setEditingId(major.id)
		setForm({
			systemId: major.systemId,
			catalogNumber: major.catalogNumber || '',
			nationalMajorCode: major.nationalMajorCode || '',
			name: major.name,
			qualification: major.qualification || '',
			trainingDuration: major.trainingDuration || '',
			trainingForm: major.trainingForm || ''
		})
		setMajorOpen(true)
	}

	const saveMajor = useMutation({
		mutationFn: () => {
			const body = {
				systemId: form.systemId,
				code: form.catalogNumber,
				catalogNumber: form.catalogNumber,
				nationalMajorCode: form.nationalMajorCode,
				name: form.name,
				qualification: form.qualification,
				trainingDuration: form.trainingDuration,
				trainingForm: form.trainingForm
			}
			return editingId == null
				? CreateExamMajor(body)
				: UpdateExamMajor(editingId, body)
		},
		onSuccess: () => {
			toast.success(
				editingId == null ? 'Đã thêm ngành' : 'Đã cập nhật ngành'
			)
			setMajorOpen(false)
			void qc.invalidateQueries({ queryKey: ['exam-majors'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})

	const removeMajor = useMutation({
		mutationFn: (id: number) => DeleteExamMajor(id),
		onSuccess: () => {
			toast.success('Đã xóa ngành')
			void qc.invalidateQueries({ queryKey: ['exam-majors'] })
		},
		onError: (error: Error) => toast.error(error.message)
	})

	const openCreateSubject = (major: ExamMajor) => {
		setEditingSubjectId(null)
		setSubjectMajorId(major.id)
		setSubjectForm({
			sourceSubjectId: 0,
			baseCode: '',
			name: '',
			facultyId: 0,
			creditHours: '0',
			lessonHours: '0'
		})
		setSubjectOpen(true)
	}

	const openEditSubject = (subject: ExamSubject) => {
		const directoryFaculty = facultyDirectory.find(
			(faculty) => faculty.code === subject.facultyCode
		)
		setEditingSubjectId(subject.id)
		setSubjectMajorId(subject.majorId)
		setSubjectForm({
			sourceSubjectId: subject.id,
			baseCode: subject.baseCode || subject.code.split('_').pop() || '',
			name: subject.name,
			facultyId: directoryFaculty?.id || subject.facultyId,
			creditHours: String(subject.creditHours || 0),
			lessonHours: String(subject.lessonHours || 0)
		})
		setSubjectOpen(true)
	}

	const saveSubject = useMutation({
		mutationFn: () => {
			const sourceSubject = subjects.find(
				(subject) => subject.id === subjectForm.sourceSubjectId
			)
			const editingSubject = subjects.find(
				(subject) => subject.id === editingSubjectId
			)
			const body = {
				name: sourceSubject?.name || subjectForm.name,
				facultyId: editingSubject?.facultyId || subjectForm.facultyId,
				baseCode:
					sourceSubject?.baseCode ||
					sourceSubject?.code.split('_').pop() ||
					subjectForm.baseCode,
				creditHours:
					sourceSubject?.creditHours ??
					(Number(subjectForm.creditHours) || 0),
				lessonHours:
					sourceSubject?.lessonHours ??
					(Number(subjectForm.lessonHours) || 0)
			}
			return editingSubjectId == null
				? CreateExamSubject({
						...body,
						majorId: subjectMajorId || undefined,
						sourceSubjectId: subjectForm.sourceSubjectId
					})
				: UpdateExamSubject(editingSubjectId, body)
		},
		onSuccess: () => {
			toast.success(
				editingSubjectId == null
					? 'Đã thêm môn học'
					: 'Đã cập nhật môn học'
			)
			setSubjectOpen(false)
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

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div>
				<h1 className='text-2xl font-semibold tracking-tight'>
					Danh mục đào tạo
				</h1>
				<p className='text-muted-foreground text-sm'>
					Cấu trúc: Hệ đào tạo → Ngành đào tạo → Môn học trong ngành.
				</p>
			</div>
			{error && (
				<div className='rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
					{error.message}
				</div>
			)}
			<Card>
				<CardHeader className='gap-3 pb-3'>
					<div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-start'>
						<div>
							<CardTitle>HỆ ĐÀO TẠO</CardTitle>
							<CardDescription>
								Quản lý các hệ và ký hiệu dùng để tạo mã ngành
								đào tạo.
							</CardDescription>
						</div>
						{canManage && (
							<Button
								className='shrink-0'
								variant='outline'
								onClick={openCreateSystem}
							>
								<Plus className='mr-2 h-4 w-4' /> Thêm hệ
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{systems.length ? (
						<div className='grid gap-3 md:grid-cols-2'>
							{systems.map((system) => (
								<div
									key={system.id}
									className='flex items-center gap-3 rounded-lg border p-3'
								>
									<div className='bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-mono font-bold'>
										{system.letter}
									</div>
									<div className='min-w-0 flex-1'>
										<div className='font-medium'>
											{system.name}
										</div>
										<div className='text-muted-foreground text-xs'>
											Mã {system.code} ·{' '}
											{
												(
													majorsBySystem.get(
														system.id
													) || []
												).length
											}{' '}
											ngành
										</div>
									</div>
									{canManage && (
										<div className='flex shrink-0 gap-0.5'>
											<Button
												type='button'
												size='icon'
												variant='ghost'
												title='Sửa hệ đào tạo'
												onClick={() =>
													openEditSystem(system)
												}
											>
												<Pencil className='h-4 w-4' />
											</Button>
											<Button
												type='button'
												size='icon'
												variant='ghost'
												title='Xóa hệ đào tạo'
												onClick={() => {
													if (
														window.confirm(
															`Xóa ${system.name}?`
														)
													)
														removeSystem.mutate(
															system.id
														)
												}}
											>
												<Trash2 className='h-4 w-4 text-destructive' />
											</Button>
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
							Chưa có hệ đào tạo. Bấm “Thêm hệ” để tạo hệ quân sự
							hoặc dân sự.
						</div>
					)}
				</CardContent>
			</Card>
			<Card>
				<CardHeader className='gap-4 pb-3'>
					<div className='flex flex-col justify-between gap-3 lg:flex-row lg:items-start'>
						<div>
							<CardTitle>DANH MỤC NGÀNH ĐÀO TẠO</CardTitle>
							<CardDescription>
								Danh mục mã số, trình độ, thời gian và hình thức
								đào tạo chính thức.
							</CardDescription>
						</div>
						{canManage && (
							<Button className='shrink-0' onClick={openCreate}>
								<Plus className='mr-2 h-4 w-4' /> Thêm ngành
							</Button>
						)}
					</div>
					<div className='relative max-w-md'>
						<Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
						<Input
							value={majorSearch}
							onChange={(event) =>
								setMajorSearch(event.target.value)
							}
							placeholder='Tìm theo mã số, mã ngành hoặc tên…'
							className='h-9 pl-9'
						/>
					</div>
				</CardHeader>
				<CardContent className='overflow-x-auto pt-0'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Mã số / Mã ngành</TableHead>
								<TableHead>Tên ngành</TableHead>
								<TableHead>Trình độ / Thời gian</TableHead>
								<TableHead>Hình thức đào tạo</TableHead>
								{canManage && (
									<TableHead className='w-20 text-right'>
										Thao tác
									</TableHead>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{systems.map((system) => {
								const rows = visibleMajors.filter(
									(major) => major.systemId === system.id
								)
								if (!rows.length) return null
								return [
									<TableRow key={`${system.id}-heading`}>
										<TableCell
											colSpan={canManage ? 5 : 4}
											className='bg-muted/50 h-9 py-2 text-center font-bold text-red-600'
										>
											{system.name.toUpperCase()} (
											{system.letter})
										</TableCell>
									</TableRow>,
									...rows.map((major) => (
										<TableRow
											key={major.id}
											className='text-sm'
										>
											<TableCell className='py-2.5 font-mono font-medium'>
												<div>
													{major.catalogNumber ||
														'Chưa có mã số'}
												</div>
												<div className='text-muted-foreground mt-0.5 text-xs'>
													{major.nationalMajorCode ||
														`Mã cũ: ${major.code}`}
												</div>
											</TableCell>
											<TableCell className='py-2.5 font-medium'>
												{major.name}
											</TableCell>
											<TableCell className='py-2.5'>
												<div>{major.qualification}</div>
												<div className='text-muted-foreground mt-0.5 text-xs'>
													{major.trainingDuration}
												</div>
											</TableCell>
											<TableCell className='py-2.5'>
												{major.trainingForm}
											</TableCell>
											{canManage && (
												<TableCell className='py-2.5'>
													<div className='flex justify-end gap-0.5'>
														<Button
															size='icon'
															variant='ghost'
															onClick={() =>
																openEdit(major)
															}
															title='Sửa ngành'
														>
															<Pencil className='h-4 w-4' />
														</Button>
														<Button
															size='icon'
															variant='ghost'
															title='Xóa ngành'
															onClick={() => {
																if (
																	window.confirm(
																		`Xóa ngành ${major.name}?`
																	)
																)
																	removeMajor.mutate(
																		major.id
																	)
															}}
														>
															<Trash2 className='h-4 w-4 text-destructive' />
														</Button>
													</div>
												</TableCell>
											)}
										</TableRow>
									))
								]
							})}
							{!visibleMajors.length && (
								<TableRow>
									<TableCell
										colSpan={canManage ? 5 : 4}
										className='text-muted-foreground h-24 text-center'
									>
										Không tìm thấy ngành phù hợp.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<BookOpen className='h-5 w-5' /> Các môn đào tạo trong
						ngành
					</CardTitle>
					<CardDescription>
						Danh sách môn học của {majors.length} ngành trong bảng
						trên · {subjects.length} môn
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className='flex justify-center py-12'>
							<Loader2 className='h-8 w-8 animate-spin' />
						</div>
					) : (
						<div className='space-y-3'>
							{systems.map((system) => (
								<details
									key={system.id}
									open
									className='group overflow-hidden rounded-lg border'
								>
									<summary className='bg-muted/50 flex cursor-pointer list-none items-center gap-2 px-3 py-2.5'>
										<ChevronRight className='h-4 w-4 transition-transform group-open:rotate-90' />
										<strong>{system.name}</strong>
										<Badge variant='outline'>
											{system.letter}
										</Badge>
										<Badge variant='secondary'>
											{
												(
													majorsBySystem.get(
														system.id
													) || []
												).length
											}{' '}
											ngành
										</Badge>
									</summary>
									<div className='space-y-2 border-t p-3'>
										{(
											majorsBySystem.get(system.id) || []
										).map((major) => {
											const majorSubjects =
												subjects.filter(
													(subject) =>
														subject.majorId ===
														major.id
												)
											return (
												<details
													key={major.id}
													className='group rounded-md border'
												>
													<summary className='flex cursor-pointer list-none items-center gap-2 px-3 py-2'>
														<ChevronRight className='h-4 w-4 transition-transform group-open:rotate-90' />
														<span className='font-mono text-xs font-semibold'>
															{
																major.catalogNumber
															}
														</span>
														<span className='font-medium'>
															{major.name}
														</span>
														<Badge variant='secondary'>
															{
																majorSubjects.length
															}{' '}
															môn
														</Badge>
														{canManage && (
															<Button
																type='button'
																size='sm'
																variant='outline'
																className='ml-auto h-7'
																onClick={(
																	event
																) => {
																	event.preventDefault()
																	openCreateSubject(
																		major
																	)
																}}
															>
																<Plus className='mr-1 h-3.5 w-3.5' />{' '}
																Thêm môn
															</Button>
														)}
													</summary>
													<div className='grid gap-1.5 border-t p-3 md:grid-cols-2'>
														{majorSubjects.length ? (
															majorSubjects.map(
																(subject) => (
																	<div
																		key={
																			subject.id
																		}
																		className='rounded-md border px-3 py-2 text-sm'
																	>
																		<div className='flex items-center gap-2 font-medium'>
																			<BookOpen className='h-3.5 w-3.5' />
																			{
																				subject.name
																			}
																			{canManage && (
																				<div className='ml-auto flex gap-0.5'>
																					<Button
																						type='button'
																						size='icon'
																						variant='ghost'
																						className='h-7 w-7'
																						title='Sửa môn học'
																						onClick={() =>
																							openEditSubject(
																								subject
																							)
																						}
																					>
																						<Pencil className='h-3.5 w-3.5' />
																					</Button>
																					<Button
																						type='button'
																						size='icon'
																						variant='ghost'
																						className='h-7 w-7'
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
																						<Trash2 className='h-3.5 w-3.5 text-destructive' />
																					</Button>
																				</div>
																			)}
																		</div>
																		<div className='text-muted-foreground mt-1 font-mono text-xs'>
																			{
																				subject.code
																			}
																		</div>
																	</div>
																)
															)
														) : (
															<p className='text-muted-foreground text-sm'>
																Chưa có môn
																trong ngành.
															</p>
														)}
													</div>
												</details>
											)
										})}
									</div>
								</details>
							))}
						</div>
					)}
				</CardContent>
			</Card>
			<Dialog
				open={systemOpen}
				onOpenChange={(open) => {
					setSystemOpen(open)
					if (!open) setEditingSystemId(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingSystemId == null
								? 'Thêm hệ đào tạo'
								: 'Sửa hệ đào tạo'}
						</DialogTitle>
					</DialogHeader>
					<p className='text-muted-foreground text-xs'>
						Nhập ký hiệu chưa được sử dụng; ký hiệu này sẽ đứng đầu
						mã ngành, ví dụ A.6720301.
					</p>
					<div className='space-y-4 py-2'>
						<div className='space-y-2'>
							<Label>Ký hiệu hệ *</Label>
							<Input
								value={systemForm.letter}
								onChange={(event) =>
									setSystemForm((old) => ({
										...old,
										letter: event.target.value.toUpperCase()
									}))
								}
								placeholder='Ví dụ: C'
							/>
						</div>
						<div className='space-y-2'>
							<Label>Mã hệ *</Label>
							<Input
								value={systemForm.code}
								onChange={(event) =>
									setSystemForm((old) => ({
										...old,
										code: event.target.value
									}))
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Tên hệ *</Label>
							<Input
								value={systemForm.name}
								onChange={(event) =>
									setSystemForm((old) => ({
										...old,
										name: event.target.value
									}))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setSystemOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveSystem.isPending ||
								!systemForm.code.trim() ||
								!systemForm.name.trim() ||
								!systemForm.letter.trim()
							}
							onClick={() => saveSystem.mutate()}
						>
							{saveSystem.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
				<DialogContent className='max-w-xl'>
					<DialogHeader>
						<DialogTitle>
							{editingSubjectId == null
								? 'Thêm môn học vào ngành'
								: 'Sửa môn học'}
						</DialogTitle>
					</DialogHeader>
					<div className='grid gap-4 py-2 md:grid-cols-2'>
						<div className='space-y-2 md:col-span-2'>
							<Label>Ngành đào tạo</Label>
							<Input
								value={
									majors.find(
										(major) => major.id === subjectMajorId
									)?.name || ''
								}
								disabled
							/>
						</div>
						<div className='space-y-2 md:col-span-2'>
							<Label>Khoa phụ trách *</Label>
							<Select
								value={String(subjectForm.facultyId || '')}
								disabled={editingSubjectId != null}
								onValueChange={(value) =>
									setSubjectForm((old) => ({
										...old,
										facultyId: Number(value),
										sourceSubjectId: 0,
										baseCode: '',
										name: '',
										creditHours: '0',
										lessonHours: '0'
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn khoa phụ trách' />
								</SelectTrigger>
								<SelectContent>
									{facultyDirectory.map((faculty) => (
										<SelectItem
											key={faculty.id}
											value={String(faculty.id)}
										>
											{faculty.code} — {faculty.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2 md:col-span-2'>
							<Label>Môn học của khoa *</Label>
							<Select
								value={String(
									subjectForm.sourceSubjectId || ''
								)}
								onValueChange={(value) => {
									const subject = subjects.find(
										(item) => item.id === Number(value)
									)
									if (!subject) return
									setSubjectForm((old) => ({
										...old,
										sourceSubjectId: subject.id,
										baseCode:
											subject.baseCode ||
											subject.code.split('_').pop() ||
											'',
										name: subject.name,
										creditHours: String(
											subject.creditHours || 0
										),
										lessonHours: String(
											subject.lessonHours || 0
										)
									}))
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn hoặc tìm môn trong khoa' />
								</SelectTrigger>
								<SelectContent>
									{subjectOptions.map((subject) => (
										<SelectItem
											key={subject.id}
											value={String(subject.id)}
										>
											{subject.baseCode || subject.code} —{' '}
											{subject.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{subjectForm.facultyId > 0 &&
								subjectOptions.length === 0 && (
									<p className='text-muted-foreground text-sm'>
										Khoa này chưa có môn học trong danh mục.
									</p>
								)}
						</div>
						<div className='space-y-2'>
							<Label>Số tín chỉ</Label>
							<Input
								type='number'
								min='0'
								value={subjectForm.creditHours}
								disabled
							/>
						</div>
						<div className='space-y-2'>
							<Label>Số tiết</Label>
							<Input
								type='number'
								min='0'
								value={subjectForm.lessonHours}
								disabled
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setSubjectOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveSubject.isPending ||
								!subjectForm.facultyId ||
								!subjectForm.sourceSubjectId
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
			<Dialog open={majorOpen} onOpenChange={setMajorOpen}>
				<DialogContent className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>
							{editingId == null
								? 'Thêm ngành đào tạo'
								: 'Sửa ngành đào tạo'}
						</DialogTitle>
					</DialogHeader>
					<div className='grid gap-4 py-2 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label>Hệ đào tạo *</Label>
							<Select
								value={String(form.systemId || '')}
								onValueChange={(value) =>
									setForm((old) => ({
										...old,
										systemId: Number(value)
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn hệ' />
								</SelectTrigger>
								<SelectContent>
									{systems.map((system) => (
										<SelectItem
											key={system.id}
											value={String(system.id)}
										>
											{system.name} ({system.letter})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label>Mã số * (không được trùng)</Label>
							<Input
								value={form.catalogNumber}
								onChange={(e) =>
									setForm((old) => ({
										...old,
										catalogNumber: e.target.value
									}))
								}
								placeholder='Ví dụ: A.6720301'
							/>
						</div>
						<div className='space-y-2'>
							<Label>Mã ngành *</Label>
							<Input
								value={form.nationalMajorCode}
								onChange={(e) =>
									setForm((old) => ({
										...old,
										nationalMajorCode: e.target.value
									}))
								}
								placeholder='6720301'
							/>
						</div>
						<div className='space-y-2'>
							<Label>Tên ngành *</Label>
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
						<div className='space-y-2'>
							<Label>Trình độ đào tạo *</Label>
							<Select
								value={form.qualification}
								onValueChange={(value) =>
									setForm((old) => ({
										...old,
										qualification: value
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn trình độ' />
								</SelectTrigger>
								<SelectContent>
									{QUALIFICATION_OPTIONS.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label>Thời gian đào tạo *</Label>
							<Input
								value={form.trainingDuration}
								onChange={(event) =>
									setForm((old) => ({
										...old,
										trainingDuration: event.target.value
									}))
								}
								placeholder='Ví dụ: 2 năm 6 tháng'
							/>
						</div>
						<div className='space-y-2'>
							<Label>Hình thức đào tạo *</Label>
							<Select
								value={form.trainingForm}
								onValueChange={(value) =>
									setForm((old) => ({
										...old,
										trainingForm: value
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn hình thức' />
								</SelectTrigger>
								<SelectContent>
									{TRAINING_FORM_OPTIONS.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setMajorOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveMajor.isPending ||
								!form.systemId ||
								!form.catalogNumber.trim() ||
								!form.nationalMajorCode.trim() ||
								!form.name.trim() ||
								!form.qualification.trim() ||
								!form.trainingDuration.trim() ||
								!form.trainingForm.trim()
							}
							onClick={() => saveMajor.mutate()}
						>
							{saveMajor.isPending ? 'Đang lưu…' : 'Lưu'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
