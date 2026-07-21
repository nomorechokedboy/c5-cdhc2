/**
 * Luồng user / giáo viên / cán bộ phòng:
 * 1. Chọn phòng dạy (chỉ phòng gán tài khoản = username)
 * 2. Xem học viên (nếu phòng đã gán lớp)
 * 3. Xem trang thiết bị trong phòng — sửa tên (ghi nhật ký SC)
 * 4. Báo hỏng → admin phân công sửa ( /vat-tu/phan-cong )
 */
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	Check,
	Monitor,
	Pencil,
	Users,
	Wrench,
	X
} from 'lucide-react'
import { toast } from 'sonner'
import { GetClasses } from '@/api'
import {
	GetBuildingTree,
	GetRoomAssets,
	UpdateRoom,
	UpdateRoomAsset
} from '@/api/asset'
import useAuth from '@/hooks/useAuth'
import useStudentData from '@/hooks/useStudents'
import { useRepairRequests } from '@/hooks/useRepairRequests'
import ReportBrokenDialog from '@/components/asset-management/ReportBrokenDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Room } from '@/types/asset'
import { canLinkRoomClass, isSuperAdmin } from '@/lib/utils'

type RoomOption = Room & {
	buildingName: string
	floorName: string
}

const STATUS_LABEL: Record<string, string> = {
	NORMAL: 'Bình thường',
	BROKEN: 'Hư hỏng',
	REPAIRING: 'Đang sửa',
	DISPOSED: 'Thanh lý'
}

const REQ_STATUS: Record<string, string> = {
	PENDING: 'Chờ phân công',
	ASSIGNED: 'Đã phân công',
	IN_PROGRESS: 'Đang sửa',
	COMPLETED: 'Hoàn thành',
	CANCELLED: 'Huỷ'
}

