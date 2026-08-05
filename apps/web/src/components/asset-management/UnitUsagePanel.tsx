/**
 * Đơn vị sử dụng vật tư (ĐVQL / holding unit)
 * — Liệt kê đơn vị (dedupe id — API trả cả cha lẫn con làm top-level)
 * — Thêm đơn vị (+) → hiện trong dropdown «Đơn vị sử dụng»
 * — Thống kê VT theo holdingUnitId; hiện rõ VT chưa gán
 */
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
	DoorOpen,
	Loader2,
	Package,
	Plus,
	RefreshCw,
	Search,
	Users
} from 'lucide-react'
import { toast } from 'sonner'
import useUnitsData from '@/hooks/useUnitsData'
import {
	AssignRolesToUser,
	CreateUnit,
	CreateUser,
	GetRoles,
	GetUsers,
	UpdateUser
} from '@/api'
import { GetRoomAssets } from '@/api/asset'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import type { RoomAsset } from '@/types/asset'
import { cn } from '@/lib/utils'

type UnitNode = {
	id: number
	alias: string
	name: string
	level?: string
	children?: UnitNode[]
}

type UnitFlat = { id: number; alias: string; name: string; level?: string }

type Props = {
	/** Tăng giá trị từ header trang → mở dialog thêm đơn vị */
	openAddSignal?: number
	/** Ẩn nút thêm nội bộ nếu header đã có */
	hideLocalAddButton?: boolean
}

/** Flatten cây đơn vị, bỏ trùng id (API hay trả con vừa top-level vừa lồng trong cha) */
function flattenUnitsUnique(tree: UnitNode[]): UnitFlat[] {
	const seen = new Set<number>()
	const list: UnitFlat[] = []
	const walk = (nodes: UnitNode[]) => {
		for (const u of nodes) {
			if (u?.id != null && !seen.has(u.id)) {
				seen.add(u.id)
				list.push({
					id: u.id,
					alias: u.alias,
					name: u.name,
					level: u.level
				})
			}
			if (u.children?.length) walk(u.children)
		}
	}
	walk(tree)
	return list.sort((a, b) =>
		`${a.alias} ${a.name}`.localeCompare(`${b.alias} ${b.name}`, 'vi')
	)
}

