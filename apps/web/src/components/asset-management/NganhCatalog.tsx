/**
 * Danh mục ngành — cùng pattern tòa nhà:
 * màn ngành + Bộ lọc → Lọc loại vật / Lọc vật tư (+ Quay lại).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	ArrowLeft,
	Boxes,
	Eye,
	Filter,
	History,
	Layers,
	Package,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Tags,
	Trash2,
	Users
} from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateCatalogChuyenNganh,
	CreateCatalogMaterial,
	CreateCatalogNganh,
	DeleteCatalogCategories,
	DeleteCatalogMaterials,
	GetAssetCatalog,
	SuggestNextChuyenNganhCode,
	SuggestNextNganhCode,
	UpdateCatalogCategory,
	UpdateCatalogMaterial,
	type CatalogCategory,
	type CatalogMaterial
} from '@/api/asset'
import CatalogAuditLogPanel from './CatalogAuditLogPanel'
import CatalogStockLogPanel from './CatalogStockLogPanel'
import {
	cn,
	getTokenNganhCodes,
	isBghOnlyUser,
	isSuperAdmin
} from '@/lib/utils'
import useIsNganhUser from '@/hooks/useIsNganhUser'
import useAuth from '@/hooks/useAuth'
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { nganhLabel } from '@/lib/nganh'
import {
	SearchableSelect,
	type SearchableOption
} from '@/components/ui/searchable-select'

type EditTarget = {
	kind: 'nganh' | 'loai_vat'
	item: CatalogCategory
}

type AddMode =
	| { kind: 'nganh' }
	| { kind: 'loai_vat'; nganhCode: string; nganhName: string }
	| null

/** nganh = danh sách ngành (mặc định); loai-vat / vat-tu = sau lọc */
export type NganhCatalogView = 'nganh' | 'loai-vat' | 'vat-tu'

function matchesQuery(
	q: string,
	parts: Array<string | null | undefined>
): boolean {
	const n = q.trim().toLocaleLowerCase('vi').split(/\s+/).filter(Boolean)
	if (!n.length) return true
	const hay = parts.filter(Boolean).join(' ').toLocaleLowerCase('vi')
	return n.every((p) => hay.includes(p))
}

type Props = {
	view?: NganhCatalogView
	nganhCode?: string | null
	loaiVatCode?: string | null
}

