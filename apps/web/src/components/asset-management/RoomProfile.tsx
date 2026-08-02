import { mediaUrl } from '@/api/asset'
import { ErrorState } from '@/components/error-state'
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
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useRoomProfile, useRoomProfileMutations } from '@/hooks/useRoomProfile'
import useUnitsData from '@/hooks/useUnitsData'
import type {
	InventoryLog,
	RepairLog,
	ReplacementLog,
	RoomAsset,
	RoomImage
} from '@/types/asset'
import { Link } from '@tanstack/react-router'
import {
	ArrowLeft,
	Building2,
	DoorOpen,
	Image as ImageIcon,
	Layers,
	Pencil,
	Plus,
	Trash2,
	AlertTriangle,
	RefreshCw,
	Download,
	Users
} from 'lucide-react'
import ReportBrokenDialog from './ReportBrokenDialog'
import { useRepairRequests } from '@/hooks/useRepairRequests'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import LogDialogs from './LogDialogs'
import RoomAssetDialog from './RoomAssetDialog'
import RoomDialog from './RoomDialog'
import RoomImageDialog from './RoomImageDialog'
import AssetMovementDialog, {
	AssetUpdateChooserDialog,
	type MovementMode
} from './AssetMovementDialog'
import type { AssetMovementLog, CreateAssetMovementBody } from '@/types/asset'
import { CreateAssetMovement } from '@/api/asset'
import { downloadCsv } from '@/lib/export-csv'
import { buildAssetCodePrefix, buildLocationCode } from '@/lib/asset-code'
import { gradeShort } from '@/lib/asset-grade'
import { isBghOnlyUser } from '@/lib/utils'

const roomStatusLabel: Record<string, string> = {
	ACTIVE: 'Đang dùng',
	INACTIVE: 'Ngưng',
	MAINTENANCE: 'Bảo trì'
}

const assetStatusLabel: Record<string, string> = {
	NORMAL: 'Bình thường',
	BROKEN: 'Hỏng',
	REPAIRING: 'Đang sửa',
	DISPOSED: 'Thanh lý'
}

