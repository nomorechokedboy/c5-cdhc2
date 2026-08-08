/**
 * Danh mục đào tạo (khớp sheet Tổng hợp mã môn):
 *   Hệ → Ngành đào tạo
 *   Khoa → Môn học do khoa đảm nhận (danh mục dùng chung theo mã khoa)
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Building2,
	ChevronDown,
	ChevronRight,
	GraduationCap,
	Loader2,
	Pencil,
	Plus,
	Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateExamFaculty,
	CreateExamMajor,
	CreateExamSubject,
	CreateExamSystem,
	DeleteExamFaculty,
	DeleteExamMajor,
	DeleteExamSubject,
	DeleteExamSystem,
	ListExamFaculties,
	ListExamMajors,
	ListExamSubjects,
	ListExamSystems,
	UpdateExamFaculty,
	UpdateExamMajor,
	UpdateExamSubject,
	UpdateExamSystem,
	type ExamFaculty,
	type ExamMajor,
	type ExamSubject,
	type ExamSystem
} from '@/api/exam'
import { canManageExamCatalog } from '@/lib/exam-roles'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ExamCatalogPage() {
	const qc = useQueryClient()
	const canManage = canManageExamCatalog()

	const [openSystems, setOpenSystems] = useState<Set<number>>(() => new Set())
	const [openMajors, setOpenMajors] = useState<Set<number>>(() => new Set())
	const [openFaculties, setOpenFaculties] = useState<Set<number>>(
		() => new Set()
	)

	const [systemOpen, setSystemOpen] = useState(false)
	const [majorOpen, setMajorOpen] = useState(false)
	const [facultyOpen, setFacultyOpen] = useState(false)
	const [subjectOpen, setSubjectOpen] = useState(false)
	const [editSystemId, setEditSystemId] = useState<number | null>(null)
	const [editMajorId, setEditMajorId] = useState<number | null>(null)
	const [editFacultyId, setEditFacultyId] = useState<number | null>(null)
	const [editSubjectId, setEditSubjectId] = useState<number | null>(null)

	const [systemForm, setSystemForm] = useState({
		code: 'QS',
		name: 'Hệ quân sự',
		letter: 'A'
	})
	const [majorForm, setMajorForm] = useState({
		name: '',
		levelCode: 'CD',
		shortCode: '',
		nationalMajorCode: '',
		catalogNumber: '',
		systemId: 0,
		systemLabel: '',
		letter: ''
	})
	const [facultyForm, setFacultyForm] = useState({
		code: '',
		shortCode: '',
		name: ''
	})
	const [subjectForm, setSubjectForm] = useState({
		baseCode: '',
		name: '',
		facultyId: 0,
		facultyLabel: '',
		majorCode: '',
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
	const facultiesQ = useQuery({
		queryKey: ['exam-faculties'],
		queryFn: () => ListExamFaculties()
	})
	const subjectsQ = useQuery({
		queryKey: ['exam-subjects'],
		queryFn: () => ListExamSubjects()
	})

	const systems = systemsQ.data || []
	const majors = majorsQ.data || []
	const faculties = facultiesQ.data || []
	const subjects = subjectsQ.data || []

	/** Mở sẵn tất cả hệ khi load — luôn thấy ngành trong từng hệ */
	useEffect(() => {
		if (!systems.length) return
		setOpenSystems(new Set(systems.map((s) => s.id)))
	}, [systems])

	const majorsBySystem = useMemo(() => {
		const m = new Map<number, ExamMajor[]>()
		for (const x of majors) {
			const list = m.get(x.systemId) || []
			list.push(x)
			m.set(x.systemId, list)
		}
		return m
	}, [majors])

	const facultiesByMajor = useMemo(() => {
		const m = new Map<number, ExamFaculty[]>()
		for (const major of majors) m.set(major.id, faculties)
		return m
	}, [faculties, majors])

	const subjectsByFaculty = useMemo(() => {
		const m = new Map<number, ExamSubject[]>()
		for (const s of subjects) {
			const list = m.get(s.facultyId) || []
			list.push(s)
			m.set(s.facultyId, list)
		}
		return m
	}, [subjects])

	const subjectCountByMajor = useMemo(() => {
		const m = new Map<number, number>()
		for (const s of subjects) {
			m.set(s.majorId, (m.get(s.majorId) || 0) + 1)
		}
		return m
	}, [subjects])

	/**
	 * Dữ liệu cũ lưu một bản ghi khoa cho từng ngành. Danh mục khoa dùng chung
	 * gom các bản ghi đó theo mã để người dùng chỉ thấy một khoa và toàn bộ môn
	 * mà khoa đảm nhận ở các ngành.
	 */
	const facultyDirectory = useMemo(() => {
		const grouped = new Map<
			string,
			{
				code: string
				name: string
				majorNames: Set<string>
				subjects: ExamSubject[]
			}
		>()
		for (const faculty of faculties) {
			const code = faculty.code.trim().toUpperCase()
			const current = grouped.get(code) || {
				code,
				name: faculty.name,
				majorNames: new Set<string>(),
				subjects: []
			}
			if (faculty.majorName) current.majorNames.add(faculty.majorName)
			current.subjects.push(...(subjectsByFaculty.get(faculty.id) || []))
			grouped.set(code, current)
		}
		return [...grouped.values()]
			.map((faculty) => ({
				...faculty,
				majorNames: [...faculty.majorNames].sort((a, b) =>
					a.localeCompare(b, 'vi')
				),
				subjects: faculty.subjects.sort((a, b) =>
					a.name.localeCompare(b.name, 'vi')
				)
			}))
			.sort((a, b) => a.code.localeCompare(b.code, 'vi'))
	}, [faculties, subjectsByFaculty])

	function toggle(
		setter: (fn: (prev: Set<number>) => Set<number>) => void,
		id: number
	) {
		setter((prev) => {
			const n = new Set(prev)
			if (n.has(id)) n.delete(id)
			else n.add(id)
			return n
		})
	}

	function expandAll() {
		setOpenSystems(new Set(systems.map((s) => s.id)))
		setOpenMajors(new Set(majors.map((m) => m.id)))
		setOpenFaculties(new Set(faculties.map((f) => f.id)))
	}

	function collapseAll() {
		setOpenSystems(new Set())
		setOpenMajors(new Set())
		setOpenFaculties(new Set())
	}

	const previewCatalogNumber = useMemo(() => {
		if (majorForm.catalogNumber.trim())
			return majorForm.catalogNumber.trim().toUpperCase()
		const letter = majorForm.letter || 'X'
		const level = majorForm.levelCode || ''
		const short =
			majorForm.shortCode.trim().toUpperCase() ||
			majorForm.name
				.replace(/\(.*?\)/g, '')
				.trim()
				.split(/[\s\-_/]+/)
				.filter(Boolean)
				.map((w) => w[0]?.toUpperCase() || '')
				.join('')
		if (!level && !short) return '—'
		return `${letter}_${level}${short}`
	}, [majorForm])

	const previewSubjectCode = useMemo(() => {
		const base = subjectForm.baseCode.trim().toUpperCase()
		if (!base) return '—'
		const maj = subjectForm.majorCode || '…'
		if (base.includes('_')) return base
		return `${maj}_${base}`
	}, [subjectForm])

	const saveSystem = useMutation({
		mutationFn: () => {
			const body = {
				code: systemForm.code.trim(),
				name: systemForm.name.trim(),
				letter: systemForm.letter.trim(),
				// DB hiện tại bắt buộc training_type_id; danh mục này dùng
				// loại đào tạo mặc định 1 cho hai hệ QS/DS.
				trainingTypeId: 1
			}
			return editSystemId == null
				? CreateExamSystem(body)
				: UpdateExamSystem(editSystemId, body)
		},
		onSuccess: (s) => {
			toast.success(
				editSystemId == null ? 'Đã thêm hệ' : 'Đã cập nhật hệ'
			)
			setSystemOpen(false)
			setEditSystemId(null)
			void qc.invalidateQueries({ queryKey: ['exam-systems'] })
			setOpenSystems((p) => new Set(p).add(s.id))
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const saveMajor = useMutation({
		mutationFn: () => {
			if (editMajorId != null) {
				return UpdateExamMajor(editMajorId, {
					name: majorForm.name,
					systemId: majorForm.systemId,
					levelCode: majorForm.levelCode || null,
					shortCode: majorForm.shortCode || null,
					nationalMajorCode: majorForm.nationalMajorCode || null,
					catalogNumber: majorForm.catalogNumber || undefined
				})
			}
			return CreateExamMajor({
				name: majorForm.name,
				systemId: majorForm.systemId,
				levelCode: majorForm.levelCode || null,
				shortCode: majorForm.shortCode || null,
				nationalMajorCode: majorForm.nationalMajorCode || null,
				catalogNumber: majorForm.catalogNumber || null
			})
		},
		onSuccess: (m) => {
			toast.success(
				editMajorId != null
					? `Đã cập nhật ngành ${m.code}`
					: `Đã thêm ngành ${m.code}`
			)
			setMajorOpen(false)
			setEditMajorId(null)
			void qc.invalidateQueries({ queryKey: ['exam-majors'] })
			setOpenSystems((p) => new Set(p).add(m.systemId))
			setOpenMajors((p) => new Set(p).add(m.id))
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const saveFaculty = useMutation({
		mutationFn: async () => {
			if (editFacultyId === -1) {
				const sameFaculty = faculties.filter(
					(f) => f.code === facultyForm.code
				)
				return Promise.all(
					sameFaculty.map((faculty) =>
						UpdateExamFaculty(faculty.id, {
							code: facultyForm.code,
							shortCode: facultyForm.shortCode,
							name: facultyForm.name
						})
					)
				)
			}
			if (editFacultyId != null) {
				return [
					await UpdateExamFaculty(editFacultyId, {
						code: facultyForm.code,
						shortCode: facultyForm.shortCode,
						name: facultyForm.name
					})
				]
			}
			return [
				await CreateExamFaculty({
					code: facultyForm.code,
					shortCode: facultyForm.shortCode,
					name: facultyForm.name
				})
			]
		},
		onSuccess: (rows) => {
			const f = rows[0]
			toast.success(
				editFacultyId === -1
					? `Đã cập nhật khoa trên ${rows.length} ngành`
					: editFacultyId != null
						? 'Đã cập nhật khoa'
						: 'Đã thêm khoa'
			)
			setFacultyOpen(false)
			setEditFacultyId(null)
			void qc.invalidateQueries({ queryKey: ['exam-faculties'] })
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
			if (f) {
				setOpenFaculties((p) => new Set(p).add(f.id))
			}
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const saveSubject = useMutation({
		mutationFn: () => {
			const body = {
				name: subjectForm.name,
				facultyId: subjectForm.facultyId,
				baseCode: subjectForm.baseCode,
				creditHours: Number(subjectForm.creditHours) || 0,
				lessonHours: Number(subjectForm.lessonHours) || 0
			}
			if (editSubjectId != null) {
				return UpdateExamSubject(editSubjectId, body)
			}
			return CreateExamSubject(body)
		},
		onSuccess: (s) => {
			toast.success(
				editSubjectId != null
					? `Đã cập nhật môn ${s.code}`
					: `Đã thêm môn ${s.code}`
			)
			setSubjectOpen(false)
			setEditSubjectId(null)
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delSystem = useMutation({
		mutationFn: (id: number) => DeleteExamSystem(id),
		onSuccess: () => {
			toast.success('Đã xóa hệ')
			void qc.invalidateQueries({ queryKey: ['exam-systems'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})
	const delMajor = useMutation({
		mutationFn: (id: number) => DeleteExamMajor(id),
		onSuccess: () => {
			toast.success('Đã xóa ngành')
			void qc.invalidateQueries({ queryKey: ['exam-majors'] })
			void qc.invalidateQueries({ queryKey: ['exam-faculties'] })
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})
	const delFaculty = useMutation({
		mutationFn: (id: number) => DeleteExamFaculty(id),
		onSuccess: () => {
			toast.success('Đã xóa khoa')
			void qc.invalidateQueries({ queryKey: ['exam-faculties'] })
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})
	const delSubject = useMutation({
		mutationFn: (id: number) => DeleteExamSubject(id),
		onSuccess: () => {
			toast.success('Đã xóa môn')
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	function openAddMajor(s: ExamSystem) {
		setEditMajorId(null)
		setMajorForm({
			name: '',
			levelCode: 'CD',
			shortCode: '',
			nationalMajorCode: '',
			catalogNumber: '',
			systemId: s.id,
			systemLabel: `${s.letter} — ${s.name}`,
			letter: s.letter
		})
		setMajorOpen(true)
	}

	function openEditMajor(maj: ExamMajor, s?: ExamSystem) {
		const sys = s || systems.find((x) => x.id === maj.systemId) || null
		setEditMajorId(maj.id)
		setMajorForm({
			name: maj.name,
			levelCode: maj.levelCode || 'CD',
			shortCode: maj.shortCode || '',
			nationalMajorCode: maj.nationalMajorCode || '',
			catalogNumber: maj.catalogNumber || maj.code,
			systemId: maj.systemId,
			systemLabel: sys
				? `${sys.letter} — ${sys.name}`
				: maj.systemName || String(maj.systemId),
			letter: sys?.letter || maj.systemLetter || ''
		})
		setMajorOpen(true)
	}

	function openAddFaculty() {
		setEditFacultyId(null)
		setFacultyForm({
			code: '',
			shortCode: '',
			name: ''
		})
		setFacultyOpen(true)
	}

	function openEditFaculty(fac: ExamFaculty) {
		setEditFacultyId(fac.id)
		setFacultyForm({
			code: fac.code,
			shortCode: fac.shortCode || '',
			name: fac.name
		})
		setFacultyOpen(true)
	}

	function openEditFacultyDirectory(code: string, name: string) {
		setEditFacultyId(-1)
		setFacultyForm({
			code,
			shortCode: '',
			name
		})
		setFacultyOpen(true)
	}

	function openAddSubject(f: ExamFaculty, m?: ExamMajor) {
		const major = m || null
		setEditSubjectId(null)
		setSubjectForm({
			baseCode: '',
			name: '',
			facultyId: f.id,
			facultyLabel: `${f.code} — ${f.name}`,
			majorCode: major?.code || '',
			creditHours: '0',
			lessonHours: '0'
		})
		setSubjectOpen(true)
	}

	function openEditSubject(sub: ExamSubject, f?: ExamFaculty, m?: ExamMajor) {
		const fac = f || faculties.find((x) => x.id === sub.facultyId) || null
		const major = m || majors.find((x) => x.id === sub.majorId) || null
		setEditSubjectId(sub.id)
		setSubjectForm({
			baseCode: sub.baseCode || '',
			name: sub.name,
			facultyId: sub.facultyId,
			facultyLabel: fac
				? `${fac.code} — ${fac.name}`
				: sub.facultyCode || String(sub.facultyId),
			majorCode: major?.code || sub.majorCode || '',
			creditHours: String(sub.creditHours ?? 0),
			lessonHours: String(sub.lessonHours ?? 0)
		})
		setSubjectOpen(true)
	}

	const loading =
		systemsQ.isLoading ||
		majorsQ.isLoading ||
		facultiesQ.isLoading ||
		subjectsQ.isLoading

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div>
				<h1 className='text-2xl font-semibold tracking-tight'>
					Danh mục đào tạo
				</h1>
				<p className='text-muted-foreground text-sm'>
					<strong>Hệ</strong> → <strong>Ngành đào tạo</strong>. Khoa
					là danh mục dùng chung và phụ trách giảng dạy các môn học.
				</p>
			</div>

			{(systemsQ.isError ||
				majorsQ.isError ||
				facultiesQ.isError ||
				subjectsQ.isError) && (
				<div className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
					Lỗi tải danh mục:{' '}
					{(
						systemsQ.error ||
						majorsQ.error ||
						facultiesQ.error ||
						subjectsQ.error
					)?.message || 'unknown'}
				</div>
			)}

			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2'>
						<Building2 className='h-5 w-5' />
						Danh mục khoa
					</CardTitle>
					<CardDescription>
						Mỗi khoa chỉ hiển thị một lần; bên trong là các môn học
						do khoa đảm nhận ở tất cả ngành đào tạo.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className='flex justify-center py-8'>
							<Loader2 className='h-7 w-7 animate-spin' />
						</div>
					) : !facultyDirectory.length ? (
						<p className='text-muted-foreground py-6 text-center text-sm'>
							Chưa có khoa trong danh mục.
						</p>
					) : (
						<div className='space-y-2'>
							{facultyDirectory.map((faculty) => (
								<details
									key={faculty.code}
									className='group overflow-hidden rounded-lg border'
								>
									<summary className='bg-muted/40 hover:bg-muted/60 flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5'>
										<ChevronRight className='h-4 w-4 transition-transform group-open:rotate-90' />
										<Badge
											variant='outline'
											className='font-mono'
										>
											{faculty.code}
										</Badge>
										<span className='font-medium'>
											{faculty.name}
										</span>
										<Badge variant='secondary'>
											{faculty.subjects.length} môn
										</Badge>
										<span className='text-muted-foreground ml-auto text-xs'>
											Phụ trách{' '}
											{faculty.majorNames.length} ngành
										</span>
										{canManage && (
											<Button
												type='button'
												size='icon'
												variant='ghost'
												className='h-7 w-7'
												title='Sửa khoa dùng chung'
												onClick={(event) => {
													event.preventDefault()
													event.stopPropagation()
													openEditFacultyDirectory(
														faculty.code,
														faculty.name
													)
												}}
											>
												<Pencil className='h-3.5 w-3.5' />
											</Button>
										)}
									</summary>
									<div className='border-t p-3'>
										{!faculty.subjects.length ? (
											<p className='text-muted-foreground text-sm'>
												Chưa có môn học thuộc khoa này.
											</p>
										) : (
											<div className='grid gap-2 md:grid-cols-2'>
												{faculty.subjects.map(
													(subject) => (
														<div
															key={subject.id}
															className='flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm'
														>
															<div className='min-w-0 font-medium'>
																{subject.name}
															</div>
															<div className='text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 text-xs'>
																<span className='font-mono'>
																	{
																		subject.code
																	}
																</span>
																{subject.majorName && (
																	<span>
																		{
																			subject.majorName
																		}
																	</span>
																)}
																<span>
																	{subject.creditHours ||
																		0}{' '}
																	tín chỉ
																</span>
															</div>
														</div>
													)
												)}
											</div>
										)}
									</div>
								</details>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3'>
					<div>
						<CardTitle className='flex items-center gap-2'>
							<GraduationCap className='h-5 w-5' />
							Cây danh mục
						</CardTitle>
						<CardDescription>
							{systems.length} hệ · {majors.length} ngành ·{' '}
							{faculties.length} khoa · {subjects.length} môn
						</CardDescription>
					</div>
					<div className='flex flex-wrap gap-2'>
						<Button
							size='sm'
							variant='outline'
							onClick={expandAll}
							disabled={!systems.length}
						>
							Mở hết
						</Button>
						<Button
							size='sm'
							variant='outline'
							onClick={collapseAll}
							disabled={!systems.length}
						>
							Gập hết
						</Button>
						{canManage && (
							<Button
								size='sm'
								onClick={() => {
									setEditSystemId(null)
									setSystemForm({
										code: 'QS',
										name: 'Hệ quân sự',
										letter: 'A'
									})
									setSystemOpen(true)
								}}
							>
								<Plus className='mr-1 h-4 w-4' /> Thêm hệ
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className='flex justify-center py-12'>
							<Loader2 className='h-8 w-8 animate-spin' />
						</div>
					) : !systems.length ? (
						<p className='text-muted-foreground py-8 text-center text-sm'>
							Chưa có hệ. Import khung CTĐT hoặc thêm Hệ quân sự /
							Hệ dân sự.
						</p>
					) : (
						<div className='space-y-2'>
							{systems.map((sys) => {
								const majList = majorsBySystem.get(sys.id) || []
								const sOpen = openSystems.has(sys.id)
								return (
									<div
										key={sys.id}
										className='overflow-hidden rounded-lg border'
									>
										<div className='bg-muted/50 flex flex-wrap items-center gap-2 px-3 py-2.5'>
											<button
												type='button'
												className='hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left'
												onClick={() =>
													toggle(
														setOpenSystems,
														sys.id
													)
												}
											>
												{sOpen ? (
													<ChevronDown className='h-4 w-4 shrink-0' />
												) : (
													<ChevronRight className='h-4 w-4 shrink-0' />
												)}
												<span className='text-muted-foreground text-xs font-medium uppercase'>
													Hệ
												</span>
												<span className='text-base font-semibold'>
													{sys.name}
												</span>
												<Badge variant='outline'>
													{sys.letter}
												</Badge>
												<Badge variant='secondary'>
													{majList.length} ngành
												</Badge>
											</button>
											{/* Gợi ý nhanh các ngành khi gập */}
											{!sOpen && majList.length > 0 && (
												<span className='text-muted-foreground w-full truncate pl-7 text-xs'>
													{majList
														.map((m) => m.name)
														.join(' · ')}
												</span>
											)}
											{canManage && (
												<div className='flex gap-1'>
													<Button
														size='sm'
														variant='outline'
														className='h-8'
														onClick={() =>
															openAddMajor(sys)
														}
													>
														<Plus className='mr-1 h-3.5 w-3.5' />
														Ngành
													</Button>
													<Button
														size='icon'
														variant='ghost'
														className='h-8 w-8'
														title='Sửa hệ'
														onClick={() => {
															setEditSystemId(
																sys.id
															)
															setSystemForm({
																code: sys.code,
																name: sys.name,
																letter: sys.letter
															})
															setSystemOpen(true)
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
																	`Xóa «${sys.name}»?`
																)
															)
																delSystem.mutate(
																	sys.id
																)
														}}
													>
														<Trash2 className='text-destructive h-3.5 w-3.5' />
													</Button>
												</div>
											)}
										</div>
										{sOpen && (
											<div className='border-t bg-background'>
												<div className='text-muted-foreground border-b px-3 py-1.5 pl-8 text-xs font-medium uppercase tracking-wide'>
													Ngành trong {sys.name}
												</div>
												{!majList.length ? (
													<p className='text-muted-foreground px-4 py-3 pl-8 text-sm'>
														Chưa có ngành trong hệ
														này.
													</p>
												) : (
													majList.map((maj) => {
														const facList =
															facultiesByMajor.get(
																maj.id
															) || []
														const mOpen =
															openMajors.has(
																maj.id
															)
														const monCount =
															subjectCountByMajor.get(
																maj.id
															) || 0
														return (
															<div
																key={maj.id}
																className='border-b last:border-b-0'
															>
																<div className='flex flex-wrap items-center gap-2 px-3 py-2 pl-8'>
																	<button
																		type='button'
																		className='hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left'
																		onClick={() =>
																			toggle(
																				setOpenMajors,
																				maj.id
																			)
																		}
																	>
																		{mOpen ? (
																			<ChevronDown className='h-4 w-4 shrink-0' />
																		) : (
																			<ChevronRight className='h-4 w-4 shrink-0' />
																		)}
																		<span className='text-muted-foreground text-xs'>
																			Ngành
																		</span>
																		{maj.nationalMajorCode && (
																			<Badge
																				variant='outline'
																				className='font-mono text-[10px]'
																			>
																				Mã
																				ngành:{' '}
																				{
																					maj.nationalMajorCode
																				}
																			</Badge>
																		)}
																		<span className='font-mono text-xs font-semibold'>
																			Mã
																			số:{' '}
																			{maj.catalogNumber ||
																				maj.code}
																		</span>
																		<span className='text-sm font-medium'>
																			{
																				maj.name
																			}
																		</span>
																		{maj.levelCode && (
																			<Badge
																				variant='outline'
																				className='text-[10px]'
																			>
																				{
																					maj.levelCode
																				}
																			</Badge>
																		)}
																		<Badge variant='secondary'>
																			{
																				facList.length
																			}{' '}
																			khoa
																		</Badge>
																		<Badge variant='outline'>
																			{
																				monCount
																			}{' '}
																			môn
																		</Badge>
																	</button>
																	{canManage && (
																		<div className='flex gap-1'>
																			<Button
																				size='sm'
																				variant='outline'
																				className='h-8'
																				onClick={() =>
																					openAddFaculty(
																						maj
																					)
																				}
																			>
																				<Plus className='mr-1 h-3.5 w-3.5' />
																				Khoa
																			</Button>
																			<Button
																				size='icon'
																				variant='ghost'
																				className='h-8 w-8'
																				title='Sửa ngành'
																				onClick={() =>
																					openEditMajor(
																						maj,
																						sys
																					)
																				}
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
																							`Xóa ngành «${maj.code}»?`
																						)
																					)
																						delMajor.mutate(
																							maj.id
																						)
																				}}
																			>
																				<Trash2 className='text-destructive h-3.5 w-3.5' />
																			</Button>
																		</div>
																	)}
																</div>
																{mOpen && (
																	<div className='bg-muted/10'>
																		{!facList.length ? (
																			<p className='text-muted-foreground px-4 py-2 pl-14 text-sm'>
																				Chưa
																				có
																				khoa.
																			</p>
																		) : (
																			facList.map(
																				(
																					fac
																				) => {
																					const subList =
																						subjectsByFaculty.get(
																							fac.id
																						) ||
																						[]
																					const fOpen =
																						openFaculties.has(
																							fac.id
																						)
																					return (
																						<div
																							key={
																								fac.id
																							}
																							className='border-t border-dashed'
																						>
																							<div className='flex flex-wrap items-center gap-2 px-3 py-1.5 pl-14'>
																								<button
																									type='button'
																									className='hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left text-sm'
																									onClick={() =>
																										toggle(
																											setOpenFaculties,
																											fac.id
																										)
																									}
																								>
																									{fOpen ? (
																										<ChevronDown className='h-3.5 w-3.5' />
																									) : (
																										<ChevronRight className='h-3.5 w-3.5' />
																									)}
																									<span className='font-mono text-xs'>
																										{
																											fac.code
																										}
																									</span>
																									<span>
																										{
																											fac.name
																										}
																									</span>
																									<Badge
																										variant='outline'
																										className='text-[10px]'
																									>
																										{
																											subList.length
																										}{' '}
																										môn
																									</Badge>
																								</button>
																								{canManage && (
																									<div className='flex gap-1'>
																										<Button
																											size='sm'
																											variant='outline'
																											className='h-7 text-xs'
																											onClick={() =>
																												openAddSubject(
																													fac,
																													maj
																												)
																											}
																										>
																											<Plus className='mr-1 h-3 w-3' />
																											Môn
																										</Button>
																										<Button
																											size='icon'
																											variant='ghost'
																											className='h-7 w-7'
																											title='Sửa khoa'
																											onClick={() =>
																												openEditFaculty(
																													fac,
																													maj
																												)
																											}
																										>
																											<Pencil className='h-3 w-3' />
																										</Button>
																										<Button
																											size='icon'
																											variant='ghost'
																											className='h-7 w-7'
																											onClick={() => {
																												if (
																													confirm(
																														`Xóa khoa «${fac.name}»?`
																													)
																												)
																													delFaculty.mutate(
																														fac.id
																													)
																											}}
																										>
																											<Trash2 className='text-destructive h-3 w-3' />
																										</Button>
																									</div>
																								)}
																							</div>
																							{fOpen && (
																								<ul className='space-y-0.5 px-3 pb-2 pl-20'>
																									{!subList.length ? (
																										<li className='text-muted-foreground text-xs'>
																											Chưa
																											có
																											môn.
																										</li>
																									) : (
																										subList.map(
																											(
																												sub
																											) => (
																												<li
																													key={
																														sub.id
																													}
																													className={cn(
																														'hover:bg-muted/40 flex items-center justify-between gap-2 rounded px-2 py-1 text-xs'
																													)}
																												>
																													<span>
																														<span className='font-mono'>
																															{
																																sub.code
																															}
																														</span>
																														{
																															' — '
																														}
																														{
																															sub.name
																														}
																													</span>
																													{canManage && (
																														<span className='flex shrink-0 gap-0.5'>
																															<Button
																																size='icon'
																																variant='ghost'
																																className='h-6 w-6'
																																title='Sửa môn'
																																onClick={() =>
																																	openEditSubject(
																																		sub,
																																		fac,
																																		maj
																																	)
																																}
																															>
																																<Pencil className='h-3 w-3' />
																															</Button>
																															<Button
																																size='icon'
																																variant='ghost'
																																className='h-6 w-6'
																																onClick={() => {
																																	if (
																																		confirm(
																																			`Xóa môn «${sub.name}»?`
																																		)
																																	)
																																		delSubject.mutate(
																																			sub.id
																																		)
																																}}
																															>
																																<Trash2 className='text-destructive h-3 w-3' />
																															</Button>
																														</span>
																													)}
																												</li>
																											)
																										)
																									)}
																								</ul>
																							)}
																						</div>
																					)
																				}
																			)
																		)}
																	</div>
																)}
															</div>
														)
													})
												)}
											</div>
										)}
									</div>
								)
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Dialogs */}
			<Dialog
				open={systemOpen}
				onOpenChange={(open) => {
					setSystemOpen(open)
					if (!open) setEditSystemId(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editSystemId == null
								? 'Thêm hệ'
								: 'Sửa hệ đào tạo'}
						</DialogTitle>
					</DialogHeader>
					<p className='text-muted-foreground text-xs'>
						Chỉ 2 hệ trên đầu sheet: <strong>Hệ quân sự (A)</strong>{' '}
						và <strong>Hệ dân sự (B)</strong>.
					</p>
					<div className='space-y-3'>
						<div>
							<Label>Letter (A/B) *</Label>
							<Select
								value={systemForm.letter}
								onValueChange={(v) =>
									setSystemForm({
										letter: v,
										code: v === 'A' ? 'QS' : 'DS',
										name:
											v === 'A'
												? 'Hệ quân sự'
												: 'Hệ dân sự'
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='A'>
										A — Hệ quân sự
									</SelectItem>
									<SelectItem value='B'>
										B — Hệ dân sự
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Mã *</Label>
							<Input
								value={systemForm.code}
								onChange={(e) =>
									setSystemForm((f) => ({
										...f,
										code: e.target.value
									}))
								}
							/>
						</div>
						<div>
							<Label>Tên *</Label>
							<Input
								value={systemForm.name}
								onChange={(e) =>
									setSystemForm((f) => ({
										...f,
										name: e.target.value
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

			<Dialog
				open={majorOpen}
				onOpenChange={(v) => {
					setMajorOpen(v)
					if (!v) setEditMajorId(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editMajorId != null
								? 'Sửa ngành đào tạo'
								: 'Thêm ngành đào tạo'}
						</DialogTitle>
					</DialogHeader>
					<p className='text-muted-foreground text-xs'>
						Ngành = cột trên sheet (vd «Y sĩ đa khoa (cao đẳng)»,
						«Điều dưỡng (liên thông)»).
					</p>
					<div className='space-y-3'>
						<div>
							<Label>Hệ</Label>
							<div className='bg-muted rounded border px-3 py-2 text-sm'>
								{majorForm.systemLabel}
							</div>
						</div>
						<div>
							<Label>Tên ngành *</Label>
							<Input
								value={majorForm.name}
								onChange={(e) =>
									setMajorForm((f) => ({
										...f,
										name: e.target.value
									}))
								}
								placeholder='Y sĩ đa khoa (cao đẳng)'
							/>
						</div>
						<div>
							<Label>Trình độ (TC/CD/LT)</Label>
							<Select
								value={majorForm.levelCode}
								onValueChange={(v) =>
									setMajorForm((f) => ({
										...f,
										levelCode: v
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='TC'>
										TC — Trung cấp
									</SelectItem>
									<SelectItem value='CD'>
										CD — Cao đẳng
									</SelectItem>
									<SelectItem value='LT'>
										LT — Liên thông
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Viết tắt ngành</Label>
							<Input
								value={majorForm.shortCode}
								onChange={(e) =>
									setMajorForm((f) => ({
										...f,
										shortCode: e.target.value
									}))
								}
								placeholder='YSDK / DD / DUOC'
							/>
						</div>
						<div>
							<Label>Mã ngành (được trùng)</Label>
							<Input
								value={majorForm.nationalMajorCode}
								onChange={(e) =>
									setMajorForm((f) => ({
										...f,
										nationalMajorCode: e.target.value
									}))
								}
								placeholder='6720301'
							/>
						</div>
						<div>
							<Label>Mã số (duy nhất) *</Label>
							<Input
								value={majorForm.catalogNumber}
								onChange={(e) =>
									setMajorForm((f) => ({
										...f,
										catalogNumber: e.target.value
									}))
								}
								placeholder={previewCatalogNumber}
							/>
							<p className='text-muted-foreground mt-1 text-xs'>
								Sẽ dùng: <strong>{previewCatalogNumber}</strong>
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setMajorOpen(false)
								setEditMajorId(null)
							}}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveMajor.isPending ||
								!majorForm.systemId ||
								!majorForm.name ||
								!majorForm.catalogNumber.trim()
							}
							onClick={() => saveMajor.mutate()}
						>
							{saveMajor.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={facultyOpen}
				onOpenChange={(v) => {
					setFacultyOpen(v)
					if (!v) setEditFacultyId(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editFacultyId != null ? 'Sửa khoa' : 'Thêm khoa'}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-3'>
						<div>
							<Label>Ngành</Label>
							<div className='bg-muted rounded border px-3 py-2 text-sm'>
								{facultyForm.majorLabel}
							</div>
						</div>
						<div>
							<Label>Mã khoa *</Label>
							<Input
								value={facultyForm.code}
								onChange={(e) =>
									setFacultyForm((f) => ({
										...f,
										code: e.target.value
									}))
								}
								placeholder='K1'
							/>
						</div>
						<div>
							<Label>Viết tắt khoa</Label>
							<Input
								value={facultyForm.shortCode}
								onChange={(e) =>
									setFacultyForm((f) => ({
										...f,
										shortCode: e.target.value.toUpperCase()
									}))
								}
								placeholder='VD: CNTT'
							/>
						</div>
						<div>
							<Label>Tên khoa *</Label>
							<Input
								value={facultyForm.name}
								onChange={(e) =>
									setFacultyForm((f) => ({
										...f,
										name: e.target.value
									}))
								}
								placeholder='Khoa Quân sự chung'
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setFacultyOpen(false)
								setEditFacultyId(null)
							}}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveFaculty.isPending ||
								!facultyForm.code ||
								!facultyForm.name
							}
							onClick={() => saveFaculty.mutate()}
						>
							{saveFaculty.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={subjectOpen}
				onOpenChange={(v) => {
					setSubjectOpen(v)
					if (!v) setEditSubjectId(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editSubjectId != null
								? 'Sửa môn học'
								: 'Thêm môn học'}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-3'>
						<div>
							<Label>Khoa</Label>
							<div className='bg-muted rounded border px-3 py-2 text-sm'>
								{subjectForm.facultyLabel}
							</div>
						</div>
						<div>
							<Label>Mã gốc (M001K1…) *</Label>
							<Input
								value={subjectForm.baseCode}
								onChange={(e) =>
									setSubjectForm((f) => ({
										...f,
										baseCode: e.target.value
									}))
								}
								placeholder='M001K1'
							/>
							<p className='text-muted-foreground mt-1 text-xs'>
								Full: <strong>{previewSubjectCode}</strong>
							</p>
						</div>
						<div>
							<Label>Tên môn *</Label>
							<Input
								value={subjectForm.name}
								onChange={(e) =>
									setSubjectForm((f) => ({
										...f,
										name: e.target.value
									}))
								}
							/>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<Label>Tín chỉ</Label>
								<Input
									value={subjectForm.creditHours}
									onChange={(e) =>
										setSubjectForm((f) => ({
											...f,
											creditHours: e.target.value
										}))
									}
								/>
							</div>
							<div>
								<Label>Số tiết</Label>
								<Input
									value={subjectForm.lessonHours}
									onChange={(e) =>
										setSubjectForm((f) => ({
											...f,
											lessonHours: e.target.value
										}))
									}
								/>
							</div>
						</div>
						{canManage && (
							<Button
								size='icon'
								variant='ghost'
								className='h-7 w-7 shrink-0'
								title='Sửa môn học'
								onClick={() => openEditSubject(subject)}
							>
								<Pencil className='h-3.5 w-3.5' />
							</Button>
						)}
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setSubjectOpen(false)
								setEditSubjectId(null)
							}}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveSubject.isPending ||
								!subjectForm.facultyId ||
								!subjectForm.baseCode ||
								!subjectForm.name
							}
							onClick={() => saveSubject.mutate()}
						>
							{saveSubject.isPending && (
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
