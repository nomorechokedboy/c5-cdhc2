/**
 * Phân công môn học: GV nào dạy môn nào (theo lớp).
 * Khoa/CNK + admin: chỉnh · BGH: chỉ xem.
 * UI: chỉ hiện tên (không mã môn / username).
 */
import { useEffect, useMemo, useState } from 'react'

/** Bỏ mã môn / username / [alias …] khỏi tên hiển thị */
function personLabel(
	displayName?: string | null,
	username?: string | null
): string {
	let s = (displayName || '').trim()
	if (!s) return (username || '—').trim() || '—'
	s = s.replace(/\s*\[alias[^\]]*\]\s*/gi, ' ').trim()
	s = s
		.replace(
			/\s*\((?:[A-Za-z][A-Za-z0-9_]*_)+[A-Za-z0-9_]+(?:\s*,\s*(?:[A-Za-z][A-Za-z0-9_]*_)+[A-Za-z0-9_]+)*\)\s*/g,
			' '
		)
		.trim()
	s = s.replace(/\s*\([a-z][a-z0-9._-]*\)\s*$/i, '').trim()
	s = s.replace(/\s*\([a-z0-9._-]+\)\s*$/i, '').trim()
	return s || username || '—'
}
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	ChevronDown,
	ChevronRight,
	History,
	Loader2,
	Pencil,
	Plus,
	Trash2,
	UserPlus
} from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateExamAssignment,
	DeleteExamAssignment,
	ListExamAssignmentLogs,
	ListExamAssignments,
	ListExamClasses,
	ListExamMajors,
	ListExamSubjects,
	ListExamSystems,
	ListExamTeachers,
	UpdateExamAssignment,
	type ExamAssignment
} from '@/api/exam'
import {
	canManageTeachingAssignments,
	canViewTeachingAssignments
} from '@/lib/exam-roles'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type FormState = {
	systemId: string
	majorId: string
	facultyCode: string
	subjectId: string
	classId: string
	userId: string
	/** YYYY-MM-DD */
	teachingStart: string
	/** YYYY-MM-DD */
	teachingEnd: string
	note: string
}

const emptyForm = (): FormState => ({
	systemId: '',
	majorId: '',
	facultyCode: '',
	subjectId: '',
	classId: '',
	userId: '',
	teachingStart: '',
	teachingEnd: '',
	note: ''
})

