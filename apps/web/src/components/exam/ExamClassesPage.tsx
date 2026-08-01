/**
 * Danh mục lớp thi — mỗi lớp thuộc Hệ đào tạo + Ngành đào tạo.
 * Dùng khi GV import đề / rút đề (chọn lớp).
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateExamClass,
	DeleteExamClass,
	ListExamClasses,
	ListExamMajors,
	ListExamSystems,
	UpdateExamClass,
	type ExamClassCatalog
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

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
	const value = String(index + 1).padStart(2, '0')
	return { value, label: `Tháng ${index + 1}` }
})
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from(
	{ length: currentYear - 1949 + 30 },
	(_, index) => String(currentYear + 30 - index)
)

function MonthYearPicker({
	value,
	onChange,
	label
}: {
	value: string
	onChange: (_value: string) => void
	label: string
}) {
	const match = /^(\d{4})-(\d{2})$/.exec(value)
	const selectedYear = match?.[1] ?? ''
	const selectedMonth = match?.[2] ?? ''
	const updateValue = (month: string, year: string) => {
		onChange(
			`${year || currentYear}-${month || String(new Date().getMonth() + 1).padStart(2, '0')}`
		)
	}

	return (
		<div className='grid grid-cols-2 gap-1.5'>
			<Select
				value={selectedMonth || undefined}
				onValueChange={(month) => updateValue(month, selectedYear)}
			>
				<SelectTrigger
					className='h-12 min-w-0'
					aria-label={`${label}: tháng`}
				>
					<SelectValue placeholder='Tháng' />
				</SelectTrigger>
				<SelectContent>
					{MONTH_OPTIONS.map((month) => (
						<SelectItem key={month.value} value={month.value}>
							{month.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={selectedYear || undefined}
				onValueChange={(year) => updateValue(selectedMonth, year)}
			>
				<SelectTrigger
					className='h-12 min-w-0'
					aria-label={`${label}: năm`}
				>
					<SelectValue placeholder='Năm' />
				</SelectTrigger>
				<SelectContent>
					{YEAR_OPTIONS.map((year) => (
						<SelectItem key={year} value={year}>
							{year}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}

function suggestCode(name: string): string {
	const slug = name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/gi, 'd')
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '')
		.slice(0, 16)
	return slug || ''
}

export default function ExamClassesPage() {
	const qc = useQueryClient()
	const canManage = canManageExamCatalog()

	const [filterSystem, setFilterSystem] = useState<string>('all')
	const [filterMajor, setFilterMajor] = useState<string>('all')
	const [keyword, setKeyword] = useState('')
	const [open, setOpen] = useState(false)
	const [editId, setEditId] = useState<number | null>(null)
	const [form, setForm] = useState({
		systemId: '',
		majorId: '',
		code: '',
		name: '',
		/** YYYY-MM (input type=month) */
		cohortStart: '',
		/** YYYY-MM */
		cohortEnd: '',
		description: ''
	})

	const systemsQ = useQuery({
		queryKey: ['exam-systems'],
		queryFn: () => ListExamSystems()
	})
	const majorsQ = useQuery({
		queryKey: ['exam-majors'],
		queryFn: () => ListExamMajors()
	})
	const classesQ = useQuery({
		queryKey: ['exam-classes-catalog', filterSystem, filterMajor, keyword],
		queryFn: () =>
			ListExamClasses({
				systemId:
					filterSystem !== 'all' ? Number(filterSystem) : undefined,
				majorId:
					filterMajor !== 'all' ? Number(filterMajor) : undefined,
				q: keyword.trim() || undefined
			})
	})

	const systems = systemsQ.data || []
	const majors = majorsQ.data || []
	const classes = classesQ.data || []

	const majorsForFilter = useMemo(() => {
		if (filterSystem === 'all') return majors
		const sid = Number(filterSystem)
		return majors.filter((m) => m.systemId === sid)
	}, [majors, filterSystem])

	const majorsForForm = useMemo(() => {
		if (!form.systemId) return []
		const sid = Number(form.systemId)
		return majors.filter((m) => m.systemId === sid)
	}, [majors, form.systemId])

	/** Parse cohort «MM/YYYY - MM/YYYY» hoặc «YYYY-MM/…» → [startYm, endYm] */
	function parseCohortToMonths(cohort: string | null | undefined): {
		start: string
		end: string
	} {
		const raw = String(cohort || '').trim()
		if (!raw) return { start: '', end: '' }
		// MM/YYYY pairs
		const mm = [...raw.matchAll(/(\d{1,2})\s*\/\s*(\d{4})/g)]
		if (mm.length >= 2) {
			const s = mm[0]!
			const e = mm[mm.length - 1]!
			return {
				start: `${s[2]}-${String(s[1]).padStart(2, '0')}`,
				end: `${e[2]}-${String(e[1]).padStart(2, '0')}`
			}
		}
		if (mm.length === 1) {
			const e = mm[0]!
			const end = `${e[2]}-${String(e[1]).padStart(2, '0')}`
			return { start: end, end }
		}
		// YYYY-MM pairs
		const ym = [...raw.matchAll(/(\d{4})-(\d{2})/g)]
		if (ym.length >= 2) {
			return {
				start: `${ym[0]![1]}-${ym[0]![2]}`,
				end: `${ym[ym.length - 1]![1]}-${ym[ym.length - 1]![2]}`
			}
		}
		if (ym.length === 1) {
			const v = `${ym[0]![1]}-${ym[0]![2]}`
			return { start: v, end: v }
		}
		// Chỉ năm: 2024-2027 → 01/start - 12/end
		const years = raw.match(/\d{4}/g) || []
		if (years.length >= 2) {
			return {
				start: `${years[0]}-01`,
				end: `${years[years.length - 1]}-12`
			}
		}
		if (years.length === 1) {
			return { start: `${years[0]}-01`, end: `${years[0]}-12` }
		}
		return { start: '', end: '' }
	}

	function formatCohort(startYm: string, endYm: string): string {
		const f = (ym: string) => {
			const m = ym.match(/^(\d{4})-(\d{2})$/)
			if (!m) return ''
			return `${m[2]}/${m[1]}`
		}
		const a = f(startYm)
		const b = f(endYm)
		if (a && b) return `${a} - ${b}`
		return b || a || ''
	}

	function resetForm() {
		setForm({
			systemId: '',
			majorId: '',
			code: '',
			name: '',
			cohortStart: '',
			cohortEnd: '',
			description: ''
		})
		setEditId(null)
	}

	function openCreate() {
		resetForm()
		setOpen(true)
	}

	function openEdit(row: ExamClassCatalog) {
		setEditId(row.id)
		const { start, end } = parseCohortToMonths(row.cohort)
		setForm({
			systemId: row.systemId != null ? String(row.systemId) : '',
			majorId: row.majorId != null ? String(row.majorId) : '',
			code: row.code,
			name: row.name,
			cohortStart: start,
			cohortEnd: end,
			description: row.description || ''
		})
		setOpen(true)
	}

	const saveMut = useMutation({
		mutationFn: async () => {
			const name = form.name.trim()
			const code = form.code.trim().toUpperCase()
			if (!form.systemId) throw new Error('Chọn hệ đào tạo')
			if (!form.majorId) throw new Error('Chọn ngành đào tạo')
			if (!name) throw new Error('Nhập tên lớp')
			if (!code) throw new Error('Nhập mã lớp')
			if (!form.cohortStart || !form.cohortEnd) {
				throw new Error(
					'Nhập đủ tháng/năm bắt đầu và kết thúc khóa (bắt buộc)'
				)
			}
			if (form.cohortStart > form.cohortEnd) {
				throw new Error(
					'Thời điểm bắt đầu khóa không được sau kết thúc'
				)
			}
			const cohort = formatCohort(form.cohortStart, form.cohortEnd)
			const majorId = Number(form.majorId)
			if (editId != null) {
				return UpdateExamClass(editId, {
					code,
					name,
					majorId,
					cohort,
					description: form.description.trim() || null
				})
			}
			return CreateExamClass({
				code,
				name,
				majorId,
				cohort,
				description: form.description.trim() || undefined
			})
		},
		onSuccess: () => {
			toast.success(editId != null ? 'Đã cập nhật lớp' : 'Đã thêm lớp')
			setOpen(false)
			resetForm()
			void qc.invalidateQueries({ queryKey: ['exam-classes-catalog'] })
			void qc.invalidateQueries({ queryKey: ['exam-classes'] })
			void qc.invalidateQueries({ queryKey: ['exam-classes-import'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delMut = useMutation({
		mutationFn: (id: number) => DeleteExamClass(id),
		onSuccess: () => {
			toast.success('Đã xóa lớp khỏi danh mục')
			void qc.invalidateQueries({ queryKey: ['exam-classes-catalog'] })
			void qc.invalidateQueries({ queryKey: ['exam-classes'] })
			void qc.invalidateQueries({ queryKey: ['exam-classes-import'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Danh mục lớp
					</h1>
					<p className='text-muted-foreground text-sm'>
						Mỗi lớp thuộc <strong>hệ đào tạo</strong> và{' '}
						<strong>ngành đào tạo</strong>. Trạng thái theo niên
						khóa: <strong>Hoạt động</strong> /{' '}
						<strong>Hết niên khóa</strong> (lớp hết khóa không phân
						công GV hay import đề).
					</p>
				</div>
				{canManage ? (
					<Button onClick={openCreate}>
						<Plus className='mr-2 h-4 w-4' />
						Thêm lớp
					</Button>
				) : (
					<Badge variant='secondary'>Chỉ xem</Badge>
				)}
			</div>

			<div className='flex flex-wrap items-end gap-3'>
				<div className='space-y-1'>
					<Label className='text-xs text-muted-foreground'>
						Hệ đào tạo
					</Label>
					<Select
						value={filterSystem}
						onValueChange={(v) => {
							setFilterSystem(v)
							setFilterMajor('all')
						}}
					>
						<SelectTrigger className='w-[180px]'>
							<SelectValue placeholder='Tất cả hệ' />
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
				<div className='space-y-1'>
					<Label className='text-xs text-muted-foreground'>
						Ngành đào tạo
					</Label>
					<Select value={filterMajor} onValueChange={setFilterMajor}>
						<SelectTrigger className='w-[240px]'>
							<SelectValue placeholder='Tất cả ngành' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>Tất cả ngành</SelectItem>
							{majorsForFilter.map((m) => (
								<SelectItem key={m.id} value={String(m.id)}>
									{m.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className='space-y-1'>
					<Label className='text-xs text-muted-foreground'>
						Tìm kiếm
					</Label>
					<Input
						className='w-[220px]'
						placeholder='Tên / mã lớp…'
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
					/>
				</div>
			</div>

			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='flex items-center gap-2 text-base'>
						<GraduationCap className='h-4 w-4' />
						Lớp thi ({classes.length})
					</CardTitle>
					<CardDescription>
						Cột: Hệ → Ngành → Tên lớp · Mã · Khóa · Trạng thái. Hết
						niên khóa: không phân công GV / không import đề cho lớp
						đó.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{classesQ.isLoading ? (
						<div className='flex justify-center py-12'>
							<Loader2 className='h-7 w-7 animate-spin' />
						</div>
					) : classes.length === 0 ? (
						<p className='text-muted-foreground py-8 text-center text-sm'>
							Chưa có lớp. Bấm «Thêm lớp» và chọn hệ → ngành.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Hệ đào tạo</TableHead>
									<TableHead>Ngành đào tạo</TableHead>
									<TableHead>Tên lớp</TableHead>
									<TableHead>Mã lớp</TableHead>
									<TableHead>Khóa</TableHead>
									<TableHead>Trạng thái</TableHead>
									{canManage && (
										<TableHead className='w-28' />
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{classes.map((c) => {
									const expired =
										c.status === 'EXPIRED' ||
										c.statusLabel === 'Hết niên khóa'
									return (
										<TableRow
											key={c.id}
											className={
												expired
													? 'bg-muted/40 opacity-90'
													: undefined
											}
										>
											<TableCell>
												{c.systemName || '—'}
											</TableCell>
											<TableCell>
												{c.majorName || '—'}
											</TableCell>
											<TableCell className='font-medium'>
												{c.name}
											</TableCell>
											<TableCell className='text-muted-foreground font-mono text-xs'>
												{c.code}
											</TableCell>
											<TableCell className='text-muted-foreground text-sm'>
												{c.cohort || '—'}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														expired
															? 'secondary'
															: 'default'
													}
													className={
														expired
															? 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
															: undefined
													}
												>
													{c.statusLabel ||
														(expired
															? 'Hết niên khóa'
															: 'Hoạt động')}
												</Badge>
											</TableCell>
											{canManage && (
												<TableCell>
													<div className='flex gap-1'>
														<Button
															size='icon'
															variant='ghost'
															className='h-8 w-8'
															onClick={() =>
																openEdit(c)
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
																		`Xóa lớp «${c.name}» khỏi danh mục?`
																	)
																)
																	delMut.mutate(
																		c.id
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
							{editId != null ? 'Sửa lớp' : 'Thêm lớp'}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-3 py-1'>
						<div className='space-y-1.5'>
							<Label>Hệ đào tạo *</Label>
							<Select
								value={form.systemId || undefined}
								onValueChange={(v) =>
									setForm((f) => ({
										...f,
										systemId: v,
										majorId: ''
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn hệ…' />
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
						<div className='space-y-1.5'>
							<Label>Ngành đào tạo *</Label>
							<Select
								value={form.majorId || undefined}
								onValueChange={(v) =>
									setForm((f) => ({ ...f, majorId: v }))
								}
								disabled={!form.systemId}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={
											form.systemId
												? 'Chọn ngành…'
												: 'Chọn hệ trước'
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{majorsForForm.map((m) => (
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
						<div className='space-y-1.5'>
							<Label>Tên lớp *</Label>
							<Input
								value={form.name}
								placeholder='VD: Điều dưỡng K4'
								onChange={(e) => {
									const name = e.target.value
									setForm((f) => ({
										...f,
										name,
										code:
											editId == null && !f.code
												? suggestCode(name)
												: f.code
									}))
								}}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Mã lớp *</Label>
							<Input
								value={form.code}
								placeholder='VD: CDDD4'
								className='font-mono uppercase'
								onChange={(e) =>
									setForm((f) => ({
										...f,
										code: e.target.value.toUpperCase()
									}))
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Khóa / niên khóa *</Label>
							<div className='grid grid-cols-2 gap-2'>
								<div>
									<p className='text-muted-foreground mb-1 text-xs'>
										Bắt đầu (tháng/năm)
									</p>
									<MonthYearPicker
										label='Bắt đầu'
										value={form.cohortStart}
										onChange={(cohortStart) =>
											setForm((f) => ({
												...f,
												cohortStart
											}))
										}
									/>
								</div>
								<div>
									<p className='text-muted-foreground mb-1 text-xs'>
										Kết thúc (tháng/năm)
									</p>
									<MonthYearPicker
										label='Kết thúc'
										value={form.cohortEnd}
										onChange={(cohortEnd) =>
											setForm((f) => ({
												...f,
												cohortEnd
											}))
										}
									/>
								</div>
							</div>
							<p className='text-muted-foreground mt-1 text-xs'>
								Bắt buộc. Trạng thái: tháng/năm hiện tại ≤ kết
								thúc → <strong>Hoạt động</strong>; sau đó →{' '}
								<strong>Hết niên khóa</strong>
								{form.cohortStart && form.cohortEnd
									? ` · Lưu: ${formatCohort(form.cohortStart, form.cohortEnd)}`
									: ''}
							</p>
						</div>
						<div className='space-y-1.5'>
							<Label>Ghi chú</Label>
							<Input
								value={form.description}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										description: e.target.value
									}))
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setOpen(false)
								resetForm()
							}}
						>
							Hủy
						</Button>
						<Button
							disabled={
								saveMut.isPending ||
								!form.cohortStart ||
								!form.cohortEnd
							}
							onClick={() => saveMut.mutate()}
						>
							{saveMut.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							{editId != null ? 'Lưu' : 'Thêm'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
