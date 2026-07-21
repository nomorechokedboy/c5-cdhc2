/**
 * Danh mục ngành của user — chỉ ngành được gán.
 * Tăng/giảm SL → đồng bộ materials.quantity + log admin.
 * Tên loại/VT mới → sinh mã theo cấu trúc HC2x / HC2xNN / HC2xNNnn.
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	ArrowDownCircle,
	ArrowUpCircle,
	History,
	Layers,
	Package,
	Plus,
	RefreshCw,
	Search
} from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateCatalogStockMovement,
	GetAssetCatalog,
	GetMyNganh,
	type CatalogMaterial
} from '@/api/asset'
import CatalogStockLogPanel from './CatalogStockLogPanel'
import { nganhLabel } from '@/lib/nganh'
import { cn } from '@/lib/utils'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
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
	SearchableSelect,
	type SearchableOption
} from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'

type Side = 'list' | 'log'
type MoveMode = 'INCREASE' | 'DECREASE' | null

function today() {
	return new Date().toISOString().slice(0, 10)
}

export default function MyNganhCatalog() {
	const qc = useQueryClient()
	const [side, setSide] = useState<Side>('list')
	const [nganhCode, setNganhCode] = useState<string>('')
	const [loaiCode, setLoaiCode] = useState<string>('')
	const [search, setSearch] = useState('')
	const [moveMode, setMoveMode] = useState<MoveMode>(null)
	const [presetMat, setPresetMat] = useState<CatalogMaterial | null>(null)

	const myNganhQ = useQuery({
		queryKey: ['my-nganh'],
		queryFn: GetMyNganh
	})

	const myNganh = myNganhQ.data || []
	const activeNganh = nganhCode || myNganh[0]?.code || ''

	const catalogQ = useQuery({
		queryKey: ['asset-catalog', 'my', activeNganh],
		queryFn: () =>
			GetAssetCatalog(
				activeNganh ? { nganhCode: activeNganh } : undefined
			),
		enabled: !!activeNganh || myNganh.length > 0
	})

	const nganh = catalogQ.data?.nganh ?? []
	const loaiVat = catalogQ.data?.chuyenNganh ?? []
	const materials = catalogQ.data?.materials ?? []

	const loaiOptions: SearchableOption[] = useMemo(
		() =>
			loaiVat
				.filter(
					(c) =>
						!activeNganh ||
						(c.nganhCode || '').toUpperCase() ===
							activeNganh.toUpperCase()
				)
				.map((c) => ({
					value: c.code,
					label: `${c.code} — ${c.name}`,
					keywords: `${c.code} ${c.name}`
				})),
		[loaiVat, activeNganh]
	)

	const filteredMaterials = useMemo(() => {
		let list = materials
		if (loaiCode) {
			list = list.filter(
				(m) =>
					(m.categoryCode || '').toUpperCase() ===
					loaiCode.toUpperCase()
			)
		}
		const q = search.trim().toLocaleLowerCase('vi')
		if (!q) return list
		return list.filter((m) => {
			const hay =
				`${m.code} ${m.name} ${m.unit} ${m.categoryName}`.toLocaleLowerCase(
					'vi'
				)
			return q.split(/\s+/).every((p) => hay.includes(p))
		})
	}, [materials, loaiCode, search])

	const invalidate = async () => {
		await qc.invalidateQueries({ queryKey: ['asset-catalog'] })
		await qc.invalidateQueries({ queryKey: ['catalog-stock-logs'] })
		await qc.invalidateQueries({ queryKey: ['my-nganh'] })
	}

	if (myNganhQ.isLoading) {
		return (
			<div className='p-6 space-y-3'>
				<Skeleton className='h-10 w-64' />
				<Skeleton className='h-40 w-full' />
			</div>
		)
	}

	if (myNganhQ.isError) {
		return (
			<div className='p-6'>
				<ErrorState
					title='Không tải được ngành của bạn'
					message={(myNganhQ.error as Error)?.message}
				/>
			</div>
		)
	}

	if (!myNganh.length) {
		return (
			<div className='p-6 max-w-2xl'>
				<Card>
					<CardHeader>
						<CardTitle>Ngành của tôi</CardTitle>
						<CardDescription>
							Bạn chưa được gán ngành danh mục. Liên hệ admin để
							gán ngành (vd. HC2A — Công nghệ thông tin).
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		)
	}

	return (
		<div className='p-4 md:p-6 space-y-4 max-w-7xl mx-auto'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-xl font-semibold flex items-center gap-2'>
						<Layers className='w-5 h-5' />
						Danh mục ngành của tôi
					</h1>
					<p className='text-sm text-muted-foreground mt-1'>
						Chỉ xem / cập nhật tăng-giảm trong ngành được gán. Tên
						loại hoặc vật tư mới sẽ tự sinh mã theo cấu trúc danh
						mục.
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button
						onClick={() => {
							setPresetMat(null)
							setMoveMode('INCREASE')
						}}
					>
						<ArrowUpCircle className='w-4 h-4 mr-1.5' />
						Khai báo tăng
					</Button>
					<Button
						variant='secondary'
						onClick={() => {
							setPresetMat(null)
							setMoveMode('DECREASE')
						}}
					>
						<ArrowDownCircle className='w-4 h-4 mr-1.5' />
						Khai báo giảm
					</Button>
					<Button
						variant='outline'
						onClick={() => {
							void catalogQ.refetch()
							void myNganhQ.refetch()
						}}
					>
						<RefreshCw
							className={`w-3.5 h-3.5 mr-1 ${catalogQ.isFetching ? 'animate-spin' : ''}`}
						/>
						Làm mới
					</Button>
				</div>
			</div>

			<div className='flex flex-wrap gap-2'>
				{myNganh.map((n) => (
					<button
						key={n.code}
						type='button'
						onClick={() => {
							setNganhCode(n.code)
							setLoaiCode('')
						}}
						className={cn(
							'rounded-full border px-3 py-1.5 text-sm transition-colors',
							(activeNganh || '').toUpperCase() ===
								n.code.toUpperCase()
								? 'bg-primary text-primary-foreground border-primary'
								: 'hover:bg-muted'
						)}
					>
						<span className='font-mono font-medium'>{n.code}</span>
						<span className='ml-1.5 opacity-90'>{n.name}</span>
					</button>
				))}
			</div>

			<div className='inline-flex rounded-lg border bg-muted/40 p-1 gap-1'>
				<button
					type='button'
					onClick={() => setSide('list')}
					className={cn(
						'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
						side === 'list'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'
					)}
				>
					<Package className='w-4 h-4' />
					Vật tư
				</button>
				<button
					type='button'
					onClick={() => setSide('log')}
					className={cn(
						'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
						side === 'log'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'
					)}
				>
					<History className='w-4 h-4' />
					Log của tôi
				</button>
			</div>

			{side === 'log' ? (
				<CatalogStockLogPanel
					nganhCode={activeNganh || null}
					title='Log tăng/giảm của tôi'
				/>
			) : (
				<>
					<Card className='border-primary/20'>
						<CardHeader className='pb-3'>
							<CardTitle className='text-base'>Bộ lọc</CardTitle>
							<CardDescription>
								{activeNganh
									? nganhLabel(
											nganh.find(
												(n) =>
													n.code.toUpperCase() ===
													activeNganh.toUpperCase()
											) || {
												code: activeNganh,
												name: ''
											}
										)
									: 'Chọn ngành'}
							</CardDescription>
						</CardHeader>
						<CardContent className='flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end'>
							<div className='flex-1 min-w-[200px] space-y-1.5'>
								<Label>Loại vật</Label>
								<SearchableSelect
									value={loaiCode}
									onValueChange={(v) => setLoaiCode(v || '')}
									options={loaiOptions}
									placeholder='Tất cả loại vật…'
									searchPlaceholder='Gõ mã/tên loại…'
									emptyText='Không có loại'
								/>
							</div>
							<div className='flex-1 min-w-[200px] space-y-1.5'>
								<Label>Tìm vật tư</Label>
								<div className='relative'>
									<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
									<Input
										value={search}
										onChange={(e) =>
											setSearch(e.target.value)
										}
										placeholder='Mã / tên…'
										className='pl-9'
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					{catalogQ.isLoading ? (
						<div className='space-y-2'>
							<Skeleton className='h-12 w-full' />
							<Skeleton className='h-12 w-full' />
						</div>
					) : catalogQ.isError ? (
						<ErrorState
							title='Không tải danh mục'
							message={(catalogQ.error as Error)?.message}
						/>
					) : filteredMaterials.length === 0 ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground space-y-3'>
								<p>
									Chưa có vật tư trong phạm vi lọc. Bấm «Khai
									báo tăng» để thêm (tự sinh mã nếu tên mới).
								</p>
								<Button
									onClick={() => {
										setPresetMat(null)
										setMoveMode('INCREASE')
									}}
								>
									<Plus className='w-4 h-4 mr-1.5' />
									Khai báo tăng
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className='rounded-xl border overflow-hidden bg-card shadow-sm'>
							<div className='px-4 py-3 border-b bg-muted/30 font-semibold text-sm flex items-center gap-2'>
								<Package className='w-4 h-4' />
								Danh sách · {filteredMaterials.length} VT
							</div>
							<div className='overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow className='bg-muted/20'>
											<TableHead className='w-12 text-center'>
												STT
											</TableHead>
											<TableHead>Mã</TableHead>
											<TableHead>Tên</TableHead>
											<TableHead>Loại</TableHead>
											<TableHead className='w-16'>
												ĐVT
											</TableHead>
											<TableHead className='text-right'>
												SL DM
											</TableHead>
											<TableHead className='text-right'>
												SL phòng
											</TableHead>
											<TableHead className='text-center w-36'>
												Thao tác
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredMaterials.map((m, idx) => (
											<TableRow key={m.id}>
												<TableCell className='text-center text-muted-foreground tabular-nums'>
													{idx + 1}
												</TableCell>
												<TableCell className='font-mono text-sm'>
													{m.code}
												</TableCell>
												<TableCell className='font-medium'>
													{m.name}
												</TableCell>
												<TableCell className='text-sm text-muted-foreground'>
													{m.categoryName ||
														m.categoryCode}
												</TableCell>
												<TableCell>{m.unit}</TableCell>
												<TableCell className='text-right font-semibold tabular-nums'>
													{m.catalogQuantity ?? 0}
												</TableCell>
												<TableCell className='text-right tabular-nums text-muted-foreground'>
													{m.stockQuantity ?? 0}
												</TableCell>
												<TableCell>
													<div className='flex justify-center gap-1'>
														<Button
															size='sm'
															variant='outline'
															className='h-8 text-emerald-700'
															onClick={() => {
																setPresetMat(m)
																setMoveMode(
																	'INCREASE'
																)
															}}
														>
															+
														</Button>
														<Button
															size='sm'
															variant='outline'
															className='h-8 text-red-700'
															onClick={() => {
																setPresetMat(m)
																setMoveMode(
																	'DECREASE'
																)
															}}
														>
															−
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
				</>
			)}

			<StockMoveDialog
				open={!!moveMode}
				mode={moveMode}
				nganhCode={activeNganh}
				loaiVat={loaiVat.filter(
					(c) =>
						!activeNganh ||
						(c.nganhCode || '').toUpperCase() ===
							activeNganh.toUpperCase()
				)}
				materials={materials}
				preset={presetMat}
				defaultLoaiCode={loaiCode || undefined}
				onClose={() => {
					setMoveMode(null)
					setPresetMat(null)
				}}
				onSuccess={async () => {
					await invalidate()
					setMoveMode(null)
					setPresetMat(null)
				}}
			/>
		</div>
	)
}

function StockMoveDialog({
	open,
	mode,
	nganhCode,
	loaiVat,
	materials,
	preset,
	defaultLoaiCode,
	onClose,
	onSuccess
}: {
	open: boolean
	mode: MoveMode
	nganhCode: string
	loaiVat: Array<{ code: string; name: string }>
	materials: CatalogMaterial[]
	preset: CatalogMaterial | null
	defaultLoaiCode?: string
	onClose: () => void
	onSuccess: () => Promise<void>
}) {
	const isInc = mode === 'INCREASE'
	const [loaiMode, setLoaiMode] = useState<'pick' | 'new'>('pick')
	const [chuyenNganhCode, setChuyenNganhCode] = useState('')
	const [chuyenNganhName, setChuyenNganhName] = useState('')
	const [materialMode, setMaterialMode] = useState<'pick' | 'new'>('pick')
	const [materialCode, setMaterialCode] = useState('')
	const [materialName, setMaterialName] = useState('')
	const [quantity, setQuantity] = useState('1')
	const [unit, setUnit] = useState('Bộ')
	const [reason, setReason] = useState('')
	const [note, setNote] = useState('')
	const [executedAt, setExecutedAt] = useState(today())

	// Reset form when open/preset changes
	useEffect(() => {
		if (!open) return
		if (preset) {
			setLoaiMode('pick')
			setChuyenNganhCode(preset.categoryCode || '')
			setChuyenNganhName(preset.categoryName || '')
			setMaterialMode('pick')
			setMaterialCode(preset.code)
			setMaterialName(preset.name)
			setUnit(preset.unit || 'Bộ')
		} else {
			setLoaiMode('pick')
			setChuyenNganhCode(defaultLoaiCode || loaiVat[0]?.code || '')
			setChuyenNganhName('')
			setMaterialMode(isInc ? 'new' : 'pick')
			setMaterialCode('')
			setMaterialName('')
			setUnit('Bộ')
		}
		setQuantity('1')
		setReason(isInc ? 'Mua sắm / tiếp nhận' : 'Thanh lý / giảm')
		setNote('')
		setExecutedAt(today())
	}, [open, preset?.id, mode])

	const matsInLoai = useMemo(() => {
		const cn = chuyenNganhCode.toUpperCase()
		if (!cn) return materials
		return materials.filter(
			(m) => (m.categoryCode || '').toUpperCase() === cn
		)
	}, [materials, chuyenNganhCode])

	const mut = useMutation({
		mutationFn: CreateCatalogStockMovement,
		onSuccess: async (data) => {
			const m = data.material
			toast.success(
				`${isInc ? 'Tăng' : 'Giảm'} ${m.name} (${m.code}): SL DM = ${m.quantity}` +
					(m.isNew ? ' · Đã sinh mã mới' : '')
			)
			await onSuccess()
		},
		onError: (e: Error) => {
			toast.error(e.message || 'Không cập nhật được')
		}
	})

	const submit = () => {
		if (!nganhCode) {
			toast.error('Chưa chọn ngành')
			return
		}
		const qty = Number(quantity)
		if (!Number.isFinite(qty) || qty < 1) {
			toast.error('Số lượng ≥ 1')
			return
		}
		const name = materialName.trim()
		if (!name) {
			toast.error('Nhập tên vật tư')
			return
		}
		const body: Parameters<typeof CreateCatalogStockMovement>[0] = {
			movementType: isInc ? 'INCREASE' : 'DECREASE',
			nganhCode,
			materialName: name,
			quantity: qty,
			unit: unit.trim() || 'Bộ',
			reason: reason.trim() || undefined,
			note: note.trim() || undefined,
			executedAt: executedAt || today()
		}
		if (loaiMode === 'new') {
			if (!chuyenNganhName.trim()) {
				toast.error('Nhập tên loại vật mới')
				return
			}
			body.chuyenNganhName = chuyenNganhName.trim()
		} else if (chuyenNganhCode) {
			body.chuyenNganhCode = chuyenNganhCode
			const lv = loaiVat.find(
				(c) => c.code.toUpperCase() === chuyenNganhCode.toUpperCase()
			)
			if (lv) body.chuyenNganhName = lv.name
		} else {
			toast.error('Chọn hoặc tạo loại vật')
			return
		}
		if (materialMode === 'pick' && materialCode) {
			body.materialCode = materialCode
		}
		mut.mutate(body)
	}

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>
						{isInc ? 'Khai báo tăng' : 'Khai báo giảm'} — danh mục
						ngành
					</DialogTitle>
				</DialogHeader>
				<div className='space-y-3 py-1'>
					<div className='space-y-1.5'>
						<Label>Ngành</Label>
						<Input
							value={nganhCode}
							disabled
							className='font-mono'
						/>
					</div>

					<div className='space-y-1.5'>
						<div className='flex items-center justify-between'>
							<Label>Loại vật tư</Label>
							{isInc && (
								<button
									type='button'
									className='text-xs text-primary underline-offset-2 hover:underline'
									onClick={() =>
										setLoaiMode((m) =>
											m === 'pick' ? 'new' : 'pick'
										)
									}
								>
									{loaiMode === 'pick'
										? 'Tạo loại mới'
										: 'Chọn loại có sẵn'}
								</button>
							)}
						</div>
						{loaiMode === 'new' ? (
							<Input
								value={chuyenNganhName}
								onChange={(e) =>
									setChuyenNganhName(e.target.value)
								}
								placeholder='Tên loại mới (tự sinh mã HC2xNN)'
							/>
						) : (
							<Select
								value={chuyenNganhCode}
								onValueChange={(v) => {
									setChuyenNganhCode(v)
									setMaterialCode('')
									setMaterialName('')
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn loại…' />
								</SelectTrigger>
								<SelectContent>
									{loaiVat.map((c) => (
										<SelectItem key={c.code} value={c.code}>
											{c.code} — {c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					<div className='space-y-1.5'>
						<div className='flex items-center justify-between'>
							<Label>Vật tư</Label>
							{isInc && loaiMode === 'pick' && (
								<button
									type='button'
									className='text-xs text-primary underline-offset-2 hover:underline'
									onClick={() =>
										setMaterialMode((m) =>
											m === 'pick' ? 'new' : 'pick'
										)
									}
								>
									{materialMode === 'pick'
										? 'VT tên mới (sinh mã)'
										: 'Chọn VT có sẵn'}
								</button>
							)}
						</div>
						{materialMode === 'pick' && loaiMode === 'pick' ? (
							<Select
								value={materialCode}
								onValueChange={(v) => {
									setMaterialCode(v)
									const m = matsInLoai.find(
										(x) => x.code === v
									)
									if (m) {
										setMaterialName(m.name)
										setUnit(m.unit || 'Bộ')
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn vật tư…' />
								</SelectTrigger>
								<SelectContent>
									{matsInLoai.map((m) => (
										<SelectItem key={m.id} value={m.code}>
											{m.code} — {m.name} (DM:{' '}
											{m.catalogQuantity ?? 0})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<Input
								value={materialName}
								onChange={(e) =>
									setMaterialName(e.target.value)
								}
								placeholder='Tên vật tư đầy đủ'
							/>
						)}
						{materialMode === 'new' || loaiMode === 'new' ? (
							<p className='text-xs text-muted-foreground'>
								Tên mới → hệ thống sinh mã theo loại (vd.
								HC2A0103).
							</p>
						) : null}
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-1.5'>
							<Label>Số lượng</Label>
							<Input
								type='number'
								min={1}
								value={quantity}
								onChange={(e) => setQuantity(e.target.value)}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>ĐVT</Label>
							<Input
								value={unit}
								onChange={(e) => setUnit(e.target.value)}
							/>
						</div>
					</div>

					<div className='space-y-1.5'>
						<Label>Ngày thực hiện</Label>
						<Input
							type='date'
							value={executedAt}
							onChange={(e) => setExecutedAt(e.target.value)}
						/>
					</div>
					<div className='space-y-1.5'>
						<Label>Lý do</Label>
						<Input
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder='Mua sắm, tiếp nhận, thanh lý…'
						/>
					</div>
					<div className='space-y-1.5'>
						<Label>Ghi chú</Label>
						<Textarea
							value={note}
							onChange={(e) => setNote(e.target.value)}
							rows={2}
							placeholder='Thông tin bổ sung…'
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant='outline' onClick={onClose}>
						Hủy
					</Button>
					<Button onClick={submit} disabled={mut.isPending}>
						{mut.isPending
							? 'Đang lưu…'
							: isInc
								? 'Xác nhận tăng'
								: 'Xác nhận giảm'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
