import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
	ArrowLeft,
	Building2,
	DoorOpen,
	Filter,
	History,
	Layers,
	Pencil,
	Plus,
	RotateCcw,
	Search,
	Trash2,
	Users
} from 'lucide-react'
import { cn, isBghOnlyUser } from '@/lib/utils'
import useIsNganhUser from '@/hooks/useIsNganhUser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useBuildingMutations, useBuildingTree } from '@/hooks/useBuildings'
import { useRoomMutations } from '@/hooks/useRooms'
import type { Building, BuildingTree, Floor, Room } from '@/types/asset'
import BuildingDialog from './BuildingDialog'
import FloorDialog from './FloorDialog'
import RoomDialog from './RoomDialog'
import AccountDialog from './AccountDialog'
import AccountAuditLogPanel from './AccountAuditLogPanel'
import UnitUsagePanel from './UnitUsagePanel'
import AssetAccountsPanel from './AssetAccountsPanel'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	SearchableSelect,
	type SearchableOption
} from '@/components/ui/searchable-select'

const statusLabel: Record<string, string> = {
	ACTIVE: 'Đang dùng',
	INACTIVE: 'Ngưng',
	MAINTENANCE: 'Bảo trì'
}

/** toa = danh sách tòa (mặc định); phong / tai-khoan / don-vi = menu */
export type BuildingCatalogView = 'toa' | 'tai-khoan' | 'phong' | 'don-vi'

function matchesQuery(
	q: string,
	parts: Array<string | null | undefined>
): boolean {
	const n = q.trim().toLocaleLowerCase('vi').split(/\s+/).filter(Boolean)
	if (!n.length) return true
	const hay = parts.filter(Boolean).join(' ').toLocaleLowerCase('vi')
	return n.every((p) => hay.includes(p))
}

type FlatRoom = Room & {
	buildingId: number
	buildingCode: string
	buildingName: string
	floorId: number
	floorName: string
	floorNumber: number
	address: string | null
}

function flatRooms(
	tree: BuildingTree[],
	buildingId?: number | null
): FlatRoom[] {
	const out: FlatRoom[] = []
	for (const b of tree) {
		if (buildingId != null && b.id !== buildingId) continue
		for (const f of b.floors ?? []) {
			for (const r of f.rooms ?? []) {
				out.push({
					...r,
					buildingId: b.id,
					buildingCode: b.code,
					buildingName: b.name,
					floorId: f.id,
					floorName: f.name,
					floorNumber: f.floorNumber,
					address: b.address ?? null
				})
			}
		}
	}
	return out
}

function accountLabel(r: {
	manager?: string | null
	managerCode?: string | null
}): string {
	const name = (r.manager ?? '').trim()
	const code = (r.managerCode ?? '').trim()
	if (name && code) return `${name} (${code})`
	return name || code || '—'
}

type Props = {
	view?: BuildingCatalogView
	buildingId?: number | null
}