export default function ExamAssignmentPage() {
	const qc = useQueryClient()
	const canView = canViewTeachingAssignments()
	const canManage = canManageTeachingAssignments()

	const [filterSystem, setFilterSystem] = useState<string>('all')
	const [filterMajor, setFilterMajor] = useState<string>('all')
	const [keyword, setKeyword] = useState('')
	const [assignOpen, setAssignOpen] = useState(false)
	const [editId, setEditId] = useState<number | null>(null)
	const [form, setForm] = useState<FormState>(emptyForm)
	/** Cây: mở Hệ / Ngành / Khoa / Môn */
	const [openSystems, setOpenSystems] = useState<Set<number>>(() => new Set())
	const [openMajors, setOpenMajors] = useState<Set<number>>(() => new Set())
	const [openFaculties, setOpenFaculties] = useState<Set<string>>(
		() => new Set()
	)
	const [openSubjects, setOpenSubjects] = useState<Set<number>>(
		() => new Set()
	)

	function toggleSet<T>(
		setter: (fn: (prev: Set<T>) => Set<T>) => void,
		key: T
	) {
		setter((prev) => {
			const next = new Set(prev)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	}

	const systemsQ = useQuery({
		queryKey: ['exam-systems'],
		queryFn: () => ListExamSystems(),
		enabled: canView
	})
	const majorsQ = useQuery({
		queryKey: ['exam-majors'],
		queryFn: () => ListExamMajors(),
		enabled: canView
	})
	const subjectsQ = useQuery({
		queryKey: ['exam-subjects', 'assign-page'],
		queryFn: () => ListExamSubjects(),
		enabled: canView
	})
	const classesQ = useQuery({
		queryKey: ['exam-classes', 'assign-page'],
		queryFn: () => ListExamClasses(),
		enabled: canView
	})
	const assignmentsQ = useQuery({
		queryKey: ['exam-assignments', filterMajor, keyword],
		queryFn: () =>
			ListExamAssignments({
				majorId:
					filterMajor !== 'all' ? Number(filterMajor) : undefined,
				q: keyword.trim() || undefined
			}),
		enabled: canView
	})
	const logsQ = useQuery({
		queryKey: ['exam-assignment-logs'],
		queryFn: () => ListExamAssignmentLogs({ limit: 80 }),
		enabled: canView
	})
	const teachersQ = useQuery({
		queryKey: ['exam-teachers', form.facultyCode],
		queryFn: () => ListExamTeachers({ facultyCode: form.facultyCode }),
		// Chỉ tải GV khi đã chọn khoa — tránh list toàn bộ rồi lọt UI
		enabled: canView && canManage && !!form.facultyCode
	})

	const systems = systemsQ.data || []
	const majors = majorsQ.data || []
	const subjects = subjectsQ.data || []
	const classes = classesQ.data || []
	/** Chỉ giữ phân công GV đúng khoa môn — phòng cache/API cũ lẫn khoa */
	const assignments = useMemo(() => {
		const raw = assignmentsQ.data || []
		return raw.filter((a) => {
			const subFac = (a.facultyCode || '').trim().toUpperCase()
			const teaFac = (a.teacherFacultyCode || '').trim().toUpperCase()
			if (!subFac || !teaFac) return false
			return subFac === teaFac
		})
	}, [assignmentsQ.data])
	const logs = logsQ.data || []
	const teachers = teachersQ.data || []

	const majorsFiltered = useMemo(() => {
		if (filterSystem === 'all') return majors
		const sid = Number(filterSystem)
		return majors.filter((m) => m.systemId === sid)
	}, [majors, filterSystem])

	const formMajors = useMemo(() => {
		if (!form.systemId) return majors
		return majors.filter((m) => m.systemId === Number(form.systemId))
	}, [majors, form.systemId])

	const formFaculties = useMemo(() => {
		if (!form.majorId) return [] as Array<{ code: string; name: string }>
		const mid = Number(form.majorId)
		const map = new Map<string, string>()
		for (const s of subjects) {
			if (s.majorId !== mid || !s.facultyCode) continue
			if (!map.has(s.facultyCode)) {
				map.set(s.facultyCode, s.facultyName || s.facultyCode)
			}
		}
		return [...map.entries()]
			.map(([code, name]) => ({ code, name }))
			.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
	}, [subjects, form.majorId])

	const formSubjects = useMemo(() => {
		if (!form.majorId) return []
		let list = subjects.filter((s) => s.majorId === Number(form.majorId))
		if (form.facultyCode) {
			list = list.filter((s) => s.facultyCode === form.facultyCode)
		}
		return list
	}, [subjects, form.majorId, form.facultyCode])

	const formClasses = useMemo(() => {
		if (!form.majorId) return []
		return classes.filter(
			(c) =>
				c.majorId === Number(form.majorId) &&
				// Chỉ lớp còn hoạt động (chưa hết niên khóa)
				c.status !== 'EXPIRED'
		)
	}, [classes, form.majorId])

	/** GV đúng khoa; loại trừ đã gán cùng môn+lớp (khi sửa vẫn giữ GV hiện tại) */
	const formTeachers = useMemo(() => {
		const fac = (form.facultyCode || '').toUpperCase()
		const already = new Set(
			assignments
				.filter(
					(a) =>
						String(a.subjectId) === form.subjectId &&
						form.classId &&
						String(a.classId) === form.classId &&
						(editId == null || a.id !== editId)
				)
				.map((a) => a.userId)
		)
		// Chỉ GV đúng khoa đang chọn — không lẫn khoa khác
		if (!fac) return []
		let list = teachers.filter((t) => {
			if (!t.facultyCode || t.facultyCode.toUpperCase() !== fac)
				return false
			if (
				already.has(t.id) &&
				(editId == null || Number(form.userId) !== t.id)
			)
				return false
			return true
		})
		// Sửa: giữ GV hiện tại nếu vẫn cùng khoa
		if (editId != null && form.userId) {
			const uid = Number(form.userId)
			if (!list.some((t) => t.id === uid)) {
				const fromTeachers = teachers.find((t) => t.id === uid)
				const teaFac = (fromTeachers?.facultyCode || '').toUpperCase()
				if (fromTeachers && teaFac === fac) {
					list = [fromTeachers, ...list]
				}
			}
		}
		return list
	}, [
		teachers,
		form.facultyCode,
		form.subjectId,
		form.classId,
		form.userId,
		assignments,
		editId
	])

	/** GV đã gắn môn+lớp đang chọn (hiển thị gợi ý multi-GV) */
	const alreadyOnSlot = useMemo(() => {
		if (!form.subjectId || !form.classId) return []
		return assignments.filter(
			(a) =>
				String(a.subjectId) === form.subjectId &&
				String(a.classId) === form.classId
		)
	}, [assignments, form.subjectId, form.classId])

	/** Một GV → nhiều dòng (môn × lớp) trong khoa */
	const byTeacher = useMemo(() => {
		const map = new Map<
			number,
			{
				userId: number
				displayName: string
				username: string
				slots: Array<{
					assignmentId: number
					systemName: string
					majorName: string
					facultyName: string
					subjectName: string
					className: string
					subjectId: number
					classId: number | null
				}>
			}
		>()
		for (const a of assignments) {
			let row = map.get(a.userId)
			if (!row) {
				row = {
					userId: a.userId,
					displayName: personLabel(a.displayName, a.username),
					username: a.username || '',
					slots: []
				}
				map.set(a.userId, row)
			}
			row.slots.push({
				assignmentId: a.id,
				systemName: a.systemName || a.systemCode || '—',
				majorName: a.majorName || a.majorCode || '—',
				facultyName: a.facultyName || a.facultyCode || '—',
				subjectName: a.subjectName || a.subjectCode || '—',
				className: a.className || a.classCode || '—',
				subjectId: a.subjectId,
				classId: a.classId ?? null
			})
		}
		return [...map.values()].sort((a, b) =>
			a.displayName.localeCompare(b.displayName, 'vi')
		)
	}, [assignments])

	/**
	 * Cây: Hệ → Ngành → Khoa → Môn → (GV + thời gian + trạng thái theo lớp)
	 * Dựa trên danh mục môn + phân công.
	 */
	const assignTree = useMemo(() => {
		const kw = keyword.trim().toLowerCase()
		const matchKw = (parts: Array<string | null | undefined>) => {
			if (!kw) return true
			return parts.some((p) => (p || '').toLowerCase().includes(kw))
		}

		let sysList = systems
		if (filterSystem !== 'all') {
			sysList = systems.filter((s) => s.id === Number(filterSystem))
		}

		return sysList
			.map((sys) => {
				let majList = majors.filter((m) => m.systemId === sys.id)
				if (filterMajor !== 'all') {
					majList = majList.filter(
						(m) => m.id === Number(filterMajor)
					)
				}

				const majorsNode = majList
					.map((maj) => {
						const majSubjects = subjects.filter(
							(s) => s.majorId === maj.id
						)
						const facMap = new Map<
							string,
							{
								code: string
								name: string
								subjects: typeof majSubjects
							}
						>()
						for (const s of majSubjects) {
							const code = (s.facultyCode || 'K?').toUpperCase()
							if (!facMap.has(code)) {
								facMap.set(code, {
									code,
									name: s.facultyName || code,
									subjects: []
								})
							}
							facMap.get(code)!.subjects.push(s)
						}
						// Môn chỉ có trong phân công (thiếu DM) — gắn đúng khoa của môn
						for (const a of assignments) {
							if (a.majorId !== maj.id) continue
							const subFac = (a.facultyCode || '')
								.trim()
								.toUpperCase()
							const teaFac = (a.teacherFacultyCode || '')
								.trim()
								.toUpperCase()
							// Bắt buộc GV cùng khoa môn — không gắn môn/GV lệch vào cây
							if (!subFac || !teaFac || subFac !== teaFac)
								continue

							const code = subFac
							if (!facMap.has(code)) {
								facMap.set(code, {
									code,
									name: a.facultyName || code,
									subjects: []
								})
							}
							const fac = facMap.get(code)!
							if (
								!fac.subjects.some((s) => s.id === a.subjectId)
							) {
								fac.subjects.push({
									id: a.subjectId,
									code: a.subjectCode || '',
									name:
										a.subjectName || `Môn #${a.subjectId}`,
									baseCode: a.baseCode,
									creditHours: null,
									lessonHours: null,
									facultyId: a.facultyId || 0,
									facultyCode: a.facultyCode,
									facultyName: a.facultyName,
									majorId: a.majorId || maj.id,
									majorCode: a.majorCode,
									majorName: a.majorName,
									systemId: a.systemId,
									systemCode: a.systemCode,
									systemName: a.systemName,
									createdAt: '',
									updatedAt: '',
									description: null
								})
							}
						}

						const faculties = [...facMap.values()]
							.map((fac) => {
								const facCode = (fac.code || '').toUpperCase()
								const subs = fac.subjects
									.map((sub) => {
										// Chỉ GV thuộc đúng khoa của node cây (và của môn)
										const rows = assignments.filter((a) => {
											if (a.subjectId !== sub.id)
												return false
											const subFac = (
												a.facultyCode ||
												sub.facultyCode ||
												''
											)
												.trim()
												.toUpperCase()
											const teaFac = (
												a.teacherFacultyCode || ''
											)
												.trim()
												.toUpperCase()
											// Môn phải thuộc khoa đang mở
											if (
												!facCode ||
												facCode === 'K?' ||
												!subFac ||
												subFac !== facCode
											) {
												return false
											}
											// GV phải cùng khoa với môn/khoa node
											if (!teaFac || teaFac !== facCode) {
												return false
											}
											return true
										})
										const hit =
											matchKw([
												sub.name,
												sub.code,
												fac.name,
												maj.name,
												sys.name
											]) ||
											rows.some((a) =>
												matchKw([
													a.displayName,
													a.username,
													a.className,
													a.classCode
												])
											)
										return {
											id: sub.id,
											name: sub.name,
											code: sub.code,
											assignments: rows,
											hit
										}
									})
									.filter((s) => !kw || s.hit)
									.sort((a, b) =>
										a.name.localeCompare(b.name, 'vi')
									)

								return {
									key: `${maj.id}:${fac.code}`,
									code: fac.code,
									name: fac.name,
									subjects: subs,
									assignCount: subs.reduce(
										(n, s) => n + s.assignments.length,
										0
									)
								}
							})
							.filter((f) => f.subjects.length > 0)
							.sort((a, b) => a.name.localeCompare(b.name, 'vi'))

						return {
							id: maj.id,
							name: maj.name,
							code: maj.code,
							faculties,
							subjectCount: faculties.reduce(
								(n, f) => n + f.subjects.length,
								0
							),
							assignCount: faculties.reduce(
								(n, f) => n + f.assignCount,
								0
							)
						}
					})
					.filter((m) => m.faculties.length > 0)

				return {
					id: sys.id,
					name: sys.name,
					code: sys.code,
					majors: majorsNode,
					assignCount: majorsNode.reduce(
						(n, m) => n + m.assignCount,
						0
					)
				}
			})
			.filter((s) => s.majors.length > 0)
	}, [
		systems,
		majors,
		subjects,
		assignments,
		filterSystem,
		filterMajor,
		keyword
	])

	/** Mở sẵn các hệ khi load; khi tìm kiếm thì mở rộng nhánh khớp */
	useEffect(() => {
		if (!assignTree.length) return
		if (!keyword.trim()) {
			setOpenSystems((prev) => {
				if (prev.size) return prev
				return new Set(assignTree.map((s) => s.id))
			})
			return
		}
		const sys = new Set<number>()
		const maj = new Set<number>()
		const fac = new Set<string>()
		const sub = new Set<number>()
		for (const s of assignTree) {
			sys.add(s.id)
			for (const m of s.majors) {
				maj.add(m.id)
				for (const f of m.faculties) {
					fac.add(f.key)
					for (const su of f.subjects) {
						sub.add(su.id)
					}
				}
			}
		}
		setOpenSystems(sys)
		setOpenMajors(maj)
		setOpenFaculties(fac)
		setOpenSubjects(sub)
	}, [assignTree, keyword])

	function openCreate(prefill?: Partial<FormState>) {
		setEditId(null)
		setForm({ ...emptyForm(), ...prefill })
		setAssignOpen(true)
	}

	function openEdit(a: ExamAssignment) {
		const subj = subjects.find((s) => s.id === a.subjectId)
		const maj =
			majors.find((m) => m.id === a.majorId) ||
			majors.find((m) => m.id === subj?.majorId) ||
			majors.find((m) => m.code === a.majorCode) ||
			majors.find((m) => m.code === subj?.majorCode)
		const sysId =
			a.systemId != null
				? String(a.systemId)
				: maj
					? String(maj.systemId)
					: subj?.systemId != null
						? String(subj.systemId)
						: ''
		const facultyCode = a.facultyCode || subj?.facultyCode || ''
		setEditId(a.id)
		setForm({
			systemId: sysId,
			majorId: maj
				? String(maj.id)
				: a.majorId != null
					? String(a.majorId)
					: subj?.majorId != null
						? String(subj.majorId)
						: '',
			facultyCode,
			subjectId: String(a.subjectId),
			classId: a.classId != null ? String(a.classId) : '',
			userId: String(a.userId),
			teachingStart: (a.teachingStart || '').slice(0, 10),
			teachingEnd: (a.teachingEnd || '').slice(0, 10),
			note: a.note || ''
		})
		setAssignOpen(true)
	}

	function validateForm(): string | null {
		if (!form.systemId) return 'Chọn hệ đào tạo'
		if (!form.majorId) return 'Chọn ngành đào tạo'
		if (!form.facultyCode) return 'Chọn khoa'
		if (!form.subjectId) return 'Chọn môn học'
		if (!form.classId)
			return 'Chọn lớp (phân công cũ chưa có lớp — bắt buộc chọn để lưu)'
		if (!form.userId) return 'Chọn giáo viên'
		if (!form.teachingEnd.trim())
			return 'Chọn ngày kết thúc thời gian giảng dạy'
		return null
	}

	const saveMut = useMutation({
		mutationFn: async () => {
			const err = validateForm()
			if (err) throw new Error(err)
			const payload = {
				subjectId: Number(form.subjectId),
				userId: Number(form.userId),
				classId: Number(form.classId),
				teachingStart: form.teachingStart.trim() || null,
				teachingEnd: form.teachingEnd.trim(),
				note: form.note || undefined
			}
			if (editId != null) {
				return UpdateExamAssignment(editId, {
					...payload,
					note: form.note || null
				})
			}
			return CreateExamAssignment(payload)
		},
		onSuccess: () => {
			toast.success(
				editId != null
					? 'Đã cập nhật phân công'
					: 'Đã phân công giáo viên'
			)
			setAssignOpen(false)
			setEditId(null)
			setForm(emptyForm())
			void qc.invalidateQueries({ queryKey: ['exam-assignments'] })
			void qc.invalidateQueries({ queryKey: ['exam-assignment-logs'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delMut = useMutation({
		mutationFn: (id: number) => DeleteExamAssignment(id),
		onSuccess: () => {
			toast.success('Đã gỡ phân công')
			void qc.invalidateQueries({ queryKey: ['exam-assignments'] })
			void qc.invalidateQueries({ queryKey: ['exam-assignment-logs'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	if (!canView) {
		return (
			<div className='p-6'>
				<h1 className='text-xl font-semibold'>Không có quyền</h1>
				<p className='text-muted-foreground text-sm'>
					Chỉ khoa / admin / BGH được xem phân công môn học.
				</p>
			</div>
		)
	}

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Phân công môn học
					</h1>
					<p className='text-muted-foreground text-sm'>
						Xem dạng cây: bấm{' '}
						<strong>Hệ → Ngành → Khoa → Môn</strong> để xem giáo
						viên, thời gian giảng dạy và trạng thái. Hết hạn → GV
						không import đề lớp đó.
					</p>
				</div>
				{canManage ? (
					<Button onClick={() => openCreate()}>
						<UserPlus className='mr-2 h-4 w-4' /> Phân công
					</Button>
				) : (
					<Badge variant='secondary'>Chế độ chỉ xem (BGH)</Badge>
				)}
			</div>

			<Card>
				<CardContent className='flex flex-wrap items-end gap-3 pt-4'>
					<div className='min-w-[140px] space-y-1'>
						<Label className='text-xs'>Hệ</Label>
						<Select
							value={filterSystem}
							onValueChange={(v) => {
								setFilterSystem(v)
								setFilterMajor('all')
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder='Hệ' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Tất cả hệ</SelectItem>
								{systems.map((s) => (
									<SelectItem key={s.id} value={String(s.id)}>
										{s.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className='min-w-[200px] space-y-1'>
						<Label className='text-xs'>Ngành</Label>
						<Select
							value={filterMajor}
							onValueChange={setFilterMajor}
						>
							<SelectTrigger>
								<SelectValue placeholder='Ngành' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>
									Tất cả ngành
								</SelectItem>
								{majorsFiltered.map((m) => (
									<SelectItem key={m.id} value={String(m.id)}>
										{m.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className='min-w-[200px] flex-1 space-y-1'>
						<Label className='text-xs'>Tìm môn / GV / lớp</Label>
						<Input
							value={keyword}
							onChange={(e) => setKeyword(e.target.value)}
							placeholder='Tên môn, giáo viên, lớp…'
						/>
					</div>
				</CardContent>
			</Card>

			<Tabs defaultValue='tree'>
				<TabsList>
					<TabsTrigger value='tree'>Cây phân công</TabsTrigger>
					<TabsTrigger value='by-teacher'>
						Theo giáo viên ({byTeacher.length})
					</TabsTrigger>
					<TabsTrigger value='detail'>
						Chi tiết ({assignments.length})
					</TabsTrigger>
					<TabsTrigger value='logs'>
						<History className='mr-1 h-3.5 w-3.5' />
						Nhật ký
					</TabsTrigger>
				</TabsList>

				{/* Cây: Hệ → Ngành → Khoa → Môn → GV / thời gian / trạng thái */}
				<TabsContent value='tree' className='mt-4'>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-base'>
								Phân công theo cây danh mục
							</CardTitle>
							<CardDescription>
								Bấm <strong>Hệ</strong> → ngành · bấm{' '}
								<strong>Ngành</strong> → khoa · bấm{' '}
								<strong>Khoa</strong> → môn · bấm{' '}
								<strong>Môn</strong> → giáo viên, thời gian
								giảng dạy, trạng thái
							</CardDescription>
						</CardHeader>
						<CardContent>
							{assignmentsQ.isLoading || subjectsQ.isLoading ? (
								<div className='flex justify-center py-10'>
									<Loader2 className='h-7 w-7 animate-spin' />
								</div>
							) : !assignTree.length ? (
								<p className='text-muted-foreground py-8 text-center text-sm'>
									Chưa có dữ liệu phân công / danh mục
									{canManage
										? ' — bấm «Phân công» để thêm'
										: ''}
								</p>
							) : (
								<div className='divide-y rounded-md border'>
									{assignTree.map((sys) => {
										const sOpen = openSystems.has(sys.id)
										return (
											<div key={sys.id}>
												<div className='flex flex-wrap items-center gap-2 px-3 py-2.5'>
													<button
														type='button'
														className='hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left'
														onClick={() =>
															toggleSet(
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
														<Badge variant='secondary'>
															{sys.majors.length}{' '}
															ngành
														</Badge>
														<Badge variant='outline'>
															{sys.assignCount}{' '}
															phân công
														</Badge>
													</button>
												</div>
												{sOpen && (
													<div className='border-t bg-background'>
														{sys.majors.map(
															(maj) => {
																const mOpen =
																	openMajors.has(
																		maj.id
																	)
																return (
																	<div
																		key={
																			maj.id
																		}
																		className='border-b last:border-b-0'
																	>
																		<div className='flex flex-wrap items-center gap-2 px-3 py-2 pl-8'>
																			<button
																				type='button'
																				className='hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left'
																				onClick={() =>
																					toggleSet(
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
																				<span className='text-sm font-medium'>
																					{
																						maj.name
																					}
																				</span>
																				<Badge
																					variant='secondary'
																					className='text-[10px]'
																				>
																					{
																						maj
																							.faculties
																							.length
																					}{' '}
																					khoa
																				</Badge>
																				<Badge
																					variant='outline'
																					className='text-[10px]'
																				>
																					{
																						maj.subjectCount
																					}{' '}
																					môn
																				</Badge>
																			</button>
																		</div>
																		{mOpen && (
																			<div className='bg-muted/10'>
																				{maj.faculties.map(
																					(
																						fac
																					) => {
																						const fOpen =
																							openFaculties.has(
																								fac.key
																							)
																						return (
																							<div
																								key={
																									fac.key
																								}
																								className='border-t border-dashed'
																							>
																								<div className='flex flex-wrap items-center gap-2 px-3 py-1.5 pl-14'>
																									<button
																										type='button'
																										className='hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left text-sm'
																										onClick={() =>
																											toggleSet(
																												setOpenFaculties,
																												fac.key
																											)
																										}
																									>
																										{fOpen ? (
																											<ChevronDown className='h-3.5 w-3.5 shrink-0' />
																										) : (
																											<ChevronRight className='h-3.5 w-3.5 shrink-0' />
																										)}
																										<span className='text-muted-foreground text-xs'>
																											Khoa
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
																												fac
																													.subjects
																													.length
																											}{' '}
																											môn
																										</Badge>
																									</button>
																								</div>
																								{fOpen && (
																									<div className='pb-2 pl-20 pr-3'>
																										{fac.subjects.map(
																											(
																												sub
																											) => {
																												const subOpen =
																													openSubjects.has(
																														sub.id
																													)
																												return (
																													<div
																														key={
																															sub.id
																														}
																														className='mb-1 rounded-md border bg-background'
																													>
																														<div className='flex flex-wrap items-center gap-2 px-2 py-1.5'>
																															<button
																																type='button'
																																className='hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-sm'
																																onClick={() =>
																																	toggleSet(
																																		setOpenSubjects,
																																		sub.id
																																	)
																																}
																															>
																																{subOpen ? (
																																	<ChevronDown className='h-3.5 w-3.5 shrink-0' />
																																) : (
																																	<ChevronRight className='h-3.5 w-3.5 shrink-0' />
																																)}
																																<span className='text-muted-foreground text-xs'>
																																	Môn
																																</span>
																																<span className='font-medium'>
																																	{
																																		sub.name
																																	}
																																</span>
																																<Badge
																																	variant='secondary'
																																	className='text-[10px]'
																																>
																																	{
																																		sub
																																			.assignments
																																			.length
																																	}{' '}
																																	GV
																																</Badge>
																															</button>
																															{canManage && (
																																<Button
																																	size='sm'
																																	variant='outline'
																																	className='h-7 text-xs'
																																	type='button'
																																	onClick={(
																																		e
																																	) => {
																																		e.preventDefault()
																																		e.stopPropagation()
																																		openCreate(
																																			{
																																				systemId:
																																					String(
																																						sys.id
																																					),
																																				majorId:
																																					String(
																																						maj.id
																																					),
																																				facultyCode:
																																					fac.code ===
																																					'K?'
																																						? ''
																																						: fac.code,
																																				subjectId:
																																					String(
																																						sub.id
																																					)
																																			}
																																		)
																																	}}
																																>
																																	<Plus className='mr-1 h-3 w-3' />
																																	Phân
																																	công
																																</Button>
																															)}
																														</div>
																														{subOpen && (
																															<div className='border-t px-2 py-2'>
																																{!sub
																																	.assignments
																																	.length ? (
																																	<p className='text-muted-foreground py-2 text-center text-xs'>
																																		Chưa
																																		có
																																		giáo
																																		viên
																																		được
																																		phân
																																		công
																																	</p>
																																) : (
																																	<div className='overflow-x-auto'>
																																		<Table>
																																			<TableHeader>
																																				<TableRow>
																																					<TableHead className='h-8 text-xs'>
																																						Lớp
																																					</TableHead>
																																					<TableHead className='h-8 text-xs'>
																																						Giáo
																																						viên
																																					</TableHead>
																																					<TableHead className='h-8 text-xs'>
																																						Thời
																																						gian
																																						giảng
																																						dạy
																																					</TableHead>
																																					<TableHead className='h-8 text-xs'>
																																						Trạng
																																						thái
																																					</TableHead>
																																					{canManage && (
																																						<TableHead className='h-8 w-20' />
																																					)}
																																				</TableRow>
																																			</TableHeader>
																																			<TableBody>
																																				{sub.assignments.map(
																																					(
																																						a
																																					) => {
																																						const exp =
																																							a.teachingStatus ===
																																								'EXPIRED' ||
																																							a.teachingStatus ===
																																								'UPCOMING'
																																						return (
																																							<TableRow
																																								key={
																																									a.id
																																								}
																																							>
																																								<TableCell className='py-1.5 text-sm'>
																																									{a.className ||
																																										a.classCode ||
																																										'—'}
																																								</TableCell>
																																								<TableCell className='py-1.5 text-sm font-medium'>
																																									{personLabel(
																																										a.displayName,
																																										a.username
																																									)}
																																								</TableCell>
																																								<TableCell className='text-muted-foreground py-1.5 text-xs whitespace-nowrap'>
																																									{a.teachingStart ||
																																										'…'}{' '}
																																									→{' '}
																																									{a.teachingEnd ||
																																										'—'}
																																								</TableCell>
																																								<TableCell className='py-1.5'>
																																									<Badge
																																										variant={
																																											exp
																																												? 'secondary'
																																												: 'default'
																																										}
																																										className={cn(
																																											'text-[10px]',
																																											exp &&
																																												'bg-amber-500/15 text-amber-900 dark:text-amber-100'
																																										)}
																																									>
																																										{a.teachingStatusLabel ||
																																											'Đang hoạt động'}
																																									</Badge>
																																								</TableCell>
																																								{canManage && (
																																									<TableCell className='py-1.5'>
																																										<div className='flex gap-0.5'>
																																											<Button
																																												type='button'
																																												size='icon'
																																												variant='ghost'
																																												className='h-7 w-7'
																																												title='Sửa phân công'
																																												onClick={(
																																													e
																																												) => {
																																													e.preventDefault()
																																													e.stopPropagation()
																																													openEdit(
																																														a
																																													)
																																												}}
																																											>
																																												<Pencil className='h-3.5 w-3.5' />
																																											</Button>
																																											<Button
																																												type='button'
																																												size='icon'
																																												variant='ghost'
																																												className='h-7 w-7'
																																												title='Gỡ phân công'
																																												onClick={(
																																													e
																																												) => {
																																													e.preventDefault()
																																													e.stopPropagation()
																																													if (
																																														confirm(
																																															'Gỡ phân công này?'
																																														)
																																													)
																																														delMut.mutate(
																																															a.id
																																														)
																																												}}
																																											>
																																												<Trash2 className='text-destructive h-3.5 w-3.5' />
																																											</Button>
																																										</div>
																																									</TableCell>
																																								)}
																																							</TableRow>
																																						)
																																					}
																																				)}
																																			</TableBody>
																																		</Table>
																																	</div>
																																)}
																															</div>
																														)}
																													</div>
																												)
																											}
																										)}
																									</div>
																								)}
																							</div>
																						)
																					}
																				)}
																			</div>
																		)}
																	</div>
																)
															}
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
				</TabsContent>

				{/* Theo giáo viên — 1 GV nhiều môn / nhiều lớp */}
				<TabsContent value='by-teacher' className='mt-4'>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-base'>
								Phân công theo giáo viên
							</CardTitle>
							<CardDescription>
								Mỗi GV có thể đảm nhiệm nhiều môn trong khoa và
								nhiều lớp (mỗi dòng = một môn + một lớp).
							</CardDescription>
						</CardHeader>
						<CardContent className='overflow-x-auto'>
							{assignmentsQ.isLoading ? (
								<div className='flex justify-center py-10'>
									<Loader2 className='h-7 w-7 animate-spin' />
								</div>
							) : !byTeacher.length ? (
								<p className='text-muted-foreground py-8 text-center text-sm'>
									Chưa có phân công
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='min-w-[10rem]'>
												Giáo viên
											</TableHead>
											<TableHead className='w-24'>
												Quy mô
											</TableHead>
											<TableHead>
												Môn · Lớp (Hệ / Ngành / Khoa)
											</TableHead>
											{canManage && (
												<TableHead className='w-24' />
											)}
										</TableRow>
									</TableHeader>
									<TableBody>
										{byTeacher.map((t) => {
											const monCount = new Set(
												t.slots.map((s) => s.subjectId)
											).size
											const lopCount = new Set(
												t.slots
													.map((s) => s.classId)
													.filter(
														(id): id is number =>
															id != null
													)
											).size
											return (
												<TableRow key={t.userId}>
													<TableCell className='font-medium'>
														{t.displayName}
													</TableCell>
													<TableCell className='text-muted-foreground text-xs'>
														{t.slots.length} pc
														<br />
														{monCount} môn
														{lopCount > 0
															? ` · ${lopCount} lớp`
															: ''}
													</TableCell>
													<TableCell>
														<ul className='space-y-1'>
															{t.slots.map(
																(s) => (
																	<li
																		key={
																			s.assignmentId
																		}
																		className='flex flex-wrap items-center gap-1 text-sm'
																	>
																		<Badge
																			variant='outline'
																			className='font-normal'
																		>
																			{
																				s.subjectName
																			}
																		</Badge>
																		<span className='text-muted-foreground'>
																			·
																		</span>
																		<span>
																			{
																				s.className
																			}
																		</span>
																		<span className='text-muted-foreground text-xs'>
																			(
																			{
																				s.systemName
																			}{' '}
																			/{' '}
																			{
																				s.majorName
																			}{' '}
																			/{' '}
																			{
																				s.facultyName
																			}
																			)
																		</span>
																		{canManage && (
																			<button
																				type='button'
																				className='text-destructive ml-1 text-xs opacity-60 hover:opacity-100'
																				title='Gỡ'
																				onClick={() => {
																					if (
																						confirm(
																							`Gỡ ${t.displayName} khỏi ${s.subjectName} / ${s.className}?`
																						)
																					)
																						delMut.mutate(
																							s.assignmentId
																						)
																				}}
																			>
																				×
																			</button>
																		)}
																	</li>
																)
															)}
														</ul>
													</TableCell>
													{canManage && (
														<TableCell>
															<Button
																size='sm'
																variant='outline'
																className='h-7'
																title='Thêm môn/lớp cho GV này'
																onClick={() => {
																	const first =
																		t
																			.slots[0]
																	const a =
																		assignments.find(
																			(
																				x
																			) =>
																				x.id ===
																				first?.assignmentId
																		)
																	if (!a) {
																		openCreate(
																			{
																				userId: String(
																					t.userId
																				)
																			}
																		)
																		return
																	}
																	const majRow =
																		majors.find(
																			(
																				m
																			) =>
																				m.id ===
																					a.majorId ||
																				m.code ===
																					a.majorCode
																		)
																	openCreate({
																		systemId:
																			a.systemId !=
																			null
																				? String(
																						a.systemId
																					)
																				: majRow
																					? String(
																							majRow.systemId
																						)
																					: '',
																		majorId:
																			majRow
																				? String(
																						majRow.id
																					)
																				: a.majorId !=
																					  null
																					? String(
																							a.majorId
																						)
																					: '',
																		facultyCode:
																			a.facultyCode ||
																			'',
																		userId: String(
																			t.userId
																		)
																	})
																}}
															>
																<Plus className='h-3.5 w-3.5' />
															</Button>
														</TableCell>
													)}
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value='detail' className='mt-4'>
					<Card>
						<CardContent className='overflow-x-auto pt-4'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Hệ đào tạo</TableHead>
										<TableHead>Ngành đào tạo</TableHead>
										<TableHead>Khoa</TableHead>
										<TableHead>Môn học</TableHead>
										<TableHead>Lớp</TableHead>
										<TableHead>
											Giáo viên giảng dạy
										</TableHead>
										<TableHead>Thời gian GD</TableHead>
										<TableHead>Trạng thái</TableHead>
										<TableHead>Người phân công</TableHead>
										<TableHead>Ghi chú</TableHead>
										{canManage && (
											<TableHead className='w-20' />
										)}
									</TableRow>
								</TableHeader>
								<TableBody>
									{assignments.map((a) => {
										const exp =
											a.teachingStatus === 'EXPIRED' ||
											a.teachingStatus === 'UPCOMING'
										return (
											<TableRow key={a.id}>
												<TableCell className='text-sm'>
													{a.systemName ||
														a.systemCode ||
														'—'}
												</TableCell>
												<TableCell className='text-sm'>
													{a.majorName ||
														a.majorCode ||
														'—'}
												</TableCell>
												<TableCell className='text-sm'>
													{a.facultyName ||
														a.facultyCode ||
														'—'}
												</TableCell>
												<TableCell className='text-sm font-medium'>
													{a.subjectName ||
														a.subjectCode ||
														'—'}
												</TableCell>
												<TableCell className='text-sm'>
													{a.className ||
														a.classCode ||
														'—'}
												</TableCell>
												<TableCell>
													<div className='text-sm font-medium'>
														{personLabel(
															a.displayName,
															a.username
														)}
													</div>
												</TableCell>
												<TableCell className='text-muted-foreground text-xs whitespace-nowrap'>
													{a.teachingStart || '…'} →{' '}
													{a.teachingEnd || '—'}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															exp
																? 'secondary'
																: 'default'
														}
														className={
															exp
																? 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
																: undefined
														}
													>
														{a.teachingStatusLabel ||
															'Đang hoạt động'}
													</Badge>
												</TableCell>
												<TableCell className='text-xs'>
													{personLabel(
														a.assignedByDisplayName,
														a.assignedByUsername
													)}
												</TableCell>
												<TableCell className='text-xs'>
													{a.note || '—'}
												</TableCell>
												{canManage && (
													<TableCell>
														<div className='flex gap-0.5'>
															<Button
																type='button'
																size='icon'
																variant='ghost'
																className='h-8 w-8'
																title='Sửa phân công'
																onClick={(
																	e
																) => {
																	e.preventDefault()
																	e.stopPropagation()
																	openEdit(a)
																}}
															>
																<Pencil className='h-3.5 w-3.5' />
															</Button>
															<Button
																type='button'
																size='icon'
																variant='ghost'
																className='h-8 w-8'
																title='Gỡ phân công'
																onClick={(
																	e
																) => {
																	e.preventDefault()
																	e.stopPropagation()
																	if (
																		confirm(
																			'Gỡ phân công này?'
																		)
																	)
																		delMut.mutate(
																			a.id
																		)
																}}
															>
																<Trash2 className='text-destructive h-3.5 w-3.5' />
															</Button>
														</div>
													</TableCell>
												)}
											</TableRow>
										)
									})}
									{!assignments.length && (
										<TableRow>
											<TableCell
												colSpan={canManage ? 11 : 10}
												className='text-muted-foreground text-center'
											>
												Trống
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value='logs' className='mt-4'>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-base'>
								Nhật ký phân công
							</CardTitle>
							<CardDescription>
								Lưu mọi lần gán / gỡ / sửa phân công.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{logsQ.isLoading ? (
								<div className='flex justify-center py-8'>
									<Loader2 className='h-6 w-6 animate-spin' />
								</div>
							) : (
								<ul className='space-y-2'>
									{logs.map((log) => (
										<li
											key={log.id}
											className='rounded-md border px-3 py-2 text-sm'
										>
											<div className='flex flex-wrap items-center gap-2'>
												<Badge
													variant={
														log.action === 'ASSIGN'
															? 'default'
															: log.action ===
																  'UPDATE'
																? 'secondary'
																: 'destructive'
													}
												>
													{log.action === 'ASSIGN'
														? 'Phân công'
														: log.action ===
															  'UPDATE'
															? 'Sửa'
															: 'Gỡ'}
												</Badge>
												<span>{log.summary}</span>
											</div>
											<div className='text-muted-foreground mt-1 text-xs'>
												{new Date(
													log.createdAt
												).toLocaleString('vi-VN')}
												{' · bởi '}
												{log.actorDisplayName ||
													log.actorUsername ||
													'—'}
											</div>
										</li>
									))}
									{!logs.length && (
										<p className='text-muted-foreground text-center text-sm'>
											Chưa có nhật ký
										</p>
									)}
								</ul>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<Dialog
				open={assignOpen}
				onOpenChange={(v) => {
					setAssignOpen(v)
					if (!v) {
						setEditId(null)
						setForm(emptyForm())
					}
				}}
			>
				{/* Form 2 cột — vừa 1 màn, không cuộn dọc dài */}
				<DialogContent className='max-h-[min(92vh,40rem)] w-[min(100vw-1.5rem,52rem)] max-w-3xl h-auto gap-3 overflow-y-auto p-4 sm:p-5'>
					<DialogHeader className='space-y-1 pb-0'>
						<DialogTitle className='text-lg'>
							{editId != null
								? 'Sửa phân công'
								: 'Phân công giáo viên dạy môn'}
						</DialogTitle>
						<p className='text-muted-foreground text-xs'>
							Hệ → Ngành → Khoa → Môn → Lớp → GV + thời gian giảng
							dạy
						</p>
					</DialogHeader>

					<div className='grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2'>
						{editId != null &&
							(!form.classId || !form.teachingEnd) && (
								<div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs sm:col-span-2'>
									Phân công cũ thiếu dữ liệu — vui lòng chọn{' '}
									{!form.classId ? (
										<strong>lớp</strong>
									) : null}
									{!form.classId && !form.teachingEnd
										? ' và '
										: null}
									{!form.teachingEnd ? (
										<strong>ngày kết thúc giảng dạy</strong>
									) : null}{' '}
									rồi bấm Lưu.
								</div>
							)}
						<div className='space-y-1'>
							<Label className='text-xs'>Hệ đào tạo *</Label>
							<Select
								value={form.systemId || undefined}
								onValueChange={(v) =>
									setForm((f) => ({
										...f,
										systemId: v,
										majorId: '',
										facultyCode: '',
										subjectId: '',
										classId: '',
										userId: editId != null ? f.userId : ''
									}))
								}
							>
								<SelectTrigger className='h-9'>
									<SelectValue placeholder='Chọn hệ' />
								</SelectTrigger>
								<SelectContent>
									{systems.map((s) => (
										<SelectItem
											key={s.id}
											value={String(s.id)}
										>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-1'>
							<Label className='text-xs'>Ngành đào tạo *</Label>
							<Select
								value={form.majorId || undefined}
								onValueChange={(v) =>
									setForm((f) => ({
										...f,
										majorId: v,
										facultyCode: '',
										subjectId: '',
										classId: '',
										userId: editId != null ? f.userId : ''
									}))
								}
							>
								<SelectTrigger className='h-9'>
									<SelectValue placeholder='Chọn ngành' />
								</SelectTrigger>
								<SelectContent>
									{formMajors.map((m) => (
										<SelectItem
											key={m.id}
											value={String(m.id)}
										>
											{m.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-1'>
							<Label className='text-xs'>Khoa *</Label>
							{!form.majorId ? (
								<p className='text-muted-foreground flex h-9 items-center text-xs'>
									Chọn ngành trước
								</p>
							) : (
								<Select
									value={form.facultyCode || undefined}
									onValueChange={(v) =>
										setForm((f) => ({
											...f,
											facultyCode: v,
											subjectId: '',
											userId:
												editId != null ? f.userId : ''
										}))
									}
								>
									<SelectTrigger className='h-9'>
										<SelectValue placeholder='Chọn khoa' />
									</SelectTrigger>
									<SelectContent>
										{formFaculties.map((f) => (
											<SelectItem
												key={f.code}
												value={f.code}
											>
												{f.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>

						<div className='space-y-1'>
							<Label className='text-xs'>Môn học *</Label>
							{!form.facultyCode ? (
								<p className='text-muted-foreground flex h-9 items-center text-xs'>
									Chọn khoa trước
								</p>
							) : (
								<Select
									value={form.subjectId || undefined}
									onValueChange={(v) =>
										setForm((f) => ({
											...f,
											subjectId: v
										}))
									}
								>
									<SelectTrigger className='h-9'>
										<SelectValue placeholder='Chọn môn' />
									</SelectTrigger>
									<SelectContent>
										{formSubjects.map((s) => (
											<SelectItem
												key={s.id}
												value={String(s.id)}
											>
												{s.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>

						<div className='space-y-1'>
							<Label className='text-xs'>Lớp *</Label>
							{!form.majorId ? (
								<p className='text-muted-foreground flex h-9 items-center text-xs'>
									Chọn ngành trước
								</p>
							) : (
								<Select
									value={form.classId || undefined}
									onValueChange={(v) =>
										setForm((f) => ({
											...f,
											classId: v,
											userId:
												editId != null ? f.userId : ''
										}))
									}
								>
									<SelectTrigger className='h-9'>
										<SelectValue placeholder='Chọn lớp' />
									</SelectTrigger>
									<SelectContent>
										{formClasses.map((c) => (
											<SelectItem
												key={c.id}
												value={String(c.id)}
											>
												{c.name}
												{c.cohort
													? ` (${c.cohort})`
													: ''}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{form.majorId && !formClasses.length && (
								<p className='text-muted-foreground text-[11px]'>
									Chưa có lớp — thêm tại «Danh mục lớp»
								</p>
							)}
						</div>

						<div className='space-y-1'>
							<Label className='text-xs'>
								Giáo viên giảng dạy *
							</Label>
							{!form.facultyCode || !form.classId ? (
								<p className='text-muted-foreground flex h-9 items-center text-xs'>
									Chọn khoa và lớp trước
								</p>
							) : (
								<Select
									value={form.userId || undefined}
									onValueChange={(v) =>
										setForm((f) => ({ ...f, userId: v }))
									}
								>
									<SelectTrigger className='h-9'>
										<SelectValue placeholder='Chọn giáo viên' />
									</SelectTrigger>
									<SelectContent>
										{formTeachers.map((t) => (
											<SelectItem
												key={t.id}
												value={String(t.id)}
											>
												{personLabel(
													t.displayName,
													t.username
												)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{form.facultyCode &&
								form.classId &&
								!formTeachers.length && (
									<p className='text-muted-foreground text-[11px]'>
										Không còn GV khả dụng trong khoa
									</p>
								)}
						</div>

						<div className='space-y-1'>
							<Label className='text-xs'>Bắt đầu giảng dạy</Label>
							<Input
								type='date'
								className='h-9'
								value={form.teachingStart}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										teachingStart: e.target.value
									}))
								}
							/>
						</div>

						<div className='space-y-1'>
							<Label className='text-xs'>
								Kết thúc giảng dạy *
							</Label>
							<Input
								type='date'
								className='h-9'
								value={form.teachingEnd}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										teachingEnd: e.target.value
									}))
								}
							/>
						</div>

						<div className='space-y-1 sm:col-span-2'>
							<Label className='text-xs'>Ghi chú</Label>
							<Input
								className='h-9'
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

						{alreadyOnSlot.length > 0 && (
							<div className='bg-muted/40 rounded-md border px-2.5 py-1.5 text-xs sm:col-span-2'>
								<span className='text-muted-foreground'>
									Đã có {alreadyOnSlot.length} GV trên
									môn+lớp:{' '}
								</span>
								{alreadyOnSlot.map((a, i) => (
									<span key={a.id}>
										{i > 0 ? ', ' : ''}
										{personLabel(a.displayName, a.username)}
									</span>
								))}
							</div>
						)}

						<p className='text-muted-foreground text-[11px] leading-snug sm:col-span-2'>
							Hết ngày kết thúc → «Hết thời gian giảng dạy» — GV
							không import đề lớp này. Cùng GV có thể gán thêm
							môn/lớp khác trong khoa.
						</p>
					</div>

					<DialogFooter className='gap-2 sm:justify-end'>
						<Button
							variant='outline'
							onClick={() => {
								setAssignOpen(false)
								setEditId(null)
								setForm(emptyForm())
							}}
						>
							Hủy
						</Button>
						<Button
							type='button'
							disabled={saveMut.isPending}
							onClick={() => {
								const err = validateForm()
								if (err) {
									toast.error(err)
									return
								}
								saveMut.mutate()
							}}
						>
							{saveMut.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							{editId != null ? 'Lưu' : 'Lưu phân công'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