export default function UnitUsagePanel({
	openAddSignal = 0,
	hideLocalAddButton = false
}: Props) {
	const qc = useQueryClient()
	const {
		data: unitsTree = [],
		isLoading: unitsLoading,
		error: unitsError,
		refetch: refetchUnits
	} = useUnitsData()

	const assetsQ = useQuery({
		queryKey: ['room-assets', 'all-for-units'],
		queryFn: () => GetRoomAssets(),
		staleTime: 30_000
	})

	/** Tài khoản đăng nhập gắn đơn vị (users.unitId) — hiện trên list-user */
	const usersQ = useQuery({
		queryKey: ['users'],
		queryFn: GetUsers,
		staleTime: 15_000
	})

	const [search, setSearch] = useState('')
	const [expandedId, setExpandedId] = useState<number | null>(null)
	const [onlyWithAssets, setOnlyWithAssets] = useState(false)
	const [showUnassigned, setShowUnassigned] = useState(false)

	const [addOpen, setAddOpen] = useState(false)
	const [alias, setAlias] = useState('')
	const [name, setName] = useState('')
	const [level, setLevel] = useState<'battalion' | 'company'>('company')
	const [parentId, setParentId] = useState('')
	const [saving, setSaving] = useState(false)

	// Tạo TK đơn vị sử dụng — 1 đơn vị + chọn phân quyền hiện có
	const [acctOpen, setAcctOpen] = useState(false)
	const [acctUnit, setAcctUnit] = useState<UnitFlat | null>(null)
	const [acctUsername, setAcctUsername] = useState('')
	const [acctDisplayName, setAcctDisplayName] = useState('')
	const [acctPassword, setAcctPassword] = useState('DonVi@123')
	const [acctRoleId, setAcctRoleId] = useState('')
	const [acctSaving, setAcctSaving] = useState(false)
	const rolesQ = useQuery({
		queryKey: ['roles'],
		queryFn: GetRoles,
		staleTime: 120_000
	})

	const acctRoleOptions = useMemo(() => {
		return (rolesQ.data || [])
			.filter((r: { name: string }) => r.name !== 'super_admin')
			.map((r: { id: number; name: string; description?: string }) => ({
				value: String(r.id),
				label: r.description ? `${r.name} — ${r.description}` : r.name,
				keywords: `${r.name} ${r.description || ''}`
			}))
	}, [rolesQ.data])

	const allUnits = useMemo(
		() => flattenUnitsUnique(unitsTree as UnitNode[]),
		[unitsTree]
	)

	const battalionOptions = useMemo(
		() =>
			(unitsTree as UnitNode[])
				.filter((u) => u.level !== 'company')
				.map((u) => ({
					id: u.id,
					alias: u.alias,
					name: u.name
				})),
		[unitsTree]
	)

	const assets = assetsQ.data ?? []

	const assetsByUnit = useMemo(() => {
		const map = new Map<number, RoomAsset[]>()
		const unassigned: RoomAsset[] = []
		for (const a of assets) {
			const hid = a.holdingUnitId
			if (hid == null) {
				unassigned.push(a)
				continue
			}
			const list = map.get(hid) || []
			list.push(a)
			map.set(hid, list)
		}
		return { map, unassigned }
	}, [assets])

	/** userId list theo unitId (TK đơn vị sử dụng) */
	const usersByUnit = useMemo(() => {
		const map = new Map<
			number,
			Array<{
				id: number
				username: string
				displayName: string
				status?: string | null
			}>
		>()
		for (const u of usersQ.data || []) {
			const uid = (u as { unitId?: number | null }).unitId
			if (uid == null) continue
			const list = map.get(uid) || []
			list.push({
				id: u.id,
				username: u.username,
				displayName: u.displayName,
				status: (u as { status?: string | null }).status
			})
			map.set(uid, list)
		}
		return map
	}, [usersQ.data])

	const rows = useMemo(() => {
		const q = search.trim().toLocaleLowerCase('vi')
		return allUnits
			.map((u) => {
				const unitAssets = assetsByUnit.map.get(u.id) || []
				const lineCount = unitAssets.length
				const qty = unitAssets.reduce(
					(s, a) => s + (Number(a.quantity) || 0),
					0
				)
				const broken = unitAssets.reduce(
					(s, a) => s + (Number(a.brokenQuantity) || 0),
					0
				)
				const roomIds = new Set(
					unitAssets.map((a) => a.roomId).filter(Boolean)
				)
				return {
					unit: u,
					assets: unitAssets,
					lineCount,
					qty,
					broken,
					roomCount: roomIds.size
				}
			})
			.filter((row) => {
				if (onlyWithAssets && row.lineCount === 0) return false
				if (!q) return true
				const hay =
					`${row.unit.alias} ${row.unit.name}`.toLocaleLowerCase('vi')
				return hay.includes(q)
			})
	}, [allUnits, assetsByUnit, search, onlyWithAssets])

	const totals = useMemo(() => {
		const assignedQty = rows.reduce((s, r) => s + r.qty, 0)
		const unQty = assetsByUnit.unassigned.reduce(
			(s, a) => s + (Number(a.quantity) || 0),
			0
		)
		return {
			units: allUnits.length,
			withAssets: rows.filter((r) => r.lineCount > 0).length,
			lines: rows.reduce((s, r) => s + r.lineCount, 0),
			qty: assignedQty,
			unassignedLines: assetsByUnit.unassigned.length,
			unassignedQty: unQty
		}
	}, [rows, allUnits.length, assetsByUnit])

	function openAddDialog() {
		setAlias('')
		setName('')
		setLevel('company')
		setParentId(battalionOptions[0] ? String(battalionOptions[0].id) : '')
		setAddOpen(true)
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: this effect intentionally reacts only to the external signal
	useEffect(() => {
		if (openAddSignal > 0) openAddDialog()
	}, [openAddSignal])

	function openCreateAccount(u: UnitFlat) {
		setAcctUnit(u)
		const base = (u.alias || 'dv').toLowerCase().replace(/[^a-z0-9]/g, '')
		setAcctUsername(`dv.${base || u.id}`)
		setAcctDisplayName(`${u.alias} — ${u.name}`)
		setAcctPassword('DonVi@123')
		const defaultRole = (rolesQ.data || []).find(
			(r: { name: string }) => r.name === 'user_don_vi'
		)
		setAcctRoleId(defaultRole ? String(defaultRole.id) : '')
		setAcctOpen(true)
	}

	async function handleCreateAccount() {
		if (!acctUnit) return
		const username = acctUsername.trim()
		const displayName = acctDisplayName.trim()
		const password = acctPassword
		if (!username || !displayName || !password) {
			toast.error('Nhập đủ username, họ tên, mật khẩu')
			return
		}
		if (!acctRoleId) {
			toast.error('Chọn phân quyền (vai trò) hiện có')
			return
		}
		setAcctSaving(true)
		try {
			const created = await CreateUser({
				username,
				password,
				displayName,
				unitId: acctUnit.id,
				isSuperUser: false
			})
			await AssignRolesToUser({
				userId: created.id,
				roleIds: [Number(acctRoleId)]
			})
			try {
				await UpdateUser({
					id: created.id,
					displayName,
					unitId: acctUnit.id,
					position: 'Đơn vị sử dụng'
				})
			} catch {
				/* optional */
			}
			await Promise.all([
				qc.invalidateQueries({ queryKey: ['users'] }),
				qc.invalidateQueries({ queryKey: ['pending-permissions'] }),
				usersQ.refetch()
			])
			const roleLabel =
				acctRoleOptions.find((r) => r.value === acctRoleId)?.label ||
				acctRoleId
			toast.success(`Đã tạo TK ${username}`, {
				description: `Đơn vị ${acctUnit.alias} (1 ĐV) · quyền ${roleLabel} · MK: ${password}`
			})
			setAcctOpen(false)
		} catch (err) {
			toast.error('Tạo tài khoản thất bại', {
				description: (err as Error).message
			})
		} finally {
			setAcctSaving(false)
		}
	}

	async function handleCreateUnit() {
		const a = alias.trim().toUpperCase()
		const n = name.trim()
		if (!a) {
			toast.error('Nhập alias (vd. D1, PTMHC)')
			return
		}
		if (!n) {
			toast.error('Nhập tên đơn vị')
			return
		}
		if (level === 'company' && !parentId) {
			toast.error('Chọn đơn vị cha (tiểu đoàn)')
			return
		}
		// Cảnh báo trùng alias (không phân biệt hoa thường)
		const clash = allUnits.find(
			(u) => u.alias.toLocaleLowerCase('vi') === a.toLocaleLowerCase('vi')
		)
		if (clash) {
			toast.error(
				`Alias «${a}» đã dùng cho «${clash.alias} — ${clash.name}». Chọn alias khác.`
			)
			return
		}
		setSaving(true)
		try {
			await CreateUnit({
				alias: a,
				name: n,
				level,
				parentId:
					level === 'company' && parentId ? Number(parentId) : null
			})
			toast.success(`Đã thêm đơn vị ${a} — ${n}`)
			setAddOpen(false)
			void refetchUnits()
			void qc.invalidateQueries({ queryKey: ['units'] })
		} catch (err) {
			toast.error('Thêm đơn vị thất bại', {
				description: (err as Error).message
			})
		} finally {
			setSaving(false)
		}
	}

	if (unitsError || assetsQ.error) {
		return (
			<ErrorState
				error={(unitsError || assetsQ.error) as Error}
				onRetry={() => {
					void refetchUnits()
					void assetsQ.refetch()
				}}
			/>
		)
	}

	const loading = unitsLoading || assetsQ.isLoading

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-center justify-between gap-2'>
				<div className='flex flex-wrap gap-2 text-base'>
					<Badge variant='secondary' className='px-3 py-1.5 gap-1.5'>
						<Users className='w-4 h-4' />
						{totals.units} đơn vị
					</Badge>
					<Badge variant='secondary' className='px-3 py-1.5 gap-1.5'>
						<Package className='w-4 h-4' />
						{totals.withAssets} đang dùng VT
					</Badge>
					<Badge
						variant='outline'
						className='px-3 py-1 gap-1 font-semibold'
					>
						SL đã gán ĐV: {totals.qty}
					</Badge>
					{totals.unassignedLines > 0 && (
						<button
							type='button'
							onClick={() => setShowUnassigned((v) => !v)}
							className='inline-flex'
						>
							<Badge
								variant='destructive'
								className='px-3 py-1 gap-1 cursor-pointer hover:opacity-90'
							>
								Chưa gán ĐV: {totals.unassignedLines} dòng · SL{' '}
								{totals.unassignedQty}
								{showUnassigned ? ' · ẩn' : ' · xem'}
							</Badge>
						</button>
					)}
				</div>
				{!hideLocalAddButton && (
					<Button type='button' onClick={openAddDialog}>
						<Plus className='w-4 h-4 mr-1.5' />
						Thêm đơn vị
					</Button>
				)}
			</div>

			{/* Gợi ý KHO */}
			<p className='text-sm text-muted-foreground leading-relaxed'>
				VT kho (mã …-KHO) nên gán đơn vị{' '}
				<strong>KHO — Kho vật tư</strong>. Đã có đơn vị KHO trong danh
				mục — gán khi import/cập nhật nếu còn dòng «Chưa gán ĐV».
			</p>

			{showUnassigned && totals.unassignedLines > 0 && (
				<Card className='border-destructive/40'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-base flex items-center gap-2'>
							<DoorOpen className='w-4.5 h-4.5 text-destructive' />
							Vật tư chưa gán đơn vị sử dụng
						</CardTitle>
						<CardDescription>
							Đây là{' '}
							<strong>{totals.unassignedLines} dòng</strong> vật
							tư (tổng SL <strong>{totals.unassignedQty}</strong>)
							chưa chọn «Đơn vị sử dụng» — thường nằm kho hoặc
							import cũ. Gán lại trong hồ sơ phòng / cập nhật VT.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='rounded-md border overflow-auto max-h-56'>
							<Table>
								<TableHeader>
									<TableRow className='bg-muted/30'>
										<TableHead>Mã VT</TableHead>
										<TableHead>Tên</TableHead>
										<TableHead className='text-right'>
											SL
										</TableHead>
										<TableHead className='w-24' />
									</TableRow>
								</TableHeader>
								<TableBody>
									{assetsByUnit.unassigned.map((a) => (
										<TableRow key={a.id}>
											<TableCell className='font-mono text-sm'>
												{a.code || '—'}
											</TableCell>
											<TableCell className='text-base font-medium'>
												{a.name}
											</TableCell>
											<TableCell className='text-right tabular-nums'>
												{a.quantity}
											</TableCell>
											<TableCell>
												{a.roomId != null ? (
													<Button
														size='sm'
														variant='ghost'
														asChild
													>
														<Link
															to='/vat-tu/phong/$roomId'
															params={{
																roomId: String(
																	a.roomId
																)
															}}
														>
															Phòng
														</Link>
													</Button>
												) : (
													'—'
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader className='pb-3'>
					<div className='flex flex-wrap items-start justify-between gap-3'>
						<div>
							<CardTitle className='text-base flex items-center gap-2'>
								<Users className='w-4 h-4' />
								Đơn vị sử dụng vật tư
							</CardTitle>
							<CardDescription>
								Mỗi đơn vị một dòng. Nút <strong>Tạo TK</strong>{' '}
								tạo user đăng nhập (role đơn vị sử dụng) — hiện
								trong{' '}
								<Link
									to='/list-user'
									className='underline font-medium text-foreground'
								>
									Danh sách người dùng
								</Link>
								, không phải tab «Tài khoản» phòng (tòa nhà).
							</CardDescription>
						</div>
						<div className='flex flex-wrap items-center gap-2'>
							<label className='flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none'>
								<input
									type='checkbox'
									className='rounded border size-4'
									checked={onlyWithAssets}
									onChange={(e) =>
										setOnlyWithAssets(e.target.checked)
									}
								/>
								Chỉ đơn vị có VT
							</label>
							<div className='relative w-full sm:w-64'>
								<Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<Input
									className='pl-9 h-9'
									placeholder='Tìm alias / tên đơn vị…'
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</div>
							<Button
								type='button'
								size='sm'
								variant='outline'
								onClick={() => {
									void refetchUnits()
									void assetsQ.refetch()
									void usersQ.refetch()
								}}
							>
								<RefreshCw
									className={cn(
										'w-3.5 h-3.5',
										(assetsQ.isFetching ||
											usersQ.isFetching) &&
											'animate-spin'
									)}
								/>
							</Button>
							{!hideLocalAddButton && (
								<Button
									type='button'
									size='sm'
									onClick={openAddDialog}
								>
									<Plus className='w-3.5 h-3.5 mr-1' />
									Thêm
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className='space-y-2'>
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
						</div>
					) : !rows.length ? (
						<div className='py-8 text-center space-y-3'>
							<p className='text-sm text-muted-foreground'>
								Không có đơn vị khớp.
							</p>
							<Button
								type='button'
								size='sm'
								onClick={openAddDialog}
							>
								<Plus className='w-4 h-4 mr-1.5' />
								Thêm đơn vị
							</Button>
						</div>
					) : (
						<div className='rounded-lg border overflow-auto max-h-[min(70vh,720px)]'>
							<Table>
								<TableHeader>
									<TableRow className='bg-muted/30'>
										<TableHead className='w-12'>
											STT
										</TableHead>
										<TableHead className='w-24'>
											Alias
										</TableHead>
										<TableHead>Tên đơn vị</TableHead>
										<TableHead className='min-w-[160px]'>
											Tài khoản ĐV
										</TableHead>
										<TableHead className='text-center w-24'>
											Dòng VT
										</TableHead>
										<TableHead className='text-center w-24'>
											Phòng
										</TableHead>
										<TableHead className='text-right w-24'>
											SL dùng
										</TableHead>
										<TableHead className='text-right w-24'>
											SL hỏng
										</TableHead>
										<TableHead className='w-40 text-center'>
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((row, idx) => {
										const open = expandedId === row.unit.id
										const unitUsers =
											usersByUnit.get(row.unit.id) || []
										return (
											<Fragment key={row.unit.id}>
												<TableRow className='hover:bg-muted/20'>
													<TableCell className='text-muted-foreground tabular-nums'>
														{idx + 1}
													</TableCell>
													<TableCell className='font-mono text-base font-medium'>
														{row.unit.alias}
													</TableCell>
													<TableCell className='font-medium text-base'>
														{row.unit.name}
													</TableCell>
													<TableCell className='text-base'>
														{unitUsers.length ===
														0 ? (
															<span className='text-sm text-muted-foreground'>
																Chưa có TK
															</span>
														) : (
															<ul className='space-y-1'>
																{unitUsers.map(
																	(u) => (
																		<li
																			key={
																				u.id
																			}
																			className='leading-snug'
																		>
																			<span className='font-mono text-sm font-medium'>
																				{
																					u.username
																				}
																			</span>
																			<span className='block text-sm text-muted-foreground truncate max-w-[180px]'>
																				{
																					u.displayName
																				}
																			</span>
																		</li>
																	)
																)}
															</ul>
														)}
													</TableCell>
													<TableCell className='text-center tabular-nums'>
														{row.lineCount}
													</TableCell>
													<TableCell className='text-center tabular-nums'>
														{row.roomCount}
													</TableCell>
													<TableCell className='text-right tabular-nums font-semibold'>
														{row.qty}
													</TableCell>
													<TableCell className='text-right tabular-nums text-destructive'>
														{row.broken || '—'}
													</TableCell>
													<TableCell className='text-center'>
														<div className='flex flex-wrap items-center justify-center gap-1'>
															<Button
																type='button'
																size='sm'
																variant='secondary'
																onClick={() =>
																	openCreateAccount(
																		row.unit
																	)
																}
															>
																Tạo TK
															</Button>
															<Button
																type='button'
																size='sm'
																variant='outline'
																disabled={
																	row.lineCount ===
																	0
																}
																onClick={() =>
																	setExpandedId(
																		open
																			? null
																			: row
																					.unit
																					.id
																	)
																}
															>
																{open
																	? 'Thu gọn'
																	: 'Xem VT'}
															</Button>
														</div>
													</TableCell>
												</TableRow>
												{open && (
													<TableRow className='bg-muted/10'>
														<TableCell
															colSpan={9}
															className='p-0'
														>
															<div className='p-3 space-y-2'>
																<p className='text-xs text-muted-foreground font-medium'>
																	Vật tư do{' '}
																	<span className='font-mono'>
																		{
																			row
																				.unit
																				.alias
																		}
																	</span>{' '}
																	—{' '}
																	{
																		row.unit
																			.name
																	}{' '}
																	sử dụng (
																	{
																		row.lineCount
																	}{' '}
																	dòng)
																</p>
																<div className='rounded-md border overflow-auto max-h-64'>
																	<Table>
																		<TableHeader>
																			<TableRow>
																				<TableHead>
																					Mã
																					VT
																				</TableHead>
																				<TableHead>
																					Tên
																				</TableHead>
																				<TableHead>
																					Loại
																				</TableHead>
																				<TableHead className='text-right'>
																					SL
																				</TableHead>
																				<TableHead className='text-center'>
																					Cấp
																				</TableHead>
																				<TableHead className='w-20' />
																			</TableRow>
																		</TableHeader>
																		<TableBody>
																			{row.assets.map(
																				(
																					a
																				) => (
																					<TableRow
																						key={
																							a.id
																						}
																					>
																						<TableCell className='font-mono text-sm'>
																							{a.code ||
																								'—'}
																						</TableCell>
																						<TableCell className='font-medium text-base'>
																							{
																								a.name
																							}
																						</TableCell>
																						<TableCell className='text-base text-muted-foreground'>
																							{a.category ||
																								'—'}
																						</TableCell>
																						<TableCell className='text-right tabular-nums'>
																							{
																								a.quantity
																							}
																						</TableCell>
																						<TableCell className='text-center'>
																							{a.grade ??
																								1}
																						</TableCell>
																						<TableCell>
																							<Button
																								size='sm'
																								variant='ghost'
																								asChild
																							>
																								<Link
																									to='/vat-tu/phong/$roomId'
																									params={{
																										roomId: String(
																											a.roomId
																										)
																									}}
																								>
																									Phòng
																								</Link>
																							</Button>
																						</TableCell>
																					</TableRow>
																				)
																			)}
																		</TableBody>
																	</Table>
																</div>
															</div>
														</TableCell>
													</TableRow>
												)}
											</Fragment>
										)
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Dialog tạo TK đơn vị sử dụng */}
			<Dialog open={acctOpen} onOpenChange={setAcctOpen}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>Tạo tài khoản đơn vị sử dụng</DialogTitle>
					</DialogHeader>
					<div className='space-y-3 py-1'>
						<p className='text-sm text-muted-foreground'>
							Đơn vị (cố định 1):{' '}
							<strong className='text-foreground'>
								{acctUnit
									? `${acctUnit.alias} — ${acctUnit.name}`
									: '—'}
							</strong>
						</p>
						<div className='space-y-1.5'>
							<Label>Username *</Label>
							<Input
								className='font-mono'
								value={acctUsername}
								onChange={(e) =>
									setAcctUsername(e.target.value)
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Họ tên hiển thị *</Label>
							<Input
								value={acctDisplayName}
								onChange={(e) =>
									setAcctDisplayName(e.target.value)
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Mật khẩu *</Label>
							<Input
								type='text'
								value={acctPassword}
								onChange={(e) =>
									setAcctPassword(e.target.value)
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>
								Phân quyền (vai trò hiện có){' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={acctRoleId}
								onValueChange={setAcctRoleId}
								options={acctRoleOptions}
								placeholder='Chọn vai trò…'
								searchPlaceholder='Gõ tên role…'
								emptyText='Không có vai trò'
							/>
							<p className='text-[11px] text-muted-foreground'>
								Giống TK ngành: gắn đúng 1 đơn vị + chọn phân
								quyền có sẵn khi tạo.
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setAcctOpen(false)}
							disabled={acctSaving}
						>
							Hủy
						</Button>
						<Button
							type='button'
							onClick={() => void handleCreateAccount()}
							disabled={acctSaving}
						>
							{acctSaving ? (
								<>
									<Loader2 className='w-4 h-4 mr-1.5 animate-spin' />
									Đang tạo…
								</>
							) : (
								'Tạo tài khoản'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>Thêm đơn vị sử dụng</DialogTitle>
					</DialogHeader>
					<div className='space-y-3 py-1'>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1.5'>
								<Label>
									Alias{' '}
									<span className='text-destructive'>*</span>
								</Label>
								<Input
									className='font-mono uppercase'
									placeholder='VD: D6, PTMHC, BGH'
									value={alias}
									onChange={(e) =>
										setAlias(e.target.value.toUpperCase())
									}
									autoFocus
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>
									Cấp{' '}
									<span className='text-destructive'>*</span>
								</Label>
								<Select
									value={level}
									onValueChange={(v) =>
										setLevel(v as 'battalion' | 'company')
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='company'>
											Đại đội / đơn vị con
										</SelectItem>
										<SelectItem value='battalion'>
											Tiểu đoàn / cấp cao
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className='space-y-1.5'>
							<Label>
								Tên đơn vị{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<Input
								placeholder='VD: Đại đội 6, Phòng Tham mưu…'
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						{level === 'company' && (
							<div className='space-y-1.5'>
								<Label>
									Đơn vị cha (tiểu đoàn){' '}
									<span className='text-destructive'>*</span>
								</Label>
								<Select
									value={parentId}
									onValueChange={setParentId}
								>
									<SelectTrigger>
										<SelectValue placeholder='Chọn tiểu đoàn…' />
									</SelectTrigger>
									<SelectContent>
										{battalionOptions.map((u) => (
											<SelectItem
												key={u.id}
												value={String(u.id)}
											>
												{u.alias} — {u.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setAddOpen(false)}
							disabled={saving}
						>
							Hủy
						</Button>
						<Button
							type='button'
							onClick={() => void handleCreateUnit()}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className='w-4 h-4 mr-1.5 animate-spin' />
									Đang lưu…
								</>
							) : (
								<>
									<Plus className='w-4 h-4 mr-1.5' />
									Thêm
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