export default function BuildingCatalog({
	view: viewProp,
	buildingId: buildingIdProp = null
}: Props) {
	const navigate = useNavigate()
	const nganhUser = useIsNganhUser()
	const bghOnly = isBghOnlyUser()
	/** User ngành / BGH: chỉ xem tòa/phòng — không thêm/sửa/xóa VT hay tòa */
	const readOnly = nganhUser || bghOnly
	const { data: tree = [], isLoading, error, refetch } = useBuildingTree()
	const { remove: removeBuilding } = useBuildingMutations()
	const { remove: removeRoom, resetAccount } = useRoomMutations()

	const view: BuildingCatalogView = (() => {
		// User ngành: không vào màn tài khoản (chỉ admin)
		if (nganhUser && viewProp === 'tai-khoan') return 'toa'
		if (
			viewProp === 'phong' ||
			viewProp === 'tai-khoan' ||
			viewProp === 'don-vi'
		) {
			return viewProp
		}
		return 'toa'
	})()

	// User ngành vào ?view=tai-khoan → về tòa
	useEffect(() => {
		if (nganhUser && viewProp === 'tai-khoan') {
			void navigate({
				to: '/vat-tu',
				search: { view: undefined },
				replace: true
			})
		}
	}, [nganhUser, viewProp, navigate])

	const [filterBuildingId, setFilterBuildingId] = useState<number | null>(
		buildingIdProp
	)

	useEffect(() => {
		setFilterBuildingId(buildingIdProp ?? null)
	}, [buildingIdProp])

	const go = (next: BuildingCatalogView, buildingId?: number | null) => {
		const bid = buildingId !== undefined ? buildingId : filterBuildingId
		void navigate({
			to: '/vat-tu',
			search: {
				view: next === 'toa' ? undefined : next,
				buildingId: bid != null ? String(bid) : undefined
			}
		})
	}

	const [buildingDialogOpen, setBuildingDialogOpen] = useState(false)
	const [editingBuilding, setEditingBuilding] = useState<Building | null>(
		null
	)
	const [floorDialogOpen, setFloorDialogOpen] = useState(false)
	const [floorBuildingId, setFloorBuildingId] = useState<number | null>(null)
	const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
	const [roomDialogOpen, setRoomDialogOpen] = useState(false)
	const [roomFloorId, setRoomFloorId] = useState<number | null>(null)
	const [editingRoom, setEditingRoom] = useState<Room | null>(null)
	const [accountDialogOpen, setAccountDialogOpen] = useState(false)
	const [editingAccount, setEditingAccount] = useState<FlatRoom | null>(null)
	const [accountSearch, setAccountSearch] = useState('')
	/** Trong màn tài khoản: chọn xem danh sách hay nhật ký (một bên) */
	const [accountSide, setAccountSide] = useState<'list' | 'log'>('list')
	const [roomSearch, setRoomSearch] = useState('')
	const [buildingSearch, setBuildingSearch] = useState('')
	/** Mở dialog thêm đơn vị trên UnitUsagePanel */
	const [unitAddSignal, setUnitAddSignal] = useState(0)

	const [confirm, setConfirm] = useState<{
		/** Tiêu đề dialog */
		heading?: string
		title: string
		/** Nhãn nút xác nhận */
		confirmLabel?: string
		/** destructive = đỏ (xóa), default = primary (reset) */
		variant?: 'destructive' | 'default'
		onConfirm: () => Promise<void>
	} | null>(null)

	const selectedBuilding = useMemo(
		() => tree.find((b) => b.id === filterBuildingId) ?? null,
		[tree, filterBuildingId]
	)

	const filteredBuildings = useMemo(() => {
		const q = buildingSearch.trim()
		if (!q) return tree
		return tree.filter((b) =>
			matchesQuery(q, [b.name, b.code, b.address, b.managerCode])
		)
	}, [tree, buildingSearch])

	const allRooms = useMemo(
		() => flatRooms(tree, filterBuildingId),
		[tree, filterBuildingId]
	)

	const filteredRooms = useMemo(() => {
		const q = roomSearch.trim()
		if (!q) return allRooms
		return allRooms.filter((r) =>
			matchesQuery(q, [
				r.roomName,
				r.roomCode,
				r.manager,
				r.buildingName,
				r.buildingCode,
				r.floorName
			])
		)
	}, [allRooms, roomSearch])

	const roomSuggestions = useMemo(() => {
		const q = roomSearch.trim()
		if (!q) return [] as string[]
		const seen = new Set<string>()
		const list: string[] = []
		for (const r of allRooms) {
			for (const s of [r.roomName, r.roomCode, r.manager].filter(
				Boolean
			) as string[]) {
				if (
					matchesQuery(q, [s]) &&
					!seen.has(s.toLocaleLowerCase('vi'))
				) {
					seen.add(s.toLocaleLowerCase('vi'))
					list.push(s)
					if (list.length >= 8) return list
				}
			}
		}
		return list
	}, [allRooms, roomSearch])

	const accountRooms = allRooms

	const filteredAccounts = useMemo(() => {
		const q = accountSearch.trim()
		if (!q) return accountRooms
		return accountRooms.filter((r) =>
			matchesQuery(q, [
				r.roomCode,
				r.roomName,
				r.address,
				r.floorName,
				r.manager,
				r.managerCode,
				r.buildingName,
				r.buildingCode
			])
		)
	}, [accountRooms, accountSearch])

	const accountSuggestions = useMemo(() => {
		const q = accountSearch.trim()
		if (!q) return [] as string[]
		const seen = new Set<string>()
		const list: string[] = []
		for (const r of accountRooms) {
			for (const s of [
				r.roomCode,
				r.roomName,
				r.manager,
				r.managerCode
			].filter(Boolean) as string[]) {
				if (
					matchesQuery(q, [s]) &&
					!seen.has(s.toLocaleLowerCase('vi'))
				) {
					seen.add(s.toLocaleLowerCase('vi'))
					list.push(s)
					if (list.length >= 8) return list
				}
			}
		}
		return list
	}, [accountRooms, accountSearch])

	const buildingOptions: SearchableOption[] = useMemo(
		() =>
			tree.map((b) => ({
				value: String(b.id),
				label: `${b.code} — ${b.name}`,
				keywords: `${b.address ?? ''} ${b.managerCode ?? ''}`
			})),
		[tree]
	)

	const totalRooms = useMemo(
		() =>
			tree.reduce(
				(acc, b) =>
					acc +
					(b.floors ?? []).reduce(
						(a, f) => a + (f.rooms?.length ?? 0),
						0
					),
				0
			),
		[tree]
	)

	const floorBuildingCode =
		tree.find((b) => b.id === floorBuildingId)?.code ?? undefined
	const roomLocationPrefix = (() => {
		for (const b of tree) {
			for (const f of b.floors ?? []) {
				if (f.id === roomFloorId) {
					return f.code || `${b.code}${f.floorNumber}`
				}
			}
		}
		return undefined
	})()

	function applyFilterPhong() {
		if (filterBuildingId == null) {
			toast.error('Chọn tòa nhà trong Bộ lọc trước')
			return
		}
		go('phong', filterBuildingId)
	}

	function backToToa() {
		go('toa', filterBuildingId)
	}

	if (error) {
		return <ErrorState error={error} onRetry={() => refetch()} />
	}

	return (
		<div className='space-y-6 p-6 md:p-8'>
			{/* Header */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex items-start gap-3 min-w-0'>
					{view !== 'toa' && (
						<Button
							variant='outline'
							size='sm'
							className='mt-1 shrink-0'
							onClick={backToToa}
						>
							<ArrowLeft className='w-4 h-4 mr-1' />
							Quay lại
						</Button>
					)}
					<div className='min-w-0'>
						<h1 className='text-3xl font-semibold tracking-tight'>
							{view === 'toa' &&
								'Quản lý vật tư — Danh mục tòa nhà'}
							{view === 'phong' && 'Danh sách phòng'}
							{view === 'tai-khoan' && 'Tài khoản'}
							{view === 'don-vi' && 'Đơn vị sử dụng'}
						</h1>
						<p className='text-base text-muted-foreground mt-1.5 leading-relaxed'>
							{view === 'toa' &&
								(readOnly
									? 'Xem danh sách tòa nhà. Dùng Bộ lọc → Lọc phòng.'
									: 'Chỉ hiển thị tòa nhà. Dùng Bộ lọc → Lọc phòng.')}
							{view === 'phong' &&
								(selectedBuilding
									? `Phòng thuộc tòa ${selectedBuilding.code} — ${selectedBuilding.name}. «Đơn vị quản lý» là text, không tạo TK đăng nhập.`
									: 'Tất cả phòng')}
							{view === 'tai-khoan' &&
								'Tài khoản đăng nhập: đơn vị sử dụng & ngành. Thêm user tại Danh sách người dùng (chọn loại TK).'}
							{view === 'don-vi' &&
								'Đơn vị sử dụng vật tư · Tạo TK đăng nhập tại đây hoặc Danh sách người dùng.'}
						</p>
					</div>
				</div>
				<div className='flex flex-wrap gap-2'>
					{view === 'toa' && !readOnly && (
						<Button
							onClick={() => {
								setEditingBuilding(null)
								setBuildingDialogOpen(true)
							}}
						>
							<Plus className='w-4 h-4 mr-2' />
							Thêm tòa nhà
						</Button>
					)}
					{view === 'phong' && !readOnly && (
						<Button
							disabled={!filterBuildingId}
							onClick={() => {
								if (!selectedBuilding) {
									toast.error('Chọn tòa trong Bộ lọc')
									return
								}
								const floors = selectedBuilding.floors ?? []
								if (!floors.length) {
									toast.error('Tòa chưa có tầng')
									return
								}
								setRoomFloorId(floors[0]!.id)
								setEditingRoom(null)
								setRoomDialogOpen(true)
							}}
						>
							<Plus className='w-4 h-4 mr-2' />
							Thêm phòng
						</Button>
					)}
					{view === 'don-vi' && !readOnly && (
						<Button onClick={() => setUnitAddSignal((n) => n + 1)}>
							<Plus className='w-4 h-4 mr-2' />
							Thêm đơn vị
						</Button>
					)}
				</div>
			</div>

			{/* Stats — chỉ màn tòa */}
			{view === 'toa' && (
				<div className='grid gap-4 sm:grid-cols-3'>
					<StatCard
						label='Tòa nhà'
						value={isLoading ? '…' : tree.length}
						icon={<Building2 className='w-4 h-4' />}
					/>
					<StatCard
						label='Tầng'
						value={
							isLoading
								? '…'
								: tree.reduce(
										(a, b) => a + (b.floors?.length ?? 0),
										0
									)
						}
						icon={<Layers className='w-4 h-4' />}
					/>
					<StatCard
						label='Phòng'
						value={isLoading ? '…' : totalRooms}
						icon={<DoorOpen className='w-4 h-4' />}
					/>
				</div>
			)}

			{/* ── Đơn vị sử dụng ── */}
			{view === 'don-vi' && (
				<UnitUsagePanel
					openAddSignal={unitAddSignal}
					hideLocalAddButton
				/>
			)}

			{/* ── Bộ lọc (toa / phong) — không cần cho tài khoản / đơn vị ── */}
			{view !== 'don-vi' && view !== 'tai-khoan' && (
				<Card className='border-primary/20'>
					<CardHeader className='pb-3'>
						<CardTitle className='text-base flex items-center gap-2'>
							<Filter className='w-4 h-4' />
							Bộ lọc
						</CardTitle>
						<CardDescription>
							Chọn tòa nhà, rồi bấm <strong>Lọc phòng</strong>.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3'>
						<div className='flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end'>
							<div className='flex-1 min-w-[220px] space-y-1.5'>
								<label className='text-base font-medium'>
									Tòa nhà
								</label>
								<SearchableSelect
									value={
										filterBuildingId != null
											? String(filterBuildingId)
											: ''
									}
									onValueChange={(v) =>
										setFilterBuildingId(
											v ? Number(v) : null
										)
									}
									options={buildingOptions}
									placeholder='Chọn tòa nhà…'
									searchPlaceholder='Gõ mã, tên tòa…'
									emptyText='Không có tòa khớp'
								/>
							</div>
							<div className='flex flex-wrap gap-2'>
								<Button
									type='button'
									onClick={applyFilterPhong}
									variant='default'
								>
									<DoorOpen className='w-4 h-4 mr-1.5' />
									Lọc phòng
								</Button>
								{filterBuildingId != null && (
									<Button
										type='button'
										variant='outline'
										onClick={() =>
											setFilterBuildingId(null)
										}
									>
										Xóa lọc
									</Button>
								)}
							</div>
						</div>
						{selectedBuilding && (
							<div className='flex flex-wrap items-center gap-2 text-sm'>
								<Badge variant='secondary'>
									{selectedBuilding.code}
								</Badge>
								<span className='font-medium'>
									{selectedBuilding.name}
								</span>
								<span className='text-muted-foreground'>
									· {(selectedBuilding.floors ?? []).length}{' '}
									tầng ·{' '}
									{(selectedBuilding.floors ?? []).reduce(
										(a, f) => a + (f.rooms?.length ?? 0),
										0
									)}{' '}
									phòng
								</span>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{view === 'don-vi' ? null : isLoading ? (
				<div className='space-y-3'>
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className='h-24 w-full rounded-xl' />
					))}
				</div>
			) : view === 'toa' ? (
				/* ═══════════ CHỈ DANH SÁCH TÒA ═══════════ */
				<div className='space-y-4'>
					<div className='relative max-w-xl'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							value={buildingSearch}
							onChange={(e) => setBuildingSearch(e.target.value)}
							placeholder='Tìm tòa nhà — mã/tên…'
							className='pl-9'
						/>
					</div>
					{tree.length === 0 ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								Chưa có tòa nhà. Bấm «Thêm tòa nhà».
							</CardContent>
						</Card>
					) : filteredBuildings.length === 0 ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								Không có tòa khớp «{buildingSearch.trim()}».
							</CardContent>
						</Card>
					) : (
						<div className='rounded-xl border overflow-hidden'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className='w-14'>
											STT
										</TableHead>
										<TableHead>Mã</TableHead>
										<TableHead>Tên tòa nhà</TableHead>
										<TableHead>Địa chỉ</TableHead>
										<TableHead className='text-center'>
											Tầng
										</TableHead>
										<TableHead className='text-center'>
											Phòng
										</TableHead>
										<TableHead className='text-right'>
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredBuildings.map((building, idx) => {
										const roomCount = (
											building.floors ?? []
										).reduce(
											(a, f) =>
												a + (f.rooms?.length ?? 0),
											0
										)
										return (
											<TableRow key={building.id}>
												<TableCell className='text-muted-foreground tabular-nums'>
													{idx + 1}
												</TableCell>
												<TableCell className='font-mono text-base'>
													{building.code}
												</TableCell>
												<TableCell className='font-medium text-base'>
													{building.name}
												</TableCell>
												<TableCell className='text-base text-muted-foreground'>
													{building.address || '—'}
												</TableCell>
												<TableCell className='text-center tabular-nums'>
													{
														(building.floors ?? [])
															.length
													}
												</TableCell>
												<TableCell className='text-center tabular-nums'>
													{roomCount}
												</TableCell>
												<TableCell className='text-right space-x-1'>
													{!readOnly && (
														<>
															<Button
																size='sm'
																variant='outline'
																onClick={() => {
																	setFloorBuildingId(
																		building.id
																	)
																	setEditingFloor(
																		null
																	)
																	setFloorDialogOpen(
																		true
																	)
																}}
															>
																<Plus className='w-3.5 h-3.5 mr-1' />
																Tầng
															</Button>
															<Button
																size='sm'
																variant='outline'
																onClick={() => {
																	setEditingBuilding(
																		building
																	)
																	setBuildingDialogOpen(
																		true
																	)
																}}
															>
																<Pencil className='w-3.5 h-3.5' />
															</Button>
															<Button
																size='sm'
																variant='outline'
																className='text-destructive'
																onClick={() =>
																	setConfirm({
																		title: `Xóa tòa «${building.name}» và toàn bộ tầng/phòng?`,
																		onConfirm:
																			async () => {
																				await removeBuilding.mutateAsync(
																					[
																						building.id
																					]
																				)
																				toast.success(
																					'Đã xóa tòa nhà'
																				)
																				if (
																					filterBuildingId ===
																					building.id
																				) {
																					setFilterBuildingId(
																						null
																					)
																				}
																			}
																	})
																}
															>
																<Trash2 className='w-3.5 h-3.5' />
															</Button>
														</>
													)}
													<Button
														size='sm'
														variant='secondary'
														asChild
													>
														<Link
															to='/vat-tu/toa-nha/$buildingId'
															params={{
																buildingId:
																	String(
																		building.id
																	)
															}}
														>
															Chi tiết
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			) : view === 'tai-khoan' ? (
				/* Tài khoản: chỉ user ĐV sử dụng + ngành */
				<AssetAccountsPanel />
			) : (
				/* ═══════════ PHÒNG ═══════════ */

				<div className='space-y-4'>
					<div className='relative max-w-xl'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							value={roomSearch}
							onChange={(e) => setRoomSearch(e.target.value)}
							placeholder='Tìm phòng — tên/mã…'
							className='pl-9'
						/>
						{roomSearch.trim() ? (
							<p className='mt-1.5 text-sm text-muted-foreground'>
								Tìm thấy <strong>{filteredRooms.length}</strong>{' '}
								phòng
							</p>
						) : null}
						{roomSuggestions.length > 0 && (
							<div className='mt-1.5 flex flex-wrap gap-1.5'>
								<span className='text-sm text-muted-foreground self-center'>
									Gợi ý:
								</span>
								{roomSuggestions.map((s) => (
									<button
										key={s}
										type='button'
										className='text-sm rounded-full border px-3 py-1 hover:bg-muted'
										onClick={() => setRoomSearch(s)}
									>
										{s}
									</button>
								))}
							</div>
						)}
					</div>

					{selectedBuilding &&
						(selectedBuilding.floors ?? []).length > 0 && (
							<div className='flex flex-wrap gap-2 items-center'>
								<span className='text-base text-muted-foreground'>
									Thêm phòng vào tầng:
								</span>
								{(selectedBuilding.floors ?? []).map((f) => (
									<Button
										key={f.id}
										size='sm'
										variant='outline'
										onClick={() => {
											setRoomFloorId(f.id)
											setEditingRoom(null)
											setRoomDialogOpen(true)
										}}
									>
										<Plus className='w-3.5 h-3.5 mr-1' />
										{f.name}
									</Button>
								))}
							</div>
						)}

					{filteredRooms.length === 0 ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								{roomSearch.trim()
									? `Không có phòng khớp «${roomSearch.trim()}».`
									: 'Chưa có phòng trong phạm vi lọc.'}
							</CardContent>
						</Card>
					) : (
						<div className='rounded-xl border overflow-hidden'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className='w-14'>
											STT
										</TableHead>
										<TableHead>Mã phòng</TableHead>
										<TableHead>Tên phòng</TableHead>
										<TableHead>Tòa</TableHead>
										<TableHead>Tầng</TableHead>
										<TableHead className='text-center'>
											SL VT
										</TableHead>
										<TableHead>Trạng thái</TableHead>
										<TableHead className='text-right'>
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredRooms.map((room, idx) => (
										<TableRow key={room.id}>
											<TableCell className='text-muted-foreground tabular-nums'>
												{idx + 1}
											</TableCell>
											<TableCell className='font-mono text-base'>
												{room.roomCode}
											</TableCell>
											<TableCell className='font-medium text-base'>
												{room.roomName}
											</TableCell>
											<TableCell className='text-base'>
												<span className='font-mono text-muted-foreground'>
													{room.buildingCode}
												</span>
											</TableCell>
											<TableCell className='text-base text-muted-foreground'>
												{room.floorName}
											</TableCell>
											<TableCell className='text-center font-medium tabular-nums'>
												{room.totalQuantity ?? 0}
											</TableCell>
											<TableCell>
												<Badge variant='outline'>
													{statusLabel[room.status] ??
														room.status}
												</Badge>
											</TableCell>
											<TableCell className='text-right space-x-1'>
												<Button
													size='sm'
													variant='link'
													asChild
												>
													<Link
														to='/vat-tu/phong/$roomId'
														params={{
															roomId: String(
																room.id
															)
														}}
													>
														Hồ sơ
													</Link>
												</Button>
												{!readOnly && (
													<>
														<Button
															size='sm'
															variant='ghost'
															onClick={() => {
																setRoomFloorId(
																	room.floorId
																)
																setEditingRoom(
																	room
																)
																setRoomDialogOpen(
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
																setConfirm({
																	title: `Xóa phòng «${room.roomName}»?`,
																	onConfirm:
																		async () => {
																			await removeRoom.mutateAsync(
																				[
																					room.id
																				]
																			)
																			toast.success(
																				'Đã xóa phòng'
																			)
																		}
																})
															}
														>
															<Trash2 className='w-3.5 h-3.5' />
														</Button>
													</>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			)}

			<BuildingDialog
				open={buildingDialogOpen}
				onOpenChange={setBuildingDialogOpen}
				building={editingBuilding}
			/>
			<AccountDialog
				open={accountDialogOpen}
				onOpenChange={(o) => {
					setAccountDialogOpen(o)
					if (!o) setEditingAccount(null)
				}}
				tree={tree}
				defaultBuildingId={filterBuildingId}
				room={editingAccount}
			/>
			{floorBuildingId !== null && (
				<FloorDialog
					open={floorDialogOpen}
					onOpenChange={setFloorDialogOpen}
					buildingId={floorBuildingId}
					buildingCode={floorBuildingCode}
					floor={editingFloor}
				/>
			)}
			{roomFloorId !== null && (
				<RoomDialog
					open={roomDialogOpen}
					onOpenChange={setRoomDialogOpen}
					floorId={roomFloorId}
					locationPrefix={roomLocationPrefix}
					room={editingRoom}
				/>
			)}

			<Dialog
				open={!!confirm}
				onOpenChange={(o) => !o && setConfirm(null)}
			>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle className='text-xl'>
							{confirm?.heading ?? 'Xác nhận xóa'}
						</DialogTitle>
					</DialogHeader>
					<p className='text-base md:text-lg text-foreground whitespace-pre-line leading-relaxed py-2'>
						{confirm?.title}
					</p>
					<DialogFooter className='gap-2 sm:gap-2'>
						<Button
							variant='outline'
							size='lg'
							className='text-base'
							onClick={() => setConfirm(null)}
						>
							Hủy
						</Button>
						<Button
							variant={confirm?.variant ?? 'destructive'}
							size='lg'
							className='text-base'
							onClick={async () => {
								try {
									await confirm?.onConfirm()
								} catch (err) {
									toast.error(
										confirm?.variant === 'default'
											? 'Reset thất bại'
											: 'Xóa thất bại',
										{
											description: (err as Error).message
										}
									)
								} finally {
									setConfirm(null)
								}
							}}
						>
							{confirm?.confirmLabel ?? 'Xóa'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

function StatCard({
	label,
	value,
	icon
}: {
	label: string
	value: number | string
	icon: React.ReactNode
}) {
	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
				<CardDescription>{label}</CardDescription>
				{icon}
			</CardHeader>
			<CardContent>
				<div className='text-2xl font-bold'>{value}</div>
			</CardContent>
		</Card>
	)
}