export default function RoomProfile({ roomId }: { roomId: number }) {
	const { data, isLoading, error, refetch } = useRoomProfile(roomId)
	const mutations = useRoomProfileMutations(roomId)
	const { data: roomTickets = [] } = useRepairRequests({ roomId })
	/** BGH thuần: chỉ xem hồ sơ phòng / VT — không thêm·sửa·xóa·báo hỏng */
	const canMutate = !isBghOnlyUser()

	const [editRoomOpen, setEditRoomOpen] = useState(false)
	const [reportOpen, setReportOpen] = useState(false)
	const [reportAssetId, setReportAssetId] = useState<number | undefined>()
	const [assetOpen, setAssetOpen] = useState(false)
	const [editingAsset, setEditingAsset] = useState<RoomAsset | null>(null)
	const [imageOpen, setImageOpen] = useState(false)
	const [logKind, setLogKind] = useState<
		'repair' | 'inventory' | 'replacement' | null
	>(null)
	const [chooserOpen, setChooserOpen] = useState(false)
	const [movementMode, setMovementMode] = useState<MovementMode | null>(null)
	const [movementAsset, setMovementAsset] = useState<RoomAsset | null>(null)
	const [confirm, setConfirm] = useState<{
		title: string
		run: () => Promise<void>
	} | null>(null)
	/** Gán đơn vị sử dụng hàng loạt (sau import) */
	const [assignUnitOpen, setAssignUnitOpen] = useState(false)
	const [assignUnitPick, setAssignUnitPick] = useState('')
	const [assignOtherUnitId, setAssignOtherUnitId] = useState('')
	const [assignPending, setAssignPending] = useState(false)
	const { data: unitsTree = [] } = useUnitsData()

	const allUnits = useMemo(() => {
		const list: { id: number; alias: string; name: string }[] = []
		const walk = (
			nodes: Array<{
				id: number
				alias?: string
				name: string
				children?: Array<{ id: number; alias?: string; name: string }>
			}>
		) => {
			for (const u of nodes) {
				if (u.alias) {
					list.push({
						id: u.id,
						alias: String(u.alias).toUpperCase(),
						name: u.name
					})
				}
				if (u.children?.length) walk(u.children as typeof nodes)
			}
		}
		walk(unitsTree as Parameters<typeof walk>[0])
		return list.sort((a, b) => a.alias.localeCompare(b.alias, 'vi'))
	}, [unitsTree])

	const unitById = useMemo(() => {
		const m = new Map<number, { alias: string; name: string }>()
		for (const u of allUnits) m.set(u.id, u)
		return m
	}, [allUnits])

	const assetNameById = useMemo(() => {
		const m = new Map<number, string>()
		for (const a of data?.assets ?? []) m.set(a.id, a.name)
		return m
	}, [data?.assets])

	const assetsMissingUnit = useMemo(
		() => (data?.assets ?? []).filter((a) => a.holdingUnitId == null),
		[data?.assets]
	)

	if (error) {
		return <ErrorState error={error} onRetry={() => refetch()} />
	}
	if (isLoading || !data) {
		return (
			<div className='p-8 space-y-4'>
				<Skeleton className='h-8 w-72' />
				<Skeleton className='h-48 w-full' />
			</div>
		)
	}

	const floor = data.floor
	const building = floor?.building
	const stableAssets = (data?.assets ?? []).filter((a) => (a.grade ?? 1) <= 4)
	const brokenGrade5 = (data.assets ?? []).filter((a) => (a.grade ?? 1) >= 5)
	const stableQty = stableAssets.reduce(
		(s, a) => s + (Number(a.quantity) || 0),
		0
	)
	const brokenQty = brokenGrade5.reduce(
		(s, a) => s + (Number(a.quantity) || 0),
		0
	)
	const totalQty = stableQty + brokenQty

	return (
		<div className='space-y-6 p-6 md:p-8'>
			<div className='flex flex-wrap items-center gap-2'>
				<Button variant='ghost' size='sm' asChild>
					<Link to='/vat-tu'>
						<ArrowLeft className='w-4 h-4 mr-1' />
						Danh mục
					</Link>
				</Button>
				{building && (
					<Button variant='ghost' size='sm' asChild>
						<Link
							to='/vat-tu/toa-nha/$buildingId'
							params={{ buildingId: String(building.id) }}
						>
							{building.name}
						</Link>
					</Button>
				)}
			</div>

			<div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
				<div className='space-y-1'>
					<h1 className='text-2xl font-semibold flex flex-wrap items-center gap-2'>
						<DoorOpen className='w-6 h-6' />
						{data.roomName}
						<Badge variant='secondary' className='font-mono'>
							{data.roomCode}
						</Badge>
						<Badge variant='outline'>
							{roomStatusLabel[data.status] ?? data.status}
						</Badge>
					</h1>
					<p className='text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1'>
						{building && (
							<span className='inline-flex items-center gap-1'>
								<Building2 className='w-3.5 h-3.5' />
								{building.name}
							</span>
						)}
						{floor && (
							<span className='inline-flex items-center gap-1'>
								<Layers className='w-3.5 h-3.5' />
								{floor.name}
							</span>
						)}
						{data.manager && <span>ĐVQL: {data.manager}</span>}
					</p>
				</div>
				{canMutate && (
					<div className='flex flex-wrap gap-2'>
						<Button
							variant='destructive'
							onClick={() => {
								setReportAssetId(undefined)
								setReportOpen(true)
							}}
						>
							<AlertTriangle className='w-4 h-4 mr-2' />
							Báo hỏng
						</Button>
						<Button
							variant='outline'
							onClick={() => setEditRoomOpen(true)}
						>
							<Pencil className='w-4 h-4 mr-2' />
							Sửa thông tin
						</Button>
					</div>
				)}
			</div>

			<Tabs defaultValue='general' className='w-full'>
				<TabsList className='flex flex-wrap h-auto gap-1'>
					<TabsTrigger value='general'>Thông tin chung</TabsTrigger>
					<TabsTrigger value='assets'>
						Vật tư ({data.assets?.length ?? 0}
						{totalQty > 0 ? ` · SL ${totalQty}` : ''})
					</TabsTrigger>
					<TabsTrigger value='tickets'>
						Phiếu báo hỏng ({roomTickets.length})
					</TabsTrigger>
					<TabsTrigger value='images'>
						Hình ảnh ({data.images?.length ?? 0})
					</TabsTrigger>
					<TabsTrigger value='repairs'>
						Sửa chữa ({data.repairs?.length ?? 0})
					</TabsTrigger>
					<TabsTrigger value='inventories'>
						Kiểm kê ({data.inventories?.length ?? 0})
					</TabsTrigger>
					<TabsTrigger value='replacements'>
						Thay thế ({data.replacements?.length ?? 0})
					</TabsTrigger>
					<TabsTrigger value='movements'>
						Biến động ({data.movements?.length ?? 0})
					</TabsTrigger>
				</TabsList>

				{/* ── General ── */}
				<TabsContent value='general' className='mt-4'>
					<Card>
						<CardHeader>
							<CardTitle>Thông tin phòng</CardTitle>
							<CardDescription>
								Thông tin chung hồ sơ phòng
							</CardDescription>
						</CardHeader>
						<CardContent>
							<dl className='grid gap-3 sm:grid-cols-2 text-sm'>
								<Field label='Mã phòng' value={data.roomCode} />
								<Field
									label='Tên phòng'
									value={data.roomName}
								/>
								<Field
									label='Loại phòng'
									value={data.roomType || '—'}
								/>
								<Field
									label='Đơn vị quản lý'
									value={data.manager || '—'}
								/>
								<Field
									label='Sức chứa'
									value={String(data.capacity ?? 0)}
								/>
								<Field
									label='Tổng số lượng VT'
									value={String(
										(data.assets ?? []).reduce(
											(s, a) =>
												s + (Number(a.quantity) || 0),
											0
										)
									)}
								/>
								<Field
									label='Trạng thái'
									value={
										roomStatusLabel[data.status] ??
										data.status
									}
								/>
								<Field
									label='Tòa nhà'
									value={
										building
											? `${building.name} (${building.code})`
											: '—'
									}
								/>
								<Field
									label='Tầng'
									value={floor?.name || '—'}
								/>
								<div className='sm:col-span-2'>
									<Field
										label='Mô tả'
										value={data.description || '—'}
									/>
								</div>
							</dl>
						</CardContent>
					</Card>
				</TabsContent>

				{/* ── Tickets ── */}
				<TabsContent value='tickets' className='mt-4 space-y-3'>
					{canMutate && (
						<div className='flex justify-end gap-2'>
							<Button variant='outline' asChild>
								<Link to='/vat-tu/phan-cong'>
									Tới trang phân công (admin)
								</Link>
							</Button>
							<Button
								variant='destructive'
								onClick={() => {
									setReportAssetId(undefined)
									setReportOpen(true)
								}}
							>
								<AlertTriangle className='w-4 h-4 mr-2' />
								Báo hỏng
							</Button>
						</div>
					)}
					<Card>
						<CardContent className='pt-6 overflow-x-auto'>
							{roomTickets.length === 0 ? (
								<p className='text-sm text-muted-foreground text-center py-8'>
									Chưa có phiếu báo hỏng cho phòng này.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Trạng thái</TableHead>
											<TableHead>Thiết bị</TableHead>
											<TableHead className='text-center w-24'>
												Số lượng
											</TableHead>
											<TableHead>Ngày hư</TableHead>
											<TableHead>Người báo</TableHead>
											<TableHead>Người sửa</TableHead>
											<TableHead>Ghi chú</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{roomTickets.map((t) => (
											<TableRow key={t.id}>
												<TableCell>
													<Badge variant='outline'>
														{t.status}
													</Badge>
												</TableCell>
												<TableCell className='font-medium'>
													{t.assetName}
													{t.description ? (
														<div className='text-xs text-muted-foreground'>
															{t.description}
														</div>
													) : null}
												</TableCell>
												<TableCell className='text-center font-medium tabular-nums'>
													{t.quantity ?? 1}
												</TableCell>
												<TableCell>
													{t.brokenAt}
												</TableCell>
												<TableCell>
													{t.reportedByName}
												</TableCell>
												<TableCell>
													{t.assignedToName || '—'}
												</TableCell>
												<TableCell className='text-xs'>
													{t.adminNote || '—'}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* ── Assets ── */}
				<TabsContent value='assets' className='mt-4 space-y-3'>
					{canMutate && assetsMissingUnit.length > 0 && (
						<Card className='border-amber-500/40 bg-amber-500/5'>
							<CardContent className='py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
								<div className='text-sm'>
									<strong>{assetsMissingUnit.length}</strong>{' '}
									vật tư chưa có{' '}
									<strong>đơn vị sử dụng</strong> (thường sau
									import). Chọn đơn vị rồi cập nhật hàng loạt.
								</div>
								<Button
									variant='default'
									size='sm'
									onClick={() => {
										setAssignUnitPick('')
										setAssignOtherUnitId('')
										setAssignUnitOpen(true)
									}}
								>
									<Users className='w-4 h-4 mr-2' />
									Gán đơn vị sử dụng
								</Button>
							</CardContent>
						</Card>
					)}
					{canMutate && (
						<div className='flex justify-end gap-2'>
							{assetsMissingUnit.length === 0 &&
								(data.assets?.length ?? 0) > 0 && (
									<Button
										variant='outline'
										size='sm'
										onClick={() => {
											setAssignUnitPick('')
											setAssignOtherUnitId('')
											setAssignUnitOpen(true)
										}}
									>
										<Users className='w-4 h-4 mr-2' />
										Đổi đơn vị sử dụng
									</Button>
								)}
							<Button
								variant='destructive'
								onClick={() => {
									setReportAssetId(undefined)
									setReportOpen(true)
								}}
							>
								<AlertTriangle className='w-4 h-4 mr-2' />
								Báo hỏng
							</Button>
							<Button
								onClick={() => {
									setEditingAsset(null)
									setAssetOpen(true)
								}}
							>
								<Plus className='w-4 h-4 mr-2' />
								Thêm vật tư
							</Button>
						</div>
					)}
					{(data.assets?.length ?? 0) === 0 ? (
						<Card>
							<CardContent className='py-10 text-center text-sm text-muted-foreground'>
								Chưa có vật tư trong phòng.
							</CardContent>
						</Card>
					) : (
						<div className='space-y-4'>
							{/* Ổn định 1–4 */}
							<Card>
								<CardHeader className='pb-2'>
									<CardTitle className='text-base flex items-center gap-2 flex-wrap'>
										Vật tư ổn định
										<Badge
											variant='secondary'
											className='font-normal'
										>
											cấp 1–4 · {stableAssets.length} dòng
											· SL {stableQty}
										</Badge>
									</CardTitle>
									<CardDescription>
										Chất lượng từ rất tốt đến có khả năng hư
										hỏng
									</CardDescription>
								</CardHeader>
								<CardContent>
									{stableAssets.length === 0 ? (
										<p className='text-sm text-muted-foreground py-4 text-center'>
											Không có vật tư ổn định
										</p>
									) : (
										<div className='overflow-x-auto'>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Mã
														</TableHead>
														<TableHead>
															Tên
														</TableHead>
														<TableHead>
															Loại
														</TableHead>
														<TableHead className='text-center w-28'>
															Số lượng
														</TableHead>
														<TableHead>
															ĐV sử dụng
														</TableHead>
														<TableHead>
															Phân cấp
														</TableHead>
														<TableHead>
															TT
														</TableHead>
														{canMutate && (
															<TableHead className='text-right'>
																Thao tác
															</TableHead>
														)}
													</TableRow>
												</TableHeader>
												<TableBody>
													{stableAssets.map((a) => (
														<TableRow key={a.id}>
															<TableCell className='font-mono text-sm'>
																{a.code || '—'}
															</TableCell>
															<TableCell className='font-medium'>
																{a.name}
															</TableCell>
															<TableCell>
																{a.category}
															</TableCell>
															<TableCell className='text-center font-semibold tabular-nums'>
																{a.quantity}
															</TableCell>
															<TableCell className='text-sm'>
																{(() => {
																	if (
																		a.holdingUnitId ==
																		null
																	) {
																		return (
																			<span className='text-amber-700 text-xs'>
																				Chưa
																				gán
																			</span>
																		)
																	}
																	const u =
																		unitById.get(
																			a.holdingUnitId
																		)
																	return u
																		? u.alias
																		: `#${a.holdingUnitId}`
																})()}
															</TableCell>
															<TableCell className='text-sm'>
																{gradeShort(
																	a.grade
																)}
																{(a.grade ??
																	1) ===
																	4 && (
																	<Badge
																		variant='outline'
																		className='ml-1 text-[10px] border-amber-500 text-amber-700'
																	>
																		Nguy cơ
																	</Badge>
																)}
															</TableCell>
															<TableCell>
																<Badge variant='outline'>
																	{assetStatusLabel[
																		a.status
																	] ??
																		a.status}
																</Badge>
															</TableCell>
															{canMutate && (
																<TableCell className='text-right space-x-1'>
																	<Button
																		size='sm'
																		variant='outline'
																		onClick={() => {
																			setEditingAsset(
																				a
																			)
																			setAssetOpen(
																				true
																			)
																		}}
																	>
																		<Pencil className='w-3.5 h-3.5' />
																	</Button>
																	<Button
																		size='sm'
																		variant='ghost'
																		className='text-destructive'
																		onClick={() =>
																			setConfirm(
																				{
																					title: `Xóa vật tư "${a.name}"?`,
																					run: async () => {
																						await mutations.deleteAssets.mutateAsync(
																							[
																								a.id
																							]
																						)
																						toast.success(
																							'Đã xóa vật tư'
																						)
																					}
																				}
																			)
																		}
																	>
																		<Trash2 className='w-3.5 h-3.5' />
																	</Button>
																</TableCell>
															)}
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Hư hỏng cấp 5 — đề xuất sửa */}
							<Card className='border-red-200'>
								<CardHeader className='pb-2'>
									<CardTitle className='text-base flex items-center gap-2 text-red-800 flex-wrap'>
										<AlertTriangle className='w-4 h-4' />
										Vật tư hư hỏng — đề xuất sửa chữa
										<Badge
											variant='destructive'
											className='font-normal'
										>
											cấp 5 · {brokenGrade5.length} dòng ·
											SL {brokenQty}
										</Badge>
									</CardTitle>
									<CardDescription>
										Vật tư cấp 5 (hỏng) được đề xuất đưa vào
										quy trình sửa chữa
									</CardDescription>
								</CardHeader>
								<CardContent>
									{brokenGrade5.length === 0 ? (
										<p className='text-sm text-muted-foreground py-4 text-center'>
											Không có vật tư cấp 5
										</p>
									) : (
										<div className='overflow-x-auto'>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Mã
														</TableHead>
														<TableHead>
															Tên
														</TableHead>
														<TableHead>
															Loại
														</TableHead>
														<TableHead className='text-center w-28'>
															Số lượng
														</TableHead>
														<TableHead>
															Phân cấp
														</TableHead>
														<TableHead>
															TT
														</TableHead>
														{canMutate && (
															<TableHead className='text-right'>
																Thao tác
															</TableHead>
														)}
													</TableRow>
												</TableHeader>
												<TableBody>
													{brokenGrade5.map((a) => (
														<TableRow
															key={a.id}
															className='bg-red-50/40'
														>
															<TableCell className='font-mono text-sm'>
																{a.code || '—'}
															</TableCell>
															<TableCell className='font-medium'>
																{a.name}
															</TableCell>
															<TableCell>
																{a.category}
															</TableCell>
															<TableCell className='text-center font-semibold tabular-nums'>
																{a.quantity}
															</TableCell>
															<TableCell>
																<Badge
																	variant='destructive'
																	className='text-[10px]'
																>
																	5 — Hỏng
																</Badge>
															</TableCell>
															<TableCell>
																<Badge
																	variant={
																		a.status ===
																			'BROKEN' ||
																		a.status ===
																			'REPAIRING'
																			? 'destructive'
																			: 'outline'
																	}
																>
																	{assetStatusLabel[
																		a.status
																	] ??
																		a.status}
																</Badge>
															</TableCell>
															{canMutate && (
																<TableCell className='text-right space-x-1'>
																	<Button
																		size='sm'
																		variant='destructive'
																		onClick={() => {
																			setReportAssetId(
																				a.id
																			)
																			setReportOpen(
																				true
																			)
																		}}
																	>
																		Báo /
																		sửa
																	</Button>
																	<Button
																		size='sm'
																		variant='outline'
																		onClick={() => {
																			setEditingAsset(
																				a
																			)
																			setAssetOpen(
																				true
																			)
																		}}
																	>
																		<Pencil className='w-3.5 h-3.5' />
																	</Button>
																</TableCell>
															)}
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					)}
				</TabsContent>

				{/* ── Images ── */}
				<TabsContent value='images' className='mt-4 space-y-3'>
					{canMutate && (
						<div className='flex justify-end'>
							<Button onClick={() => setImageOpen(true)}>
								<Plus className='w-4 h-4 mr-2' />
								Thêm ảnh
							</Button>
						</div>
					)}
					{(data.images?.length ?? 0) === 0 ? (
						<Card>
							<CardContent className='py-10 text-center text-muted-foreground text-sm'>
								Chưa có hình ảnh.
							</CardContent>
						</Card>
					) : (
						<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
							{data.images.map((img) => (
								<ImageCard
									key={img.id}
									image={img}
									onDelete={
										canMutate
											? () =>
													setConfirm({
														title: `Xóa ảnh "${img.title || img.id}"?`,
														run: async () => {
															await mutations.deleteImages.mutateAsync(
																[img.id]
															)
															toast.success(
																'Đã xóa ảnh'
															)
														}
													})
											: undefined
									}
								/>
							))}
						</div>
					)}
				</TabsContent>

				{/* ── Repair logs ── */}
				<TabsContent value='repairs' className='mt-4 space-y-3'>
					{canMutate && (
						<div className='flex justify-end'>
							<Button
								onClick={() => setLogKind('repair')}
								disabled={(data.assets?.length ?? 0) === 0}
							>
								<Plus className='w-4 h-4 mr-2' />
								Ghi sửa chữa
							</Button>
						</div>
					)}
					<LogTable
						empty='Chưa có nhật ký sửa chữa.'
						rows={data.repairs}
						columns={
							canMutate
								? [
										'Ngày',
										'Vật tư',
										'Nội dung',
										'Chi phí',
										'Người SC',
										''
									]
								: [
										'Ngày',
										'Vật tư',
										'Nội dung',
										'Chi phí',
										'Người SC'
									]
						}
						render={(r: RepairLog) => (
							<>
								<TableCell>{r.repairDate}</TableCell>
								<TableCell>
									{assetNameById.get(r.roomAssetId) ??
										`#${r.roomAssetId}`}
								</TableCell>
								<TableCell className='max-w-[200px] truncate'>
									{r.content}
								</TableCell>
								<TableCell>
									{r.cost?.toLocaleString('vi-VN')}
								</TableCell>
								<TableCell>{r.performer || '—'}</TableCell>
								{canMutate && (
									<TableCell className='text-right'>
										<Button
											size='sm'
											variant='ghost'
											className='text-destructive'
											onClick={() =>
												setConfirm({
													title: 'Xóa nhật ký sửa chữa?',
													run: async () => {
														await mutations.deleteRepairs.mutateAsync(
															[r.id]
														)
														toast.success('Đã xóa')
													}
												})
											}
										>
											<Trash2 className='w-3.5 h-3.5' />
										</Button>
									</TableCell>
								)}
							</>
						)}
					/>
				</TabsContent>

				{/* ── Inventory ── */}
				<TabsContent value='inventories' className='mt-4 space-y-3'>
					{canMutate && (
						<div className='flex justify-end'>
							<Button
								onClick={() => setLogKind('inventory')}
								disabled={(data.assets?.length ?? 0) === 0}
							>
								<Plus className='w-4 h-4 mr-2' />
								Ghi kiểm kê
							</Button>
						</div>
					)}
					<LogTable
						empty='Chưa có nhật ký kiểm kê.'
						rows={data.inventories}
						columns={
							canMutate
								? [
										'Ngày',
										'Vật tư',
										'Thực tế',
										'Sổ sách',
										'Kết quả',
										''
									]
								: [
										'Ngày',
										'Vật tư',
										'Thực tế',
										'Sổ sách',
										'Kết quả'
									]
						}
						render={(r: InventoryLog) => (
							<>
								<TableCell>{r.inventoryDate}</TableCell>
								<TableCell>
									{assetNameById.get(r.roomAssetId) ??
										`#${r.roomAssetId}`}
								</TableCell>
								<TableCell>{r.actualQuantity}</TableCell>
								<TableCell>{r.expectedQuantity}</TableCell>
								<TableCell>{r.result || '—'}</TableCell>
								{canMutate && (
									<TableCell className='text-right'>
										<Button
											size='sm'
											variant='ghost'
											className='text-destructive'
											onClick={() =>
												setConfirm({
													title: 'Xóa nhật ký kiểm kê?',
													run: async () => {
														await mutations.deleteInventories.mutateAsync(
															[r.id]
														)
														toast.success('Đã xóa')
													}
												})
											}
										>
											<Trash2 className='w-3.5 h-3.5' />
										</Button>
									</TableCell>
								)}
							</>
						)}
					/>
				</TabsContent>

				{/* ── Replacement ── */}
				<TabsContent value='replacements' className='mt-4 space-y-3'>
					{canMutate && (
						<div className='flex justify-end'>
							<Button
								onClick={() => setLogKind('replacement')}
								disabled={(data.assets?.length ?? 0) === 0}
							>
								<Plus className='w-4 h-4 mr-2' />
								Ghi thay thế
							</Button>
						</div>
					)}
					<LogTable
						empty='Chưa có lịch sử thay thế.'
						rows={data.replacements}
						columns={
							canMutate
								? ['Ngày', 'Vật tư', 'Cũ', 'Mới', 'Lý do', '']
								: ['Ngày', 'Vật tư', 'Cũ', 'Mới', 'Lý do']
						}
						render={(r: ReplacementLog) => (
							<>
								<TableCell>{r.replacementDate}</TableCell>
								<TableCell>
									{assetNameById.get(r.roomAssetId) ??
										`#${r.roomAssetId}`}
								</TableCell>
								<TableCell>{r.oldAsset}</TableCell>
								<TableCell>{r.newAsset}</TableCell>
								<TableCell>{r.reason || '—'}</TableCell>
								{canMutate && (
									<TableCell className='text-right'>
										<Button
											size='sm'
											variant='ghost'
											className='text-destructive'
											onClick={() =>
												setConfirm({
													title: 'Xóa lịch sử thay thế?',
													run: async () => {
														await mutations.deleteReplacements.mutateAsync(
															[r.id]
														)
														toast.success('Đã xóa')
													}
												})
											}
										>
											<Trash2 className='w-3.5 h-3.5' />
										</Button>
									</TableCell>
								)}
							</>
						)}
					/>
				</TabsContent>

				{/* ── Movements ── */}
				<TabsContent value='movements' className='mt-4 space-y-3'>
					<div className='flex justify-end'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								const rows = data.movements ?? []
								if (!rows.length) {
									toast.error('Chưa có log biến động')
									return
								}
								downloadCsv(
									`bien-dong-vat-tu-phong-${data.roomCode}.csv`,
									[
										'Ngày',
										'Loại',
										'Mã VT',
										'Tên',
										'SL',
										'Trước',
										'Sau',
										'Phân cấp',
										'Lý do',
										'Quyết định',
										'Người TH',
										'Diễn giải'
									],
									rows.map((m: AssetMovementLog) => [
										m.executedAt,
										m.movementType,
										m.assetCode ?? '',
										m.assetName,
										m.quantity,
										m.quantityBefore,
										m.quantityAfter,
										m.grade,
										m.reasonOther || m.reasonCode || '',
										m.decisionNumber || '',
										m.performer || '',
										m.explanation || m.note || ''
									])
								)
								toast.success('Đã xuất file log')
							}}
						>
							<Download className='w-4 h-4 mr-2' />
							Xuất log
						</Button>
					</div>
					<Card>
						<CardContent className='pt-6'>
							{(data.movements?.length ?? 0) === 0 ? (
								<p className='text-sm text-muted-foreground text-center py-8'>
									Chưa có biến động tăng/giảm hoặc điều chỉnh.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Ngày</TableHead>
											<TableHead>Loại</TableHead>
											<TableHead>Mã</TableHead>
											<TableHead>Tên</TableHead>
											<TableHead className='text-center'>
												Số lượng
											</TableHead>
											<TableHead>Trước → Sau</TableHead>
											<TableHead>Cấp</TableHead>
											<TableHead>
												Lý do / diễn giải
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(data.movements ?? []).map((m) => (
											<TableRow key={m.id}>
												<TableCell className='text-sm'>
													{m.executedAt}
												</TableCell>
												<TableCell>
													<Badge variant='outline'>
														{m.movementType ===
														'INCREASE'
															? 'Tăng'
															: m.movementType ===
																  'DECREASE'
																? 'Giảm'
																: m.movementType ===
																	  'TRANSFER'
																	? 'Điều động'
																	: m.movementType ===
																		  'RECALL'
																		? 'Thu hồi'
																		: 'Điều chỉnh'}
													</Badge>
												</TableCell>
												<TableCell className='font-mono text-xs'>
													{m.assetCode || '—'}
												</TableCell>
												<TableCell>
													{m.assetName}
												</TableCell>
												<TableCell className='text-center font-medium tabular-nums'>
													{m.quantity}
												</TableCell>
												<TableCell className='text-sm'>
													{m.quantityBefore} →{' '}
													{m.quantityAfter}
												</TableCell>
												<TableCell className='text-sm'>
													{gradeShort(m.grade)}
												</TableCell>
												<TableCell className='text-sm max-w-[200px] truncate'>
													{m.explanation ||
														m.reasonOther ||
														m.reasonCode ||
														'—'}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<ReportBrokenDialog
				open={reportOpen}
				onOpenChange={setReportOpen}
				roomId={roomId}
				assets={data.assets ?? []}
				defaultAssetId={reportAssetId}
			/>
			<RoomDialog
				open={editRoomOpen}
				onOpenChange={setEditRoomOpen}
				floorId={data.floorId}
				room={data}
			/>
			<RoomAssetDialog
				open={assetOpen}
				onOpenChange={setAssetOpen}
				roomId={roomId}
				locationCode={buildLocationCode(
					building?.code,
					floor?.floorNumber,
					data.roomCode
				)}
				codePrefix={
					buildAssetCodePrefix(
						building?.code,
						floor?.floorNumber,
						data.roomCode
					) || undefined
				}
				roomCode={data.roomCode}
				roomName={data.roomName}
				managerCode={data.managerCode ?? ''}
				asset={editingAsset}
				onCreate={async (body) => {
					await mutations.createAsset.mutateAsync(body)
				}}
				onUpdate={async (id, body) => {
					await mutations.updateAsset.mutateAsync({ id, body })
				}}
			/>

			{/* Gán / đổi đơn vị sử dụng hàng loạt */}
			<Dialog open={assignUnitOpen} onOpenChange={setAssignUnitOpen}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>Đơn vị sử dụng</DialogTitle>
					</DialogHeader>
					<div className='space-y-4 py-1'>
						<p className='text-sm text-muted-foreground'>
							Cập nhật{' '}
							<strong>
								{assetsMissingUnit.length > 0
									? `${assetsMissingUnit.length} VT chưa gán`
									: `tất cả ${data.assets?.length ?? 0} VT`}
							</strong>{' '}
							trong phòng. Chọn đơn vị; nếu chọn{' '}
							<strong>Khác</strong> phải chọn đơn vị quản lý / sử
							dụng cụ thể.
						</p>
						<div className='space-y-2'>
							<Label className='font-semibold'>
								Đơn vị sử dụng{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={assignUnitPick || undefined}
								onValueChange={(v) => {
									setAssignUnitPick(v)
									if (v !== '__other__')
										setAssignOtherUnitId('')
								}}
								placeholder='Chọn đơn vị…'
								searchPlaceholder='Gõ D1, PTMHC…'
								emptyText='Không có đơn vị'
								options={[
									...allUnits.map((u) => ({
										value: String(u.id),
										label: `${u.alias} — ${u.name}`,
										keywords: `${u.alias} ${u.name}`
									})),
									{
										value: '__other__',
										label: 'Khác — chọn đơn vị quản lý / sử dụng…',
										keywords: 'khac other'
									}
								]}
							/>
						</div>
						{assignUnitPick === '__other__' && (
							<div className='space-y-2'>
								<Label className='font-semibold'>
									Đơn vị quản lý / sử dụng{' '}
									<span className='text-destructive'>*</span>
								</Label>
								<SearchableSelect
									value={assignOtherUnitId || undefined}
									onValueChange={setAssignOtherUnitId}
									placeholder='— Chọn đơn vị —'
									searchPlaceholder='Gõ mã/tên…'
									emptyText='Không có đơn vị'
									className='border-destructive/50'
									options={allUnits.map((u) => ({
										value: String(u.id),
										label: `${u.alias} — ${u.name}`,
										keywords: `${u.alias} ${u.name}`
									}))}
								/>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setAssignUnitOpen(false)}
							disabled={assignPending}
						>
							Hủy
						</Button>
						<Button
							disabled={
								assignPending ||
								!assignUnitPick ||
								(assignUnitPick === '__other__' &&
									!assignOtherUnitId)
							}
							onClick={async () => {
								const unitId =
									assignUnitPick === '__other__'
										? Number(assignOtherUnitId)
										: Number(assignUnitPick)
								if (!unitId) {
									toast.error('Chọn đơn vị sử dụng')
									return
								}
								const targets =
									assetsMissingUnit.length > 0
										? assetsMissingUnit
										: (data.assets ?? [])
								if (!targets.length) {
									toast.error('Không có vật tư để cập nhật')
									return
								}
								setAssignPending(true)
								try {
									for (const a of targets) {
										await mutations.updateAsset.mutateAsync(
											{
												id: a.id,
												body: { holdingUnitId: unitId }
											}
										)
									}
									toast.success(
										`Đã gán đơn vị sử dụng cho ${targets.length} vật tư`
									)
									setAssignUnitOpen(false)
								} catch (e) {
									toast.error('Cập nhật thất bại', {
										description: (e as Error).message
									})
								} finally {
									setAssignPending(false)
								}
							}}
						>
							{assignPending ? 'Đang cập nhật…' : 'Cập nhật'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<AssetUpdateChooserDialog
				open={chooserOpen}
				onOpenChange={setChooserOpen}
				onChoose={(mode) => setMovementMode(mode)}
			/>
			{movementAsset && movementMode && (
				<AssetMovementDialog
					open={!!movementMode}
					onOpenChange={(o) => {
						if (!o) {
							setMovementMode(null)
							setMovementAsset(null)
						}
					}}
					mode={movementMode}
					asset={movementAsset}
					onSubmit={async (body: CreateAssetMovementBody) => {
						await CreateAssetMovement(movementAsset.id, body)
						await refetch()
					}}
				/>
			)}
			<RoomImageDialog
				open={imageOpen}
				onOpenChange={setImageOpen}
				roomId={roomId}
				onCreate={async (body) => {
					await mutations.createImage.mutateAsync(body)
				}}
			/>
			{logKind && (
				<LogDialogs
					kind={logKind}
					open={!!logKind}
					onOpenChange={(o) => !o && setLogKind(null)}
					assets={data.assets}
					onCreateRepair={async (body) => {
						await mutations.createRepair.mutateAsync(body)
					}}
					onCreateInventory={async (body) => {
						await mutations.createInventory.mutateAsync(body)
					}}
					onCreateReplacement={async (body) => {
						await mutations.createReplacement.mutateAsync(body)
					}}
				/>
			)}

			<Dialog
				open={!!confirm}
				onOpenChange={(o) => !o && setConfirm(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Xác nhận xóa</DialogTitle>
					</DialogHeader>
					<p className='text-sm text-muted-foreground'>
						{confirm?.title}
					</p>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setConfirm(null)}
						>
							Hủy
						</Button>
						<Button
							variant='destructive'
							onClick={async () => {
								try {
									await confirm?.run()
								} catch (err) {
									toast.error('Thao tác thất bại', {
										description: (err as Error).message
									})
								} finally {
									setConfirm(null)
								}
							}}
						>
							Xóa
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

function Field({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className='text-xs text-muted-foreground'>{label}</dt>
			<dd className='font-medium mt-0.5'>{value}</dd>
		</div>
	)
}

function ImageCard({
	image,
	onDelete
}: {
	image: RoomImage
	onDelete?: () => void
}) {
	return (
		<Card className='overflow-hidden'>
			<div className='aspect-video bg-muted relative'>
				<img
					src={mediaUrl(image.imageUrl)}
					alt={image.title || 'Ảnh phòng'}
					className='w-full h-full object-cover'
					onError={(e) => {
						;(e.target as HTMLImageElement).style.display = 'none'
					}}
				/>
				<div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
					<ImageIcon className='w-8 h-8 text-muted-foreground/40' />
				</div>
			</div>
			<CardHeader className='p-3 flex flex-row items-start justify-between gap-2 space-y-0'>
				<div className='min-w-0'>
					<CardTitle className='text-sm truncate'>
						{image.title || 'Không tiêu đề'}
					</CardTitle>
					<CardDescription className='text-xs truncate'>
						{image.description || image.imageUrl}
					</CardDescription>
				</div>
				{onDelete && (
					<Button
						size='sm'
						variant='ghost'
						className='text-destructive shrink-0'
						onClick={onDelete}
					>
						<Trash2 className='w-3.5 h-3.5' />
					</Button>
				)}
			</CardHeader>
		</Card>
	)
}

function LogTable<T extends { id: number }>({
	rows,
	columns,
	render,
	empty
}: {
	rows: T[]
	columns: string[]
	render: (row: T) => React.ReactNode
	empty: string
}) {
	if (!rows?.length) {
		return (
			<Card>
				<CardContent className='py-10 text-center text-sm text-muted-foreground'>
					{empty}
				</CardContent>
			</Card>
		)
	}
	return (
		<Card>
			<CardContent className='pt-6 overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow>
							{columns.map((c) => (
								<TableHead key={c || 'actions'}>{c}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((r) => (
							<TableRow key={r.id}>{render(r)}</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
