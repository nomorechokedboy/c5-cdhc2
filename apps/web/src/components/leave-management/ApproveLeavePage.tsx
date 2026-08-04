/**
 * Duyệt đề xuất nghỉ phép — hộp thư chỉ huy CQ / CQQL
 * Bảng đơn chờ · bấm tên xem hồ sơ QN · bấm xem để duyệt
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Check,
	Eye,
	Loader2,
	Printer,
	RotateCcw,
	UserRound
} from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import {
	DecideLeaveRequest,
	GetLeaveMyAccess,
	GetLeaveMailStatus,
	ListLeaveAlerts,
	ListLeaveMailLog,
	ListLeaveRequests,
	MarkLeaveAlertsRead,
	TestLeaveMail,
	type LeaveRequest
} from '@/api/leave'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isSuperAdmin } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import PersonnelPreviewDialog from './PersonnelPreviewDialog'
import { printLeaveCertificate } from './printLeaveCertificate'
import { printClassLeaveList } from './printClassLeaveList'

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

const STATUS_LABEL: Record<string, string> = {
	PENDING: 'Chờ chỉ huy CQ',
	PENDING_COMMANDER: 'Chờ chỉ huy CQ',
	PENDING_AGENCY: 'Chờ CQQL (ký)',
	APPROVED: 'Đã duyệt',
	RETURNED: 'Trả lại',
	CANCELLED: 'Đã hủy'
}

type PendingGroup = {
	key: string
	rows: LeaveRequest[]
	first: LeaveRequest
	isClass: boolean
}

function pendingGroupKey(r: LeaveRequest): string {
	if (r.requestScope !== 'CLASS' || r.classId == null)
		return `request:${r.id}`
	// Các đơn của một lần đề xuất lớp được tạo gần như đồng thời. Ghép thêm
	// thông tin nghiệp vụ để không nhập nhầm hai lần đề xuất khác nhau.
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

export default function ApproveLeavePage() {
	const qc = useQueryClient()
	const admin = isSuperAdmin()
	const userId = useMemo(() => readUserId(), [])
	const [personnelId, setPersonnelId] = useState<number | null>(null)
	const [personnelName, setPersonnelName] = useState<string | null>(null)
	const [detail, setDetail] = useState<LeaveRequest | null>(null)
	const [detailGroup, setDetailGroup] = useState<PendingGroup | null>(null)
	const [testTo, setTestTo] = useState('maiphuongnam7554@gmail.com')
	const { data: access } = useQuery({
		queryKey: ['leave-my-access'],
		queryFn: GetLeaveMyAccess
	})
	const agency = Boolean(access?.isAgency)

	const { data: mailStatus, refetch: refetchMail } = useQuery({
		queryKey: ['leave-mail-status'],
		queryFn: GetLeaveMailStatus,
		enabled: admin
	})

	const testMailMut = useMutation({
		mutationFn: () => TestLeaveMail(testTo.trim()),
		onSuccess: (r) => {
			if (r.ok) {
				if (r.isTestInbox || r.mode === 'ethereal-dev') {
					toast.message(
						`Mode TEST — thư KHÔNG vào Gmail. Mở link Ethereal để xem.`,
						{ duration: 12000 }
					)
				} else {
					toast.success(`Đã gửi mail thật → ${r.to} (${r.mode})`)
				}
				if (r.previewUrl) window.open(r.previewUrl, '_blank')
				refetchMail()
				qc.invalidateQueries({ queryKey: ['leave-mail-log'] })
			} else {
				toast.error(r.error || `Gửi thất bại (${r.mode})`)
			}
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const { data: alerts = [] } = useQuery({
		queryKey: ['leave-alerts', 'unread'],
		queryFn: () => ListLeaveAlerts({ unreadOnly: true, limit: 20 }),
		refetchInterval: 30_000
	})

	// Đơn chờ chỉ huy (tôi)
	const { data: commanderPending = [], isLoading: loadCmd } = useQuery({
		queryKey: ['leave-approve', 'commander', userId],
		queryFn: () =>
			ListLeaveRequests({
				inbox: 'commander',
				status: 'PENDING_COMMANDER'
			}),
		enabled: userId != null
	})
	// legacy PENDING
	const { data: commanderPendingLegacy = [] } = useQuery({
		queryKey: ['leave-approve', 'commander-legacy', userId],
		queryFn: () =>
			ListLeaveRequests({
				inbox: 'commander',
				status: 'PENDING'
			}),
		enabled: userId != null
	})

	const { data: agencyPending = [], isLoading: loadAgency } = useQuery({
		queryKey: ['leave-approve', 'agency'],
		queryFn: () =>
			ListLeaveRequests({
				inbox: 'agency',
				status: 'PENDING_AGENCY'
			}),
		enabled: admin || agency
	})

	const pendingRows = useMemo(() => {
		const map = new Map<number, LeaveRequest>()
		for (const r of [
			...commanderPending,
			...commanderPendingLegacy,
			...(admin || agency ? agencyPending : [])
		]) {
			map.set(r.id, r)
		}
		return [...map.values()].sort((a, b) => b.id - a.id)
	}, [commanderPending, commanderPendingLegacy, agencyPending, admin, agency])

	const pendingGroups = useMemo<PendingGroup[]>(() => {
		const groups = new Map<string, LeaveRequest[]>()
		for (const row of pendingRows) {
			const key = pendingGroupKey(row)
			const rows = groups.get(key) || []
			rows.push(row)
			groups.set(key, rows)
		}
		return [...groups.entries()].map(([key, rows]) => ({
			key,
			rows,
			first: rows[0]!,
			isClass: rows[0]!.requestScope === 'CLASS'
		}))
	}, [pendingRows])

	// Alert chưa đọc có thể còn tồn tại sau khi đơn đã được xử lý ở tab/phiên
	// khác. Banner chỉ phản ánh những đơn thực sự còn trong hàng chờ hiện tại.
	const actionableAlerts = useMemo(() => {
		const pendingIds = new Set(pendingRows.map((r) => r.id))
		return alerts.filter(
			(a) => a.requestId != null && pendingIds.has(a.requestId)
		)
	}, [alerts, pendingRows])

	const actionableAlertGroups = useMemo(() => {
		const byRequest = new Map<number, PendingGroup>()
		for (const group of pendingGroups) {
			for (const row of group.rows) byRequest.set(row.id, group)
		}
		const seen = new Set<string>()
		return actionableAlerts.flatMap((alert) => {
			const group = byRequest.get(alert.requestId)
			if (!group || seen.has(group.key)) return []
			seen.add(group.key)
			return [{ alert, group }]
		})
	}, [actionableAlerts, pendingGroups])

	const decideMut = useMutation({
		mutationFn: (vars: {
			id: number
			decision: 'APPROVED' | 'RETURNED'
			adminNote?: string
		}) =>
			DecideLeaveRequest(vars.id, {
				decision: vars.decision,
				adminNote: vars.adminNote
			}),
		onSuccess: async (resp, vars) => {
			toast.success(
				vars.decision === 'APPROVED' ? 'Đã duyệt' : 'Đã trả lại'
			)
			const mail = resp.mail
			if (mail) {
				if (mail.ok && mail.previewUrl) {
					toast.message(mail.message, {
						duration: 15000,
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
					toast.error(mail.message || mail.error || 'Gửi mail lỗi')
				}
			}
			await MarkLeaveAlertsRead({ requestId: vars.id }).catch(() => {})
			qc.invalidateQueries({ queryKey: ['leave-approve'] })
			qc.invalidateQueries({ queryKey: ['leave-requests'] })
			qc.invalidateQueries({ queryKey: ['leave-alerts'] })
			qc.invalidateQueries({ queryKey: ['leave-alert-count'] })
			qc.invalidateQueries({ queryKey: ['leave-records'] })
			qc.invalidateQueries({ queryKey: ['leave-mail-log'] })
			setDetail(null)
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const decideGroupMut = useMutation({
		mutationFn: async (vars: {
			rows: LeaveRequest[]
			decision: 'APPROVED' | 'RETURNED'
		}) => {
			// Chạy tuần tự để SQLite và luồng gửi mail không bị tranh chấp khi lớp đông.
			for (const row of vars.rows) {
				await DecideLeaveRequest(row.id, { decision: vars.decision })
			}
		},
		onSuccess: async (_, vars) => {
			toast.success(
				vars.decision === 'APPROVED'
					? `Đã duyệt ${vars.rows.length} học viên`
					: `Đã trả lại ${vars.rows.length} học viên`
			)
			await Promise.all(
				vars.rows.map((row) =>
					MarkLeaveAlertsRead({ requestId: row.id }).catch(() => {})
				)
			)
			for (const key of [
				['leave-approve'],
				['leave-requests'],
				['leave-alerts'],
				['leave-alert-count'],
				['leave-records'],
				['leave-mail-log']
			])
				qc.invalidateQueries({ queryKey: key })
		},
		onError: (e: Error) =>
			toast.error(`Duyệt theo lớp chưa hoàn tất: ${e.message}`)
	})

	const isLoading = loadCmd || ((admin || agency) && loadAgency)

	function openPersonnel(r: LeaveRequest) {
		if (r.personnelId) {
			setPersonnelId(r.personnelId)
			setPersonnelName(r.personnelName)
		} else {
			toast.message('Đơn không liên kết hồ sơ quân nhân')
		}
	}

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-2xl font-bold tracking-tight'>
					Duyệt đề xuất nghỉ phép
				</h2>
				<p className='text-sm text-muted-foreground'>
					Đơn đẩy lên chỉ huy CQ / CQQL hiện tại bảng dưới. Bấm{' '}
					<strong>họ tên</strong> để xem hồ sơ quân nhân · bấm{' '}
					<strong>Xem</strong> để duyệt / trả lại.
				</p>
			</div>

			{/* Banner thông báo chưa đọc */}
			{actionableAlertGroups.length > 0 && (
				<Card className='border-amber-500/40 bg-amber-500/10'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-base'>
							Thông báo chờ xử lý ({actionableAlertGroups.length})
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-2'>
						{actionableAlertGroups
							.slice(0, 5)
							.map(({ alert: a, group }) => (
								<div
									key={a.id}
									className='flex flex-wrap items-start justify-between gap-2 rounded-md border bg-background/60 px-3 py-2 text-sm'
								>
									<div>
										<p className='font-medium'>
											{group.isClass
												? `[Đề xuất phép theo lớp] ${group.first.className || 'Lớp'} — ${group.rows.length} học viên`
												: a.title}
										</p>
										<p className='text-muted-foreground'>
											{group.isClass
												? `${group.first.totalDays} ngày (${group.first.startDate || '—'} → ${group.first.endDate || '—'}). Vào duyệt một lần cho cả lớp.`
												: a.message}
										</p>
										<p className='mt-1 text-xs text-muted-foreground'>
											{dayjs(a.createdAt).format(
												'DD/MM/YYYY HH:mm'
											)}
										</p>
									</div>
									<Button
										size='sm'
										variant='outline'
										onClick={async () => {
											await MarkLeaveAlertsRead({
												ids: [a.id]
											})
											const found = group.first
											if (group.isClass)
												setDetailGroup(group)
											else if (found) setDetail(found)
											else {
												// load single via list
												const all =
													await ListLeaveRequests({
														inbox: admin
															? 'all'
															: 'related'
													})
												const r = all.find(
													(x) => x.id === a.requestId
												)
												if (r) setDetail(r)
											}
											qc.invalidateQueries({
												queryKey: ['leave-alerts']
											})
											qc.invalidateQueries({
												queryKey: ['leave-alert-count']
											})
										}}
									>
										{group.isClass ? 'Mở lớp' : 'Mở đơn'}
									</Button>
								</div>
							))}
					</CardContent>
				</Card>
			)}

			<div className='rounded-md border'>
				<div className='flex items-center justify-between border-b px-4 py-3'>
					<p className='font-medium'>
						Đơn chờ tôi duyệt
						{pendingGroups.length > 0 && (
							<Badge className='ml-2' variant='destructive'>
								{pendingGroups.length}
							</Badge>
						)}
					</p>
				</div>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Mã QN</TableHead>
							<TableHead>Họ tên / Lớp</TableHead>
							<TableHead>Đối tượng</TableHead>
							<TableHead>Đơn vị</TableHead>
							<TableHead>Loại</TableHead>
							<TableHead>Tổng ngày</TableHead>
							<TableHead>Từ ngày</TableHead>
							<TableHead>Đến ngày</TableHead>
							<TableHead>Trạng thái</TableHead>
							<TableHead className='w-36' />
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
						{!isLoading && pendingRows.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={10}
									className='text-center text-muted-foreground'
								>
									Không có đơn chờ bạn duyệt
								</TableCell>
							</TableRow>
						)}
						{pendingGroups.map((group) => {
							const r = group.first
							return (
								<TableRow key={group.key}>
									<TableCell className='font-mono text-sm'>
										{group.isClass
											? 'THEO LỚP'
											: r.personnelCode || '—'}
									</TableCell>
									<TableCell>
										<button
											type='button'
											className='inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline'
											onClick={() =>
												group.isClass
													? setDetailGroup(group)
													: openPersonnel(r)
											}
											title={
												group.isClass
													? 'Xem đề xuất cả lớp'
													: 'Xem hồ sơ quân nhân'
											}
										>
											<UserRound className='h-3.5 w-3.5' />
											{group.isClass
												? `${r.className || 'Lớp'} (${group.rows.length} học viên)`
												: r.personnelName || '—'}
										</button>
									</TableCell>
									<TableCell>
										<Badge variant='secondary'>
											{group.isClass
												? 'Học viên'
												: r.objectTypeLabel}
										</Badge>
									</TableCell>
									<TableCell>{r.unitName || '—'}</TableCell>
									<TableCell>
										{r.leaveType === 'SPECIAL'
											? 'Đặc biệt'
											: 'Hằng năm'}
									</TableCell>
									<TableCell className='font-semibold'>
										{r.totalDays}
									</TableCell>
									<TableCell className='whitespace-nowrap text-sm'>
										{r.startDate
											? dayjs(r.startDate).format(
													'DD/MM/YYYY'
												)
											: '—'}
									</TableCell>
									<TableCell className='whitespace-nowrap text-sm'>
										{r.endDate
											? dayjs(r.endDate).format(
													'DD/MM/YYYY'
												)
											: '—'}
									</TableCell>
									<TableCell>
										<Badge variant='secondary'>
											{STATUS_LABEL[r.status] || r.status}
										</Badge>
									</TableCell>
									<TableCell>
										<div className='flex gap-1'>
											{group.isClass && (
												<Button
													size='sm'
													disabled={
														decideGroupMut.isPending ||
														decideMut.isPending
													}
													onClick={() => {
														if (
															window.confirm(
																`Duyệt ${group.rows.length} học viên của ${r.className || 'lớp này'}?`
															)
														) {
															decideGroupMut.mutate(
																{
																	rows: group.rows,
																	decision:
																		'APPROVED'
																}
															)
														}
													}}
												>
													<Check className='mr-1 h-3.5 w-3.5' />
													Duyệt cả lớp
												</Button>
											)}
											{!group.isClass && (
												<Button
													size='sm'
													variant='outline'
													title='In trước khi duyệt'
													onClick={() => {
														if (
															!printLeaveCertificate(
																r
															)
														) {
															toast.error(
																'Trình duyệt chặn popup in'
															)
														}
													}}
												>
													<Printer className='h-3.5 w-3.5' />
												</Button>
											)}
											{!group.isClass && (
												<Button
													size='sm'
													variant='outline'
													onClick={() => setDetail(r)}
												>
													<Eye className='mr-1 h-3.5 w-3.5' />
													Xem
												</Button>
											)}
											{group.isClass && (
												<Button
													size='sm'
													variant='destructive'
													disabled={
														decideGroupMut.isPending ||
														decideMut.isPending
													}
													onClick={() => {
														if (
															window.confirm(
																`Trả lại đề xuất của ${group.rows.length} học viên?`
															)
														) {
															decideGroupMut.mutate(
																{
																	rows: group.rows,
																	decision:
																		'RETURNED'
																}
															)
														}
													}}
												>
													<RotateCcw className='h-3.5 w-3.5' />
												</Button>
											)}
											{!group.isClass && (
												<Button
													size='sm'
													disabled={
														decideMut.isPending
													}
													onClick={() =>
														decideMut.mutate({
															id: r.id,
															decision: 'APPROVED'
														})
													}
												>
													<Check className='mr-1 h-3.5 w-3.5' />
													Duyệt
												</Button>
											)}
											{!group.isClass && (
												<Button
													size='sm'
													variant='destructive'
													disabled={
														decideMut.isPending
													}
													onClick={() =>
														decideMut.mutate({
															id: r.id,
															decision: 'RETURNED'
														})
													}
												>
													<RotateCcw className='h-3.5 w-3.5' />
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			{/* Chi tiết duyệt — tái dùng dialog từ LeaveListPage qua state local đơn giản */}
			{detail && (
				<ApproveDetailDialog
					r={detail}
					busy={decideMut.isPending}
					onClose={() => setDetail(null)}
					onApprove={() =>
						decideMut.mutate({
							id: detail.id,
							decision: 'APPROVED'
						})
					}
					onReturn={() =>
						decideMut.mutate({
							id: detail.id,
							decision: 'RETURNED'
						})
					}
					onOpenPersonnel={() => openPersonnel(detail)}
				/>
			)}

			{detailGroup && (
				<ClassApproveDetailDialog
					group={detailGroup}
					busy={decideGroupMut.isPending}
					onClose={() => setDetailGroup(null)}
					onApprove={() =>
						decideGroupMut.mutate(
							{ rows: detailGroup.rows, decision: 'APPROVED' },
							{ onSuccess: () => setDetailGroup(null) }
						)
					}
					onReturn={() =>
						decideGroupMut.mutate(
							{ rows: detailGroup.rows, decision: 'RETURNED' },
							{ onSuccess: () => setDetailGroup(null) }
						)
					}
				/>
			)}

			{personnelId != null && (
				<PersonnelPreviewDialog
					personnelId={personnelId}
					fallbackName={personnelName}
					onClose={() => {
						setPersonnelId(null)
						setPersonnelName(null)
					}}
				/>
			)}

			{/* Admin: cấu hình / thử mail + nhật ký */}
			{admin && (
				<MailConfigAndLog
					mailStatus={mailStatus}
					testTo={testTo}
					setTestTo={setTestTo}
					testMailMut={testMailMut}
				/>
			)}
		</div>
	)
}

function MailConfigAndLog({
	mailStatus,
	testTo,
	setTestTo,
	testMailMut
}: {
	mailStatus:
		| {
				configured: boolean
				mode: string
				host: string | null
				port: number | null
				from: string | null
				hint: string
				lastPreviewUrl: string | null
				devMode: boolean
		  }
		| undefined
	testTo: string
	setTestTo: (v: string) => void
	testMailMut: {
		isPending: boolean
		mutate: () => void
	}
}) {
	const { data: logs = [] } = useQuery({
		queryKey: ['leave-mail-log'],
		queryFn: () => ListLeaveMailLog(20),
		refetchInterval: 15_000
	})

	return (
		<>
			{mailStatus && (
				<Card
					className={
						mailStatus.mode === 'ethereal-dev' || mailStatus.devMode
							? 'border-amber-500/50'
							: ''
					}
				>
					<CardHeader className='pb-2'>
						<CardTitle className='text-base'>
							Cấu hình email thông báo
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3 text-sm'>
						{(mailStatus.mode === 'ethereal-dev' ||
							mailStatus.devMode) && (
							<div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100'>
								<strong>Đang bật LEAVE_MAIL_DEV</strong> — mail
								chỉ vào hộp test Ethereal,{' '}
								<strong>không vào Gmail thật</strong>. Muốn gửi
								Gmail: điền SMTP_USER + SMTP_PASS (App
								Password), đặt LEAVE_MAIL_DEV=false, restart
								encore.
							</div>
						)}
						<div className='grid gap-1 rounded-md border bg-muted/30 p-3'>
							<p>
								<strong>Trạng thái:</strong>{' '}
								{mailStatus.configured ? (
									<span className='text-green-600'>
										Sẵn sàng ({mailStatus.mode})
									</span>
								) : (
									<span className='text-destructive'>
										Chưa cấu hình
									</span>
								)}
							</p>
							<p className='text-muted-foreground'>
								{mailStatus.hint}
							</p>
							{mailStatus.host && (
								<p className='text-xs text-muted-foreground'>
									Host: {mailStatus.host}:{mailStatus.port} ·
									From: {mailStatus.from}
								</p>
							)}
							{mailStatus.lastPreviewUrl && (
								<p className='text-xs'>
									Preview gần nhất:{' '}
									<a
										className='text-primary underline'
										href={mailStatus.lastPreviewUrl}
										target='_blank'
										rel='noreferrer'
									>
										mở thư test
									</a>
								</p>
							)}
						</div>
						<div className='flex flex-wrap items-end gap-2'>
							<div className='min-w-[220px] flex-1'>
								<Label>Gửi thử tới</Label>
								<Input
									type='email'
									value={testTo}
									onChange={(e) => setTestTo(e.target.value)}
									placeholder='email@example.com'
								/>
							</div>
							<Button
								disabled={
									testMailMut.isPending || !testTo.trim()
								}
								onClick={() => testMailMut.mutate()}
							>
								{testMailMut.isPending && (
									<Loader2 className='mr-1 h-4 w-4 animate-spin' />
								)}
								Gửi mail thử
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>
						Nhật ký mail đã gửi (tự động khi duyệt)
					</CardTitle>
				</CardHeader>
				<CardContent>
					{logs.length === 0 ? (
						<p className='text-sm text-muted-foreground'>
							Chưa có bản ghi. Sau khi duyệt đơn sẽ hiện ở đây.
						</p>
					) : (
						<div className='space-y-2'>
							{logs.map((l) => (
								<div
									key={l.id}
									className='rounded-md border px-3 py-2 text-sm'
								>
									<div className='flex flex-wrap items-center justify-between gap-2'>
										<span className='font-medium'>
											{l.ok ? '✓' : '✗'} {l.toEmail}
										</span>
										<span className='text-xs text-muted-foreground'>
											{dayjs(l.createdAt).format(
												'DD/MM/YYYY HH:mm'
											)}{' '}
											· {l.mode}
											{l.kind ? ` · ${l.kind}` : ''}
										</span>
									</div>
									<p className='text-muted-foreground'>
										{l.subject}
									</p>
									{l.error && (
										<p className='text-xs text-destructive'>
											{l.error}
										</p>
									)}
									{l.previewUrl && (
										<a
											className='text-xs text-primary underline'
											href={l.previewUrl}
											target='_blank'
											rel='noreferrer'
										>
											Xem nội dung thư (Ethereal)
										</a>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</>
	)
}

function ClassApproveDetailDialog({
	group,
	busy,
	onClose,
	onApprove,
	onReturn
}: {
	group: PendingGroup
	busy: boolean
	onClose: () => void
	onApprove: () => void
	onReturn: () => void
}) {
	const r = group.first
	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
			<div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background shadow-lg'>
				<div className='flex items-center justify-between border-b px-5 py-4'>
					<div>
						<h3 className='font-semibold'>
							Chi tiết đề xuất {r.className || 'theo lớp'}
						</h3>
						<p className='text-sm text-muted-foreground'>
							{group.rows.length} học viên
						</p>
					</div>
					<Button variant='ghost' size='sm' onClick={onClose}>
						Đóng
					</Button>
				</div>
				<div className='grid grid-cols-2 gap-3 px-5 py-4 text-sm sm:grid-cols-4'>
					<div>
						<p className='text-xs text-muted-foreground'>Lớp</p>
						<p className='font-medium'>{r.className || '—'}</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Đối tượng
						</p>
						<p className='font-medium'>Học viên</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>Đơn vị</p>
						<p className='font-medium'>{r.unitName || '—'}</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Trạng thái
						</p>
						<p className='font-medium'>
							{STATUS_LABEL[r.status] || r.status}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Loại phép
						</p>
						<p className='font-medium'>
							{r.leaveType === 'SPECIAL'
								? 'Phép đặc biệt'
								: 'Phép hằng năm'}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Tổng ngày
						</p>
						<p className='font-semibold'>{r.totalDays} ngày</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>Từ ngày</p>
						<p className='font-medium'>
							{r.startDate
								? dayjs(r.startDate).format('DD/MM/YYYY')
								: '—'}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Đến ngày
						</p>
						<p className='font-medium'>
							{r.endDate
								? dayjs(r.endDate).format('DD/MM/YYYY')
								: '—'}
						</p>
					</div>
					<div className='col-span-2 sm:col-span-4'>
						<p className='text-xs text-muted-foreground'>Ghi chú</p>
						<p className='font-medium'>{r.note || '—'}</p>
					</div>
				</div>
				<div className='border-t px-5 py-4'>
					<p className='mb-2 font-medium'>
						Danh sách học viên ({group.rows.length})
					</p>
					<div className='max-h-52 overflow-y-auto rounded-md border'>
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
										<TableCell className='font-mono'>
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
				</div>
				<div className='flex justify-end gap-2 border-t px-5 py-4'>
					<Button
						variant='outline'
						disabled={busy}
						onClick={() => {
							if (!printClassLeaveList(group.rows))
								toast.error('Trình duyệt chặn cửa sổ in')
						}}
					>
						<Printer className='mr-1 h-4 w-4' />
						In danh sách lớp
					</Button>
					<Button
						variant='destructive'
						disabled={busy}
						onClick={onReturn}
					>
						<RotateCcw className='mr-1 h-4 w-4' />
						Trả lại cả lớp
					</Button>
					<Button disabled={busy} onClick={onApprove}>
						{busy ? (
							<Loader2 className='mr-1 h-4 w-4 animate-spin' />
						) : (
							<Check className='mr-1 h-4 w-4' />
						)}
						Duyệt cả lớp
					</Button>
				</div>
			</div>
		</div>
	)
}

function ApproveDetailDialog({
	r,
	busy,
	onClose,
	onApprove,
	onReturn,
	onOpenPersonnel
}: {
	r: LeaveRequest
	busy: boolean
	onClose: () => void
	onApprove: () => void
	onReturn: () => void
	onOpenPersonnel: () => void
}) {
	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
			<div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background shadow-lg'>
				<div className='flex items-center justify-between border-b px-5 py-4'>
					<h3 className='font-semibold'>Chi tiết đơn #{r.id}</h3>
					<Button variant='ghost' size='sm' onClick={onClose}>
						Đóng
					</Button>
				</div>
				<div className='grid grid-cols-2 gap-3 px-5 py-4 text-sm'>
					<div>
						<p className='text-xs text-muted-foreground'>Họ tên</p>
						<button
							type='button'
							className='font-medium text-primary underline-offset-4 hover:underline'
							onClick={onOpenPersonnel}
						>
							{r.personnelName || '—'} ({r.personnelCode || '—'})
						</button>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Trạng thái
						</p>
						<p className='font-medium'>
							{STATUS_LABEL[r.status] || r.status}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Đối tượng
						</p>
						<p className='font-medium'>{r.objectTypeLabel}</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>Cấp bậc</p>
						<p className='font-medium'>{r.rank || '—'}</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>Chức vụ</p>
						<p className='font-medium'>{r.position || '—'}</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>Đơn vị</p>
						<p className='font-medium'>{r.unitName || '—'}</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Loại phép
						</p>
						<p className='font-medium'>
							{r.leaveType === 'SPECIAL'
								? 'Phép đặc biệt'
								: 'Phép hằng năm'}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Nhập ngũ
						</p>
						<p className='font-medium'>
							{r.enlistmentDate
								? dayjs(r.enlistmentDate).format('DD/MM/YYYY')
								: '—'}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Thâm niên
						</p>
						<p className='font-medium'>{r.serviceYears} năm</p>
					</div>
					<div className='col-span-2 rounded-md border bg-muted/30 p-3'>
						<p className='mb-2 font-medium'>
							Căn cứ tính ngày phép
						</p>
						<div className='grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4'>
							<div>
								<p className='text-xs text-muted-foreground'>
									Ngày cơ bản
								</p>
								<p className='font-semibold'>
									{r.baseDays} ngày
								</p>
							</div>
							<div>
								<p className='text-xs text-muted-foreground'>
									Ngày đi đường
								</p>
								<p className='font-semibold'>
									{r.travelDays} ngày
								</p>
							</div>
							<div>
								<p className='text-xs text-muted-foreground'>
									Ngày nghỉ thêm
								</p>
								<p className='font-semibold'>
									{r.extraDays} ngày
								</p>
							</div>
							<div>
								<p className='text-xs text-muted-foreground'>
									Tổng cộng
								</p>
								<p className='font-semibold'>
									{r.totalDays} ngày
								</p>
							</div>
						</div>
						{r.extraReasons.length > 0 && (
							<p className='mt-2 text-xs text-muted-foreground'>
								Lý do nghỉ thêm: {r.extraReasons.join(', ')}
							</p>
						)}
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>Bắt đầu</p>
						<p className='font-medium'>
							{r.startDate
								? dayjs(r.startDate).format('DD/MM/YYYY')
								: '—'}
						</p>
					</div>
					<div>
						<p className='text-xs text-muted-foreground'>
							Kết thúc
						</p>
						<p className='font-medium'>
							{r.endDate
								? dayjs(r.endDate).format('DD/MM/YYYY')
								: '—'}
						</p>
					</div>
					<div className='col-span-2'>
						<p className='text-xs text-muted-foreground'>
							Nơi nghỉ
						</p>
						<p className='font-medium'>{r.localityPath || '—'}</p>
					</div>
					<div className='col-span-2'>
						<p className='text-xs text-muted-foreground'>Ghi chú</p>
						<p className='font-medium'>{r.note || '—'}</p>
					</div>
				</div>
				<div className='flex flex-wrap gap-2 border-t px-5 py-4'>
					<Button
						variant='outline'
						onClick={() => {
							if (!printLeaveCertificate(r)) {
								toast.error('Trình duyệt chặn popup in')
							}
						}}
					>
						Xuất giấy phép
					</Button>
					<Button
						variant='destructive'
						disabled={busy}
						onClick={onReturn}
					>
						<RotateCcw className='mr-1 h-4 w-4' />
						Trả lại
					</Button>
					<Button disabled={busy} onClick={onApprove}>
						{busy && (
							<Loader2 className='mr-1 h-4 w-4 animate-spin' />
						)}
						<Check className='mr-1 h-4 w-4' />
						Duyệt
					</Button>
				</div>
			</div>
		</div>
	)
}
