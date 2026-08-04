import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
	SearchableSelect,
	type SearchableOption
} from '@/components/ui/searchable-select'
import type {
	CreateRoomAssetBody,
	RoomAsset,
	UpdateRoomAssetBody
} from '@/types/asset'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ASSET_GRADES } from '@/lib/asset-grade'
import {
	isCatalogStyleAssetCode,
	stripLocationPrefixFromCatalog
} from '@/lib/asset-code'
import {
	MIN_ASSET_YEAR,
	clampAssetYearInput,
	maxAssetYear,
	validateAssetYears
} from '@/lib/asset-year'
import useUnitsData from '@/hooks/useUnitsData'
import { GetAssetCatalog } from '@/api/asset'
import { toast } from 'sonner'

const STATUSES = [
	{ value: 'NORMAL', label: 'Bình thường' },
	{ value: 'BROKEN', label: 'Hỏng' },
	{ value: 'REPAIRING', label: 'Đang sửa' },
	{ value: 'DISPOSED', label: 'Thanh lý' }
]

const GRADES = ASSET_GRADES.map((g) => ({
	value: g.value,
	label: g.label
}))

const OTHER_UNIT = '__other__'

type UnitFlat = { id: number; alias: string; name: string }

function normText(s: string): string {
	return s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'd')
		.toLocaleLowerCase('vi')
		.replace(/\s+/g, ' ')
		.trim()
}

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	roomId: number
	/**
	 * @deprecated Không còn ép prefix vị trí vào mã VT.
	 * Giữ prop để RoomProfile không gãy — chỉ dùng gợi ý.
	 */
	codePrefix?: string
	/** Mã vị trí phòng (gợi ý, không ép vào mã VT) */
	locationCode?: string
	/** Mã/tên phòng — gợi ý đơn vị sử dụng (CDHC2-D2 → D2) */
	roomCode?: string
	roomName?: string
	/** Đơn vị quản lý của phòng; đồng thời là đơn vị sử dụng vật tư */
	managerCode?: string
	asset?: RoomAsset | null
	onCreate: (body: CreateRoomAssetBody) => Promise<void>
	onUpdate: (id: number, body: UpdateRoomAssetBody) => Promise<void>
}

