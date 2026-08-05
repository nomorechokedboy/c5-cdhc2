import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
	ComputeLeaveDays,
	CreateLeaveRequest,
	GetLeaveMyAccess,
	GetLeaveMeta,
	GetMyLeavePersonnel,
	ListLeaveLocalities,
	ListLeaveClasses,
	ListLeavePersonnel,
	ListLeaveRequests,
	type LeaveLocality,
	type LeavePersonnel
} from '@/api/leave'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import DateInput from '@/components/date-input'
import { isSuperAdmin } from '@/lib/utils'
import dayjs from 'dayjs'

const EXTRA_ELIGIBLE = new Set([
	'SQ',
	'QNCN',
	'CNQP',
	'VCQP',
	// legacy
	'QN',
	'CN'
])

export default function LeaveRequestForm() {
	const qc = useQueryClient()
	const admin = isSuperAdmin()
	const { data: access } = useQuery({
		queryKey: ['leave-my-access'],
		queryFn: GetLeaveMyAccess
	})
	const canProposeForUnit = admin || Boolean(access?.isCommander)

	const { data: myPersonnel, isLoading: loadingP } = useQuery({
		queryKey: ['leave-my-personnel'],
		queryFn: GetMyLeavePersonnel
	})
	const { data: allPersonnel = [], isLoading: loadingAll } = useQuery({
		queryKey: ['leave-personnel', 'for-propose'],
		queryFn: () => ListLeavePersonnel(),
		enabled: canProposeForUnit
	})
	const { data: classes = [] } = useQuery({
		queryKey: ['leave-classes', 'for-propose'],
		queryFn: () => ListLeaveClasses()
	})
	const managedStudents = useMemo(
		() => allPersonnel.filter((p) => p.classId != null),
		[allPersonnel]
	)
	const { data: meta } = useQuery({
		queryKey: ['leave-meta'],
		queryFn: GetLeaveMeta
	})
	const { data: myRequests = [] } = useQuery({
		queryKey: ['leave-requests', 'mine'],
		queryFn: () => ListLeaveRequests({ mine: true })
	})

	const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>('')
	type RequestScope = 'INDIVIDUAL' | 'CLASS' | 'SHORT_LEAVE'
	const [requestScope, setRequestScope] = useState<RequestScope>('INDIVIDUAL')
	const [selectedClassId, setSelectedClassId] = useState('')
	const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([])
	const [targetLocations, setTargetLocations] = useState<
		Record<number, string>
	>({})
	const [leaveType, setLeaveType] = useState<'ANNUAL' | 'SPECIAL'>('ANNUAL')
	const [rank, setRank] = useState('')
	const [unitName, setUnitName] = useState('')
	const [travelDays, setTravelDays] = useState(0)
	const [wantExtra, setWantExtra] = useState(false)
	const [extraDays, setExtraDays] = useState<0 | 5 | 10>(0)
	const [reasons, setReasons] = useState<string[]>([])
	/** Lý do phép đặc biệt */
	const [specialReasons, setSpecialReasons] = useState<string[]>([])
	/** Số ngày phép đặc biệt (1–10) */
	const [specialDays, setSpecialDays] = useState(10)
	const [manualDays, setManualDays] = useState(1)
	const [provinceId, setProvinceId] = useState('')
	const [wardId, setWardId] = useState('')
	const [addressDetail, setAddressDetail] = useState('')
	const [note, setNote] = useState('')
	const [otherReason, setOtherReason] = useState('')
	const [startDate, setStartDate] = useState('')
	const [endDate, setEndDate] = useState('')

	/** Hồ sơ đang dùng: linked account hoặc admin chọn từ danh sách */
	const personnel: LeavePersonnel | null = useMemo(() => {
		if (myPersonnel && !canProposeForUnit) return myPersonnel
		if (requestScope === 'CLASS' && selectedClassId) {
			return (
				allPersonnel.find(
					(p) => p.classId === Number(selectedClassId)
				) || null
			)
		}
		if (requestScope === 'SHORT_LEAVE') {
			return (
				managedStudents.find((p) => selectedTargetIds.includes(p.id)) ||
				managedStudents[0] ||
				null
			)
		}
		if (canProposeForUnit && selectedPersonnelId) {
			return (
				allPersonnel.find(
					(p) => p.id === Number(selectedPersonnelId)
				) || null
			)
		}
		return null
	}, [
		myPersonnel,
		canProposeForUnit,
		requestScope,
		selectedClassId,
		selectedPersonnelId,
		selectedTargetIds,
		allPersonnel,
		managedStudents
	])

	useEffect(() => {
		if (personnel) {
			setRank(personnel.rank || '')
			setUnitName(personnel.unitName || '')
		}
	}, [personnel])

	const { data: provinces = [] } = useQuery({
		queryKey: ['leave-loc-province'],
		queryFn: () => ListLeaveLocalities({ level: 'province' })
	})
	const { data: wards = [] } = useQuery({
		queryKey: ['leave-loc-ward', provinceId],
		queryFn: () =>
			ListLeaveLocalities({
				level: 'ward',
				parentId: Number(provinceId)
			}),
		enabled: !!provinceId
	})
	const objectType = personnel?.objectType
	const canExtra =
		leaveType === 'ANNUAL' && objectType
			? EXTRA_ELIGIBLE.has(objectType)
			: false
	const canSpecial = objectType
		? (meta?.specialEligible || ['SQ', 'QNCN', 'CNQP', 'VCQP']).includes(
				objectType
			)
		: false
	const specialMax = meta?.specialMaxDays ?? 10
	const effectiveExtra = wantExtra && leaveType === 'ANNUAL' ? extraDays : 0

	// HSQ/BS không được phép đặc biệt → tự về ANNUAL
	useEffect(() => {
		if (leaveType === 'SPECIAL' && objectType && !canSpecial) {
			setLeaveType('ANNUAL')
			toast.message('Hạ sĩ quan / binh sĩ không được nghỉ phép đặc biệt')
		}
	}, [leaveType, objectType, canSpecial])

	const { data: computed } = useQuery({
		queryKey: [
			'leave-compute',
			objectType,
			personnel?.enlistmentDate,
			startDate,
			leaveType,
			travelDays,
			effectiveExtra,
			specialDays
		],
		queryFn: () =>
			ComputeLeaveDays({
				objectType: objectType!,
				enlistmentDate: personnel?.enlistmentDate,
				startDate: startDate || null,
				leaveType,
				travelDays: leaveType === 'SPECIAL' ? 0 : travelDays,
				extraDays: leaveType === 'SPECIAL' ? 0 : effectiveExtra,
				specialDays: leaveType === 'SPECIAL' ? specialDays : undefined
			}),
		enabled: !!objectType && !canProposeForUnit
	})

	/** Tổng ngày dùng để auto end date (ANNUAL lấy từ API compute) */
	const totalLeaveDays = useMemo(() => {
		if (canProposeForUnit) return Math.max(1, manualDays)
		if (leaveType === 'SPECIAL') return Math.max(1, specialDays)
		if (computed?.totalDays != null && computed.totalDays > 0) {
			return Number(computed.totalDays)
		}
		return 0
	}, [
		canProposeForUnit,
		manualDays,
		leaveType,
		specialDays,
		computed?.totalDays
	])

	/**
	 * end = start + (totalDays − 1)  // inclusive
	 * VD: 22/07 + 25 ngày → kết thúc 15/08
	 */
	const autoEndDate = useMemo(() => {
		if (!startDate || totalLeaveDays < 1) return ''
		const d = dayjs(startDate)
		if (!d.isValid()) return ''
		return d.add(totalLeaveDays - 1, 'day').format('YYYY-MM-DD')
	}, [startDate, totalLeaveDays])

	// Luôn sync endDate khi start / tổng ngày đổi
	useEffect(() => {
		if (leaveType !== 'ANNUAL' && leaveType !== 'SPECIAL') return
		if (autoEndDate) {
			setEndDate(autoEndDate)
		} else if (!startDate) {
			setEndDate('')
		}
	}, [leaveType, autoEndDate, startDate])

	function handleStartDateChange(v: string) {
		setStartDate(v)
		const days =
			leaveType === 'SPECIAL'
				? Math.max(1, specialDays)
				: computed?.totalDays != null && computed.totalDays > 0
					? Number(computed.totalDays)
					: 0
		if (v && days >= 1) {
			const d = dayjs(v)
			if (d.isValid()) {
				setEndDate(d.add(days - 1, 'day').format('YYYY-MM-DD'))
			}
		} else if (!v) {
			setEndDate('')
		}
	}

	const reasonOptions = useMemo(() => {
		if (!meta) return []
		if (extraDays === 10) return meta.extra10Reasons
		if (extraDays === 5) return meta.extra5Reasons
		return []
	}, [meta, extraDays])

	function toggleReason(code: string) {
		setReasons((prev) =>
			prev.includes(code)
				? prev.filter((c) => c !== code)
				: [...prev, code]
		)
	}

	function toggleSpecialReason(code: string) {
		setSpecialReasons((prev) =>
			prev.includes(code)
				? prev.filter((c) => c !== code)
				: [...prev, code]
		)
	}

	const createMut = useMutation({
		mutationFn: () => {
			if (!personnel) {
				throw new Error('Vui lòng chọn quân nhân')
			}
			if (leaveType === 'SPECIAL') {
				if (!canSpecial) {
					throw new Error(
						'Chỉ sỹ quan, QNCN, CNQP, VCQP được nghỉ phép đặc biệt'
					)
				}
				if (!specialReasons.length) {
					throw new Error('Vui lòng chọn lý do phép đặc biệt')
				}
			}
			const localityId = wardId
				? Number(wardId)
				: provinceId
					? Number(provinceId)
					: null
			const selectedClass = classes.find(
				(c) => c.id === Number(selectedClassId)
			)
			const targets =
				requestScope === 'CLASS'
					? allPersonnel.filter(
							(p) => p.classId === Number(selectedClassId)
						)
					: requestScope === 'SHORT_LEAVE'
						? managedStudents.filter((p) =>
								selectedTargetIds.includes(p.id)
							)
						: [personnel]
			if (!targets.length) {
				throw new Error(
					requestScope === 'SHORT_LEAVE'
						? 'Vui lòng tích chọn ít nhất một học viên'
						: 'Lớp chưa có quân nhân'
				)
			}
			if (canProposeForUnit && !proposalReason) {
				throw new Error('Vui lòng nhập lý do')
			}
			const common = {
				leaveType,
				manualDays: canProposeForUnit ? manualDays : undefined,
				rank: rank || null,
				unitName: unitName || null,
				travelDays: leaveType === 'SPECIAL' ? 0 : travelDays,
				extraDays: leaveType === 'SPECIAL' ? 0 : effectiveExtra,
				extraReasons:
					leaveType === 'SPECIAL'
						? specialReasons
						: effectiveExtra > 0
							? reasons
							: [],
				specialDays: leaveType === 'SPECIAL' ? specialDays : undefined,
				localityId: canProposeForUnit ? null : localityId,
				startDate: startDate || null,
				endDate: endDate || autoEndDate || null,
				note: proposalReason || null
			}
			return Promise.all(
				targets.map((target) =>
					CreateLeaveRequest({
						...common,
						localityDetail: canProposeForUnit
							? requestScope === 'INDIVIDUAL'
								? addressDetail.trim() || null
								: targetLocations[target.id]?.trim() ||
									target.permanentResidence ||
									target.hometown ||
									null
							: addressDetail.trim() || null,
						requestScope,
						classId:
							requestScope === 'CLASS'
								? Number(selectedClassId)
								: target.classId,
						className:
							requestScope === 'CLASS'
								? selectedClass?.name || null
								: target.className,
						personnelId: target.id,
						objectType: target.objectType,
						rank: target.rank || null,
						unitId: target.unitId,
						unitName: target.unitName || null
					})
				)
			)
		},
		onSuccess: () => {
			toast.success(
				'Đã gửi đề xuất — chỉ huy CQ / CQQL sẽ thấy trong «Duyệt đề xuất»'
			)
			qc.invalidateQueries({ queryKey: ['leave-requests'] })
			setWantExtra(false)
			setExtraDays(0)
			setReasons([])
			setSpecialReasons([])
			setSpecialDays(specialMax)
			setNote('')
			setOtherReason('')
			setAddressDetail('')
			setSelectedTargetIds([])
			setTargetLocations({})
		},
		onError: (e: Error) => toast.error(e.message)
	})

	if (loadingP || (canProposeForUnit && loadingAll)) {
		return (
			<div className='flex justify-center p-12'>
				<Loader2 className='h-6 w-6 animate-spin' />
			</div>
		)
	}

	// Không phải admin và chưa liên kết hồ sơ
	if (!personnel && !canProposeForUnit) {
		return (
			<div className='space-y-4'>
				<h2 className='text-2xl font-bold tracking-tight'>
					Đề xuất nghỉ phép
				</h2>
				<Card>
					<CardContent className='p-6 text-muted-foreground'>
						Tài khoản chưa được liên kết hồ sơ quân nhân. Quản trị
						viên cần gán tài khoản cho quân nhân trong{' '}
						<strong>Danh sách quân nhân</strong> (hoặc tạo user rồi
						liên kết) để bạn có thể đề xuất phép.
					</CardContent>
				</Card>
			</div>
		)
	}

	const objectLabel = personnel
		? meta?.objectTypes.find((o) => o.code === personnel.objectType)
				?.label || personnel.objectType
		: ''
	const isClassProposal = canProposeForUnit && requestScope === 'CLASS'
	const isMultiProposal =
		canProposeForUnit &&
		(requestScope === 'CLASS' || requestScope === 'SHORT_LEAVE')
	const selectedClass = classes.find((c) => c.id === Number(selectedClassId))
	const proposalReason = canProposeForUnit
		? isClassProposal
			? 'Nghỉ hè'
			: otherReason.trim()
		: note.trim()

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-2xl font-bold tracking-tight'>
					Đề xuất nghỉ phép
				</h2>
				{personnel && myPersonnel && (
					<p className='text-sm text-muted-foreground'>
						{personnel.fullName} ({personnel.code}) — đối tượng cố
						định
					</p>
				)}
				{canProposeForUnit && (
					<p className='text-sm text-muted-foreground'>
						Chọn đề xuất riêng cho một cá nhân hoặc cho cả lớp
					</p>
				)}
			</div>

			{/* Admin / chỉ huy chọn phạm vi và đối tượng được quản lý */}
			{canProposeForUnit && (
				<Card>
					<CardHeader>
						<CardTitle className='text-lg'>
							Phạm vi đề xuất
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='max-w-md'>
							<Label>Đề xuất cho *</Label>
							<Select
								value={requestScope}
								onValueChange={(v) => {
									setRequestScope(v as RequestScope)
									setSelectedPersonnelId('')
									setSelectedClassId('')
									setSelectedTargetIds([])
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='INDIVIDUAL'>
										Một cá nhân
									</SelectItem>
									<SelectItem value='CLASS'>
										Cả lớp
									</SelectItem>
									<SelectItem value='SHORT_LEAVE'>
										Tranh thủ
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{allPersonnel.length === 0 ? (
							<p className='text-sm text-muted-foreground'>
								Chưa có quân nhân trong danh sách — thêm ở menu
								Danh sách quân nhân trước.
							</p>
						) : (
							<div className='max-w-md'>
								{requestScope === 'INDIVIDUAL' ? (
									<>
										<Label>Quân nhân *</Label>
										<Select
											value={selectedPersonnelId}
											onValueChange={
												setSelectedPersonnelId
											}
										>
											<SelectTrigger>
												<SelectValue placeholder='Chọn người đề xuất phép…' />
											</SelectTrigger>
											<SelectContent>
												{allPersonnel.map((p) => (
													<SelectItem
														key={p.id}
														value={String(p.id)}
													>
														{p.fullName} ({p.code})
														{p.unitName
															? ` — ${p.unitName}`
															: ''}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</>
								) : requestScope === 'CLASS' ? (
									<>
										<Label>Lớp *</Label>
										<Select
											value={selectedClassId}
											onValueChange={setSelectedClassId}
										>
											<SelectTrigger>
												<SelectValue placeholder='Chọn lớp nghỉ phép…' />
											</SelectTrigger>
											<SelectContent>
												{classes
													.filter((c) =>
														allPersonnel.some(
															(p) =>
																p.classId ===
																c.id
														)
													)
													.map((c) => (
														<SelectItem
															key={c.id}
															value={String(c.id)}
														>
															{c.name} —{' '}
															{c.unitName}
														</SelectItem>
													))}
											</SelectContent>
										</Select>
									</>
								) : (
									<div className='space-y-2'>
										<Label>
											Học viên được phép đi tranh thủ *
										</Label>
										<p className='text-xs text-muted-foreground'>
											Tích chọn trong toàn bộ học viên
											thuộc các lớp đại đội quản lý.
										</p>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{personnel && (
				<Card>
					<CardHeader>
						<CardTitle className='text-lg'>
							Thông tin đề xuất
						</CardTitle>
					</CardHeader>
					<CardContent className='grid gap-4 md:grid-cols-2'>
						<div>
							<Label>Đối tượng</Label>
							<Input
								value={
									isClassProposal
										? `Lớp ${selectedClass?.name || '—'}`
										: objectLabel
								}
								disabled
							/>
						</div>
						<div className={canProposeForUnit ? 'hidden' : ''}>
							<Label>Loại phép</Label>
							<Select
								value={leaveType}
								onValueChange={(v) => {
									const t = v as 'ANNUAL' | 'SPECIAL'
									setLeaveType(t)
									if (t === 'SPECIAL') {
										setWantExtra(false)
										setExtraDays(0)
										setReasons([])
										setTravelDays(0)
									} else {
										setSpecialReasons([])
									}
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='ANNUAL'>
										Phép hằng năm
									</SelectItem>
									<SelectItem
										value='SPECIAL'
										disabled={!canSpecial}
									>
										Phép đặc biệt
										{!canSpecial
											? ' (không áp dụng HSQBS/HV)'
											: ''}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{canProposeForUnit && (
							<div className='md:col-span-2'>
								<Label>Lý do *</Label>
								{isClassProposal ? (
									<Input value='Nghỉ hè' disabled />
								) : (
									<Input
										value={otherReason}
										onChange={(e) =>
											setOtherReason(e.target.value)
										}
										placeholder={
											requestScope === 'SHORT_LEAVE'
												? 'Nhập lý do đi tranh thủ…'
												: 'Nhập lý do phép khác…'
										}
									/>
								)}
							</div>
						)}
						<div className={isMultiProposal ? 'hidden' : ''}>
							<Label>Họ tên</Label>
							<Input
								value={personnel.fullName}
								disabled
								readOnly
								className='bg-muted/40'
							/>
						</div>
						<div className={isMultiProposal ? 'hidden' : ''}>
							<Label>Ngày nhập ngũ / tuyển dụng</Label>
							<Input
								value={
									personnel.enlistmentDate
										? dayjs(
												personnel.enlistmentDate
											).format('DD/MM/YYYY')
										: personnel.recruitment || '—'
								}
								disabled
								readOnly
								className='bg-muted/40'
							/>
						</div>
						<div className={isMultiProposal ? 'hidden' : ''}>
							<Label>Cấp bậc</Label>
							<Input
								value={rank || '—'}
								disabled
								readOnly
								className='bg-muted/40'
							/>
						</div>
						<div>
							<Label>Chức vụ</Label>
							<Input
								value={personnel.position || '—'}
								disabled
								readOnly
								className='bg-muted/40'
							/>
						</div>
						<div>
							<Label>Đơn vị</Label>
							<Input
								value={unitName || '—'}
								disabled
								readOnly
								className='bg-muted/40'
							/>
						</div>
						{!isClassProposal &&
							leaveType === 'ANNUAL' &&
							computed && (
								<div>
									<Label>
										Thâm niên (năm) / Ngày phép cơ bản
									</Label>
									<Input
										value={`${computed.serviceYears} năm → ${computed.baseDays} ngày`}
										disabled
										readOnly
										className='bg-muted/40'
									/>
									<p className='mt-1 text-xs text-muted-foreground'>
										Tự tính theo đối tượng + thâm niên tại
										ngày bắt đầu nghỉ (hoặc hôm nay nếu chưa
										chọn ngày).
									</p>
								</div>
							)}
						{canProposeForUnit && (
							<div>
								<Label>Số ngày nghỉ *</Label>
								<Input
									type='number'
									min={1}
									max={365}
									value={manualDays}
									onChange={(e) =>
										setManualDays(
											Math.min(
												365,
												Math.max(
													1,
													Number(e.target.value) || 1
												)
											)
										)
									}
								/>
								<p className='mt-1 text-xs text-muted-foreground'>
									Đại đội nhập trực tiếp, không tính theo thâm
									niên.
								</p>
							</div>
						)}
						{leaveType === 'ANNUAL' && !canProposeForUnit && (
							<div>
								<Label>Ngày đi đường</Label>
								<Input
									type='number'
									min={0}
									value={travelDays}
									onChange={(e) =>
										setTravelDays(
											Math.max(
												0,
												Number(e.target.value) || 0
											)
										)
									}
								/>
							</div>
						)}
						{leaveType === 'SPECIAL' && !canProposeForUnit && (
							<div>
								<Label>
									Số ngày phép đặc biệt (tối đa {specialMax})
								</Label>
								<Input
									type='number'
									min={1}
									max={specialMax}
									value={specialDays}
									onChange={(e) => {
										const n = Number(e.target.value) || 1
										setSpecialDays(
											Math.min(specialMax, Math.max(1, n))
										)
									}}
								/>
							</div>
						)}
						<div>
							<Label>Ngày bắt đầu</Label>
							<DateInput
								value={startDate}
								onChange={handleStartDateChange}
								placeholder='Chọn ngày bắt đầu'
							/>
						</div>
						<div>
							<Label>Ngày kết thúc</Label>
							{/* Chỉ hiển thị — không cho chọn / sửa */}
							<div
								className='flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground'
								aria-readonly
							>
								{endDate || autoEndDate
									? dayjs(endDate || autoEndDate).format(
											'DD/MM/YYYY'
										)
									: startDate
										? 'Đang tính…'
										: 'Tự cập nhật khi chọn ngày bắt đầu'}
							</div>
							{startDate && totalLeaveDays > 0 && (
								<p className='mt-1 text-xs text-muted-foreground'>
									Tự động = bắt đầu + {totalLeaveDays} ngày
									nghỉ
									{leaveType === 'ANNUAL' && computed
										? ` (cơ bản ${computed.baseDays}${computed.travelDays ? ` + đi đường ${computed.travelDays}` : ''}${computed.extraDays ? ` + thêm ${computed.extraDays}` : ''})`
										: ''}
									. Không chỉnh tay.
								</p>
							)}
						</div>

						{!canProposeForUnit && (
							<div className='md:col-span-2 grid gap-3 md:grid-cols-2'>
								<div>
									<Label>Tỉnh / Thành phố</Label>
									<Select
										value={provinceId}
										onValueChange={(v) => {
											setProvinceId(v)
											setWardId('')
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder='Chọn tỉnh / thành phố' />
										</SelectTrigger>
										<SelectContent>
											{provinces.map(
												(p: LeaveLocality) => (
													<SelectItem
														key={p.id}
														value={String(p.id)}
													>
														{p.name}
													</SelectItem>
												)
											)}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Xã / Phường</Label>
									<Select
										value={wardId}
										onValueChange={setWardId}
										disabled={!provinceId}
									>
										<SelectTrigger>
											<SelectValue placeholder='Chọn xã / phường' />
										</SelectTrigger>
										<SelectContent>
											{wards.map((p) => (
												<SelectItem
													key={p.id}
													value={String(p.id)}
												>
													{p.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className='md:col-span-2'>
									<Label>Địa chỉ cụ thể</Label>
									<Input
										value={addressDetail}
										onChange={(e) =>
											setAddressDetail(e.target.value)
										}
										placeholder='Số nhà, đường, tổ, thôn…'
									/>
								</div>
							</div>
						)}

						{canProposeForUnit && requestScope === 'INDIVIDUAL' && (
							<div className='md:col-span-2'>
								<Label>Nơi nghỉ</Label>
								<Input
									value={addressDetail}
									onChange={(e) =>
										setAddressDetail(e.target.value)
									}
									placeholder={
										personnel.permanentResidence ||
										personnel.hometown ||
										'Nhập nơi nghỉ…'
									}
								/>
							</div>
						)}

						{canProposeForUnit && isMultiProposal && (
							<div className='md:col-span-2 space-y-2'>
								<Label>
									{requestScope === 'SHORT_LEAVE'
										? 'Danh sách học viên đi tranh thủ'
										: 'Nơi nghỉ của học viên trong lớp'}
								</Label>
								<div className='max-h-96 overflow-auto rounded-md border'>
									<Table>
										<TableHeader>
											<TableRow>
												{requestScope ===
													'SHORT_LEAVE' && (
													<TableHead className='w-12'>
														Chọn
													</TableHead>
												)}
												<TableHead>Học viên</TableHead>
												<TableHead>Lớp</TableHead>
												<TableHead>Nơi nghỉ</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{managedStudents
												.filter(
													(p) =>
														requestScope ===
															'SHORT_LEAVE' ||
														p.classId ===
															Number(
																selectedClassId
															)
												)
												.map((p) => {
													const checked =
														requestScope ===
															'CLASS' ||
														selectedTargetIds.includes(
															p.id
														)
													return (
														<TableRow key={p.id}>
															{requestScope ===
																'SHORT_LEAVE' && (
																<TableCell>
																	<Checkbox
																		checked={
																			checked
																		}
																		onCheckedChange={(
																			value
																		) =>
																			setSelectedTargetIds(
																				(
																					prev
																				) =>
																					value
																						? [
																								...prev,
																								p.id
																							]
																						: prev.filter(
																								(
																									id
																								) =>
																									id !==
																									p.id
																							)
																			)
																		}
																	/>
																</TableCell>
															)}
															<TableCell>
																{p.fullName}
																<span className='block text-xs text-muted-foreground'>
																	{p.code}
																</span>
															</TableCell>
															<TableCell>
																{p.className ||
																	'—'}
															</TableCell>
															<TableCell>
																<Input
																	disabled={
																		!checked
																	}
																	value={
																		targetLocations[
																			p.id
																		] ??
																		p.permanentResidence ??
																		p.hometown ??
																		''
																	}
																	onChange={(
																		e
																	) =>
																		setTargetLocations(
																			(
																				prev
																			) => ({
																				...prev,
																				[p.id]: e
																					.target
																					.value
																			})
																		)
																	}
																	placeholder='Nhập nơi nghỉ…'
																/>
															</TableCell>
														</TableRow>
													)
												})}
										</TableBody>
									</Table>
								</div>
							</div>
						)}

						{leaveType === 'SPECIAL' && canSpecial && (
							<div className='md:col-span-2 space-y-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4'>
								<p className='text-sm font-medium'>
									Lý do phép đặc biệt (chọn ít nhất 1) *
								</p>
								<p className='text-xs text-muted-foreground'>
									Mỗi lần không quá {specialMax} ngày. Chỉ áp
									dụng quân nhân, công nhân, viên chức QP.
								</p>
								<div className='space-y-3'>
									{(meta?.specialReasons || []).map((r) => (
										<label
											key={r.code}
											className='flex items-start gap-2 text-sm'
										>
											<Checkbox
												checked={specialReasons.includes(
													r.code
												)}
												onCheckedChange={() =>
													toggleSpecialReason(r.code)
												}
											/>
											<span>{r.label}</span>
										</label>
									))}
								</div>
							</div>
						)}

						{canExtra &&
							leaveType === 'ANNUAL' &&
							!canProposeForUnit && (
								<div className='md:col-span-2 space-y-3 rounded-md border p-4'>
									<div className='flex items-center gap-2'>
										<Checkbox
											id='wantExtra'
											checked={wantExtra}
											onCheckedChange={(c) => {
												setWantExtra(!!c)
												if (!c) {
													setExtraDays(0)
													setReasons([])
												} else {
													setExtraDays(10)
												}
											}}
										/>
										<Label
											htmlFor='wantExtra'
											className='cursor-pointer'
										>
											Nghỉ thêm
										</Label>
									</div>
									{wantExtra && (
										<>
											<div className='flex flex-wrap gap-4'>
												<label className='flex items-center gap-2 text-sm'>
													<input
														type='radio'
														name='extraDays'
														checked={
															extraDays === 10
														}
														onChange={() => {
															setExtraDays(10)
															setReasons([])
														}}
													/>
													Nghỉ thêm 10 ngày
												</label>
												<label className='flex items-center gap-2 text-sm'>
													<input
														type='radio'
														name='extraDays'
														checked={
															extraDays === 5
														}
														onChange={() => {
															setExtraDays(5)
															setReasons([])
														}}
													/>
													Nghỉ thêm 5 ngày
												</label>
											</div>
											<div className='space-y-2'>
												<p className='text-sm font-medium'>
													Lý do (chọn ít nhất 1):
												</p>
												{reasonOptions.map((r) => (
													<label
														key={r.code}
														className='flex items-start gap-2 text-sm'
													>
														<Checkbox
															checked={reasons.includes(
																r.code
															)}
															onCheckedChange={() =>
																toggleReason(
																	r.code
																)
															}
														/>
														<span>{r.label}</span>
													</label>
												))}
											</div>
										</>
									)}
								</div>
							)}

						<div
							className={
								canProposeForUnit ? 'hidden' : 'md:col-span-2'
							}
						>
							<Label>Ghi chú</Label>
							<Textarea
								value={note}
								onChange={(e) => setNote(e.target.value)}
								rows={2}
							/>
						</div>

						{computed && (
							<div className='md:col-span-2 flex flex-wrap gap-3 rounded-md bg-muted/50 p-4 text-sm'>
								<span>
									Thâm niên:{' '}
									<strong>{computed.serviceYears} năm</strong>
								</span>
								<span>
									Phép cơ bản:{' '}
									<strong>{computed.baseDays} ngày</strong>
								</span>
								<span>
									Đi đường:{' '}
									<strong>{computed.travelDays} ngày</strong>
								</span>
								<span>
									Nghỉ thêm:{' '}
									<strong>{computed.extraDays} ngày</strong>
								</span>
								<span>
									Tổng:{' '}
									<strong className='text-base'>
										{computed.totalDays} ngày
									</strong>
								</span>
							</div>
						)}

						<div className='md:col-span-2'>
							<Button
								disabled={
									createMut.isPending ||
									!personnel ||
									(canProposeForUnit && !proposalReason) ||
									(leaveType === 'SPECIAL' &&
										specialReasons.length === 0) ||
									(leaveType === 'ANNUAL' &&
										wantExtra &&
										(extraDays === 0 ||
											reasons.length === 0))
								}
								onClick={() => createMut.mutate()}
							>
								{createMut.isPending ? (
									<Loader2 className='mr-1 h-4 w-4 animate-spin' />
								) : (
									<Send className='mr-1 h-4 w-4' />
								)}
								Gửi đề xuất
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<div>
				<h3 className='mb-2 text-lg font-semibold'>Đơn của tôi</h3>
				<div className='rounded-md border'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Quân nhân</TableHead>
								<TableHead>Loại</TableHead>
								<TableHead>Tổng ngày</TableHead>
								<TableHead>Nơi nghỉ</TableHead>
								<TableHead>Trạng thái</TableHead>
								<TableHead>Ngày tạo</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{myRequests.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={6}
										className='text-center text-muted-foreground'
									>
										Chưa có đơn
									</TableCell>
								</TableRow>
							)}
							{myRequests.map((r) => (
								<TableRow key={r.id}>
									<TableCell>
										{r.personnelName || '—'}
									</TableCell>
									<TableCell>
										{r.leaveType === 'ANNUAL'
											? 'Hằng năm'
											: 'Đặc biệt'}
									</TableCell>
									<TableCell>{r.totalDays}</TableCell>
									<TableCell className='max-w-[200px] truncate'>
										{r.localityPath || '—'}
									</TableCell>
									<TableCell>
										<Badge variant='secondary'>
											{r.status}
										</Badge>
									</TableCell>
									<TableCell className='text-sm text-muted-foreground'>
										{r.createdAt?.slice(0, 10)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	)
}
