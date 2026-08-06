import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateLeaveExtraStandard,
	CreateLeaveObjectType,
	CreateLeaveRegulation,
	DeleteLeaveExtraStandard,
	DeleteLeaveObjectType,
	DeleteLeaveRegulation,
	GetLeaveMeta,
	ListLeaveExtraStandards,
	ListLeaveObjectTypes,
	ListLeaveRegulations,
	UpdateLeaveExtraStandard,
	UpdateLeaveObjectType,
	UpdateLeaveRegulation,
	type LeaveExtraStandard,
	type LeaveObjectType,
	type LeaveObjectTypeRow,
	type LeaveRegulation
} from '@/api/leave'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isSuperAdmin } from '@/lib/utils'

function formatYears(min: number | null, max: number | null) {
	if (min == null && max == null) return 'Không phân bậc'
	if (min != null && max == null) return `Từ ${min} năm trở lên`
	if (min != null && max != null) return `Từ ${min} đến dưới ${max} năm`
	return `Dưới ${max} năm`
}

export default function RegulationsPage() {
	const admin = isSuperAdmin()
	const qc = useQueryClient()

	const { data: regulations = [], isLoading: loadingReg } = useQuery({
		queryKey: ['leave-regulations'],
		queryFn: () => ListLeaveRegulations()
	})
	const { data: objectTypes = [], isLoading: loadingOt } = useQuery({
		queryKey: ['leave-object-types'],
		queryFn: () => ListLeaveObjectTypes(false)
	})
	const { data: extras = [], isLoading: loadingEx } = useQuery({
		queryKey: ['leave-extra-standards'],
		queryFn: () => ListLeaveExtraStandards({ activeOnly: false })
	})
	const { data: meta } = useQuery({
		queryKey: ['leave-meta'],
		queryFn: GetLeaveMeta
	})

	const annual = useMemo(
		() => regulations.filter((r) => r.leaveType === 'ANNUAL'),
		[regulations]
	)
	const displayedObjectTypes = useMemo<LeaveObjectTypeRow[]>(() => {
		if (objectTypes.length) return objectTypes
		return (meta?.objectTypes || []).map((o, index) => ({
			id: -(index + 1),
			createdAt: '',
			updatedAt: '',
			code: o.code,
			name: o.label,
			sortOrder: index + 1,
			isActive: true
		}))
	}, [objectTypes, meta?.objectTypes])
	const displayedExtras = useMemo<LeaveExtraStandard[]>(() => {
		if (extras.length) return extras
		const combined = [
			...(meta?.extra10Reasons || []).map((e) => ({ ...e, days: 10 })),
			...(meta?.extra5Reasons || []).map((e) => ({ ...e, days: 5 }))
		]
		return combined.map((e, index) => ({
			id: -(index + 1),
			createdAt: '',
			updatedAt: '',
			code: e.code,
			label: e.label,
			days: e.days,
			sortOrder: index + 1,
			isActive: true
		}))
	}, [extras, meta?.extra10Reasons, meta?.extra5Reasons])

	// ── Object type dialog ──
	const [otOpen, setOtOpen] = useState(false)
	const [otEdit, setOtEdit] = useState<LeaveObjectTypeRow | null>(null)
	const [otCode, setOtCode] = useState('')
	const [otName, setOtName] = useState('')
	const [otSort, setOtSort] = useState(99)

	const saveOt = useMutation({
		mutationFn: async () => {
			if (otEdit) {
				return UpdateLeaveObjectType(otEdit.id, {
					name: otName.trim(),
					sortOrder: otSort
				})
			}
			return CreateLeaveObjectType({
				code: otCode.trim().toUpperCase(),
				name: otName.trim(),
				sortOrder: otSort
			})
		},
		onSuccess: () => {
			toast.success(
				otEdit ? 'Đã cập nhật đối tượng' : 'Đã thêm đối tượng'
			)
			qc.invalidateQueries({ queryKey: ['leave-object-types'] })
			qc.invalidateQueries({ queryKey: ['leave-meta'] })
			setOtOpen(false)
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delOt = useMutation({
		mutationFn: (id: number) => DeleteLeaveObjectType(id),
		onSuccess: () => {
			toast.success('Đã xóa')
			qc.invalidateQueries({ queryKey: ['leave-object-types'] })
			qc.invalidateQueries({ queryKey: ['leave-meta'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	// ── Extra standard dialog ──
	const [exOpen, setExOpen] = useState(false)
	const [exEdit, setExEdit] = useState<LeaveExtraStandard | null>(null)
	const [exCode, setExCode] = useState('')
	const [exLabel, setExLabel] = useState('')
	const [exDays, setExDays] = useState<5 | 10>(10)
	const [exSort, setExSort] = useState(99)

	const saveEx = useMutation({
		mutationFn: async () => {
			if (exEdit) {
				return UpdateLeaveExtraStandard(exEdit.id, {
					label: exLabel.trim(),
					days: exDays,
					sortOrder: exSort
				})
			}
			return CreateLeaveExtraStandard({
				code: exCode.trim(),
				label: exLabel.trim(),
				days: exDays,
				sortOrder: exSort
			})
		},
		onSuccess: () => {
			toast.success(exEdit ? 'Đã cập nhật' : 'Đã thêm tiêu chuẩn')
			qc.invalidateQueries({ queryKey: ['leave-extra-standards'] })
			qc.invalidateQueries({ queryKey: ['leave-meta'] })
			setExOpen(false)
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delEx = useMutation({
		mutationFn: (id: number) => DeleteLeaveExtraStandard(id),
		onSuccess: () => {
			toast.success('Đã xóa')
			qc.invalidateQueries({ queryKey: ['leave-extra-standards'] })
			qc.invalidateQueries({ queryKey: ['leave-meta'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	// ── Annual regulation dialog ──
	const [regOpen, setRegOpen] = useState(false)
	const [regEdit, setRegEdit] = useState<LeaveRegulation | null>(null)
	const [regOt, setRegOt] = useState('')
	const [regMin, setRegMin] = useState('')
	const [regMax, setRegMax] = useState('')
	const [regDays, setRegDays] = useState('20')
	const [regLabel, setRegLabel] = useState('')
	const [regDesc, setRegDesc] = useState('')

	const saveReg = useMutation({
		mutationFn: async () => {
			const baseDays = Number(regDays)
			if (!Number.isFinite(baseDays) || baseDays < 0) {
				throw new Error('Số ngày không hợp lệ')
			}
			const minYears = regMin.trim() === '' ? null : Number(regMin)
			const maxYears = regMax.trim() === '' ? null : Number(regMax)
			if (regEdit) {
				return UpdateLeaveRegulation(regEdit.id, {
					baseDays,
					minYears,
					maxYears,
					label: regLabel.trim() || null,
					description: regDesc.trim() || null
				})
			}
			if (!regOt) throw new Error('Chọn đối tượng')
			return CreateLeaveRegulation({
				leaveType: 'ANNUAL',
				objectType: regOt as LeaveObjectType,
				minYears,
				maxYears,
				baseDays,
				label: regLabel.trim() || null,
				description: regDesc.trim() || null
			})
		},
		onSuccess: () => {
			toast.success(regEdit ? 'Đã cập nhật quy định' : 'Đã thêm quy định')
			qc.invalidateQueries({ queryKey: ['leave-regulations'] })
			setRegOpen(false)
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delReg = useMutation({
		mutationFn: (id: number) => DeleteLeaveRegulation(id),
		onSuccess: () => {
			toast.success('Đã xóa')
			qc.invalidateQueries({ queryKey: ['leave-regulations'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	function openOtCreate() {
		setOtEdit(null)
		setOtCode('')
		setOtName('')
		setOtSort(99)
		setOtOpen(true)
	}
	function openOtEdit(o: LeaveObjectTypeRow) {
		setOtEdit(o)
		setOtCode(o.code)
		setOtName(o.name)
		setOtSort(o.sortOrder)
		setOtOpen(true)
	}
	function openExCreate() {
		setExEdit(null)
		setExCode('')
		setExLabel('')
		setExDays(10)
		setExSort(99)
		setExOpen(true)
	}
	function openExEdit(e: LeaveExtraStandard) {
		setExEdit(e)
		setExCode(e.code)
		setExLabel(e.label)
		setExDays(e.days === 5 ? 5 : 10)
		setExSort(e.sortOrder)
		setExOpen(true)
	}
	function openRegCreate() {
		setRegEdit(null)
		setRegOt(objectTypes[0]?.code || 'SQ')
		setRegMin('0')
		setRegMax('15')
		setRegDays('20')
		setRegLabel('')
		setRegDesc('')
		setRegOpen(true)
	}
	function openRegEdit(r: LeaveRegulation) {
		setRegEdit(r)
		setRegOt(r.objectType || '')
		setRegMin(r.minYears != null ? String(r.minYears) : '')
		setRegMax(r.maxYears != null ? String(r.maxYears) : '')
		setRegDays(String(r.baseDays))
		setRegLabel(r.label || '')
		setRegDesc(r.description || '')
		setRegOpen(true)
	}

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-2xl font-bold tracking-tight'>
					Quy định về phép
				</h2>
				<p className='text-sm text-muted-foreground'>
					Bảng đối tượng · Tiêu chuẩn phép hằng năm · Tiêu chuẩn phép
					thêm · Phép đặc biệt
				</p>
			</div>

			<Tabs defaultValue='annual'>
				<TabsList className='flex h-auto flex-wrap gap-1'>
					<TabsTrigger value='objects'>
						Đối tượng ({displayedObjectTypes.length})
					</TabsTrigger>
					<TabsTrigger value='annual'>Phép hằng năm</TabsTrigger>
					<TabsTrigger value='extra'>
						Phép thêm ({displayedExtras.length})
					</TabsTrigger>
					<TabsTrigger value='special'>Phép đặc biệt</TabsTrigger>
				</TabsList>

				{/* ── Đối tượng ── */}
				<TabsContent value='objects' className='space-y-3'>
					<div className='flex items-center justify-between'>
						<p className='text-sm text-muted-foreground'>
							Ma_ĐT / Tên_ĐT theo quy định
						</p>
						{admin && (
							<Button size='sm' onClick={openOtCreate}>
								<Plus className='mr-1 h-4 w-4' />
								Thêm
							</Button>
						)}
					</div>
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Ma_ĐT</TableHead>
									<TableHead>Tên_ĐT</TableHead>
									<TableHead>Thứ tự</TableHead>
									<TableHead>TT</TableHead>
									{admin && <TableHead className='w-24' />}
								</TableRow>
							</TableHeader>
							<TableBody>
								{loadingOt && (
									<TableRow>
										<TableCell
											colSpan={5}
											className='text-center'
										>
											<Loader2 className='mx-auto h-5 w-5 animate-spin' />
										</TableCell>
									</TableRow>
								)}
								{displayedObjectTypes.map((o) => (
									<TableRow key={o.id}>
										<TableCell className='font-mono font-semibold'>
											{o.code}
										</TableCell>
										<TableCell>{o.name}</TableCell>
										<TableCell>{o.sortOrder}</TableCell>
										<TableCell>
											<Badge
												variant={
													o.isActive
														? 'default'
														: 'secondary'
												}
											>
												{o.isActive ? 'HĐ' : 'Ẩn'}
											</Badge>
										</TableCell>
										{admin && o.id > 0 && (
											<TableCell>
												<div className='flex gap-1'>
													<Button
														size='icon'
														variant='ghost'
														onClick={() =>
															openOtEdit(o)
														}
													>
														<Pencil className='h-4 w-4' />
													</Button>
													<Button
														size='icon'
														variant='ghost'
														onClick={() => {
															if (
																confirm(
																	`Xóa ${o.code}?`
																)
															)
																delOt.mutate(
																	o.id
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
							</TableBody>
						</Table>
					</div>
				</TabsContent>

				{/* ── Phép hằng năm ── */}
				<TabsContent value='annual' className='space-y-3'>
					<div className='flex items-center justify-between'>
						<p className='text-sm text-muted-foreground'>
							Tra theo đối tượng + thâm niên → số ngày phép cơ bản
						</p>
						{admin && (
							<Button size='sm' onClick={openRegCreate}>
								<Plus className='mr-1 h-4 w-4' />
								Thêm mức
							</Button>
						)}
					</div>
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Đối tượng</TableHead>
									<TableHead>Thâm niên</TableHead>
									<TableHead>Số ngày</TableHead>
									<TableHead>Mô tả</TableHead>
									{admin && <TableHead className='w-24' />}
								</TableRow>
							</TableHeader>
							<TableBody>
								{loadingReg && (
									<TableRow>
										<TableCell
											colSpan={5}
											className='text-center'
										>
											<Loader2 className='mx-auto h-5 w-5 animate-spin' />
										</TableCell>
									</TableRow>
								)}
								{annual.map((r) => (
									<TableRow key={r.id}>
										<TableCell>
											<Badge variant='secondary'>
												{r.objectTypeLabel ||
													r.objectType ||
													'—'}
											</Badge>
										</TableCell>
										<TableCell>
											{formatYears(
												r.minYears,
												r.maxYears
											)}
										</TableCell>
										<TableCell className='font-semibold'>
											{r.baseDays} ngày
										</TableCell>
										<TableCell className='text-muted-foreground'>
											{r.label || r.description || '—'}
										</TableCell>
										{admin && (
											<TableCell>
												<div className='flex gap-1'>
													<Button
														size='icon'
														variant='ghost'
														onClick={() =>
															openRegEdit(r)
														}
													>
														<Pencil className='h-4 w-4' />
													</Button>
													<Button
														size='icon'
														variant='ghost'
														onClick={() => {
															if (
																confirm(
																	'Xóa quy định này?'
																)
															)
																delReg.mutate(
																	r.id
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
							</TableBody>
						</Table>
					</div>
				</TabsContent>

				{/* ── Phép thêm ── */}
				<TabsContent value='extra' className='space-y-3'>
					<div className='flex items-center justify-between'>
						<p className='text-sm text-muted-foreground'>
							MS 01–06 · 5 hoặc 10 ngày nghỉ thêm
						</p>
						{admin && (
							<Button size='sm' onClick={openExCreate}>
								<Plus className='mr-1 h-4 w-4' />
								Thêm
							</Button>
						)}
					</div>
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className='w-16'>MS</TableHead>
									<TableHead>Loại / Nội dung</TableHead>
									<TableHead className='w-24'>
										Số ngày
									</TableHead>
									<TableHead className='w-16'>TT</TableHead>
									{admin && <TableHead className='w-24' />}
								</TableRow>
							</TableHeader>
							<TableBody>
								{loadingEx && (
									<TableRow>
										<TableCell
											colSpan={5}
											className='text-center'
										>
											<Loader2 className='mx-auto h-5 w-5 animate-spin' />
										</TableCell>
									</TableRow>
								)}
								{displayedExtras.map((e) => (
									<TableRow key={e.id}>
										<TableCell className='font-mono font-semibold'>
											{e.code}
										</TableCell>
										<TableCell className='text-sm'>
											{e.label}
										</TableCell>
										<TableCell>
											<Badge>{e.days} ngày</Badge>
										</TableCell>
										<TableCell>
											{e.isActive ? 'HĐ' : 'Ẩn'}
										</TableCell>
										{admin && e.id > 0 && (
											<TableCell>
												<div className='flex gap-1'>
													<Button
														size='icon'
														variant='ghost'
														onClick={() =>
															openExEdit(e)
														}
													>
														<Pencil className='h-4 w-4' />
													</Button>
													<Button
														size='icon'
														variant='ghost'
														onClick={() => {
															if (
																confirm(
																	`Xóa MS ${e.code}?`
																)
															)
																delEx.mutate(
																	e.id
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
							</TableBody>
						</Table>
					</div>
				</TabsContent>

				{/* ── Phép đặc biệt ── */}
				<TabsContent value='special'>
					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>
								Phép đặc biệt
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4 text-sm'>
							<ul className='list-disc space-y-2 pl-5 text-muted-foreground'>
								<li>
									<strong className='text-foreground'>
										Đối tượng:
									</strong>{' '}
									SQ, QNCN, CNQP, VCQP (không áp dụng HSQBS /
									HV).
								</li>
								<li>
									<strong className='text-foreground'>
										Thời gian:
									</strong>{' '}
									Mỗi lần không quá{' '}
									<strong className='text-foreground'>
										{meta?.specialMaxDays ?? 10} ngày
									</strong>
									.
								</li>
							</ul>
							<div>
								<p className='mb-2 font-medium'>
									Được nghỉ phép đặc biệt khi:
								</p>
								<ol className='list-decimal space-y-3 pl-5 text-muted-foreground'>
									{(
										meta?.specialReasons || [
											{
												code: 'MARRIAGE',
												label: 'Bản thân kết hôn, hoặc con đẻ / con nuôi hợp pháp kết hôn'
											},
											{
												code: 'FAMILY_HARDSHIP',
												label: 'Gia đình gặp khó khăn đột xuất…'
											}
										]
									).map((r) => (
										<li key={r.code}>
											<span className='text-foreground'>
												{r.label}
											</span>
										</li>
									))}
								</ol>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<Dialog open={otOpen} onOpenChange={setOtOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{otEdit ? 'Sửa đối tượng' : 'Thêm đối tượng'}
						</DialogTitle>
					</DialogHeader>
					<div className='grid gap-3 py-2'>
						<div>
							<Label>Ma_ĐT *</Label>
							<Input
								value={otCode}
								disabled={!!otEdit}
								onChange={(e) =>
									setOtCode(e.target.value.toUpperCase())
								}
								placeholder='VD: SQ'
							/>
						</div>
						<div>
							<Label>Tên_ĐT *</Label>
							<Input
								value={otName}
								onChange={(e) => setOtName(e.target.value)}
							/>
						</div>
						<div>
							<Label>Thứ tự</Label>
							<Input
								type='number'
								value={otSort}
								onChange={(e) =>
									setOtSort(Number(e.target.value) || 0)
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setOtOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={saveOt.isPending}
							onClick={() => saveOt.mutate()}
						>
							{saveOt.isPending && (
								<Loader2 className='mr-1 h-4 w-4 animate-spin' />
							)}
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={exOpen} onOpenChange={setExOpen}>
				<DialogContent className='max-w-lg'>
					<DialogHeader>
						<DialogTitle>
							{exEdit
								? 'Sửa tiêu chuẩn phép thêm'
								: 'Thêm tiêu chuẩn phép thêm'}
						</DialogTitle>
					</DialogHeader>
					<div className='grid gap-3 py-2'>
						<div>
							<Label>MS *</Label>
							<Input
								value={exCode}
								disabled={!!exEdit}
								onChange={(e) => setExCode(e.target.value)}
								placeholder='01'
							/>
						</div>
						<div>
							<Label>Nội dung *</Label>
							<textarea
								className='min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
								value={exLabel}
								onChange={(e) => setExLabel(e.target.value)}
							/>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<Label>Số ngày</Label>
								<Select
									value={String(exDays)}
									onValueChange={(v) =>
										setExDays(Number(v) as 5 | 10)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='10'>
											10 ngày
										</SelectItem>
										<SelectItem value='5'>
											5 ngày
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Thứ tự</Label>
								<Input
									type='number'
									value={exSort}
									onChange={(e) =>
										setExSort(Number(e.target.value) || 0)
									}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setExOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={saveEx.isPending}
							onClick={() => saveEx.mutate()}
						>
							{saveEx.isPending && (
								<Loader2 className='mr-1 h-4 w-4 animate-spin' />
							)}
							Lưu
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={regOpen} onOpenChange={setRegOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{regEdit
								? 'Sửa tiêu chuẩn phép hằng năm'
								: 'Thêm mức phép hằng năm'}
						</DialogTitle>
					</DialogHeader>
					<div className='grid gap-3 py-2'>
						<div>
							<Label>Đối tượng *</Label>
							<Select
								value={regOt}
								onValueChange={setRegOt}
								disabled={!!regEdit}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn…' />
								</SelectTrigger>
								<SelectContent>
									{displayedObjectTypes.map((o) => (
										<SelectItem key={o.code} value={o.code}>
											{o.code} — {o.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<Label>Min (năm)</Label>
								<Input
									value={regMin}
									onChange={(e) => setRegMin(e.target.value)}
									placeholder='0'
								/>
							</div>
							<div>
								<Label>Max (năm, exclusive)</Label>
								<Input
									value={regMax}
									onChange={(e) => setRegMax(e.target.value)}
									placeholder='15'
								/>
							</div>
						</div>
						<div>
							<Label>Số ngày *</Label>
							<Input
								type='number'
								min={0}
								value={regDays}
								onChange={(e) => setRegDays(e.target.value)}
							/>
						</div>
						<div>
							<Label>Nhãn</Label>
							<Input
								value={regLabel}
								onChange={(e) => setRegLabel(e.target.value)}
							/>
						</div>
						<div>
							<Label>Mô tả</Label>
							<Input
								value={regDesc}
								onChange={(e) => setRegDesc(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setRegOpen(false)}
						>
							Hủy
						</Button>
						<Button
							disabled={saveReg.isPending}
							onClick={() => saveReg.mutate()}
						>
							{saveReg.isPending && (
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