export default function NganhCatalog({
	view: viewProp,
	nganhCode: nganhCodeProp = null,
	loaiVatCode: loaiVatCodeProp = null
}: Props) {
	const navigate = useNavigate()
	const qc = useQueryClient()
	/** User ngành: chỉ ngành được gán; không thêm ngành mới */
	const { user } = useAuth()
	const nganhScoped = useIsNganhUser()
	/** BGH: chỉ xem danh mục — không thêm/sửa/xóa ngành·loại·VT */
	const bghOnly = isBghOnlyUser()
	const canMutate = !bghOnly
	const canManageFullCatalog = canMutate && (isSuperAdmin() || !nganhScoped)
	const tokenNganhCodes =
		getTokenNganhCodes().length > 0
			? getTokenNganhCodes()
			: (user?.nganhCodes || []).map((c) => c.toUpperCase())

	const view: NganhCatalogView =
		viewProp === 'loai-vat' || viewProp === 'vat-tu' ? viewProp : 'nganh'

	const [filterNganhCode, setFilterNganhCode] = useState<string | null>(
		nganhCodeProp
	)
	const [selectedLoaiVatCode, setSelectedLoaiVatCode] = useState<
		string | null
	>(loaiVatCodeProp)
	const [search, setSearch] = useState('')
	const [nganhSearch, setNganhSearch] = useState('')

	const [addMode, setAddMode] = useState<AddMode>(null)
	const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
	/** Màn vật tư: danh sách | nhật ký CRUD | log tăng/giảm user */
	const [vatTuSide, setVatTuSide] = useState<'list' | 'log' | 'stock'>('list')
	const [editMaterial, setEditMaterial] = useState<CatalogMaterial | null>(
		null
	)
	const [createMaterialOpen, setCreateMaterialOpen] = useState(false)
	const [confirm, setConfirm] = useState<{
		title: string
		onConfirm: () => Promise<void>
	} | null>(null)

	useEffect(() => {
		// Admin: đồng bộ URL. User ngành: không xóa lọc ngành (luôn giữ ngành gán)
		if (nganhScoped) return
		setFilterNganhCode(nganhCodeProp ?? null)
	}, [nganhCodeProp, nganhScoped])
	useEffect(() => {
		setSelectedLoaiVatCode(loaiVatCodeProp ?? null)
	}, [loaiVatCodeProp])

	const catalogQ = useQuery({
		queryKey: ['asset-catalog', 'full', nganhScoped ? 'scoped' : 'all'],
		queryFn: () => GetAssetCatalog()
	})

	const nganh = catalogQ.data?.nganh ?? []
	const loaiVat = catalogQ.data?.chuyenNganh ?? []
	const materials = catalogQ.data?.materials ?? []

	/**
	 * User ngành: bộ lọc ngành cố định theo ngành được gán.
	 * - JWT nganhCodes / catalog (đã filter API) → auto set
	 * - 1 ngành → khóa cứng
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-scope only when assigned catalog access changes
	useEffect(() => {
		if (!nganhScoped) return
		// Ưu tiên JWT → catalog API (đã scope)
		const fromToken = tokenNganhCodes
		const fromCatalog = nganh.map((n) => n.code.toUpperCase())
		const allowed =
			fromToken.length > 0
				? fromToken
				: fromCatalog.length > 0
					? fromCatalog
					: []
		if (!allowed.length) return

		const current = (filterNganhCode || '').toUpperCase()
		const fromUrl = (nganhCodeProp || '').toUpperCase()

		// Ưu tiên URL nếu thuộc ngành gán
		if (fromUrl && allowed.includes(fromUrl)) {
			if (current !== fromUrl) setFilterNganhCode(fromUrl)
			return
		}
		// Đã chọn hợp lệ
		if (current && allowed.includes(current)) return

		// Mặc định: ngành đầu (user.cntt → HC2A)
		const first =
			nganh.find((n) => allowed.includes(n.code.toUpperCase()))?.code ||
			allowed[0]
		if (!first) return
		setFilterNganhCode(first)
		void navigate({
			to: '/vat-tu/danh-muc-nganh',
			search: {
				view: view === 'nganh' ? undefined : view,
				nganhCode: first,
				loaiVatCode:
					view === 'vat-tu'
						? selectedLoaiVatCode || undefined
						: undefined
			},
			replace: true
		})
	}, [nganhScoped, nganh, nganhCodeProp, tokenNganhCodes.join('|')])

	const go = (opts: {
		view: NganhCatalogView
		nganhCode?: string | null
		loaiVatCode?: string | null
	}) => {
		const nextNganh =
			opts.nganhCode !== undefined ? opts.nganhCode : filterNganhCode
		const nextLoai =
			opts.loaiVatCode !== undefined
				? opts.loaiVatCode
				: selectedLoaiVatCode
		void navigate({
			to: '/vat-tu/danh-muc-nganh',
			search: {
				view: opts.view === 'nganh' ? undefined : opts.view,
				nganhCode: nextNganh || undefined,
				loaiVatCode:
					opts.view === 'vat-tu' ? nextLoai || undefined : undefined
			}
		})
	}

	const selectedNganh = useMemo(
		() =>
			nganh.find(
				(n) =>
					n.code.toUpperCase() ===
					(filterNganhCode || '').toUpperCase()
			) ?? null,
		[nganh, filterNganhCode]
	)

	const selectedLoaiVat = useMemo(
		() =>
			loaiVat.find(
				(c) =>
					c.code.toUpperCase() ===
					(selectedLoaiVatCode || '').toUpperCase()
			) ?? null,
		[loaiVat, selectedLoaiVatCode]
	)

	const nganhOptions: SearchableOption[] = useMemo(
		() =>
			nganh.map((n) => ({
				value: n.code,
				label: nganhLabel(n),
				keywords: n.code
			})),
		[nganh]
	)

	const filteredNganhList = useMemo(() => {
		const q = nganhSearch.trim()
		if (!q) return nganh
		return nganh.filter((n) => matchesQuery(q, [n.code, n.name]))
	}, [nganh, nganhSearch])

	/** Ngành hiệu lực: user ngành luôn có (tự gán); admin có thể null = tất cả */
	const effectiveNganhCode = useMemo(() => {
		if (filterNganhCode) return filterNganhCode
		if (nganhScoped && nganh[0]) return nganh[0].code
		return null
	}, [filterNganhCode, nganhScoped, nganh])

	const loaiVatOfNganh = useMemo(() => {
		let list = loaiVat
		const ng = effectiveNganhCode
		if (ng) {
			list = list.filter(
				(c) => (c.nganhCode || '').toUpperCase() === ng.toUpperCase()
			)
		}
		const q = search.trim()
		if (!q) return list
		return list.filter((c) => {
			if (matchesQuery(q, [c.code, c.name])) return true
			return materials.some(
				(m) =>
					(m.categoryCode || '').toUpperCase() ===
						c.code.toUpperCase() &&
					matchesQuery(q, [m.code, m.name])
			)
		})
	}, [loaiVat, effectiveNganhCode, materials, search])

	const filteredMaterials = useMemo(() => {
		let list = materials
		if (selectedLoaiVatCode) {
			list = list.filter(
				(m) =>
					(m.categoryCode || '').toUpperCase() ===
					selectedLoaiVatCode.toUpperCase()
			)
		} else if (effectiveNganhCode) {
			list = list.filter(
				(m) =>
					(m.nganhCode || '').toUpperCase() ===
					effectiveNganhCode.toUpperCase()
			)
		}
		const q = search.trim()
		if (!q) return list
		return list.filter((m) => matchesQuery(q, [m.code, m.name, m.unit]))
	}, [materials, effectiveNganhCode, selectedLoaiVatCode, search])

	const loaiVatSuggestions = useMemo(() => {
		const raw = search.trim()
		if (!raw || view !== 'loai-vat') return [] as string[]
		const seen = new Set<string>()
		const list: string[] = []
		for (const c of loaiVatOfNganh) {
			for (const s of [c.name, c.code]) {
				if (
					matchesQuery(raw, [s]) &&
					!seen.has(s.toLocaleLowerCase('vi'))
				) {
					seen.add(s.toLocaleLowerCase('vi'))
					list.push(s)
					if (list.length >= 8) return list
				}
			}
		}
		return list
	}, [loaiVatOfNganh, search, view])

	const materialSuggestions = useMemo(() => {
		const raw = search.trim()
		if (!raw || view !== 'vat-tu') return [] as string[]
		const seen = new Set<string>()
		const list: string[] = []
		for (const m of filteredMaterials) {
			for (const s of [m.name, m.code]) {
				if (
					matchesQuery(raw, [s]) &&
					!seen.has(s.toLocaleLowerCase('vi'))
				) {
					seen.add(s.toLocaleLowerCase('vi'))
					list.push(s)
					if (list.length >= 8) return list
				}
			}
		}
		return list
	}, [filteredMaterials, search, view])

	const totalStock = useMemo(
		() => materials.reduce((s, m) => s + (Number(m.stockQuantity) || 0), 0),
		[materials]
	)

	function invalidate() {
		return Promise.all([
			qc.invalidateQueries({ queryKey: ['asset-catalog'] }),
			qc.invalidateQueries({ queryKey: ['catalog-audit-logs'] })
		])
	}

	function applyFilterLoaiVat() {
		const ng = effectiveNganhCode || filterNganhCode
		if (!ng) {
			toast.error('Chọn ngành trong Bộ lọc trước')
			return
		}
		setSearch('')
		go({ view: 'loai-vat', nganhCode: ng, loaiVatCode: null })
	}

	function applyFilterVatTu() {
		const ng = effectiveNganhCode || filterNganhCode
		if (!ng) {
			toast.error('Chọn ngành trong Bộ lọc trước')
			return
		}
		setFilterNganhCode(ng)
		setSearch('')
		go({
			view: 'vat-tu',
			nganhCode: ng,
			loaiVatCode: selectedLoaiVatCode
		})
	}

	function backToNganh() {
		// User ngành: giữ nganhCode trên URL khi quay lại
		go({
			view: 'nganh',
			nganhCode: nganhScoped
				? effectiveNganhCode || filterNganhCode
				: filterNganhCode
		})
	}

	if (catalogQ.error) {
		return (
			<div className='p-6'>
				<ErrorState
					error={catalogQ.error}
					onRetry={() => catalogQ.refetch()}
				/>
			</div>
		)
	}

	return (
		<div className='space-y-5 p-5 md:p-8 max-w-[1400px] mx-auto'>
			{/* Header */}
			<div className='flex flex-wrap items-center gap-3'>
				{view !== 'nganh' && (
					<Button variant='outline' size='sm' onClick={backToNganh}>
						<ArrowLeft className='w-4 h-4 mr-1' />
						Quay lại
					</Button>
				)}
				<div className='flex items-center gap-3 min-w-0'>
					<Layers className='w-7 h-7 shrink-0' />
					<div>
						<h1 className='text-2xl md:text-3xl font-bold tracking-tight'>
							{view === 'nganh' && 'Danh mục ngành'}
							{view === 'loai-vat' && 'Loại vật'}
							{view === 'vat-tu' && 'Vật tư'}
						</h1>
						<p className='text-sm text-muted-foreground mt-0.5'>
							{view === 'nganh' &&
								'Chỉ hiển thị ngành. Dùng Bộ lọc → Lọc loại vật / Lọc vật tư.'}
							{view === 'loai-vat' &&
								(selectedNganh
									? `Loại vật thuộc ngành ${selectedNganh.code} — ${selectedNganh.name}`
									: 'Danh sách loại vật')}
							{view === 'vat-tu' &&
								(selectedLoaiVat
									? `Vật tư loại ${selectedLoaiVat.code} — ${selectedLoaiVat.name}`
									: selectedNganh
										? `Vật tư ngành ${selectedNganh.code}`
										: 'Danh sách vật tư')}
						</p>
					</div>
				</div>
				<div className='flex gap-2 ml-auto flex-wrap'>
					{view === 'nganh' && canManageFullCatalog && (
						<Button onClick={() => setAddMode({ kind: 'nganh' })}>
							<Plus className='w-4 h-4 mr-1.5' />
							Thêm ngành
						</Button>
					)}
					{view === 'loai-vat' && canMutate && (
						<Button
							onClick={() => {
								if (!selectedNganh) {
									toast.error('Chọn ngành trong Bộ lọc trước')
									return
								}
								setAddMode({
									kind: 'loai_vat',
									nganhCode: selectedNganh.code,
									nganhName: selectedNganh.name
								})
							}}
						>
							<Plus className='w-4 h-4 mr-1.5' />
							Thêm loại vật
						</Button>
					)}
					<Button
						variant='outline'
						onClick={() => catalogQ.refetch()}
					>
						<RefreshCw
							className={`w-3.5 h-3.5 mr-1 ${catalogQ.isFetching ? 'animate-spin' : ''}`}
						/>
						Làm mới
					</Button>
				</div>
			</div>

			{/* Stats — màn ngành */}
			{view === 'nganh' && (
				<div className='flex flex-wrap gap-3 text-sm'>
					<Badge variant='secondary' className='px-3 py-1'>
						{nganh.length} ngành
					</Badge>
					<Badge variant='secondary' className='px-3 py-1'>
						{loaiVat.length} loại vật
					</Badge>
					<Badge variant='secondary' className='px-3 py-1'>
						{materials.length} vật tư danh mục
					</Badge>
					<Badge
						variant='outline'
						className='font-semibold px-3 py-1'
					>
						Tổng SL thực tế: {totalStock}
					</Badge>
				</div>
			)}

			{/* ── Bộ lọc ── */}
			<Card className='border-primary/20'>
				<CardHeader className='pb-3'>
					<CardTitle className='text-base flex items-center gap-2'>
						<Filter className='w-4 h-4' />
						Bộ lọc
					</CardTitle>
					<CardDescription>
						{nganhScoped
							? view === 'vat-tu'
								? 'Ngành cố định theo tài khoản. Chọn loại vật (trong ngành) để lọc vật tư.'
								: view === 'loai-vat'
									? 'Ngành cố định — chỉ loại vật thuộc ngành được gán.'
									: 'Ngành cố định theo tài khoản được gán. Xem loại vật / vật tư trong ngành.'
							: view === 'vat-tu'
								? 'Chọn ngành và loại vật để xem vật tư.'
								: view === 'loai-vat'
									? 'Chọn ngành để lọc loại vật.'
									: 'Chọn ngành, rồi bấm Lọc loại vật hoặc Lọc vật tư.'}
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-3'>
					{view === 'vat-tu' ? (
						/* Vật tư: Ngành (cố định user ngành) + Loại vật */
						<div className='flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end'>
							<div className='flex-1 min-w-[200px] space-y-1.5'>
								<div className='text-sm font-medium'>
									Ngành
									{nganhScoped ? (
										<span className='text-muted-foreground font-normal'>
											{' '}
											(cố định)
										</span>
									) : null}
								</div>
								{nganhScoped && nganh.length === 1 ? (
									<div className='h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-medium'>
										{selectedNganh
											? nganhLabel(selectedNganh)
											: filterNganhCode || '—'}
									</div>
								) : (
									<SearchableSelect
										value={filterNganhCode ?? ''}
										onValueChange={(v) => {
											const code = v || null
											// User ngành: không cho xóa lọc (bắt buộc 1 ngành)
											if (nganhScoped && !code) return
											setFilterNganhCode(code)
											setSelectedLoaiVatCode(null)
											setSearch('')
											go({
												view: 'vat-tu',
												nganhCode: code,
												loaiVatCode: null
											})
										}}
										options={nganhOptions}
										placeholder='Chọn ngành…'
										searchPlaceholder='Gõ mã, tên ngành…'
										emptyText='Không có ngành khớp'
										disabled={
											nganhScoped && nganh.length <= 1
										}
									/>
								)}
							</div>
							<div className='flex-1 min-w-[200px] space-y-1.5'>
								<div className='text-sm font-medium'>
									Loại vật
									{nganhScoped ? (
										<span className='text-muted-foreground font-normal'>
											{' '}
											(trong ngành)
										</span>
									) : null}
								</div>
								<SearchableSelect
									value={selectedLoaiVatCode ?? ''}
									onValueChange={(v) => {
										const code = v || null
										setSelectedLoaiVatCode(code)
										setSearch('')
										go({
											view: 'vat-tu',
											nganhCode: filterNganhCode,
											loaiVatCode: code
										})
									}}
									options={loaiVatOfNganh.map((c) => ({
										value: c.code,
										label: `${c.code} — ${c.name}`,
										keywords: c.nganhCode ?? ''
									}))}
									placeholder={
										filterNganhCode
											? 'Tất cả loại vật ngành…'
											: 'Chọn ngành trước…'
									}
									searchPlaceholder='Gõ mã, tên loại vật…'
									emptyText={
										filterNganhCode
											? 'Không có loại vật trong ngành'
											: 'Chọn ngành trước'
									}
									disabled={!filterNganhCode}
								/>
							</div>
							{/* User ngành: không xóa lọc ngành; chỉ xóa lọc loại vật */}
							{nganhScoped
								? selectedLoaiVatCode && (
										<Button
											type='button'
											variant='outline'
											onClick={() => {
												setSelectedLoaiVatCode(null)
												setSearch('')
												go({
													view: 'vat-tu',
													nganhCode: filterNganhCode,
													loaiVatCode: null
												})
											}}
										>
											Bỏ lọc loại vật
										</Button>
									)
								: (filterNganhCode || selectedLoaiVatCode) && (
										<Button
											type='button'
											variant='outline'
											onClick={() => {
												setFilterNganhCode(null)
												setSelectedLoaiVatCode(null)
												setSearch('')
												go({
													view: 'vat-tu',
													nganhCode: null,
													loaiVatCode: null
												})
											}}
										>
											Xóa lọc
										</Button>
									)}
						</div>
					) : (
						/* Ngành / Loại vật: ngành cố định (user) + nút lọc */
						<div className='flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end'>
							<div className='flex-1 min-w-[220px] space-y-1.5'>
								<div className='text-sm font-medium'>
									Ngành
									{nganhScoped ? (
										<span className='text-muted-foreground font-normal'>
											{' '}
											(cố định)
										</span>
									) : null}
								</div>
								{nganhScoped && nganh.length === 1 ? (
									<div className='h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-medium'>
										{selectedNganh
											? nganhLabel(selectedNganh)
											: filterNganhCode || '—'}
									</div>
								) : (
									<SearchableSelect
										value={filterNganhCode ?? ''}
										onValueChange={(v) => {
											if (nganhScoped && !v) return
											setFilterNganhCode(v || null)
											setSelectedLoaiVatCode(null)
											if (nganhScoped && v) {
												// Giữ nganhCode trên URL
												void navigate({
													to: '/vat-tu/danh-muc-nganh',
													search: {
														view:
															view === 'nganh'
																? undefined
																: view,
														nganhCode: v
													},
													replace: true
												})
											}
										}}
										options={nganhOptions}
										placeholder='Chọn ngành…'
										searchPlaceholder='Gõ mã, tên ngành…'
										emptyText='Không có ngành khớp'
										disabled={
											nganhScoped && nganh.length <= 1
										}
									/>
								)}
							</div>
							<div className='flex flex-wrap gap-2'>
								{view === 'nganh' && (
									<>
										<Button
											type='button'
											onClick={applyFilterLoaiVat}
										>
											<Tags className='w-4 h-4 mr-1.5' />
											Lọc loại vật
										</Button>
										<Button
											type='button'
											variant='secondary'
											onClick={applyFilterVatTu}
										>
											<Boxes className='w-4 h-4 mr-1.5' />
											Lọc vật tư
										</Button>
									</>
								)}
								{view === 'loai-vat' && !nganhScoped && (
									<Button
										type='button'
										onClick={applyFilterLoaiVat}
									>
										<Tags className='w-4 h-4 mr-1.5' />
										Áp dụng ngành
									</Button>
								)}
								{filterNganhCode && !nganhScoped && (
									<Button
										type='button'
										variant='outline'
										onClick={() => {
											setFilterNganhCode(null)
											setSelectedLoaiVatCode(null)
										}}
									>
										Xóa lọc
									</Button>
								)}
							</div>
						</div>
					)}
					{selectedNganh && (
						<div className='flex flex-wrap items-center gap-2 text-sm'>
							<Badge variant='secondary'>
								{selectedNganh.code}
							</Badge>
							<span className='font-medium'>
								{selectedNganh.name}
							</span>
							{selectedLoaiVat && view === 'vat-tu' && (
								<>
									<span className='text-muted-foreground'>
										·
									</span>
									<Badge variant='outline'>
										{selectedLoaiVat.code}
									</Badge>
									<span className='font-medium'>
										{selectedLoaiVat.name}
									</span>
								</>
							)}
							<span className='text-muted-foreground'>
								· SL {selectedNganh.stockQuantity ?? 0}
							</span>
						</div>
					)}
				</CardContent>
			</Card>

			{catalogQ.isLoading ? (
				<div className='space-y-2'>
					<Skeleton className='h-14 w-full' />
					<Skeleton className='h-14 w-full' />
					<Skeleton className='h-14 w-full' />
				</div>
			) : view === 'nganh' ? (
				/* ═══════════ CHỈ DANH SÁCH NGÀNH ═══════════ */
				<div className='space-y-4'>
					<div className='relative max-w-xl'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							value={nganhSearch}
							onChange={(e) => setNganhSearch(e.target.value)}
							placeholder='Tìm ngành — mã/tên…'
							className='pl-9'
						/>
					</div>
					{filteredNganhList.length === 0 ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								{nganhSearch.trim()
									? `Không có ngành khớp «${nganhSearch.trim()}».`
									: 'Chưa có ngành. Bấm «Thêm ngành».'}
							</CardContent>
						</Card>
					) : (
						<div className='rounded-xl border overflow-hidden bg-card shadow-sm'>
							<Table>
								<TableHeader>
									<TableRow className='bg-muted/20'>
										<TableHead className='w-14 text-center'>
											STT
										</TableHead>
										<TableHead>Mã</TableHead>
										<TableHead>Tên ngành</TableHead>
										<TableHead className='text-center'>
											Loại vật
										</TableHead>
										<TableHead className='text-right'>
											SL thực tế
										</TableHead>
										<TableHead className='text-right'>
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredNganhList.map((n, idx) => {
										const lvCount = loaiVat.filter(
											(c) =>
												(
													c.nganhCode || ''
												).toUpperCase() ===
												n.code.toUpperCase()
										).length
										return (
											<TableRow
												key={n.code}
												className='hover:bg-muted/30'
											>
												<TableCell className='text-center text-muted-foreground tabular-nums'>
													{idx + 1}
												</TableCell>
												<TableCell className='font-mono text-sm'>
													{n.code}
												</TableCell>
												<TableCell className='font-medium'>
													{n.name}
												</TableCell>
												<TableCell className='text-center tabular-nums'>
													{n.childCount ?? lvCount}
												</TableCell>
												<TableCell className='text-right font-semibold tabular-nums'>
													{n.stockQuantity ?? 0}
												</TableCell>
												<TableCell>
													<div className='flex justify-end gap-1'>
														{canManageFullCatalog && (
															<>
																<Button
																	size='icon'
																	variant='ghost'
																	className='h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
																	title='Sửa'
																	onClick={() =>
																		setEditTarget(
																			{
																				kind: 'nganh',
																				item: n
																			}
																		)
																	}
																>
																	<Pencil className='w-4 h-4' />
																</Button>
																<Button
																	size='icon'
																	variant='ghost'
																	className='h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50'
																	title='Xóa'
																	onClick={() =>
																		setConfirm(
																			{
																				title: `Xóa ngành «${n.code} — ${n.name}»? Chỉ xóa được khi không còn loại vật.`,
																				onConfirm:
																					async () => {
																						await DeleteCatalogCategories(
																							[
																								n.id
																							]
																						)
																						await invalidate()
																						toast.success(
																							'Đã xóa ngành'
																						)
																					}
																			}
																		)
																	}
																>
																	<Trash2 className='w-4 h-4' />
																</Button>
															</>
														)}
														<Button
															size='sm'
															variant='secondary'
															title='Chi tiết loại vật trong ngành'
															onClick={() => {
																setFilterNganhCode(
																	n.code
																)
																setSelectedLoaiVatCode(
																	null
																)
																setSearch('')
																go({
																	view: 'loai-vat',
																	nganhCode:
																		n.code,
																	loaiVatCode:
																		null
																})
															}}
														>
															<Eye className='w-4 h-4 mr-1' />
															Chi tiết
														</Button>
													</div>
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			) : view === 'loai-vat' ? (
				/* ═══════════ LOẠI VẬT ═══════════ */
				<div className='space-y-4'>
					<div className='relative max-w-xl'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder='Tìm loại vật — mã/tên…'
							className='pl-9'
						/>
						{loaiVatSuggestions.length > 0 && (
							<div className='mt-1.5 flex flex-wrap gap-1.5'>
								<span className='text-xs text-muted-foreground self-center'>
									Gợi ý:
								</span>
								{loaiVatSuggestions.map((s) => (
									<button
										key={s}
										type='button'
										className='text-xs rounded-full border px-2.5 py-0.5 hover:bg-muted'
										onClick={() => setSearch(s)}
									>
										{s}
									</button>
								))}
							</div>
						)}
					</div>

					{loaiVatOfNganh.length === 0 ? (
						<Card>
							<CardContent className='py-12 text-center text-muted-foreground'>
								{search
									? `Không có loại vật khớp «${search}».`
									: 'Chưa có loại vật. Bấm «Thêm loại vật».'}
							</CardContent>
						</Card>
					) : (
						<div className='rounded-xl border overflow-hidden bg-card shadow-sm'>
							<div className='px-4 py-3 border-b bg-muted/30 font-semibold text-sm'>
								Danh sách loại vật · {loaiVatOfNganh.length}
							</div>
							<div className='overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow className='bg-muted/20'>
											<TableHead className='w-14 text-center'>
												STT
											</TableHead>
											<TableHead>Mã</TableHead>
											<TableHead>Tên loại vật</TableHead>
											<TableHead>Ngành</TableHead>
											<TableHead className='text-center'>
												Số VT
											</TableHead>
											<TableHead className='text-right'>
												SL thực tế
											</TableHead>
											<TableHead className='text-center w-36'>
												Thao tác
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{loaiVatOfNganh.map((lv, idx) => {
											const matCount = materials.filter(
												(m) =>
													(
														m.categoryCode || ''
													).toUpperCase() ===
													lv.code.toUpperCase()
											).length
											return (
												<TableRow
													key={lv.code}
													className='hover:bg-muted/30'
												>
													<TableCell className='text-center text-muted-foreground tabular-nums'>
														{idx + 1}
													</TableCell>
													<TableCell className='font-mono text-sm'>
														{lv.code}
													</TableCell>
													<TableCell className='font-medium'>
														{lv.name}
													</TableCell>
													<TableCell className='font-mono text-sm text-muted-foreground'>
														{lv.nganhCode || '—'}
													</TableCell>
													<TableCell className='text-center tabular-nums'>
														{lv.childCount ??
															matCount}
													</TableCell>
													<TableCell className='text-right font-semibold tabular-nums'>
														{lv.stockQuantity ?? 0}
													</TableCell>
													<TableCell>
														<div className='flex justify-center gap-1'>
															{canMutate && (
																<>
																	<Button
																		size='icon'
																		variant='ghost'
																		className='h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
																		title='Sửa'
																		onClick={() =>
																			setEditTarget(
																				{
																					kind: 'loai_vat',
																					item: lv
																				}
																			)
																		}
																	>
																		<Pencil className='w-4 h-4' />
																	</Button>
																	<Button
																		size='icon'
																		variant='ghost'
																		className='h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50'
																		title='Xóa'
																		onClick={() =>
																			setConfirm(
																				{
																					title: `Xóa loại vật «${lv.code} — ${lv.name}»? Chỉ xóa được khi không còn vật tư.`,
																					onConfirm:
																						async () => {
																							await DeleteCatalogCategories(
																								[
																									lv.id
																								]
																							)
																							await invalidate()
																							toast.success(
																								'Đã xóa loại vật'
																							)
																						}
																				}
																			)
																		}
																	>
																		<Trash2 className='w-4 h-4' />
																	</Button>
																</>
															)}
															<Button
																size='sm'
																variant='secondary'
																title='Chi tiết vật tư'
																onClick={() => {
																	setSelectedLoaiVatCode(
																		lv.code
																	)
																	setSearch(
																		''
																	)
																	setVatTuSide(
																		'list'
																	)
																	go({
																		view: 'vat-tu',
																		nganhCode:
																			lv.nganhCode ||
																			filterNganhCode,
																		loaiVatCode:
																			lv.code
																	})
																}}
															>
																<Eye className='w-4 h-4 mr-1' />
																Chi tiết
															</Button>
														</div>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
				</div>
			) : (
				/* ═══════════ VẬT TƯ: chọn bên Danh sách | Nhật ký ═══════════ */
				<div className='space-y-4'>
					{/* User ngành: chỉ danh sách VT, không xem log admin */}
					{!nganhScoped && (
						<div className='inline-flex flex-wrap rounded-lg border bg-muted/40 p-1 gap-1'>
							<button
								type='button'
								onClick={() => setVatTuSide('list')}
								className={cn(
									'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
									vatTuSide === 'list'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								)}
							>
								<Users className='w-4 h-4' />
								Vật tư
							</button>
							<button
								type='button'
								onClick={() => setVatTuSide('stock')}
								className={cn(
									'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
									vatTuSide === 'stock'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								)}
							>
								<History className='w-4 h-4' />
								Log tăng/giảm user
							</button>
							<button
								type='button'
								onClick={() => setVatTuSide('log')}
								className={cn(
									'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
									vatTuSide === 'log'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								)}
							>
								<History className='w-4 h-4' />
								Nhật ký DM
							</button>
						</div>
					)}

					{nganhScoped || vatTuSide === 'list' ? (
						<div className='space-y-4'>
							<div className='relative max-w-xl'>
								<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder='Tìm vật tư — mã/tên…'
									className='pl-9'
								/>
							</div>
							{canMutate && (
								<Button
									onClick={() => setCreateMaterialOpen(true)}
								>
									<Plus className='mr-2 h-4 w-4' /> Thêm vật
									tư
								</Button>
							)}
							{materialSuggestions.length > 0 && (
								<div className='flex flex-wrap gap-1.5'>
									<span className='text-xs text-muted-foreground self-center'>
										Gợi ý:
									</span>
									{materialSuggestions.map((s) => (
										<button
											key={s}
											type='button'
											className='text-xs rounded-full border px-2.5 py-0.5 hover:bg-muted'
											onClick={() => setSearch(s)}
										>
											{s}
										</button>
									))}
								</div>
							)}

							{filteredMaterials.length === 0 ? (
								<Card>
									<CardContent className='py-12 text-center text-muted-foreground'>
										{search
											? `Không có vật tư khớp «${search}».`
											: 'Chưa có vật tư trong phạm vi lọc.'}
									</CardContent>
								</Card>
							) : (
								<div className='rounded-xl border overflow-hidden bg-card shadow-sm'>
									<div className='px-4 py-3 border-b bg-muted/30 font-semibold text-sm flex flex-wrap items-center gap-2'>
										<Package className='w-4 h-4' />
										Danh sách vật tư ·{' '}
										{filteredMaterials.length}
										{selectedLoaiVat && (
											<span className='text-muted-foreground font-normal'>
												· {selectedLoaiVat.code} —{' '}
												{selectedLoaiVat.name}
											</span>
										)}
									</div>
									<div className='overflow-x-auto'>
										<Table>
											<TableHeader>
												<TableRow className='bg-muted/20'>
													<TableHead className='w-14 text-center'>
														STT
													</TableHead>
													<TableHead>Mã</TableHead>
													<TableHead>
														Tên vật tư
													</TableHead>
													<TableHead className='w-[80px]'>
														ĐVT
													</TableHead>
													<TableHead>
														Loại vật
													</TableHead>
													<TableHead className='text-right w-[80px]'>
														SL DM
													</TableHead>
													<TableHead className='text-right w-[80px]'>
														SL phòng
													</TableHead>
													{canMutate && (
														<TableHead className='text-center w-28'>
															Thao tác
														</TableHead>
													)}
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredMaterials.map(
													(m, idx) => (
														<TableRow
															key={m.id}
															className='hover:bg-muted/30'
														>
															<TableCell className='text-center text-muted-foreground tabular-nums'>
																{idx + 1}
															</TableCell>
															<TableCell className='font-mono text-sm'>
																{m.code}
															</TableCell>
															<TableCell className='font-medium'>
																{m.name}
															</TableCell>
															<TableCell className='text-muted-foreground'>
																{m.unit}
															</TableCell>
															<TableCell className='font-mono text-sm text-muted-foreground'>
																{m.categoryCode ||
																	'—'}
															</TableCell>
															<TableCell className='text-right font-semibold tabular-nums'>
																{m.catalogQuantity ??
																	0}
															</TableCell>
															<TableCell className='text-right tabular-nums text-muted-foreground'>
																{m.stockQuantity ??
																	0}
															</TableCell>
															{canMutate && (
																<TableCell>
																	<div className='flex justify-center gap-1'>
																		<Button
																			size='icon'
																			variant='ghost'
																			className='h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
																			title='Sửa'
																			onClick={() =>
																				setEditMaterial(
																					m
																				)
																			}
																		>
																			<Pencil className='w-4 h-4' />
																		</Button>
																		<Button
																			size='icon'
																			variant='ghost'
																			className='h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50'
																			title='Xóa'
																			onClick={() =>
																				setConfirm(
																					{
																						title: `Xóa vật tư «${m.code} — ${m.name}» khỏi danh mục?`,
																						onConfirm:
																							async () => {
																								await DeleteCatalogMaterials(
																									[
																										m.id
																									]
																								)
																								await invalidate()
																								toast.success(
																									'Đã xóa vật tư'
																								)
																							}
																					}
																				)
																			}
																		>
																			<Trash2 className='w-4 h-4' />
																		</Button>
																	</div>
																</TableCell>
															)}
														</TableRow>
													)
												)}
											</TableBody>
										</Table>
									</div>
								</div>
							)}
						</div>
					) : vatTuSide === 'stock' ? (
						<CatalogStockLogPanel
							nganhCode={filterNganhCode}
							title='Log tăng/giảm user (danh mục ngành)'
						/>
					) : (
						<CatalogAuditLogPanel
							entityType='VAT_TU'
							title='Nhật ký vật tư'
						/>
					)}
				</div>
			)}

			{view === 'nganh' && (
				<p className='text-xs text-muted-foreground'>
					Mã: ngành (HC2A) → loại vật (HC2A01) → vật tư (HC2A0101…).
					{nganhScoped
						? ' Chỉ hiển thị ngành được gán cho tài khoản của bạn.'
						: ' SL = tổng số lượng trên các phòng. '}
					{!nganhScoped && (
						<Link
							to='/vat-tu'
							className='text-primary underline-offset-2 hover:underline'
						>
							Danh mục tòa nhà
						</Link>
					)}
				</p>
			)}

			<AddNganhDialog
				open={addMode?.kind === 'nganh'}
				onOpenChange={(o) => {
					if (!o) setAddMode(null)
				}}
				onSuccess={async (created) => {
					await invalidate()
					setFilterNganhCode(created.code)
					setAddMode(null)
				}}
			/>

			<AddLoaiVatDialog
				open={addMode?.kind === 'loai_vat'}
				onOpenChange={(o) => {
					if (!o) setAddMode(null)
				}}
				nganhCode={
					addMode?.kind === 'loai_vat' ? addMode.nganhCode : ''
				}
				nganhName={
					addMode?.kind === 'loai_vat' ? addMode.nganhName : ''
				}
				onSuccess={async (created) => {
					await invalidate()
					if (addMode?.kind === 'loai_vat') {
						setFilterNganhCode(addMode.nganhCode)
					}
					setAddMode(null)
					setSearch('')
					go({
						view: 'loai-vat',
						nganhCode:
							addMode?.kind === 'loai_vat'
								? addMode.nganhCode
								: filterNganhCode
					})
					toast.success(`Đã thêm loại vật ${created.code}`)
				}}
			/>

			<EditCategoryDialog
				open={!!editTarget}
				onOpenChange={(o) => {
					if (!o) setEditTarget(null)
				}}
				target={editTarget}
				onSuccess={async () => {
					await invalidate()
					setEditTarget(null)
				}}
			/>

			<EditMaterialDialog
				open={!!editMaterial}
				material={editMaterial}
				onOpenChange={(o) => {
					if (!o) setEditMaterial(null)
				}}
				onSuccess={async () => {
					await invalidate()
					setEditMaterial(null)
				}}
			/>
			<CreateMaterialDialog
				open={createMaterialOpen}
				onOpenChange={setCreateMaterialOpen}
				categories={loaiVat}
				defaultCode={selectedLoaiVatCode}
				onSuccess={invalidate}
			/>

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
									await confirm?.onConfirm()
								} catch (err) {
									toast.error('Xóa thất bại', {
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

function CreateMaterialDialog({
	open,
	onOpenChange,
	categories,
	defaultCode,
	onSuccess
}: {
	open: boolean
	onOpenChange: (o: boolean) => void
	categories: CatalogCategory[]
	defaultCode: string | null
	onSuccess: () => void | Promise<void>
}) {
	const [code, setCode] = useState(defaultCode || '')
	const [name, setName] = useState('')
	const [unit, setUnit] = useState('Bộ')
	const [quantity, setQuantity] = useState('0')
	const [manufactureYear, setManufactureYear] = useState('')
	const [usageYear, setUsageYear] = useState('')
	const [classification, setClassification] = useState('')
	const [assetStatus, setAssetStatus] = useState('NORMAL')
	const [purchaseDate, setPurchaseDate] = useState('')
	const [expiryDate, setExpiryDate] = useState('')
	useEffect(() => {
		if (open) {
			setCode(defaultCode || categories[0]?.code || '')
			setName('')
			setUnit('Bộ')
			setQuantity('0')
			setManufactureYear('')
			setUsageYear('')
			setClassification('')
			setAssetStatus('NORMAL')
			setPurchaseDate('')
			setExpiryDate('')
		}
	}, [open, defaultCode, categories])
	const mut = useMutation({
		mutationFn: () =>
			CreateCatalogMaterial({
				chuyenNganhCode: code,
				name: name.trim(),
				unit: unit.trim() || 'Bộ',
				quantity: Math.max(0, Number(quantity) || 0),
				manufactureYear: manufactureYear
					? Number(manufactureYear)
					: undefined,
				usageYear: usageYear ? Number(usageYear) : undefined,
				classification: classification.trim() || undefined,
				assetStatus,
				purchaseDate: purchaseDate || undefined,
				expiryDate: expiryDate || undefined
			}),
		onSuccess: async () => {
			toast.success('Đã thêm vật tư')
			await onSuccess()
			onOpenChange(false)
		},
		onError: (err) =>
			toast.error('Thêm vật tư thất bại', {
				description: (err as Error).message
			})
	})
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Thêm vật tư</DialogTitle>
				</DialogHeader>
				<form
					className='space-y-4'
					onSubmit={(e) => {
						e.preventDefault()
						if (!code || !name.trim()) return
						mut.mutate()
					}}
				>
					<div className='space-y-2'>
						<Label>Chuyên ngành *</Label>
						<Select value={code} onValueChange={setCode}>
							<SelectTrigger>
								<SelectValue placeholder='Chọn chuyên ngành' />
							</SelectTrigger>
							<SelectContent>
								{categories
									.filter((c) => !c.isNganh)
									.map((c) => (
										<SelectItem key={c.code} value={c.code}>
											{c.code} — {c.name}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-2'>
						<Label>Tên vật tư *</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label>Đơn vị tính</Label>
							<Input
								value={unit}
								onChange={(e) => setUnit(e.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Số lượng danh mục</Label>
							<Input
								type='number'
								min='0'
								step='1'
								value={quantity}
								onChange={(e) => setQuantity(e.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Năm sản xuất</Label>
							<Input
								type='number'
								value={manufactureYear}
								onChange={(e) =>
									setManufactureYear(e.target.value)
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Năm sử dụng</Label>
							<Input
								type='number'
								value={usageYear}
								onChange={(e) => setUsageYear(e.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Phân loại</Label>
							<Input
								value={classification}
								onChange={(e) =>
									setClassification(e.target.value)
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Trạng thái</Label>
							<Select
								value={assetStatus}
								onValueChange={setAssetStatus}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='NORMAL'>
										Bình thường
									</SelectItem>
									<SelectItem value='BROKEN'>Hỏng</SelectItem>
									<SelectItem value='REPAIRING'>
										Đang sửa
									</SelectItem>
									<SelectItem value='DISPOSED'>
										Thanh lý
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label>Ngày mua</Label>
							<Input
								type='date'
								value={purchaseDate}
								onChange={(e) =>
									setPurchaseDate(e.target.value)
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Ngày hết hạn bảo hành</Label>
							<Input
								type='date'
								min={purchaseDate || undefined}
								value={expiryDate}
								onChange={(e) => setExpiryDate(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button
							type='submit'
							disabled={mut.isPending || !code || !name.trim()}
						>
							Lưu
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function EditMaterialDialog({
	open,
	material,
	onOpenChange,
	onSuccess
}: {
	open: boolean
	material: CatalogMaterial | null
	onOpenChange: (o: boolean) => void
	onSuccess: () => void | Promise<void>
}) {
	const [name, setName] = useState('')
	const [unit, setUnit] = useState('')

	useEffect(() => {
		if (open && material) {
			setName(material.name)
			setUnit(material.unit)
		}
	}, [open, material])

	const mut = useMutation({
		mutationFn: () => {
			if (!material) throw new Error('Không tìm thấy vật tư cần cập nhật')
			return UpdateCatalogMaterial(material.id, {
				name: name.trim(),
				unit: unit.trim() || 'Bộ'
			})
		},
		onSuccess: async () => {
			toast.success('Đã cập nhật vật tư')
			await onSuccess()
		},
		onError: (err) => {
			toast.error('Cập nhật thất bại', {
				description: (err as Error).message
			})
		}
	})

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Sửa vật tư</DialogTitle>
				</DialogHeader>
				<form
					className='space-y-4'
					onSubmit={(e) => {
						e.preventDefault()
						if (!name.trim()) {
							toast.error('Tên không được để trống')
							return
						}
						mut.mutate()
					}}
				>
					<div className='space-y-2'>
						<Label>Mã (không đổi)</Label>
						<Input
							value={material?.code ?? ''}
							readOnly
							className='font-mono bg-muted'
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='mat-name'>Tên *</Label>
						<Input
							id='mat-name'
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							autoFocus
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='mat-unit'>ĐVT</Label>
						<Input
							id='mat-unit'
							value={unit}
							onChange={(e) => setUnit(e.target.value)}
							placeholder='Bộ'
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button type='submit' disabled={mut.isPending}>
							{mut.isPending ? 'Đang lưu…' : 'Cập nhật'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function AddNganhDialog({
	open,
	onOpenChange,
	onSuccess
}: {
	open: boolean
	onOpenChange: (o: boolean) => void
	onSuccess: (created: CatalogCategory) => void | Promise<void>
}) {
	const [name, setName] = useState('')
	const [suggestedCode, setSuggestedCode] = useState('')
	const [loadingCode, setLoadingCode] = useState(false)

	useEffect(() => {
		if (!open) return
		setName('')
		setSuggestedCode('')
		setLoadingCode(true)
		SuggestNextNganhCode()
			.then((r) => setSuggestedCode(r.code))
			.catch((err) => {
				toast.error('Không xin được mã ngành', {
					description: (err as Error).message
				})
			})
			.finally(() => setLoadingCode(false))
	}, [open])

	const mut = useMutation({
		mutationFn: () => CreateCatalogNganh({ name: name.trim() }),
		onSuccess: async (data) => {
			toast.success(`Đã thêm ngành ${data.code}`)
			await onSuccess(data)
		},
		onError: (err) => {
			toast.error('Thêm ngành thất bại', {
				description: (err as Error).message
			})
		}
	})

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Thêm ngành</DialogTitle>
				</DialogHeader>
				<form
					className='space-y-5'
					onSubmit={(e) => {
						e.preventDefault()
						if (!name.trim()) {
							toast.error('Tên ngành là bắt buộc')
							return
						}
						mut.mutate()
					}}
				>
					<div className='space-y-2'>
						<Label className='text-base font-semibold'>
							Mã ngành (hệ thống xin)
						</Label>
						<Input
							value={
								loadingCode
									? 'Đang xin mã…'
									: suggestedCode || '—'
							}
							readOnly
							className='font-mono bg-muted h-12 text-lg'
						/>
					</div>
					<div className='space-y-2'>
						<Label
							htmlFor='nganh-name'
							className='text-base font-semibold'
						>
							Tên ngành *
						</Label>
						<Input
							id='nganh-name'
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder='VD: Công nghệ thông tin'
							required
							autoFocus
							className='h-12 text-lg'
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button
							type='submit'
							disabled={
								mut.isPending || loadingCode || !suggestedCode
							}
						>
							{mut.isPending ? 'Đang lưu…' : 'Thêm ngành'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function AddLoaiVatDialog({
	open,
	onOpenChange,
	nganhCode,
	nganhName,
	onSuccess
}: {
	open: boolean
	onOpenChange: (o: boolean) => void
	nganhCode: string
	nganhName: string
	onSuccess: (created: CatalogCategory) => void | Promise<void>
}) {
	const [name, setName] = useState('')
	const [suggestedCode, setSuggestedCode] = useState('')
	const [loadingCode, setLoadingCode] = useState(false)

	useEffect(() => {
		if (!open || !nganhCode) return
		setName('')
		setSuggestedCode('')
		setLoadingCode(true)
		SuggestNextChuyenNganhCode(nganhCode)
			.then((r) => setSuggestedCode(r.code))
			.catch((err) => {
				toast.error('Không xin được mã loại vật', {
					description: (err as Error).message
				})
			})
			.finally(() => setLoadingCode(false))
	}, [open, nganhCode])

	const mut = useMutation({
		mutationFn: () =>
			CreateCatalogChuyenNganh({
				nganhCode,
				name: name.trim()
			}),
		onSuccess: async (data) => {
			await onSuccess(data)
		},
		onError: (err) => {
			toast.error('Thêm loại vật thất bại', {
				description: (err as Error).message
			})
		}
	})

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Thêm loại vật</DialogTitle>
				</DialogHeader>
				<form
					className='space-y-5'
					onSubmit={(e) => {
						e.preventDefault()
						if (!name.trim()) {
							toast.error('Tên loại vật là bắt buộc')
							return
						}
						mut.mutate()
					}}
				>
					<div className='space-y-2'>
						<Label className='text-base font-semibold'>
							Thuộc ngành
						</Label>
						<Input
							value={`${nganhCode} — ${nganhName}`}
							readOnly
							className='bg-muted h-12 text-lg'
						/>
					</div>
					<div className='space-y-2'>
						<Label className='text-base font-semibold'>
							Mã loại vật (hệ thống xin)
						</Label>
						<Input
							value={
								loadingCode
									? 'Đang xin mã…'
									: suggestedCode || '—'
							}
							readOnly
							className='font-mono bg-muted h-12 text-lg'
						/>
					</div>
					<div className='space-y-2'>
						<Label
							htmlFor='lv-name'
							className='text-base font-semibold'
						>
							Tên loại vật *
						</Label>
						<Input
							id='lv-name'
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder='VD: Máy tính để bàn'
							required
							autoFocus
							className='h-12 text-lg'
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button
							type='submit'
							disabled={
								mut.isPending || loadingCode || !suggestedCode
							}
						>
							{mut.isPending ? 'Đang lưu…' : 'Thêm loại vật'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function EditCategoryDialog({
	open,
	onOpenChange,
	target,
	onSuccess
}: {
	open: boolean
	onOpenChange: (o: boolean) => void
	target: EditTarget | null
	onSuccess: () => void | Promise<void>
}) {
	const [name, setName] = useState('')

	useEffect(() => {
		if (open && target) setName(target.item.name)
	}, [open, target])

	const mut = useMutation({
		mutationFn: () => {
			if (!target) throw new Error('Không tìm thấy danh mục cần cập nhật')
			return UpdateCatalogCategory(target.item.id, { name: name.trim() })
		},
		onSuccess: async () => {
			toast.success(
				target?.kind === 'nganh'
					? 'Đã cập nhật tên ngành'
					: 'Đã cập nhật tên loại vật'
			)
			await onSuccess()
		},
		onError: (err) => {
			toast.error('Cập nhật thất bại', {
				description: (err as Error).message
			})
		}
	})

	const title = target?.kind === 'nganh' ? 'Sửa ngành' : 'Sửa loại vật'

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<form
					className='space-y-4'
					onSubmit={(e) => {
						e.preventDefault()
						if (!name.trim()) {
							toast.error('Tên không được để trống')
							return
						}
						mut.mutate()
					}}
				>
					<div className='space-y-2'>
						<Label>Mã (không đổi)</Label>
						<Input
							value={target?.item.code ?? ''}
							readOnly
							className='font-mono bg-muted'
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='edit-name'>Tên *</Label>
						<Input
							id='edit-name'
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button type='submit' disabled={mut.isPending}>
							{mut.isPending ? 'Đang lưu…' : 'Cập nhật'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