export default function TeacherClassroomPage() {
	const { user } = useAuth()
	const qc = useQueryClient()
	const [roomId, setRoomId] = useState<string>('')
	const [reportOpen, setReportOpen] = useState(false)
	const [reportAssetId, setReportAssetId] = useState<number | undefined>()
	const [linkClassId, setLinkClassId] = useState<string>('')
	const [linking, setLinking] = useState(false)
	const [editingAssetId, setEditingAssetId] = useState<number | null>(null)
	const [editName, setEditName] = useState('')
	const [savingName, setSavingName] = useState(false)

	const treeQ = useQuery({
		queryKey: ['building-tree-classroom'],
		queryFn: GetBuildingTree
	})

	const username = (user?.username || '').trim().toLowerCase()
	const adminView = isSuperAdmin()

	const rooms: RoomOption[] = useMemo(() => {
		const list: RoomOption[] = []
		for (const b of treeQ.data ?? []) {
			for (const f of b.floors ?? []) {
				for (const r of f.rooms ?? []) {
					// Tài khoản phòng: chỉ phòng có managerCode = username
					// Super admin xem tất cả (debug)
					if (!adminView && username) {
						const code = (r.managerCode || '').trim().toLowerCase()
						if (!code || code !== username) continue
					}
					list.push({
						...r,
						buildingName: b.name,
						floorName: f.name
					})
				}
			}
		}
		return list.sort((a, b) =>
			`${a.buildingName} ${a.roomCode}`.localeCompare(
				`${b.buildingName} ${b.roomCode}`,
				'vi'
			)
		)
	}, [treeQ.data, username, adminView])

	const selected = rooms.find((r) => String(r.id) === roomId)

	const assetsQ = useQuery({
		queryKey: ['room-assets', roomId],
		queryFn: () => GetRoomAssets(Number(roomId)),
		enabled: !!roomId
	})

	const classId = selected?.classId ?? null
	const studentsQ = useStudentData(classId != null ? { classId } : undefined)

	const classesQ = useQuery({
		queryKey: ['classes-for-link'],
		queryFn: () => GetClasses({}),
		staleTime: 60_000
	})

	const repairQ = useRepairRequests(
		roomId ? { roomId: Number(roomId) } : undefined,
		{ enabled: !!roomId }
	)

	const assets = assetsQ.data ?? []
	const students = studentsQ.data ?? []
	const repairs = repairQ.data ?? []

	async function handleLinkClass() {
		if (!selected) return
		const cid =
			linkClassId === 'none' || !linkClassId ? null : Number(linkClassId)
		setLinking(true)
		try {
			await UpdateRoom(selected.id, { classId: cid })
			toast.success(
				cid
					? 'Đã gắn lớp vào phòng dạy'
					: 'Đã gỡ liên kết lớp khỏi phòng'
			)
			await treeQ.refetch()
		} catch (e) {
			toast.error('Gắn lớp thất bại', {
				description: (e as Error).message
			})
		} finally {
			setLinking(false)
		}
	}

	const reporterName = user?.displayName || user?.username || ''

	async function handleSaveName(assetId: number) {
		const name = editName.trim()
		if (!name) {
			toast.error('Tên thiết bị không được trống')
			return
		}
		setSavingName(true)
		try {
			await UpdateRoomAsset(assetId, { name })
			toast.success(
				'Đã đổi tên — nhật ký sửa chữa đã gửi lên báo cáo vật tư'
			)
			setEditingAssetId(null)
			await assetsQ.refetch()
			await qc.invalidateQueries({ queryKey: ['asset-reports'] })
			await qc.invalidateQueries({ queryKey: ['repair-logs'] })
		} catch (e) {
			toast.error('Đổi tên thất bại', {
				description: (e as Error).message
			})
		} finally {
			setSavingName(false)
		}
	}

	return (
		<div className='container mx-auto p-6 space-y-6 max-w-6xl'>
			<div>
				<h1 className='text-2xl font-bold tracking-tight'>
					Phòng dạy của tôi
				</h1>
				<p className='text-sm text-muted-foreground mt-1'>
					Chỉ hiển thị phòng gán tài khoản của bạn → xem thiết bị ·
					sửa tên (ghi nhật ký SC) · báo hỏng để admin phân công
				</p>
			</div>

			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='text-base'>
						1. Chọn phòng dạy
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid gap-3 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label>Phòng</Label>
							<SearchableSelect
								value={roomId}
								onValueChange={(v) => {
									setRoomId(v)
									setLinkClassId('')
								}}
								placeholder='— Chọn phòng —'
								searchPlaceholder='Gõ tên/mã phòng (vd: Chính, H1.101)…'
								emptyText='Không có phòng khớp'
								options={rooms.map((r) => ({
									value: String(r.id),
									label: `${r.roomCode} · ${r.roomName}${
										r.buildingName
											? ` — ${r.buildingName}`
											: ''
									}`,
									keywords: [
										r.roomCode,
										r.roomName,
										r.buildingName,
										r.floorName,
										r.manager
									]
										.filter(Boolean)
										.join(' ')
								}))}
							/>
							<p className='text-xs text-muted-foreground'>
								{adminView
									? 'Super admin: xem mọi phòng. User phòng chỉ thấy phòng gán tài khoản.'
									: rooms.length === 0
										? 'Chưa có phòng nào gán tài khoản của bạn (managerCode). Liên hệ admin.'
										: 'Chỉ phòng gán đúng tài khoản đăng nhập của bạn.'}
							</p>
						</div>
						{selected && (
							<div className='text-sm text-muted-foreground space-y-1 pt-6'>
								<p>
									<strong className='text-foreground'>
										{selected.roomName}
									</strong>{' '}
									({selected.roomCode})
								</p>
								<p>
									{selected.buildingName} /{' '}
									{selected.floorName}
								</p>
								<p>
									Lớp gắn:{' '}
									{selected.classId
										? `ID ${selected.classId}`
										: 'Chưa gán'}
								</p>
							</div>
						)}
					</div>

					{/* Gắn lớp — chỉ admin/user có rooms:update */}
					{selected && canLinkRoomClass() && (
						<div className='rounded-md border p-3 space-y-2 bg-muted/30'>
							<p className='text-xs font-medium text-muted-foreground'>
								Gắn lớp học viên với phòng (để tab Học viên hiện
								danh sách)
							</p>
							<div className='flex flex-wrap items-end gap-2'>
								<div className='space-y-1 min-w-[220px] flex-1'>
									<Label className='text-xs'>Lớp</Label>
									<SearchableSelect
										value={
											linkClassId ||
											(selected.classId
												? String(selected.classId)
												: 'none')
										}
										onValueChange={setLinkClassId}
										placeholder='Chọn lớp'
										searchPlaceholder='Gõ tên lớp…'
										emptyText='Không có lớp khớp'
										options={[
											{
												value: 'none',
												label: '— Không gắn lớp —',
												keywords: 'none khong gan'
											},
											...(classesQ.data ?? []).map(
												(c) => {
													const unitName = (
														c as {
															unit?: {
																name?: string
															}
														}
													).unit?.name
													return {
														value: String(c.id),
														label: unitName
															? `${c.name} · ${unitName}`
															: c.name,
														keywords: [
															c.name,
															unitName
														]
															.filter(Boolean)
															.join(' ')
													}
												}
											)
										]}
									/>
								</div>
								<Button
									type='button'
									variant='secondary'
									disabled={linking}
									onClick={handleLinkClass}
								>
									Lưu gắn lớp
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{!selected ? (
				<p className='text-sm text-muted-foreground text-center py-8'>
					Chọn một phòng để xem học viên và trang thiết bị.
				</p>
			) : (
				<Tabs defaultValue='equipment' className='space-y-4'>
					<div className='flex flex-wrap items-center justify-between gap-2'>
						<TabsList>
							<TabsTrigger value='students' className='gap-1.5'>
								<Users className='h-4 w-4' />
								Học viên
								{classId != null && (
									<Badge variant='secondary' className='ml-1'>
										{students.length}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value='equipment' className='gap-1.5'>
								<Monitor className='h-4 w-4' />
								Trang thiết bị
								<Badge variant='secondary' className='ml-1'>
									{assets.length}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value='reports' className='gap-1.5'>
								<Wrench className='h-4 w-4' />
								Phiếu báo hỏng
								<Badge variant='secondary' className='ml-1'>
									{repairs.length}
								</Badge>
							</TabsTrigger>
						</TabsList>
						<Button
							onClick={() => {
								setReportAssetId(undefined)
								setReportOpen(true)
							}}
						>
							<AlertTriangle className='h-4 w-4 mr-2' />
							Báo hỏng thiết bị
						</Button>
					</div>

					<TabsContent value='students'>
						<Card>
							<CardHeader>
								<CardTitle className='text-base'>
									Danh sách học viên
								</CardTitle>
							</CardHeader>
							<CardContent>
								{classId == null ? (
									<p className='text-sm text-muted-foreground py-6 text-center'>
										Phòng chưa gắn lớp. Dùng mục «Gắn lớp
										học viên với phòng» phía trên (hoặc
										admin gán trong quản lý tòa nhà).
									</p>
								) : studentsQ.isLoading ? (
									<p className='text-sm text-muted-foreground'>
										Đang tải học viên…
									</p>
								) : students.length === 0 ? (
									<p className='text-sm text-muted-foreground py-6 text-center'>
										Lớp chưa có học viên.
									</p>
								) : (
									<div className='border rounded-md overflow-auto'>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className='w-12'>
														STT
													</TableHead>
													<TableHead>
														Họ tên
													</TableHead>
													<TableHead>
														Cấp bậc
													</TableHead>
													<TableHead>
														Chức vụ
													</TableHead>
													<TableHead>
														Điện thoại
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{students.map((s, i) => (
													<TableRow key={s.id}>
														<TableCell>
															{i + 1}
														</TableCell>
														<TableCell className='font-medium'>
															{s.fullName}
														</TableCell>
														<TableCell>
															{s.rank || '—'}
														</TableCell>
														<TableCell>
															{s.position || '—'}
														</TableCell>
														<TableCell>
															{s.phone || '—'}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='equipment'>
						<Card>
							<CardHeader>
								<CardTitle className='text-base'>
									Trang thiết bị trong phòng
								</CardTitle>
							</CardHeader>
							<CardContent>
								{assetsQ.isLoading ? (
									<p className='text-sm text-muted-foreground'>
										Đang tải thiết bị…
									</p>
								) : assets.length === 0 ? (
									<p className='text-sm text-muted-foreground py-6 text-center'>
										Phòng chưa có vật tư / thiết bị.
									</p>
								) : (
									<div className='border rounded-md overflow-auto'>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className='w-12'>
														STT
													</TableHead>
													<TableHead>Mã</TableHead>
													<TableHead>
														Tên thiết bị
													</TableHead>
													<TableHead>Loại</TableHead>
													<TableHead className='text-center'>
														Đang dùng
													</TableHead>
													<TableHead className='text-center'>
														Hỏng
													</TableHead>
													<TableHead>TT</TableHead>
													<TableHead className='w-28' />
												</TableRow>
											</TableHeader>
											<TableBody>
												{assets.map((a, i) => (
													<TableRow key={a.id}>
														<TableCell>
															{i + 1}
														</TableCell>
														<TableCell className='font-mono text-xs'>
															{a.code || '—'}
														</TableCell>
														<TableCell className='font-medium min-w-[180px]'>
															{editingAssetId ===
															a.id ? (
																<div className='flex items-center gap-1'>
																	<Input
																		value={
																			editName
																		}
																		onChange={(
																			e
																		) =>
																			setEditName(
																				e
																					.target
																					.value
																			)
																		}
																		className='h-8 text-sm'
																		disabled={
																			savingName
																		}
																		onKeyDown={(
																			e
																		) => {
																			if (
																				e.key ===
																				'Enter'
																			) {
																				e.preventDefault()
																				void handleSaveName(
																					a.id
																				)
																			}
																			if (
																				e.key ===
																				'Escape'
																			) {
																				setEditingAssetId(
																					null
																				)
																			}
																		}}
																		autoFocus
																	/>
																	<Button
																		size='icon'
																		variant='ghost'
																		className='h-8 w-8 shrink-0'
																		disabled={
																			savingName
																		}
																		onClick={() =>
																			void handleSaveName(
																				a.id
																			)
																		}
																	>
																		<Check className='h-4 w-4 text-green-600' />
																	</Button>
																	<Button
																		size='icon'
																		variant='ghost'
																		className='h-8 w-8 shrink-0'
																		disabled={
																			savingName
																		}
																		onClick={() =>
																			setEditingAssetId(
																				null
																			)
																		}
																	>
																		<X className='h-4 w-4' />
																	</Button>
																</div>
															) : (
																<div className='flex items-center gap-1.5 group'>
																	<span>
																		{a.name}
																	</span>
																	<Button
																		size='icon'
																		variant='ghost'
																		className='h-7 w-7 opacity-60 group-hover:opacity-100'
																		title='Sửa tên (ghi nhật ký SC)'
																		onClick={() => {
																			setEditingAssetId(
																				a.id
																			)
																			setEditName(
																				a.name
																			)
																		}}
																	>
																		<Pencil className='h-3.5 w-3.5' />
																	</Button>
																</div>
															)}
														</TableCell>
														<TableCell>
															{a.category || '—'}
														</TableCell>
														<TableCell className='text-center'>
															{a.quantity}
														</TableCell>
														<TableCell className='text-center'>
															{(a.brokenQuantity ??
																0) > 0 ? (
																<span className='text-destructive font-medium'>
																	{
																		a.brokenQuantity
																	}
																</span>
															) : (
																'0'
															)}
														</TableCell>
														<TableCell>
															<Badge
																variant={
																	a.status ===
																		'BROKEN' ||
																	a.status ===
																		'REPAIRING'
																		? 'destructive'
																		: 'secondary'
																}
															>
																{STATUS_LABEL[
																	a.status
																] || a.status}
															</Badge>
														</TableCell>
														<TableCell>
															{(Number(
																a.quantity
															) || 0) > 0 && (
																<Button
																	size='sm'
																	variant='outline'
																	onClick={() => {
																		setReportAssetId(
																			a.id
																		)
																		setReportOpen(
																			true
																		)
																	}}
																>
																	Báo hỏng
																</Button>
															)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='reports'>
						<Card>
							<CardHeader>
								<CardTitle className='text-base'>
									Phiếu báo hỏng của phòng
								</CardTitle>
								<p className='text-xs text-muted-foreground'>
									Admin xem và phân công tại «Vật tư → Phân
									công sửa chữa»
								</p>
							</CardHeader>
							<CardContent>
								{repairQ.isLoading ? (
									<p className='text-sm text-muted-foreground'>
										Đang tải phiếu…
									</p>
								) : repairs.length === 0 ? (
									<p className='text-sm text-muted-foreground py-6 text-center'>
										Chưa có phiếu báo hỏng.
									</p>
								) : (
									<div className='border rounded-md overflow-auto'>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>
														Thiết bị
													</TableHead>
													<TableHead className='text-center'>
														SL
													</TableHead>
													<TableHead>
														Ngày hỏng
													</TableHead>
													<TableHead>
														Người báo
													</TableHead>
													<TableHead>
														Trạng thái
													</TableHead>
													<TableHead>
														Ghi chú
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{repairs.map((r) => (
													<TableRow key={r.id}>
														<TableCell className='font-medium'>
															{r.assetName}
														</TableCell>
														<TableCell className='text-center font-medium'>
															{r.quantity ?? 1}
														</TableCell>
														<TableCell>
															{r.brokenAt}
														</TableCell>
														<TableCell>
															{r.reportedByName}
														</TableCell>
														<TableCell>
															<Badge variant='outline'>
																{REQ_STATUS[
																	r.status
																] || r.status}
															</Badge>
														</TableCell>
														<TableCell className='text-sm text-muted-foreground max-w-[200px] truncate'>
															{r.description ||
																r.adminNote ||
																'—'}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			)}

			{selected && (
				<ReportBrokenDialog
					open={reportOpen}
					onOpenChange={(o) => {
						setReportOpen(o)
						if (!o) {
							repairQ.refetch()
							assetsQ.refetch()
						}
					}}
					roomId={selected.id}
					assets={assets}
					defaultAssetId={reportAssetId}
					defaultReporterName={reporterName}
				/>
			)}
		</div>
	)
}
