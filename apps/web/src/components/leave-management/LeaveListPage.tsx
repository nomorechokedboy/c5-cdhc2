import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Check,
	Eye,
	Loader2,
	Printer,
	RotateCcw,
	Save,
	UserRound
} from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import {
	DecideLeaveRequest,
	GetLeaveMeta,
	ListLeaveRequests,
	PatchLeaveRequest,
	type LeaveRequest
} from '@/api/leave'
import { printLeaveCertificate } from '@/components/leave-management/printLeaveCertificate'
import { printClassLeaveList } from '@/components/leave-management/printClassLeaveList'
import PersonnelPreviewDialog from '@/components/leave-management/PersonnelPreviewDialog'
import { isSuperAdmin } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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

const STATUS_LABEL: Record<string, string> = {
	PENDING: 'Chờ chỉ huy CQ',
	PENDING_COMMANDER: 'Chờ chỉ huy CQ',
	PENDING_AGENCY: 'Chờ CQQL (ký)',
	APPROVED: 'Đã duyệt',
	RETURNED: 'Trả lại',
	REJECTED: 'Trả lại',
	CANCELLED: 'Đã hủy',
	DRAFT: 'Nháp'
}

function statusVariant(
	s: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
	if (s === 'APPROVED') return 'default'
	if (s === 'RETURNED' || s === 'REJECTED') return 'destructive'
	if (s === 'PENDING_AGENCY') return 'outline'
	return 'secondary'
}

function canAct(r: LeaveRequest, admin: boolean, userId: number | null) {
	// Người đề xuất không tự duyệt đơn của mình
	if (
		userId != null &&
		r.proposedByUserId != null &&
		r.proposedByUserId === userId &&
		!admin
	) {
		return false
	}
	const st = r.status
	const isCommander =
		userId != null &&
		r.commanderUserId != null &&
		r.commanderUserId === userId
	if (st === 'PENDING_COMMANDER' || st === 'PENDING') {
		return isCommander || admin
	}
	if (st === 'PENDING_AGENCY') {
		return admin
	}
	return false
}

function isCommanderOf(r: LeaveRequest, userId: number | null, admin: boolean) {
	const st = r.status
	if (st !== 'PENDING_COMMANDER' && st !== 'PENDING') return false
	if (admin) return true
	return (
		userId != null &&
		r.commanderUserId != null &&
		r.commanderUserId === userId
	)
}

function readUserId(): number | null {
	try {
		const token = localStorage.getItem('qlhvAccessToken')
		if (!token) return null
		const payload = JSON.parse(atob(token.split('.')[1]!))
		return Number(payload.userId) || null
	} catch {
		return null
	}
}

function fmtDate(iso: string | null | undefined) {
	if (!iso) return '—'
	const d = dayjs(iso)
	return d.isValid() ? d.format('DD/MM/YYYY') : iso
}

type LeaveListGroup = {
	key: string
	rows: LeaveRequest[]
	first: LeaveRequest
	isClass: boolean
}

function leaveListGroupKey(r: LeaveRequest) {
	if (r.requestScope !== 'CLASS' || r.classId == null)
		return `request:${r.id}`
	return [
		'class',
		r.classId,
		r.proposedByUserId ?? '',
		r.status,
		r.leaveType,
		r.startDate ?? '',
		r.endDate ?? '',
		r.totalDays,
		r.note ?? '',
		String(r.createdAt).slice(0, 16)
	].join(':')
}