export default function RoomAssetDialog({
	open,
	onOpenChange,
	roomId,
	locationCode = '',
	roomCode = '',
	roomName = '',
	managerCode = '',
	asset,
	onCreate,
	onUpdate
}: Props) {
	const isEdit = !!asset
	const { data: unitsTree = [] } = useUnitsData()
	const catalogQ = useQuery({
		queryKey: ['asset-catalog', 'room-asset-picker'],
		queryFn: () => GetAssetCatalog(),
		enabled: open
	})
	const [pending, setPending] = useState(false)
	/** Mã đầy đủ — một ô (vd. HC2A0113), không tách prefix vị trí */
	const [fullCode, setFullCode] = useState('')
	const [name, setName] = useState('')
	const [category, setCategory] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [unit, setUnit] = useState('')
	const [grade, setGrade] = useState('1')
	const [manufactureYear, setManufactureYear] = useState(
		String(MIN_ASSET_YEAR)
	)
	const [usageYear, setUsageYear] = useState(String(MIN_ASSET_YEAR))
	const [installAddress, setInstallAddress] = useState('')
	const [status, setStatus] = useState('NORMAL')
	const [purchaseDate, setPurchaseDate] = useState('')
	const [expiryDate, setExpiryDate] = useState('')
	const [brokenAt, setBrokenAt] = useState('')
	const [repairStartedAt, setRepairStartedAt] = useState('')
	const [repairCompletedAt, setRepairCompletedAt] = useState('')
	const [repairPerformer, setRepairPerformer] = useState('')
	/** Mô tả tự do (ghi chú) — không lưu nganh=/cn=/vt= */
	const [description, setDescription] = useState('')
	/**
	 * Đơn vị sử dụng: id đơn vị, hoặc OTHER_UNIT → bắt chọn đơn vị quản lý bên dưới
	 */
	const [holdingPick, setHoldingPick] = useState<string>('')
	/** Khi pick = OTHER: đơn vị thật bắt buộc */
	const [otherUnitId, setOtherUnitId] = useState('')
	const [selectedCatalogCode, setSelectedCatalogCode] = useState('')
	const [selectedNganhCode, setSelectedNganhCode] = useState('')
	const [selectedChuyenNganhCode, setSelectedChuyenNganhCode] = useState('')
	const catalogMaterials = catalogQ.data?.materials ?? []
	const catalogNganh = catalogQ.data?.nganh ?? []
	const catalogChuyenNganh = catalogQ.data?.chuyenNganh ?? []
	const filteredChuyenNganh = catalogChuyenNganh.filter(
		(item) => !selectedNganhCode || item.nganhCode === selectedNganhCode
	)
	const filteredCatalogMaterials = catalogMaterials.filter(
		(item) =>
			!selectedChuyenNganhCode ||
			item.categoryCode === selectedChuyenNganhCode
	)

	const allUnits: UnitFlat[] = useMemo(() => {
		const list: UnitFlat[] = []
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

	/** Gợi ý đơn vị từ mã/tên phòng hiện tại */
	const suggestedUnitId = useMemo(() => {
		const managerAlias = managerCode.trim().toUpperCase()
		if (managerAlias) {
			const managed = allUnits.find((u) => u.alias === managerAlias)
			if (managed) return String(managed.id)
		}
		const code = (roomCode || '').toUpperCase()
		const tail = code.includes('-') ? code.split('-').pop() || '' : ''
		if (tail) {
			const byAlias =
				allUnits.find((u) => u.alias === tail) ||
				allUnits.find((u) => u.alias.toUpperCase() === tail)
			if (byAlias) return String(byAlias.id)
		}
		const rn = normText(roomName || '')
		if (rn) {
			const byName = allUnits.find((u) => normText(u.name) === rn)
			if (byName) return String(byName.id)
		}
		return ''
	}, [managerCode, roomCode, roomName, allUnits])

	const unitOptions: SearchableOption[] = useMemo(
		() => [
			...allUnits.map((u) => ({
				value: String(u.id),
				label: `${u.alias} — ${u.name}`,
				keywords: `${u.alias} ${u.name}`
			})),
			{
				value: OTHER_UNIT,
				label: 'Khác — chọn đơn vị quản lý / sử dụng khác…',
				keywords: 'khac other'
			}
		],
		[allUnits]
	)

	const resolvedHoldingUnitId = useMemo(() => {
		if (!isEdit) return suggestedUnitId ? Number(suggestedUnitId) : null
		if (holdingPick === OTHER_UNIT) {
			return otherUnitId ? Number(otherUnitId) : null
		}
		if (holdingPick) return Number(holdingPick)
		return null
	}, [holdingPick, otherUnitId, isEdit, suggestedUnitId])

	useEffect(() => {
		if (asset) {
			const cleaned = stripLocationPrefixFromCatalog(asset.code ?? '')
			setFullCode(cleaned)
			setName(asset.name)
			setCategory(asset.category)
			setSelectedCatalogCode(
				catalogMaterials.find(
					(item) =>
						asset.code === item.code ||
						asset.code.startsWith(`${item.code}-`)
				)?.code ?? ''
			)
			const picked = catalogMaterials.find(
				(item) =>
					asset.code === item.code ||
					asset.code.startsWith(`${item.code}-`)
			)
			setSelectedNganhCode(picked?.nganhCode ?? '')
			setSelectedChuyenNganhCode(picked?.categoryCode ?? '')
			setQuantity(asset.quantity)
			setUnit(asset.unit ?? '')
			setGrade(String(asset.grade ?? 1))
			setManufactureYear(
				asset.manufactureYear != null
					? String(asset.manufactureYear)
					: String(MIN_ASSET_YEAR)
			)
			setUsageYear(
				asset.usageYear != null
					? String(asset.usageYear)
					: String(MIN_ASSET_YEAR)
			)
			setInstallAddress(asset.installAddress ?? '')
			setStatus(asset.status ?? 'NORMAL')
			setPurchaseDate(asset.purchaseDate ?? '')
			setExpiryDate(asset.expiryDate ?? '')
			setBrokenAt(asset.brokenAt ?? '')
			setRepairStartedAt(asset.repairStartedAt ?? '')
			setRepairCompletedAt(asset.repairCompletedAt ?? '')
			setRepairPerformer(asset.repairPerformer ?? '')
			setDescription(asset.description ?? '')
			if (asset.holdingUnitId != null) {
				const hid = String(asset.holdingUnitId)
				const isSuggested = suggestedUnitId && hid === suggestedUnitId
				// Nếu khác gợi ý phòng → vẫn chọn đúng id (không ép OTHER)
				setHoldingPick(hid)
				setOtherUnitId('')
				void isSuggested
			} else {
				setHoldingPick(suggestedUnitId || '')
				setOtherUnitId('')
			}
		} else {
			setFullCode('')
			setName('')
			setCategory('')
			setSelectedCatalogCode('')
			setSelectedNganhCode('')
			setSelectedChuyenNganhCode('')
			setQuantity(1)
			setUnit('')
			setGrade('1')
			setManufactureYear(String(MIN_ASSET_YEAR))
			setUsageYear(String(MIN_ASSET_YEAR))
			setInstallAddress('')
			setStatus('NORMAL')
			setPurchaseDate('')
			setExpiryDate('')
			setBrokenAt('')
			setRepairStartedAt('')
			setRepairCompletedAt('')
			setRepairPerformer('')
			setDescription('')
			setHoldingPick(suggestedUnitId || '')
			setOtherUnitId('')
		}
	}, [asset, suggestedUnitId, catalogMaterials])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		let code = fullCode.trim()
		// Chuẩn hóa: nếu dán nhầm prefix vị trí + HC2… → chỉ giữ mã danh mục
		code = stripLocationPrefixFromCatalog(code)
		if (isCatalogStyleAssetCode(code)) {
			code = code.toUpperCase()
		}
		if (!code || !name.trim() || !category.trim()) {
			toast.error('Hãy chọn vật tư trong danh mục ngành')
			return
		}
		if (isEdit && !holdingPick) {
			toast.error('Chọn đơn vị sử dụng')
			return
		}
		if (isEdit && holdingPick === OTHER_UNIT && !otherUnitId) {
			toast.error(
				'Đã chọn «Khác» — bắt buộc chọn đơn vị quản lý / sử dụng'
			)
			return
		}
		if (resolvedHoldingUnitId == null) {
			toast.error('Phòng chưa có đơn vị sử dụng để tự động cập nhật')
			return
		}
		const yearErr = validateAssetYears({
			manufactureYear,
			usageYear
		})
		if (yearErr) {
			toast.error(yearErr)
			return
		}
		// Mô tả: chỉ ghi chú người dùng — không ghi nganh/cn/vt
		const descClean = description.trim()
		const body = {
			roomId,
			code,
			name,
			category,
			quantity,
			unit: unit || undefined,
			holdingUnitId: resolvedHoldingUnitId,
			grade: Number(grade),
			manufactureYear: manufactureYear
				? Number(manufactureYear)
				: undefined,
			usageYear: usageYear ? Number(usageYear) : undefined,
			installAddress: installAddress || undefined,
			status,
			purchaseDate: purchaseDate || undefined,
			expiryDate: expiryDate || undefined,
			brokenAt: brokenAt || undefined,
			repairStartedAt: repairStartedAt || undefined,
			repairCompletedAt: repairCompletedAt || undefined,
			repairPerformer: repairPerformer || undefined,
			description: descClean || undefined
		}
		setPending(true)
		try {
			if (isEdit && asset) {
				await onUpdate(asset.id, body)
				toast.success('Cập nhật vật tư thành công')
			} else {
				await onCreate(body)
				toast.success('Thêm vật tư thành công')
			}
			onOpenChange(false)
		} catch (err) {
			toast.error(isEdit ? 'Cập nhật thất bại' : 'Thêm thất bại', {
				description: (err as Error).message
			})
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle className='text-2xl font-bold'>
						{isEdit ? 'Sửa vật tư' : 'Thêm vật tư'}
					</DialogTitle>
				</DialogHeader>
				<form className='space-y-4 text-lg' onSubmit={handleSubmit}>
					<div className='space-y-2'>
						<Label className='text-base font-semibold'>
							Mã vật tư *
						</Label>
						<div className='grid grid-cols-1 gap-3'>
							<Select
								value={selectedNganhCode}
								onValueChange={(value) => {
									setSelectedNganhCode(value)
									setSelectedChuyenNganhCode('')
									setSelectedCatalogCode('')
								}}
							>
								<SelectTrigger className='h-12'>
									<SelectValue placeholder='Chọn ngành' />
								</SelectTrigger>
								<SelectContent>
									{catalogNganh.map((item) => (
										<SelectItem
											key={item.code}
											value={item.code}
										>
											{item.code} — {item.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={selectedChuyenNganhCode}
								onValueChange={(value) => {
									setSelectedChuyenNganhCode(value)
									setSelectedCatalogCode('')
								}}
								disabled={!selectedNganhCode}
							>
								<SelectTrigger className='h-12'>
									<SelectValue placeholder='Chọn loại vật' />
								</SelectTrigger>
								<SelectContent>
									{filteredChuyenNganh.map((item) => (
										<SelectItem
											key={item.code}
											value={item.code}
										>
											{item.code} — {item.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={selectedCatalogCode}
								onValueChange={(value) => {
									const m = filteredCatalogMaterials.find(
										(item) => item.code === value
									)
									if (!m) return
									setSelectedCatalogCode(value)
									setFullCode(value)
									setName(m.name)
									setCategory(
										m.classification ||
											m.categoryName ||
											m.categoryCode
									)
									setUnit(m.unit)
									setManufactureYear(
										m.manufactureYear != null
											? String(m.manufactureYear)
											: ''
									)
									setUsageYear(
										m.usageYear != null
											? String(m.usageYear)
											: ''
									)
									setStatus(m.assetStatus || 'NORMAL')
									setPurchaseDate(m.purchaseDate || '')
									setExpiryDate(m.expiryDate || '')
								}}
								disabled={!selectedChuyenNganhCode}
							>
								<SelectTrigger className='h-12'>
									<SelectValue placeholder='Chọn vật tư' />
								</SelectTrigger>
								<SelectContent>
									{filteredCatalogMaterials.map((m) => (
										<SelectItem key={m.id} value={m.code}>
											{m.code} — {m.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<p className='text-base text-muted-foreground leading-relaxed'>
							<strong>Danh mục:</strong> chọn lần lượt Ngành, Loại
							vật và Vật tư.
							{locationCode ? (
								<>
									<br />
									Vị trí phòng (tham chiếu):{' '}
									<span className='font-mono'>
										{locationCode}
									</span>
								</>
							) : null}
						</p>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className={isEdit ? 'space-y-2' : 'hidden'}>
							<Label className='text-base font-semibold'>
								Tên thiết bị *
							</Label>
							<Input
								value={name}
								readOnly
								className='h-12 text-lg bg-muted'
							/>
						</div>
						<div className={isEdit ? 'space-y-2' : 'hidden'}>
							<Label className='text-base font-semibold'>
								Loại / nhóm *
							</Label>
							<Input
								value={category}
								readOnly
								className='h-12 text-lg bg-muted'
							/>
						</div>
					</div>
					<div className='grid grid-cols-3 gap-3'>
						<div className='space-y-2'>
							<Label className='text-base font-semibold'>
								Số lượng
							</Label>
							<Input
								type='number'
								min={0}
								value={quantity}
								onChange={(e) =>
									setQuantity(Number(e.target.value))
								}
								className='h-12 text-lg'
							/>
						</div>
						<div className={isEdit ? 'space-y-2' : 'hidden'}>
							<Label className='text-base font-semibold'>
								ĐVT
							</Label>
							<Input
								value={unit}
								onChange={(e) => setUnit(e.target.value)}
								placeholder='cái'
								className='h-12 text-lg'
							/>
						</div>
						<div className={isEdit ? 'space-y-2' : 'hidden'}>
							<Label className='text-base font-semibold'>
								Phân cấp
							</Label>
							<Select value={grade} onValueChange={setGrade}>
								<SelectTrigger className='h-12 text-lg'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{GRADES.map((g) => (
										<SelectItem
											key={g.value}
											value={String(g.value)}
										>
											{g.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					{isEdit && grade === '5' && (
						<p className='text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5'>
							Phân cấp 5 (Hỏng): hệ thống sẽ tự đề xuất phiếu sửa
							chữa.
						</p>
					)}

					{/* Khi thêm mới, đơn vị được lấy tự động từ phòng. */}
					{!isEdit && (
						<div className='rounded-md border bg-muted/30 p-3 text-sm'>
							<strong>Đơn vị sử dụng:</strong>{' '}
							{allUnits.find(
								(u) => String(u.id) === suggestedUnitId
							)?.name || 'Chưa xác định từ phòng'}
						</div>
					)}
					<div
						className={
							isEdit
								? 'space-y-3 rounded-md border p-3 bg-muted/20'
								: 'hidden'
						}
					>
						<div className='space-y-2'>
							<Label className='text-base font-semibold'>
								Đơn vị sử dụng{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={holdingPick || undefined}
								onValueChange={(v) => {
									setHoldingPick(v)
									if (v !== OTHER_UNIT) setOtherUnitId('')
								}}
								placeholder='Chọn đơn vị sử dụng…'
								searchPlaceholder='Gõ D1, PTMHC, Ban…'
								emptyText='Không có đơn vị'
								className='h-12 text-base'
								options={unitOptions}
							/>
							<p className='text-xs text-muted-foreground'>
								Gợi ý theo phòng:{' '}
								{suggestedUnitId
									? allUnits.find(
											(u) =>
												String(u.id) === suggestedUnitId
										)?.alias || '—'
									: '—'}
								. Chọn <strong>Khác</strong> nếu đơn vị không
								trùng gợi ý — bắt buộc chọn đơn vị bên dưới.
							</p>
						</div>
						{holdingPick === OTHER_UNIT && (
							<div className='space-y-2'>
								<Label className='text-base font-semibold'>
									Đơn vị quản lý / sử dụng (bắt buộc){' '}
									<span className='text-destructive'>*</span>
								</Label>
								<SearchableSelect
									value={otherUnitId || undefined}
									onValueChange={setOtherUnitId}
									placeholder='— Chọn đơn vị —'
									searchPlaceholder='Gõ mã/tên đơn vị…'
									emptyText='Không có đơn vị'
									className='h-12 text-base border-destructive/50'
									options={allUnits.map((u) => ({
										value: String(u.id),
										label: `${u.alias} — ${u.name}`,
										keywords: `${u.alias} ${u.name}`
									}))}
								/>
							</div>
						)}
					</div>

					<div
						className={isEdit ? 'grid grid-cols-2 gap-3' : 'hidden'}
					>
						<div className='space-y-2'>
							<Label className='text-base font-semibold'>
								Năm sản xuất
							</Label>
							<Input
								type='number'
								min={MIN_ASSET_YEAR}
								max={maxAssetYear()}
								value={manufactureYear}
								onChange={(e) =>
									setManufactureYear(
										clampAssetYearInput(e.target.value)
									)
								}
								className='h-12 text-lg'
							/>
						</div>
						<div className='space-y-2'>
							<Label className='text-base font-semibold'>
								Năm sử dụng
							</Label>
							<Input
								type='number'
								min={MIN_ASSET_YEAR}
								max={maxAssetYear()}
								value={usageYear}
								onChange={(e) =>
									setUsageYear(
										clampAssetYearInput(e.target.value)
									)
								}
								className='h-12 text-lg'
							/>
						</div>
					</div>
					<div className='space-y-2'>
						<Label className='text-base font-semibold'>
							Địa chỉ lắp đặt / sử dụng
						</Label>
						<Input
							value={installAddress}
							onChange={(e) => setInstallAddress(e.target.value)}
							placeholder='VD: Tòa H - Tầng 1 - Phòng 101'
							className='h-12 text-lg'
						/>
					</div>
					<div
						className={isEdit ? 'grid grid-cols-2 gap-3' : 'hidden'}
					>
						<div className='space-y-2'>
							<Label className='text-base font-semibold'>
								Trạng thái
							</Label>
							<Select value={status} onValueChange={setStatus}>
								<SelectTrigger className='h-12 text-lg'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUSES.map((s) => (
										<SelectItem
											key={s.value}
											value={s.value}
										>
											{s.label}
										</SelectItem>
									))}
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
					</div>
					<div className={isEdit ? 'space-y-2' : 'hidden'}>
						<Label>Ngày hết hạn / BH</Label>
						<Input
							type='date'
							value={expiryDate}
							onChange={(e) => setExpiryDate(e.target.value)}
						/>
					</div>
					{isEdit &&
						(status === 'BROKEN' || status === 'REPAIRING') && (
							<div className='rounded-md border p-3 space-y-3 bg-muted/30'>
								<p className='text-xs font-medium text-muted-foreground'>
									Thông tin hư hỏng / sửa chữa
								</p>
								<div className='grid grid-cols-2 gap-3'>
									<div className='space-y-2'>
										<Label>Ngày hư</Label>
										<Input
											type='date'
											value={brokenAt}
											onChange={(e) =>
												setBrokenAt(e.target.value)
											}
										/>
									</div>
									<div className='space-y-2'>
										<Label>Bắt đầu sửa</Label>
										<Input
											type='date'
											value={repairStartedAt}
											onChange={(e) =>
												setRepairStartedAt(
													e.target.value
												)
											}
										/>
									</div>
								</div>
								<div className='grid grid-cols-2 gap-3'>
									<div className='space-y-2'>
										<Label>Hoàn thành SC</Label>
										<Input
											type='date'
											value={repairCompletedAt}
											onChange={(e) =>
												setRepairCompletedAt(
													e.target.value
												)
											}
										/>
									</div>
									<div className='space-y-2'>
										<Label>Người sửa</Label>
										<Input
											value={repairPerformer}
											onChange={(e) =>
												setRepairPerformer(
													e.target.value
												)
											}
										/>
									</div>
								</div>
							</div>
						)}
					<div className='space-y-2'>
						<Label>Mô tả / ghi chú</Label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
							disabled={pending}
						>
							Hủy
						</Button>
						<Button type='submit' disabled={pending}>
							{pending
								? 'Đang lưu…'
								: isEdit
									? 'Cập nhật'
									: 'Thêm'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
