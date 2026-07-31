/**
 * Danh mục đào tạo (khớp sheet Tổng hợp mã môn):
 *   Hệ (Quân sự A / Dân sự B)
 *     → Ngành (Y sĩ TC/CD/LT, Điều dưỡng, Dược…)
 *       → Khoa → Môn
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
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
		code: '',
		systemId: 0,
		systemLabel: '',
		letter: ''
	})
	const [facultyForm, setFacultyForm] = useState({
		code: '',
		name: '',
		majorId: 0,
		majorLabel: ''
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
		for (const f of faculties) {
			const list = m.get(f.majorId) || []
			list.push(f)
			m.set(f.majorId, list)
		}
		return m
	}, [faculties])

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

	const previewMajorCode = useMemo(() => {
		if (majorForm.code.trim()) return majorForm.code.trim().toUpperCase()
		const letter = majorForm.letter || 'X'
		const level = majorForm.levelCode || ''
		const short =
			majorForm.shortCode.trim().toUpperCase() ||
			majorForm.name
				.replace(/\(.*?\)/g, '')
				.trim()
				.split(/[\s\-_/]+/)
				.filter(Boolean)
				.map((w) => w[0]!.toUpperCase())
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
					code: majorForm.code || undefined
				})
			}
			return CreateExamMajor({
				name: majorForm.name,
				systemId: majorForm.systemId,
				levelCode: majorForm.levelCode || null,
				shortCode: majorForm.shortCode || null,
				code: majorForm.code || null
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
		mutationFn: () => {
			if (editFacultyId != null) {
				return UpdateExamFaculty(editFacultyId, {
					code: facultyForm.code,
					name: facultyForm.name,
					majorId: facultyForm.majorId
				})
			}
			return CreateExamFaculty({
				code: facultyForm.code,
				name: facultyForm.name,
				majorId: facultyForm.majorId
			})
		},
		onSuccess: (f) => {
			toast.success(
				editFacultyId != null ? 'Đã cập nhật khoa' : 'Đã thêm khoa'
			)
			setFacultyOpen(false)
			setEditFacultyId(null)
			void qc.invalidateQueries({ queryKey: ['exam-faculties'] })
			void qc.invalidateQueries({ queryKey: ['exam-subjects'] })
			setOpenMajors((p) => new Set(p).add(f.majorId))
			setOpenFaculties((p) => new Set(p).add(f.id))
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
			code: '',
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
			code: maj.code,
			systemId: maj.systemId,
			systemLabel: sys
				? `${sys.letter} — ${sys.name}`
				: maj.systemName || String(maj.systemId),
			letter: sys?.letter || maj.systemLetter || ''
		})
		setMajorOpen(true)
	}

	function openAddFaculty(m: ExamMajor) {
		setEditFacultyId(null)
		setFacultyForm({
			code: '',
			name: '',
			majorId: m.id,
			majorLabel: `${m.code} — ${m.name}`
		})
		setFacultyOpen(true)
	}

	function openEditFaculty(fac: ExamFaculty, m?: ExamMajor) {
		const major = m || majors.find((x) => x.id === fac.majorId) || null
		setEditFacultyId(fac.id)
		setFacultyForm({
			code: fac.code,
			name: fac.name,
			majorId: fac.majorId,
			majorLabel: major
				? `${major.code} — ${major.name}`
				: fac.majorCode || String(fac.majorId)
		})
		setFacultyOpen(true)
	}

	function openAddSubject(f: ExamFaculty, m?: ExamMajor) {
		const major = m || majors.find((x) => x.id === f.majorId) || null
		setEditSubjectId(null)
		setSubjectForm({
			baseCode: '',
			name: '',
			facultyId: f.id,
			facultyLabel: `${f.code} — ${f.name}`,
			majorCode: major?.code || f.majorCode || '',
			creditHours: '0',
			lessonHours: '0'
		})
		setSubjectOpen(true)
	}

	function openEditSubject(sub: ExamSubject, f?: ExamFaculty, m?: ExamMajor) {
		const fac = f || faculties.find((x) => x.id === sub.facultyId) || null
		const major =
			m ||
			majors.find((x) => x.id === sub.majorId) ||
			(fac ? majors.find((x) => x.id === fac.majorId) : null) ||
			null
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
					Cây: <strong>Hệ</strong> → <strong>Ngành trong hệ</strong> →
					Khoa → Môn. Ví dụ Hệ quân sự gồm Y sĩ (TC/CD/LT), Điều
					dưỡng…
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
																		<span className='font-mono text-xs font-semibold'>
																			{
																				maj.code
																			}
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
							<Label>Mã ngành (tuỳ chọn — chỉnh tay)</Label>
							<Input
								value={majorForm.code}
								onChange={(e) =>
									setMajorForm((f) => ({
										...f,
										code: e.target.value
									}))
								}
								placeholder={previewMajorCode}
							/>
							<p className='text-muted-foreground mt-1 text-xs'>
								Sẽ dùng: <strong>{previewMajorCode}</strong>
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
								!majorForm.name
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
								!facultyForm.majorId ||
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