export default function LeaveListPage() {
	const qc = useQueryClient()
	const admin = isSuperAdmin()
	const userId = useMemo(() => readUserId(), [])
	const [status, setStatus] = useState<string>('all')
	// QN thường: chỉ xem đơn mình; admin/chỉ huy: hộp thư liên quan
	const [inbox, setInbox] = useState<string>(admin ? 'all' : 'mine')
	const [leaveType, setLeaveType] = useState<string>('all')
	const [commanderId, setCommanderId] = useState<string>('all')
	const [search, setSearch] = useState('')
	const [searchApplied, setSearchApplied] = useState('')
	const [detail, setDetail] = useState<LeaveRequest | null>(null)
	const [detailGroup, setDetailGroup] = useState<LeaveListGroup | null>(null)
	const [personnelPreview, setPersonnelPreview] = useState<{
		id: number
		name: string | null
	} | null>(null)

	/** Key theo ngày → Đã đi/Còn lại tự tính lại mỗi ngày khi mở lại trang */
	const asOfDay = dayjs().format('YYYY-MM-DD')

	const {
		data = [],
		isLoading,
		dataUpdatedAt
	} = useQuery({
		queryKey: [
			'leave-requests',
			status,
			inbox,
			leaveType,
			commanderId,
			searchApplied,
			admin,
			asOfDay
		],
		queryFn: () =>
			ListLeaveRequests({
				status: status === 'all' ? undefined : status,
				inbox,
				leaveType: leaveType === 'all' ? undefined : leaveType,
				commanderUserId:
					commanderId === 'all' ? undefined : Number(commanderId),
				search: searchApplied.trim() || undefined
			}),
		// Làm mới định kỳ trong ngày (5 phút) + khi focus lại tab
		refetchInterval: 5 * 60 * 1000,
		refetchOnWindowFocus: true
	})

	/** Danh sách chỉ huy để chọn lọc (từ dữ liệu đã load, không filter commander) */
	const { data: allForCommanders = [] } = useQuery({
		queryKey: ['leave-requests-commanders', inbox, admin, asOfDay],
		queryFn: () =>
			ListLeaveRequests({
				inbox: admin ? 'all' : inbox,
				status: undefined
			}),
		staleTime: 60_000
	})

	const commanderOptions = useMemo(() => {
		const map = new Map<number, string>()
		for (const r of allForCommanders) {
			if (r.commanderUserId != null && r.commanderName) {
				map.set(r.commanderUserId, r.commanderName)
			} else if (r.commanderUserId != null) {
				map.set(
					r.commanderUserId,
					map.get(r.commanderUserId) || `User #${r.commanderUserId}`
				)
			}
		}
		return [...map.entries()]
			.map(([id, name]) => ({ id, name }))
			.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
	}, [allForCommanders])

	const displayGroups = useMemo<LeaveListGroup[]>(() => {
		const grouped = new Map<string, LeaveRequest[]>()
		for (const row of data) {
			const key = leaveListGroupKey(row)
			grouped.set(key, [...(grouped.get(key) || []), row])
		}
		return [...grouped.entries()].map(([key, rows]) => ({
			key,
			rows,
			first: rows[0]!,
			isClass: rows[0]!.requestScope === 'CLASS'
		}))
	}, [data])

	const decideMut = useMutation({
		mutationFn: (vars: {
			id: number
			decision: 'APPROVED' | 'RETURNED'
			travelDays?: number
			extraDays?: number
			extraReasons?: string[]
			adminNote?: string
		}) =>
			DecideLeaveRequest(vars.id, {
				decision: vars.decision,
				travelDays: vars.travelDays,
				extraDays: vars.extraDays,
				extraReasons: vars.extraReasons,
				adminNote: vars.adminNote
			}),
		onSuccess: (resp, vars) => {
			const mail = resp.mail
			if (vars.decision === 'APPROVED' || vars.decision === 'RETURNED') {
				toast.success(
					vars.decision === 'APPROVED' ? 'Đã duyệt' : 'Đã trả lại'
				)
				if (mail) {
					if (mail.ok && mail.previewUrl) {
						toast.message(mail.message, {
							duration: 12000,
							action: {
								label: 'Xem thư',
								onClick: () =>
									window.open(mail.previewUrl!, '_blank')
							}
						})
						window.open(mail.previewUrl, '_blank')
					} else if (mail.ok) {
						toast.success(mail.message)
					} else {
						toast.error(mail.message || mail.error || 'Mail lỗi')
					}
				}
			}
			qc.invalidateQueries({ queryKey: ['leave-requests'] })
			qc.invalidateQueries({ queryKey: ['leave-records'] })
			qc.invalidateQueries({ queryKey: ['leave-mail-log'] })
			setDetail(null)
		},
		onError: (e: Error) => toast.error(e.message)
	})

	function applySearch() {
		setSearchApplied(search.trim())
	}

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh sách phép
					</h2>
					<p className='text-sm text-muted-foreground'>
						<strong>Đã đi</strong> / <strong>Còn lại</strong> cập
						nhật theo lịch mỗi ngày
						{dataUpdatedAt
							? ` · Làm mới: ${dayjs(dataUpdatedAt).format('DD/MM/YYYY HH:mm')}`
							: ''}
					</p>
				</div>
			</div>

			<div className='flex flex-wrap items-end gap-2'>
				<div className='min-w-[200px] flex-1'>
					<Label className='text-xs text-muted-foreground'>
						Mã / họ tên
					</Label>
					<div className='flex gap-2'>
						<Input
							placeholder='Tìm mã QN hoặc tên…'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') applySearch()
							}}
						/>
						<Button
							type='button'
							variant='secondary'
							onClick={applySearch}
						>
							Tìm
						</Button>
					</div>
				</div>
				<div className='w-40'>
					<Label className='text-xs text-muted-foreground'>
						Loại phép
					</Label>
					<Select value={leaveType} onValueChange={setLeaveType}>
						<SelectTrigger>
							<SelectValue placeholder='Loại phép' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>Tất cả loại</SelectItem>
							<SelectItem value='ANNUAL'>Hằng năm</SelectItem>
							<SelectItem value='SPECIAL'>Đặc biệt</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className='w-48'>
					<Label className='text-xs text-muted-foreground'>
						Chỉ huy CQ
					</Label>
					<Select value={commanderId} onValueChange={setCommanderId}>
						<SelectTrigger>
							<SelectValue placeholder='Chỉ huy' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>Tất cả chỉ huy</SelectItem>
							{commanderOptions.map((c) => (
								<SelectItem key={c.id} value={String(c.id)}>
									{c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className='w-44'>
					<Label className='text-xs text-muted-foreground'>
						Trạng thái
					</Label>
					<Select value={status} onValueChange={setStatus}>
						<SelectTrigger>
							<SelectValue placeholder='Trạng thái' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>Tất cả TT</SelectItem>
							<SelectItem value='PENDING_COMMANDER'>
								Chờ chỉ huy CQ
							</SelectItem>
							<SelectItem value='PENDING_AGENCY'>
								Chờ CQQL
							</SelectItem>
							<SelectItem value='APPROVED'>Đã duyệt</SelectItem>
							<SelectItem value='RETURNED'>Trả lại</SelectItem>
							<SelectItem value='CANCELLED'>Đã hủy</SelectItem>
						</SelectContent>
					</Select>
				</div>
				{/* Chỉ admin / chỉ huy thấy bộ lọc hộp thư duyệt */}
				{(admin || userId != null) && (
					<div className='w-44'>
						<Label className='text-xs text-muted-foreground'>
							Hộp thư
						</Label>
						<Select value={inbox} onValueChange={setInbox}>
							<SelectTrigger>
								<SelectValue placeholder='Hộp thư' />
							</SelectTrigger>
							<SelectContent>
								{admin && (
									<SelectItem value='all'>
										Tất cả đơn
									</SelectItem>
								)}
								{admin && (
									<SelectItem value='agency'>
										Chờ CQQL (ký)
									</SelectItem>
								)}
								{admin && (
									<SelectItem value='commander'>
										Chờ tôi (chỉ huy CQ)
									</SelectItem>
								)}
								<SelectItem value='mine'>
									Đơn tôi đề xuất
								</SelectItem>
								{!admin && (
									<SelectItem value='related'>
										Liên quan đến tôi
									</SelectItem>
								)}
							</SelectContent>
						</Select>
					</div>
				)}
			</div>

			<div className='rounded-md border'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Mã QN</TableHead>
							<TableHead>Họ tên</TableHead>
							<TableHead>Loại</TableHead>
							<TableHead>Tổng</TableHead>
							<TableHead title='Số ngày đã trôi qua từ ngày bắt đầu (đơn đã duyệt)'>
								Đã đi
							</TableHead>
							<TableHead title='Số ngày phép đã duyệt nhưng chưa tới lịch'>
								Còn lại
							</TableHead>
							<TableHead>Nơi nghỉ</TableHead>
							<TableHead>Chỉ huy CQ</TableHead>
							<TableHead>Trạng thái</TableHead>
							<TableHead className='w-28' />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && (
							<TableRow>
								<TableCell colSpan={10} className='text-center'>
									<Loader2 className='mx-auto h-5 w-5 animate-spin' />
								</TableCell>
							</TableRow>
						)}
						{!isLoading && data.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={10}
									className='text-center text-muted-foreground'
								>
									Chưa có đơn phép
								</TableCell>
							</TableRow>
						)}
						{displayGroups.map((group) => {
							const r = group.first
							return (
								<TableRow
									key={group.key}
									className='cursor-pointer hover:bg-muted/40'
									onClick={() =>
										group.isClass
											? setDetailGroup(group)
											: setDetail(r)
									}
								>
									<TableCell className='font-mono text-sm'>
										{group.isClass
											? '—'
											: r.personnelCode || '—'}
									</TableCell>
									<TableCell
										onClick={(e) => {
											if (group.isClass) {
												setDetailGroup(group)
												return
											}
											e.stopPropagation()
											if (r.personnelId) {
												setPersonnelPreview({
													id: r.personnelId,
													name: r.personnelName
												})
											}
										}}
									>
										{group.isClass ? (
											<span className='font-medium'>
												{r.className || 'Lớp'}{' '}
												<span className='text-xs text-muted-foreground'>
													({group.rows.length} học
													viên)
												</span>
											</span>
										) : r.personnelId ? (
											<button
												type='button'
												className='inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline'
											>
												<UserRound className='h-3.5 w-3.5' />
												{r.personnelName || '—'}
											</button>
										) : (
											r.personnelName || '—'
										)}
									</TableCell>
									<TableCell>
										{r.leaveType === 'ANNUAL'
											? 'Hằng năm'
											: 'Đặc biệt'}
									</TableCell>
									<TableCell className='font-semibold'>
										{r.totalDays}
									</TableCell>
									<TableCell className='tabular-nums'>
										{r.usedDays ?? 0}
									</TableCell>
									<TableCell className='tabular-nums font-medium'>
										{r.remainingDays ?? 0}
									</TableCell>
									<TableCell className='max-w-[140px] truncate text-sm'>
										{r.localityPath || '—'}
									</TableCell>
									<TableCell className='max-w-[120px] truncate text-sm'>
										{r.commanderName || '—'}
									</TableCell>
									<TableCell>
										<Badge
											variant={statusVariant(r.status)}
										>
											{STATUS_LABEL[r.status] || r.status}
										</Badge>
									</TableCell>
									<TableCell
										onClick={(e) => e.stopPropagation()}
									>
										<Button
											size='icon'
											variant='ghost'
											title='Xem chi tiết'
											onClick={() =>
												group.isClass
													? setDetailGroup(group)
													: setDetail(r)
											}
										>
											<Eye className='h-4 w-4' />
										</Button>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			{detail && (
				<LeaveDetailDialog
					key={detail.id}
					r={detail}
					admin={admin}
					userId={userId}
					busy={decideMut.isPending}
					onClose={() => setDetail(null)}
					onDecide={(vars) =>
						decideMut.mutate({ id: detail.id, ...vars })
					}
					onPatched={(updated) => {
						setDetail(updated)
						qc.invalidateQueries({ queryKey: ['leave-requests'] })
					}}
					onOpenPersonnel={() => {
						if (detail.personnelId) {
							setPersonnelPreview({
								id: detail.personnelId,
								name: detail.personnelName
							})
						}
					}}
				/>
			)}

			{detailGroup && (
				<ClassLeaveListDialog
					group={detailGroup}
					onClose={() => setDetailGroup(null)}
				/>
			)}

			{personnelPreview && (
				<PersonnelPreviewDialog
					personnelId={personnelPreview.id}
					fallbackName={personnelPreview.name}
					onClose={() => setPersonnelPreview(null)}
				/>
			)}
		</div>
	)
}

function ClassLeaveListDialog({
	group,
	onClose
}: {
	group: LeaveListGroup
	onClose: () => void
}) {
	const r = group.first
	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-2xl'>
				<DialogHeader>
					<DialogTitle>
						Chi tiết phép — {r.className || 'Lớp'}
					</DialogTitle>
				</DialogHeader>
				<div className='grid grid-cols-2 gap-3 text-sm sm:grid-cols-4'>
					<Info label='Đối tượng' value='Học viên' />
					<Info label='Đơn vị' value={r.unitName || '—'} />
					<Info
						label='Loại phép'
						value={
							r.leaveType === 'ANNUAL' ? 'Hằng năm' : 'Đặc biệt'
						}
					/>
					<Info label='Tổng ngày' value={`${r.totalDays} ngày`} />
					<Info label='Từ ngày' value={fmtDate(r.startDate)} />
					<Info label='Đến ngày' value={fmtDate(r.endDate)} />
					<Info
						label='Trạng thái'
						value={STATUS_LABEL[r.status] || r.status}
					/>
					<Info
						label='Số học viên'
						value={String(group.rows.length)}
					/>
				</div>
				<div className='max-h-64 overflow-y-auto rounded-md border'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Mã QN</TableHead>
								<TableHead>Họ tên</TableHead>
								<TableHead>Cấp bậc</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{group.rows.map((row) => (
								<TableRow key={row.id}>
									<TableCell>
										{row.personnelCode || '—'}
									</TableCell>
									<TableCell>
										{row.personnelName || '—'}
									</TableCell>
									<TableCell>{row.rank || '—'}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => {
							if (!printClassLeaveList(group.rows))
								toast.error('Trình duyệt chặn cửa sổ in')
						}}
					>
						<Printer className='mr-1 h-4 w-4' />
						In danh sách lớp
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

function LeaveDetailDialog({
	r,
	admin,
	userId,
	busy,
	onClose,
	onDecide,
	onPatched,
	onOpenPersonnel
}: {
	r: LeaveRequest
	admin: boolean
	userId: number | null
	busy: boolean
	onClose: () => void
	onDecide: (v: {
		decision: 'APPROVED' | 'RETURNED'
		travelDays?: number
		extraDays?: number
		extraReasons?: string[]
		adminNote?: string
	}) => void
	onPatched: (r: LeaveRequest) => void
	onOpenPersonnel?: () => void
}) {
	const act = canAct(r, admin, userId)
	const commanderEdit = isCommanderOf(r, userId, admin)
	const agencyStep = r.status === 'PENDING_AGENCY'
	const { data: meta } = useQuery({
		queryKey: ['leave-meta'],
		queryFn: GetLeaveMeta
	})

	const [travelDays, setTravelDays] = useState(r.travelDays)
	const [extraDays, setExtraDays] = useState(r.extraDays)
	const [wantExtra, setWantExtra] = useState(r.extraDays > 0)
	const [reasons, setReasons] = useState<string[]>(r.extraReasons || [])
	const [adminNote, setAdminNote] = useState(r.adminNote || '')

	const previewTotal = r.baseDays + travelDays + (wantExtra ? extraDays : 0)

	const patchMut = useMutation({
		mutationFn: () =>
			PatchLeaveRequest(r.id, {
				travelDays,
				extraDays: wantExtra ? extraDays : 0,
				extraReasons: wantExtra ? reasons : [],
				adminNote: adminNote || null
			}),
		onSuccess: (updated) => {
			toast.success('Đã lưu chỉnh sửa ngày')
			onPatched(updated)
			setTravelDays(updated.travelDays)
			setExtraDays(updated.extraDays)
			setWantExtra(updated.extraDays > 0)
			setReasons(updated.extraReasons || [])
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const reasonOptions =
		extraDays === 10
			? meta?.extra10Reasons || []
			: extraDays === 5
				? meta?.extra5Reasons || []
				: []

	function printSlip() {
		const ok = printLeaveCertificate(
			{
				...r,
				extraReasons: wantExtra ? reasons : r.extraReasons
			},
			{
				travelDays,
				extraDays: wantExtra ? extraDays : 0,
				totalDays: previewTotal
			}
		)
		if (!ok) toast.error('Trình duyệt chặn popup in')
	}

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className='flex !h-auto max-h-[90vh] max-w-lg flex-col overflow-hidden p-0'>
				<DialogHeader className='shrink-0 border-b px-6 py-4'>
					<DialogTitle>
						Chi tiết đơn #{r.id} — {r.personnelName}
					</DialogTitle>
				</DialogHeader>
				<div className='space-y-4 overflow-y-auto px-6 py-4 text-sm'>
					<div className='grid grid-cols-2 gap-3'>
						<div className='col-span-2'>
							<p className='text-xs text-muted-foreground'>
								Họ tên
							</p>
							{onOpenPersonnel && r.personnelId ? (
								<button
									type='button'
									className='text-sm font-medium text-primary underline-offset-4 hover:underline'
									onClick={onOpenPersonnel}
								>
									{r.personnelName || '—'} (
									{r.personnelCode || '—'})
								</button>
							) : (
								<p className='text-sm font-medium'>
									{r.personnelName || '—'} (
									{r.personnelCode || '—'})
								</p>
							)}
						</div>
						<Field label='Mã' value={r.personnelCode || '—'} />
						<Field
							label='Trạng thái'
							value={STATUS_LABEL[r.status] || r.status}
						/>
						<Field
							label='Loại phép'
							value={
								r.leaveType === 'ANNUAL'
									? 'Hằng năm'
									: 'Đặc biệt'
							}
						/>
						<Field label='Đối tượng' value={r.objectTypeLabel} />
						<Field
							label='Ngày nhập ngũ'
							value={
								r.enlistmentDate
									? dayjs(r.enlistmentDate).format(
											'DD/MM/YYYY'
										)
									: '—'
							}
						/>
						<Field label='Cấp bậc' value={r.rank || '—'} />
						<Field label='Chức vụ' value={r.position || '—'} />
						<Field label='Đơn vị' value={r.unitName || '—'} />
						<Field
							label='Ngày bắt đầu'
							value={fmtDate(r.startDate)}
						/>
						<Field
							label='Ngày kết thúc'
							value={fmtDate(r.endDate)}
						/>
						<Field
							label='Phép cơ bản'
							value={`${r.baseDays} ngày`}
						/>
						<Field
							label='Thâm niên'
							value={`${r.serviceYears} năm`}
						/>
						<Field
							label='Đã đi (theo lịch)'
							value={`${r.usedDays ?? 0} ngày`}
						/>
						<Field
							label='Còn lại (chưa tới)'
							value={`${r.remainingDays ?? 0} ngày${
								r.quotaDays != null
									? ` · hạn mức năm ${r.quotaDays}`
									: ''
							}`}
						/>
						<div className='col-span-2'>
							<Field
								label='Nơi nghỉ'
								value={r.localityPath || '—'}
							/>
						</div>
						<div className='col-span-2'>
							<Field
								label='Ghi chú đề xuất'
								value={r.note || '—'}
							/>
						</div>
						<Field
							label='Người đề xuất'
							value={
								r.proposedByDisplayName ||
								r.proposedByUsername ||
								'—'
							}
						/>
						<Field
							label='Chỉ huy CQ'
							value={r.commanderName || '—'}
						/>
						<Field
							label='Xử lý cuối'
							value={
								r.decidedByUsername
									? `${r.decidedByUsername} · ${r.decidedAt ? dayjs(r.decidedAt).format('DD/MM/YYYY HH:mm') : ''}`
									: '—'
							}
						/>
					</div>

					{/* Commander edit travel / extra */}
					{commanderEdit && r.leaveType === 'ANNUAL' && (
						<div className='space-y-3 rounded-md border p-3'>
							<p className='font-medium'>
								Chỉ huy CQ — chỉnh ngày đi đường / nghỉ thêm
							</p>
							<div className='grid grid-cols-2 gap-3'>
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
								<div>
									<Label>Tổng dự kiến</Label>
									<div className='flex h-10 items-center rounded-md border bg-muted/40 px-3 font-semibold'>
										{previewTotal} ngày
									</div>
								</div>
							</div>
							<div className='flex items-center gap-2'>
								<Checkbox
									id='wantExtraCmd'
									checked={wantExtra}
									onCheckedChange={(c) => {
										setWantExtra(!!c)
										if (!c) {
											setExtraDays(0)
											setReasons([])
										} else if (!extraDays) {
											setExtraDays(10)
										}
									}}
								/>
								<Label htmlFor='wantExtraCmd'>Nghỉ thêm</Label>
							</div>
							{wantExtra && (
								<>
									<div className='flex gap-4 text-sm'>
										<label className='flex items-center gap-2'>
											<input
												type='radio'
												checked={extraDays === 10}
												onChange={() => {
													setExtraDays(10)
													setReasons([])
												}}
											/>
											10 ngày
										</label>
										<label className='flex items-center gap-2'>
											<input
												type='radio'
												checked={extraDays === 5}
												onChange={() => {
													setExtraDays(5)
													setReasons([])
												}}
											/>
											5 ngày
										</label>
									</div>
									<div className='space-y-2'>
										{reasonOptions.map((opt) => (
											<label
												key={opt.code}
												className='flex items-start gap-2 text-sm'
											>
												<Checkbox
													checked={reasons.includes(
														opt.code
													)}
													onCheckedChange={() =>
														setReasons((prev) =>
															prev.includes(
																opt.code
															)
																? prev.filter(
																		(c) =>
																			c !==
																			opt.code
																	)
																: [
																		...prev,
																		opt.code
																	]
														)
													}
												/>
												<span>{opt.label}</span>
											</label>
										))}
									</div>
								</>
							)}
							<div>
								<Label>Ghi chú chỉ huy</Label>
								<Textarea
									value={adminNote}
									onChange={(e) =>
										setAdminNote(e.target.value)
									}
									rows={2}
								/>
							</div>
							<Button
								variant='outline'
								size='sm'
								disabled={patchMut.isPending}
								onClick={() => patchMut.mutate()}
							>
								{patchMut.isPending ? (
									<Loader2 className='mr-1 h-4 w-4 animate-spin' />
								) : (
									<Save className='mr-1 h-4 w-4' />
								)}
								Lưu chỉnh sửa
							</Button>
						</div>
					)}

					{!commanderEdit && r.leaveType === 'ANNUAL' && (
						<div className='grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-3 text-sm'>
							<span>Đi đường: {r.travelDays}</span>
							<span>Nghỉ thêm: {r.extraDays}</span>
							<span className='font-semibold'>
								Tổng: {r.totalDays}
							</span>
						</div>
					)}

					{act && agencyStep && (
						<div>
							<Label>Ghi chú CQQL</Label>
							<Textarea
								value={adminNote}
								onChange={(e) => setAdminNote(e.target.value)}
								rows={2}
								placeholder='VD: Đã ký BGH…'
							/>
						</div>
					)}
				</div>

				<DialogFooter className='shrink-0 flex-wrap gap-2 border-t px-6 py-4'>
					<Button variant='outline' onClick={onClose}>
						Đóng
					</Button>
					<Button variant='outline' onClick={printSlip}>
						<Printer className='mr-1 h-4 w-4' />
						Xuất giấy phép
					</Button>
					{act && (
						<>
							<Button
								variant='destructive'
								disabled={busy}
								onClick={() =>
									onDecide({
										decision: 'RETURNED',
										travelDays,
										extraDays: wantExtra ? extraDays : 0,
										extraReasons: wantExtra ? reasons : [],
										adminNote
									})
								}
							>
								<RotateCcw className='mr-1 h-4 w-4' />
								Trả lại
							</Button>
							<Button
								disabled={
									busy ||
									(wantExtra &&
										commanderEdit &&
										reasons.length === 0)
								}
								onClick={() =>
									onDecide({
										decision: 'APPROVED',
										travelDays,
										extraDays: wantExtra ? extraDays : 0,
										extraReasons: wantExtra ? reasons : [],
										adminNote
									})
								}
							>
								{busy ? (
									<Loader2 className='mr-1 h-4 w-4 animate-spin' />
								) : (
									<Check className='mr-1 h-4 w-4' />
								)}
								{agencyStep ? 'Duyệt (đã ký)' : 'Duyệt → CQQL'}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

function Field({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className='text-xs text-muted-foreground'>{label}</p>
			<p className='font-medium break-words'>{value}</p>
		</div>
	)
}
