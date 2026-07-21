import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
	AlertTriangle,
	ArrowLeft,
	ClipboardList,
	FileUp,
	PackagePlus,
	PenLine,
	RefreshCw
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
	CreateAssetMovement,
	CreateRoomAsset,
	GetAssetCatalog,
	GetRoomAssets
} from '@/api/asset'
import {
	buildAssetCode,
	buildCatalogRoomAssetCode,
	buildLocationCode,
	resolveUnitAliasFromCodes
} from '@/lib/asset-code'
import { nganhLabel } from '@/lib/nganh'
import { resolveInstallAddress } from '@/lib/export-asset-excel'
import useUnitsData from '@/hooks/useUnitsData'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useBuildingTree } from '@/hooks/useBuildings'
import {
	ASSET_GRADES,
	GRADE_UP_TARGET_GRADES,
	validateGradeUp
} from '@/lib/asset-grade'
import {
	MIN_ASSET_YEAR,
	clampAssetYearInput,
	maxAssetYear,
	validateAssetYears
} from '@/lib/asset-year'
import type {
	AssetMovementType,
	CreateAssetMovementBody,
	RoomAsset
} from '@/types/asset'
import type { MovementMode } from './AssetMovementDialog'
import CatalogImportPanel from './CatalogImportPanel'
import AssetUpdateBatchForm from './AssetUpdateBatchForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	cn,
	nowVNDateTimeLocal,
	nowVNStoredDateTime,
	toStoredDateTime
} from '@/lib/utils'
import useIsNganhUser from '@/hooks/useIsNganhUser'

/** Loại luôn có sẵn (gồm IT + Khác) + loại từ dữ liệu phòng */
const PRESET_CATEGORIES = [
	'IT',
	'Điện lạnh',
	'Nội thất',
	'Điện',
	'Khác'
] as const
const CATEGORY_OTHER = 'Khác'

const INCREASE_REASONS_ALL = [
	{ value: 'FROM_SUPERIOR', label: 'Trên cấp' },
	{ value: 'PURCHASE', label: 'Mua sắm' },
	{ value: 'GRADE_UP', label: 'Tăng phân cấp' },
	{ value: 'INVENTORY', label: 'Kiểm kê' },
	{ value: 'OTHER', label: 'Khác' }
]

const DECREASE_REASONS = [
	{ value: 'RETURN_SUPERIOR', label: 'Trả trên → kho KHO-VT' },
	{ value: 'LOSS', label: 'Hao hụt' },
	{ value: 'LIQUIDATION', label: 'Thanh lý' },
	{ value: 'INVENTORY', label: 'Kiểm kê' },
	{ value: 'OTHER', label: 'Khác' }
]

function today() {
	return nowVNDateTimeLocal()
}

function Cell({
	label,
	required,
	children,
	className = ''
}: {
	label: string
	required?: boolean
	children: ReactNode
	className?: string
}) {
	return (
		<div className={`min-w-0 space-y-2 ${className}`}>
			<Label className='text-base font-semibold text-foreground leading-snug block'>
				{label}
				{required ? <span className='text-destructive'> *</span> : null}
			</Label>
			{children}
		</div>
	)
}

/**
 * Form cập nhật — ngang, gọn 1 trang.
 * Chọn: tòa → tầng → phòng → loại → tên TB (mã VT tự điền).
 * Ổn định / hư hỏng xem ở Báo cáo; form chỉ hiện biến đổi kho.
 */
export default function AssetUpdatePage() {
	const qc = useQueryClient()
	/** User ngành: chỉ form ngành nhiều dòng — không nhập từng VT / import */
	const nganhUser = useIsNganhUser()
	const {
		data: tree = [],
		isLoading: treeLoading,
		error: treeError,
		refetch: refetchTree
	} = useBuildingTree()
	const { data: unitsTree = [] } = useUnitsData()

	const [mode, setMode] = useState<MovementMode>('increase-decrease')
	const [dir, setDir] = useState<'INCREASE' | 'DECREASE'>('INCREASE')

	const [buildingId, setBuildingId] = useState('')
	const [floorId, setFloorId] = useState('')
	const [roomId, setRoomId] = useState('')
	const [category, setCategory] = useState('')
	const [assetId, setAssetId] = useState('')
	/** Danh mục khi Khác + Mua sắm: ngành → CN → thiết bị */
	const [catalogNganhCode, setCatalogNganhCode] = useState('')
	const [catalogCnCode, setCatalogCnCode] = useState('')
	const [catalogMaterialCode, setCatalogMaterialCode] = useState('')

	const [executedAt, setExecutedAt] = useState(today())
	const [executingUnit, setExecutingUnit] = useState('')
	const [assetName, setAssetName] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [grade, setGrade] = useState('1')
	const [manufactureYear, setManufactureYear] = useState(
		String(MIN_ASSET_YEAR)
	)
	const [usageYear, setUsageYear] = useState(String(MIN_ASSET_YEAR))
	const [reasonCode, setReasonCode] = useState('')
	const [reasonOther, setReasonOther] = useState('')
	const [decisionDate, setDecisionDate] = useState('')
	const [decisionNumber, setDecisionNumber] = useState('')
	const [signer, setSigner] = useState('')
	const [performer, setPerformer] = useState('')
	const [explanation, setExplanation] = useState('')
	const [note, setNote] = useState('')
	const [pending, setPending] = useState(false)

	const buildingIdNum = buildingId ? Number(buildingId) : undefined
	const floorIdNum = floorId ? Number(floorId) : undefined
	const roomIdNum = roomId ? Number(roomId) : undefined

	const floors = useMemo(() => {
		const b = tree.find((x) => x.id === buildingIdNum)
		return b?.floors ?? []
	}, [tree, buildingIdNum])

	const rooms = useMemo(() => {
		const f = floors.find((x) => x.id === floorIdNum)
		return f?.rooms ?? []
	}, [floors, floorIdNum])

	const assetsQ = useQuery({
		queryKey: ['room-assets', 'update-form', roomIdNum],
		queryFn: () => GetRoomAssets(roomIdNum!),
		enabled: roomIdNum != null && !Number.isNaN(roomIdNum)
	})

	const roomAssets = assetsQ.data ?? []

	const isOtherCategory = category === CATEGORY_OTHER
	/**
	 * Loại Khác + Tăng: nhập / chọn tên VT mới (mua sắm…).
	 * Giảm / điều chỉnh: phải chọn VT loại Khác đã có trong phòng — không nhập tay.
	 */
	const isNewOtherAsset =
		isOtherCategory && mode === 'increase-decrease' && dir === 'INCREASE'

	/**
	 * Khác + Tăng + Mua sắm: bắt buộc chọn ngành → chuyên ngành → thiết bị (danh mục).
	 */
	const needCatalogPurchase = isNewOtherAsset && reasonCode === 'PURCHASE'

	const catalogQ = useQuery({
		queryKey: ['asset-catalog', 'update-form'],
		queryFn: () => GetAssetCatalog(),
		enabled: isOtherCategory,
		staleTime: 60_000
	})

	const catalogNganh = catalogQ.data?.nganh ?? []
	const catalogCn = catalogQ.data?.chuyenNganh ?? []
	const catalogMaterials = catalogQ.data?.materials ?? []

	const cnOptions = useMemo(() => {
		if (!catalogNganhCode) return []
		return catalogCn
			.filter(
				(c) =>
					(c.nganhCode || '').toUpperCase() ===
					catalogNganhCode.toUpperCase()
			)
			.sort((a, b) => a.code.localeCompare(b.code, 'vi'))
	}, [catalogCn, catalogNganhCode])

	const materialOptions = useMemo(() => {
		if (!catalogCnCode) return []
		return catalogMaterials
			.filter(
				(m) =>
					(m.categoryCode || '').toUpperCase() ===
					catalogCnCode.toUpperCase()
			)
			.sort((a, b) => a.code.localeCompare(b.code, 'vi'))
	}, [catalogMaterials, catalogCnCode])

	const selectedCatalogMaterial = useMemo(
		() =>
			catalogMaterials.find(
				(m) =>
					m.code.toUpperCase() ===
					catalogMaterialCode.trim().toUpperCase()
			),
		[catalogMaterials, catalogMaterialCode]
	)

	/** Loại: preset (IT, Khác, …) + loại có trong phòng */
	const categories = useMemo(() => {
		const set = new Set<string>(PRESET_CATEGORIES)
		for (const a of roomAssets) {
			if (a.category?.trim()) set.add(a.category.trim())
		}
		// Khác luôn cuối
		const list = [...set].filter((c) => c !== CATEGORY_OTHER)
		list.sort((a, b) => a.localeCompare(b, 'vi'))
		list.push(CATEGORY_OTHER)
		return list
	}, [roomAssets])

	const selectedBuilding = tree.find((b) => b.id === buildingIdNum)
	const selectedFloor = floors.find((f) => f.id === floorIdNum)
	const selectedRoom = rooms.find((r) => r.id === roomIdNum)

	/** Flat units (battalion + company) for alias → id */
	const allUnits = useMemo(() => {
		const list: Array<{ id: number; alias: string; name: string }> = []
		for (const u of unitsTree as Array<{
			id: number
			alias: string
			name: string
			children?: Array<{ id: number; alias: string; name: string }>
		}>) {
			list.push({ id: u.id, alias: u.alias, name: u.name })
			for (const c of u.children || []) {
				list.push({ id: c.id, alias: c.alias, name: c.name })
			}
		}
		return list
	}, [unitsTree])

	/**
	 * Alias đơn vị của phòng đang chọn (D1, BGH…).
	 * Ưu tiên mã VT hiện có trong phòng / holdingUnitId / roomCode.
	 */
	const roomUnitAlias = useMemo(() => {
		const fromCodes = resolveUnitAliasFromCodes(
			roomAssets.map((a) => a.code),
			selectedRoom?.roomCode
		)
		if (fromCodes) return fromCodes
		// holdingUnitId phổ biến
		const counts = new Map<number, number>()
		for (const a of roomAssets) {
			if (a.holdingUnitId == null) continue
			counts.set(a.holdingUnitId, (counts.get(a.holdingUnitId) || 0) + 1)
		}
		if (counts.size > 0) {
			let bestId = 0
			let n = 0
			for (const [id, v] of counts) {
				if (v > n) {
					bestId = id
					n = v
				}
			}
			const u = allUnits.find((x) => x.id === bestId)
			if (u?.alias) return u.alias.toUpperCase()
		}
		// khớp tên phòng với tên đơn vị
		const rn = (selectedRoom?.roomName || '').toLocaleLowerCase('vi')
		if (rn) {
			const hit = allUnits.find(
				(u) =>
					rn.includes(u.name.toLocaleLowerCase('vi')) ||
					u.name.toLocaleLowerCase('vi').includes(rn)
			)
			if (hit) return hit.alias.toUpperCase()
		}
		return null
	}, [roomAssets, selectedRoom?.roomCode, selectedRoom?.roomName, allUnits])

	const roomHoldingUnitId = useMemo(() => {
		if (!roomUnitAlias) return undefined
		const u = allUnits.find(
			(x) => x.alias.toUpperCase() === roomUnitAlias.toUpperCase()
		)
		return u?.id
	}, [allUnits, roomUnitAlias])

	/** Chuyên ngành đã chọn (tên dùng làm category sau mua sắm) */
	const selectedCatalogCn = useMemo(
		() =>
			catalogCn.find(
				(c) =>
					c.code.toUpperCase() === catalogCnCode.trim().toUpperCase()
			),
		[catalogCn, catalogCnCode]
	)

	/**
	 * Mã VT chuẩn khi Mua sắm + Khác:
	 * HC2A0113-G2-D1 (mã danh mục + cấp + đơn vị phòng)
	 */
	const purchaseCatalogCode = useMemo(() => {
		if (!needCatalogPurchase) return ''
		const mat = (
			selectedCatalogMaterial?.code ||
			catalogMaterialCode ||
			''
		).trim()
		if (!mat) return ''
		return buildCatalogRoomAssetCode(mat, grade, roomUnitAlias)
	}, [
		needCatalogPurchase,
		selectedCatalogMaterial?.code,
		catalogMaterialCode,
		grade,
		roomUnitAlias
	])

	/**
	 * Nếu phòng đã có đúng mã (cùng VT+cấp+đơn vị) → tăng trên dòng đó,
	 * không tạo bản ghi mới.
	 */
	const existingPurchaseAsset = useMemo(() => {
		if (!needCatalogPurchase || !purchaseCatalogCode) return undefined
		const want = purchaseCatalogCode.toUpperCase()
		return roomAssets.find((a) => (a.code || '').toUpperCase() === want)
	}, [needCatalogPurchase, purchaseCatalogCode, roomAssets])

	/** Mã VT gợi ý cho vật tư mới (loại Khác + Tăng) */
	const suggestedNewCode = useMemo(() => {
		if (!isNewOtherAsset || !selectedRoom) return ''

		// Mua sắm: HC2A0113-G{cấp}-{đơn vị} — đồng bộ mã trong đơn vị
		if (needCatalogPurchase) {
			return purchaseCatalogCode
		}

		const existing = new Set(
			roomAssets.map((a) => (a.code || '').toUpperCase())
		)
		const loc = buildLocationCode(
			selectedBuilding?.code,
			selectedFloor?.floorNumber,
			selectedRoom.roomCode
		)
		if (!loc) return ''
		// viết tắt từ tên: lấy chữ cái đầu mỗi từ, hoặc 3–6 ký tự
		const raw = assetName.trim()
		let suffix = ''
		if (raw) {
			const words = raw.split(/\s+/).filter(Boolean)
			if (words.length >= 2) {
				suffix = words
					.map((w) => w[0])
					.join('')
					.slice(0, 6)
			} else {
				suffix = raw.replace(/[^a-zA-Z0-9À-ỹ]/g, '').slice(0, 6)
			}
			suffix = suffix.toUpperCase() || 'MOI'
		} else {
			suffix = 'MOI'
		}
		let code = buildAssetCode(
			selectedBuilding?.code,
			selectedFloor?.floorNumber,
			selectedRoom.roomCode,
			suffix
		)
		// tránh trùng mã trong phòng
		if (existing.has(code.toUpperCase())) {
			code = `${code}-${Date.now().toString(36).slice(-3).toUpperCase()}`
		}
		return code
	}, [
		isNewOtherAsset,
		needCatalogPurchase,
		purchaseCatalogCode,
		selectedBuilding?.code,
		selectedFloor?.floorNumber,
		selectedRoom?.roomCode,
		assetName,
		roomAssets
	])

	/** Khi giảm: chỉ xét VT còn SL > 0 (SL = 0 không cho giảm tiếp) */
	const assetsSelectable = useMemo(() => {
		if (mode === 'increase-decrease' && dir === 'DECREASE') {
			return roomAssets.filter((a) => (Number(a.quantity) || 0) > 0)
		}
		return roomAssets
	}, [roomAssets, mode, dir])

	/** Tên thiết bị theo loại đã chọn (có thể nhiều bản ghi cùng tên, khác mã) */
	const namesInCategory = useMemo(() => {
		if (!category) return [] as string[]
		const set = new Set<string>()
		for (const a of assetsSelectable) {
			if (a.category === category && a.name?.trim())
				set.add(a.name.trim())
		}
		return [...set].sort((a, b) => a.localeCompare(b, 'vi'))
	}, [assetsSelectable, category])

	/** Các bản ghi khớp loại + tên (để chọn đúng mã nếu trùng tên) */
	const assetsByCatName = useMemo(() => {
		if (!category || !assetName) return [] as RoomAsset[]
		return assetsSelectable.filter(
			(a) => a.category === category && a.name === assetName
		)
	}, [assetsSelectable, category, assetName])

	const selectedAsset: RoomAsset | undefined = useMemo(
		() => roomAssets.find((a) => a.id === Number(assetId)),
		[roomAssets, assetId]
	)

	/**
	 * Địa chỉ lắp đặt:
	 * - VT đã có: lấy đúng installAddress trên bản ghi VT (không ghép tòa/tầng/phòng form —
	 *   form chỉ để tìm VT; địa chỉ thật có thể khác vị trí đang chọn).
	 * - VT mới (loại Khác) / chưa có địa chỉ: suy từ tòa–tầng–phòng đang chọn.
	 */
	const installAddress = useMemo(() => {
		const fromAsset = String(selectedAsset?.installAddress ?? '').trim()
		if (fromAsset) return fromAsset
		if (!selectedBuilding || !selectedFloor || !selectedRoom) return ''
		return resolveInstallAddress({
			buildingName: selectedBuilding.name,
			buildingCode: selectedBuilding.code,
			floorName: selectedFloor.name,
			roomName: selectedRoom.roomName,
			roomCode: selectedRoom.roomCode
		})
	}, [selectedAsset, selectedBuilding, selectedFloor, selectedRoom])

	function clearCatalogPick() {
		setCatalogNganhCode('')
		setCatalogCnCode('')
		setCatalogMaterialCode('')
	}

	// Khi chọn loại → reset tên + asset
	function onCategoryChange(v: string) {
		setCategory(v)
		setAssetName('')
		setAssetId('')
		clearCatalogPick()
		// Loại Khác: không dùng tăng phân cấp
		if (v === CATEGORY_OTHER && reasonCode === 'GRADE_UP') {
			setReasonCode('')
		}
	}

	function onCatalogNganhChange(code: string) {
		setCatalogNganhCode(code)
		setCatalogCnCode('')
		setCatalogMaterialCode('')
		setAssetName('')
		setAssetId('')
	}

	function onCatalogCnChange(code: string) {
		setCatalogCnCode(code)
		setCatalogMaterialCode('')
		setAssetName('')
		setAssetId('')
	}

	function onCatalogMaterialChange(code: string) {
		setCatalogMaterialCode(code)
		const mat = catalogMaterials.find(
			(m) => m.code.toUpperCase() === code.trim().toUpperCase()
		)
		setAssetName(mat?.name?.trim() || '')
		setAssetId('')
	}

	/** Chọn đúng kho: tăng cấp → ưu tiên cấp 5; còn lại → ưu tiên ổn định 1–4 */
	function pickAssetId(matches: RoomAsset[], preferBroken: boolean): string {
		if (!matches.length) return ''
		if (matches.length === 1) return String(matches[0].id)
		if (preferBroken) {
			const broken = matches.find((a) => Number(a.grade ?? 1) >= 5)
			if (broken) return String(broken.id)
		}
		const stable = matches.find((a) => Number(a.grade ?? 1) <= 4)
		return String((stable ?? matches[0]).id)
	}

	// Khi chọn tên (loại có sẵn / Khác khi Giảm) → gắn assetId (đúng kho theo lý do)
	function onNameChange(v: string) {
		setAssetName(v)
		// Chỉ VT mới (Khác + Tăng) mới bỏ assetId; còn lại luôn gắn bản ghi có sẵn
		if (isNewOtherAsset) {
			setAssetId('')
			return
		}
		const pool =
			mode === 'increase-decrease' && dir === 'DECREASE'
				? roomAssets.filter((a) => (Number(a.quantity) || 0) > 0)
				: roomAssets
		const matches = pool.filter(
			(a) => a.category === category && a.name === v
		)
		// Tăng cấp → chọn bản cấp 5; mặc định → bản ổn định 1–4
		setAssetId(pickAssetId(matches, reasonCode === 'GRADE_UP'))
	}

	// Đổi lý do tăng cấp → chuyển sang bản ghi hư hỏng cùng tên (nếu có)
	useEffect(() => {
		// VT mới (Khác + Tăng) không chọn kho theo tên
		if (!assetName || !category || isNewOtherAsset) return
		const matches = roomAssets.filter(
			(a) => a.category === category && a.name === assetName
		)
		if (matches.length < 2) return
		const nextId = pickAssetId(matches, reasonCode === 'GRADE_UP')
		if (nextId && nextId !== assetId) setAssetId(nextId)
	}, [reasonCode])

	// Rời chế độ VT mới (Khác+Tăng → Giảm/điều chỉnh): gắn lại assetId nếu tên khớp VT có sẵn
	useEffect(() => {
		if (isNewOtherAsset || !category || !assetName) return
		if (assetId) return
		const pool =
			mode === 'increase-decrease' && dir === 'DECREASE'
				? roomAssets.filter((a) => (Number(a.quantity) || 0) > 0)
				: roomAssets
		const matches = pool.filter(
			(a) => a.category === category && a.name === assetName
		)
		const nextId = pickAssetId(matches, reasonCode === 'GRADE_UP')
		if (nextId) setAssetId(nextId)
	}, [isNewOtherAsset, mode, dir, category, assetName])

	useEffect(() => {
		if (!selectedAsset) return
		setCategory(selectedAsset.category)
		setAssetName(selectedAsset.name)
		setGrade(String(selectedAsset.grade ?? 1))
		setManufactureYear(
			selectedAsset.manufactureYear != null
				? String(selectedAsset.manufactureYear)
				: String(MIN_ASSET_YEAR)
		)
		setUsageYear(
			selectedAsset.usageYear != null
				? String(selectedAsset.usageYear)
				: String(MIN_ASSET_YEAR)
		)
		setQuantity(mode === 'adjust' ? selectedAsset.quantity : 1)
	}, [selectedAsset?.id, mode])

	useEffect(() => {
		if (reasonCode === 'GRADE_UP') {
			if (isOtherCategory) {
				setReasonCode('')
				return
			}
			const g = Number(grade)
			if (g < 1 || g > 4) setGrade('1')
			if (selectedAsset && (selectedAsset.grade ?? 1) >= 5) {
				setQuantity((q) => (q > 0 ? q : 1))
			}
		}
	}, [reasonCode, selectedAsset, isOtherCategory])

	/** Ghi chú tự động: lý do hư (từ VT) + đã/chưa hoàn thành SC */
	useEffect(() => {
		if (reasonCode === 'GRADE_UP' && selectedAsset) {
			const check = validateGradeUp({
				currentGrade: selectedAsset.grade ?? 1,
				newGrade: Number(grade) || 1,
				status: selectedAsset.status,
				repairCompletedAt: selectedAsset.repairCompletedAt
			})
			const raw = String(selectedAsset.description ?? '').trim()
			const damage =
				raw &&
				!/^Import\s+từ/i.test(raw) &&
				!raw.toLowerCase().includes('import từ')
					? raw.split('|')[0]?.trim()
					: ''
			const status = check.ok
				? 'Hiện tại đã hoàn thành sửa chữa'
				: 'Chưa hoàn thành sửa chữa'
			setNote(damage ? `Lý do hư: ${damage}. ${status}` : status)
			return
		}
	}, [reasonCode, selectedAsset, grade, reasonOther])

	const reasons =
		dir === 'INCREASE'
			? isOtherCategory
				? INCREASE_REASONS_ALL.filter((r) => r.value !== 'GRADE_UP')
				: INCREASE_REASONS_ALL
			: DECREASE_REASONS
	const isIncDec = mode === 'increase-decrease'
	const isGrade5 = (selectedAsset?.grade ?? 1) >= 5

	const gradeUpCheck =
		reasonCode === 'GRADE_UP' && selectedAsset
			? validateGradeUp({
					currentGrade: selectedAsset.grade ?? 1,
					newGrade: Number(grade),
					status: selectedAsset.status,
					repairCompletedAt: selectedAsset.repairCompletedAt
				})
			: null
	const gradeUpBlocked = !!gradeUpCheck && !gradeUpCheck.ok

	/** Xóa form (giữ tòa/tầng/phòng) để nhập cập nhật tiếp */
	function resetFormKeepLocation() {
		setDir('INCREASE')
		setExecutedAt(today())
		setExecutingUnit('')
		setReasonCode('')
		setReasonOther('')
		setDecisionDate('')
		setDecisionNumber('')
		setSigner('')
		setPerformer('')
		setExplanation('')
		setNote('')
		setCategory('')
		setAssetName('')
		setAssetId('')
		clearCatalogPick()
		setQuantity(1)
		setGrade('1')
		setManufactureYear(String(MIN_ASSET_YEAR))
		setUsageYear(String(MIN_ASSET_YEAR))
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!category) {
			toast.error('Chọn loại')
			return
		}
		if (!roomIdNum) {
			toast.error('Chọn phòng')
			return
		}
		if (isOtherCategory && isIncDec && reasonCode === 'GRADE_UP') {
			toast.error('Loại Khác không dùng tăng phân cấp')
			return
		}
		// Khác + Mua sắm: bắt buộc ngành → chuyên ngành → thiết bị danh mục
		if (needCatalogPurchase) {
			if (!catalogNganhCode) {
				toast.error('Chọn ngành (danh mục)')
				return
			}
			if (!catalogCnCode) {
				toast.error('Chọn loại vật')
				return
			}
			if (!catalogMaterialCode || !selectedCatalogMaterial) {
				toast.error('Chọn tên thiết bị trong danh mục')
				return
			}
		}
		if (!assetName.trim()) {
			toast.error(
				needCatalogPurchase
					? 'Chọn tên thiết bị trong danh mục'
					: 'Nhập / chọn tên thiết bị'
			)
			return
		}
		if (!executedAt) {
			toast.error('Ngày thực hiện là bắt buộc')
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
		const qty = Math.floor(Number(quantity) || 0)
		if (qty < 0 || !Number.isFinite(qty)) {
			toast.error('Số lượng không được âm')
			return
		}

		// Mua sắm + danh mục: nếu đã có đúng mã trong phòng → tăng dòng cũ
		const purchaseExisting = needCatalogPurchase
			? existingPurchaseAsset
			: undefined
		// VT mới: Khác+Tăng và chưa có dòng trùng mã danh mục
		const isNewAsset =
			(isNewOtherAsset || !selectedAsset) && !purchaseExisting
		const targetExisting = purchaseExisting || selectedAsset
		const currentStock = Number(targetExisting?.quantity) || 0

		// Cấp 5: chỉ chặn TĂNG thường (phải dùng Tăng phân cấp); GIẢM vẫn được (kể cả về 0)
		if (!isNewAsset && selectedAsset) {
			const g = Number(selectedAsset.grade ?? 1)
			if (
				g >= 5 &&
				isIncDec &&
				dir === 'INCREASE' &&
				reasonCode !== 'GRADE_UP'
			) {
				toast.error(
					'Vật tư cấp 5 (hỏng): muốn đưa về dùng được hãy chọn lý do «Tăng phân cấp». Giảm SL vẫn được.'
				)
				return
			}
		}

		if (isIncDec) {
			if (dir === 'DECREASE') {
				if (isNewAsset) {
					toast.error('Vật tư mới chỉ dùng thao tác Tăng')
					return
				}
				if (currentStock <= 0) {
					toast.error(
						'Vật tư này số lượng đang không có — vui lòng thử lại với thiết bị khác'
					)
					return
				}
				if (qty < 1) {
					toast.error('Số lượng giảm phải ≥ 1')
					return
				}
				if (qty > currentStock) {
					toast.error(
						`Không đủ số lượng để giảm. Hiện có ${currentStock} ${selectedAsset?.unit || 'cái'} — không giảm ${qty}.`
					)
					return
				}
			} else if (dir === 'INCREASE' && qty < 1) {
				toast.error('Số lượng tăng phải ≥ 1')
				return
			}
			if (!reasonCode) {
				toast.error('Chọn lý do tăng/giảm')
				return
			}
			if (reasonCode === 'OTHER' && !reasonOther.trim()) {
				toast.error('Nhập lý do khác')
				return
			}
			if (reasonCode === 'GRADE_UP' && selectedAsset) {
				const check = validateGradeUp({
					currentGrade: selectedAsset.grade ?? 1,
					newGrade: Number(grade),
					status: selectedAsset.status,
					repairCompletedAt: selectedAsset.repairCompletedAt
				})
				if (!check.ok) {
					toast.error(
						'Chưa hoàn thành sửa chữa — không được tăng phân cấp'
					)
					return
				}
				// Tăng phân cấp không được cộng tồn: cấp 5 = chuyển SL; cấp 1–4 = chỉ đổi cấp
				const curG = Number(selectedAsset.grade ?? 1)
				if (curG >= 5) {
					if (qty < 1) {
						toast.error('Nhập số lượng chuyển từ kho hỏng (≥ 1)')
						return
					}
					if (qty > currentStock) {
						toast.error(
							`Kho hỏng chỉ có ${currentStock} — không chuyển ${qty}`
						)
						return
					}
				}
			}
		} else if (!explanation.trim()) {
			toast.error('Nhập diễn giải lý do cụ thể')
			return
		} else {
			// Điều chỉnh: SL mới ≥ 0 (không cho âm)
			if (qty < 0) {
				toast.error('Số lượng mới không được âm')
				return
			}
		}

		const movementType: AssetMovementType = isIncDec ? dir : 'ADJUST'
		// Ghi chú: tăng cấp = lý do hư + đã SC xong; thanh lý = ghi chú người dùng
		let noteOut = note.trim() || undefined
		if (reasonCode === 'GRADE_UP') {
			const raw = String(selectedAsset?.description ?? '').trim()
			const damage =
				raw && !/^Import\s+từ/i.test(raw)
					? raw.split('|')[0]?.trim()
					: ''
			const status = 'Hiện tại đã hoàn thành sửa chữa'
			// Ưu tiên ghi chú form (đã auto-fill); nếu trống thì ghép lại
			if (noteOut && /hoàn thành sửa chữa/i.test(noteOut)) {
				// giữ noteOut
			} else if (damage) {
				noteOut = `Lý do hư: ${damage}. ${status}`
			} else {
				noteOut = status
			}
		} else if (reasonCode === 'LIQUIDATION') {
			noteOut = noteOut || 'Thanh lý'
		}
		// GRADE_UP: server không cộng tồn — cấp 5 gửi SL chuyển; cấp 1–4 gửi 0
		const isGradeUpReason = isIncDec && reasonCode === 'GRADE_UP'
		const gradeUpFromBroken =
			isGradeUpReason &&
			selectedAsset &&
			(Number(selectedAsset.grade ?? 1) >= 5 ||
				String(selectedAsset.status || '').toUpperCase() === 'BROKEN')
		const qtyToSend = isGradeUpReason ? (gradeUpFromBroken ? qty : 0) : qty

		const picked = (executedAt || '').trim()
		const nowLocal = nowVNDateTimeLocal()
		const isDefaultOrNow =
			!picked ||
			picked.slice(0, 16) === nowLocal.slice(0, 16) ||
			picked.replace(' ', 'T').slice(0, 16) === nowLocal.slice(0, 16)
		const executedAtStored = isDefaultOrNow
			? nowVNStoredDateTime()
			: toStoredDateTime(picked)

		const body: CreateAssetMovementBody = {
			movementType: isGradeUpReason ? 'INCREASE' : movementType,
			executedAt: executedAtStored,
			executingUnit: executingUnit || undefined,
			installAddress: installAddress || undefined,
			assetName: assetName.trim() || undefined,
			quantity: qtyToSend,
			grade: Number(grade),
			manufactureYear: manufactureYear
				? Number(manufactureYear)
				: undefined,
			usageYear: usageYear ? Number(usageYear) : undefined,
			note: noteOut
		}
		if (isIncDec) {
			body.reasonCode = reasonCode
			body.reasonOther =
				reasonCode === 'OTHER' ? reasonOther.trim() : undefined
			body.decisionDate = decisionDate || undefined
			body.decisionNumber = decisionNumber || undefined
			body.signer = signer || undefined
			body.performer = performer || undefined
		} else {
			body.explanation = explanation
		}

		setPending(true)
		try {
			let targetId = targetExisting?.id

			if (isNewAsset) {
				if (needCatalogPurchase && !purchaseCatalogCode) {
					toast.error(
						'Chưa suy ra mã VT (cần thiết bị danh mục + đơn vị phòng)'
					)
					setPending(false)
					return
				}
				if (needCatalogPurchase && !roomUnitAlias) {
					toast.error(
						'Không xác định được đơn vị của phòng — kiểm tra mã VT / room code (vd. …-D1)'
					)
					setPending(false)
					return
				}
				const code =
					(needCatalogPurchase
						? purchaseCatalogCode
						: suggestedNewCode) || `VT-${Date.now()}`
				// Sau mua sắm: loại = tên chuyên ngành (không còn «Khác»)
				const finalCategory = needCatalogPurchase
					? (selectedCatalogCn?.name || '').trim() ||
						category ||
						CATEGORY_OTHER
					: category || CATEGORY_OTHER
				const created = await CreateRoomAsset({
					roomId: roomIdNum,
					code,
					name: assetName.trim(),
					category: finalCategory,
					quantity: 0,
					unit: selectedCatalogMaterial?.unit || undefined,
					holdingUnitId: roomHoldingUnitId,
					grade: Number(grade) || 1,
					installAddress: installAddress || undefined,
					manufactureYear: manufactureYear
						? Number(manufactureYear)
						: undefined,
					usageYear: usageYear ? Number(usageYear) : undefined,
					status: 'NORMAL'
				})
				targetId = created.id
				setAssetId(String(created.id))
			}

			if (!targetId) {
				toast.error('Không xác định được vật tư')
				return
			}

			await CreateAssetMovement(targetId, body)
			await qc.invalidateQueries({ queryKey: ['room-assets'] })
			await qc.invalidateQueries({ queryKey: ['room-profile'] })
			await qc.invalidateQueries({
				queryKey: ['asset-reports', 'movements']
			})
			await assetsQ.refetch()
			const stockAfter =
				isIncDec && dir === 'DECREASE' && targetExisting
					? Math.max(0, currentStock - qty)
					: null
			toast.success(
				isNewAsset
					? needCatalogPurchase
						? `Đã thêm VT ${purchaseCatalogCode} (loại: ${selectedCatalogCn?.name || 'loại vật'})`
						: 'Đã thêm vật tư mới và cập nhật kho'
					: stockAfter === 0
						? 'Đã giảm về 0. Form đã xóa — chọn thiết bị khác để cập nhật tiếp.'
						: purchaseExisting
							? `Đã tăng SL trên mã ${purchaseCatalogCode}`
							: 'Đã lưu cập nhật. Form đã xóa — có thể điền cập nhật tiếp.'
			)
			// Sau mỗi lần cập nhật thành công: xóa form (giữ tòa/tầng/phòng)
			resetFormKeepLocation()
		} catch (err) {
			toast.error('Lưu thất bại', {
				description: (err as Error).message
			})
		} finally {
			setPending(false)
		}
	}

	const stockIsZero =
		!!selectedAsset && (Number(selectedAsset.quantity) || 0) <= 0
	const decreaseBlocked = isIncDec && dir === 'DECREASE' && stockIsZero

	// Chỉ chặn full page khi admin (cần cây tòa). User ngành tự load tree trong batch form.
	if (treeError && !nganhUser) {
		return <ErrorState error={treeError} onRetry={() => refetchTree()} />
	}

	// UX phóng to: chữ lớn, ô cao, khoảng cách rộng
	const selTrig = 'h-12 text-lg w-full min-w-0 px-3'
	const inp = 'h-12 text-lg w-full min-w-0 px-3'

	return (
		<div className='h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col p-4 md:p-6 gap-4 max-w-[1600px] mx-auto w-full'>
			{/* Header */}
			<div className='flex flex-wrap items-center gap-3 shrink-0'>
				{!nganhUser && (
					<>
						<Button
							variant='ghost'
							size='default'
							className='h-11 text-base'
							asChild
						>
							<Link to='/vat-tu'>
								<ArrowLeft className='w-5 h-5 mr-1.5' />
								Danh mục
							</Link>
						</Button>
						<Button
							variant='outline'
							size='default'
							className='h-11 text-base'
							asChild
						>
							<Link to='/vat-tu/bao-cao'>
								<ClipboardList className='w-5 h-5 mr-1.5' />
								Báo cáo
							</Link>
						</Button>
					</>
				)}
				<div className='flex items-center gap-2 min-w-0'>
					<PackagePlus className='w-7 h-7 shrink-0' />
					<h1 className='text-2xl font-bold truncate'>
						Cập nhật vật tư
					</h1>
				</div>
			</div>

			{/* User ngành: chỉ form nhiều dòng, không tab Nhập từng VT / Import */}
			{nganhUser ? (
				<div className='flex-1 min-h-0 overflow-hidden flex flex-col'>
					<AssetUpdateBatchForm />
				</div>
			) : (
				<Tabs
					defaultValue='batch'
					className='flex-1 min-h-0 flex flex-col gap-3'
				>
					<TabsList className='h-12 shrink-0 self-start'>
						<TabsTrigger
							value='batch'
							className='text-base px-5 h-10 gap-2 data-[state=active]:shadow-sm'
						>
							<PackagePlus className='w-4 h-4' />
							Form ngành (nhiều dòng)
						</TabsTrigger>
						<TabsTrigger
							value='single'
							className='text-base px-5 h-10 gap-2 data-[state=active]:shadow-sm'
						>
							<PenLine className='w-4 h-4' />
							Nhập từng VT
						</TabsTrigger>
						<TabsTrigger
							value='import'
							className='text-base px-5 h-10 gap-2 data-[state=active]:shadow-sm'
						>
							<FileUp className='w-4 h-4' />
							Import VT
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value='batch'
						className='flex-1 min-h-0 overflow-hidden mt-0 flex flex-col data-[state=inactive]:hidden focus-visible:outline-none'
					>
						<AssetUpdateBatchForm />
					</TabsContent>

					<TabsContent
						value='import'
						className='flex-1 min-h-0 overflow-y-auto overscroll-contain mt-0 data-[state=inactive]:hidden focus-visible:outline-none'
					>
						{/* pb để cuộn hết danh sách xem xét; không h-full con */}
						<div className='min-h-0 pb-6'>
							<CatalogImportPanel />
						</div>
					</TabsContent>

					<TabsContent
						value='single'
						className='flex-1 min-h-0 overflow-hidden mt-0 flex flex-col data-[state=inactive]:hidden'
					>
						{/* Mode tăng/giảm — chỉ tab nhập từng VT */}
						<div className='flex gap-2 shrink-0 mb-2'>
							<button
								type='button'
								onClick={() => {
									setMode('increase-decrease')
									if (selectedAsset) setQuantity(1)
								}}
								className={cn(
									'h-11 px-5 rounded-md text-base font-semibold border',
									mode === 'increase-decrease'
										? 'bg-primary text-primary-foreground border-primary'
										: 'bg-background hover:bg-muted'
								)}
							>
								Tăng / giảm
							</button>
							<button
								type='button'
								onClick={() => {
									setMode('adjust')
									if (selectedAsset)
										setQuantity(selectedAsset.quantity)
								}}
								className={cn(
									'h-11 px-5 rounded-md text-base font-semibold border',
									mode === 'adjust'
										? 'bg-primary text-primary-foreground border-primary'
										: 'bg-background hover:bg-muted'
								)}
							>
								Điều chỉnh
							</button>
						</div>

						<form
							onSubmit={handleSubmit}
							className='flex-1 min-h-0 overflow-hidden flex flex-col gap-4'
						>
							<Card className='flex-1 min-h-0 overflow-hidden shadow-sm'>
								<CardContent className='p-5 md:p-6 h-full overflow-y-auto flex flex-col gap-5'>
									{/* Hàng 1: vị trí — tách rõ tòa / tầng / phòng (có gõ tìm) */}
									<div className='grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4 shrink-0'>
										<Cell label='Tòa nhà' required>
											<SearchableSelect
												value={buildingId}
												onValueChange={(v) => {
													setBuildingId(v)
													setFloorId('')
													setRoomId('')
													setCategory('')
													setAssetName('')
													setAssetId('')
												}}
												disabled={treeLoading}
												className={selTrig}
												placeholder='Chọn tòa nhà…'
												searchPlaceholder='Gõ tên/mã tòa…'
												emptyText='Không có tòa khớp'
												options={tree.map((b) => ({
													value: String(b.id),
													label: b.name,
													keywords: [b.name, b.code]
														.filter(Boolean)
														.join(' ')
												}))}
											/>
										</Cell>
										<Cell label='Tầng' required>
											<SearchableSelect
												value={floorId}
												onValueChange={(v) => {
													setFloorId(v)
													setRoomId('')
													setCategory('')
													setAssetName('')
													setAssetId('')
												}}
												disabled={!buildingId}
												className={selTrig}
												placeholder='Chọn tầng…'
												searchPlaceholder='Gõ tên tầng…'
												emptyText='Không có tầng khớp'
												options={floors.map((f) => ({
													value: String(f.id),
													label: f.name,
													keywords: [f.name, f.code]
														.filter(Boolean)
														.join(' ')
												}))}
											/>
										</Cell>
										<Cell label='Phòng' required>
											<SearchableSelect
												value={roomId}
												onValueChange={(v) => {
													setRoomId(v)
													setCategory('')
													setAssetName('')
													setAssetId('')
												}}
												disabled={!floorId}
												className={selTrig}
												placeholder='Chọn phòng…'
												searchPlaceholder='Gõ tên/mã phòng (vd: Chính)…'
												emptyText='Không có phòng khớp'
												options={rooms.map((r) => ({
													value: String(r.id),
													label: r.roomName,
													keywords: [
														r.roomName,
														r.roomCode
													]
														.filter(Boolean)
														.join(' ')
												}))}
											/>
										</Cell>
									</div>

									{/* Hàng 2: mã + loại + tên (có gõ tìm) */}
									<div className='grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4 shrink-0'>
										<Cell label='Mã VT'>
											{isNewOtherAsset ? (
												<Input
													className={`${inp} font-mono bg-muted`}
													value={
														needCatalogPurchase
															? catalogMaterialCode
																? purchaseCatalogCode ||
																	suggestedNewCode
																: ''
															: assetName.trim()
																? suggestedNewCode
																: ''
													}
													readOnly
													placeholder={
														needCatalogPurchase
															? roomUnitAlias
																? 'HC2…-G{cấp}-{đơn vị}'
																: 'Chọn thiết bị + cần đơn vị phòng'
															: ''
													}
													title={
														needCatalogPurchase
															? existingPurchaseAsset
																? `Đã có mã trong phòng — sẽ tăng SL trên ${purchaseCatalogCode}`
																: `Mã đồng bộ danh mục + cấp + đơn vị ${roomUnitAlias || '?'}`
															: 'Mã tự tạo cho vật tư mới khi chọn loại Khác + Tăng'
													}
												/>
											) : assetsByCatName.length > 1 ? (
												// Cùng tên có cả kho ổn định + hư hỏng → bắt buộc chọn đúng mã/kho
												<SearchableSelect
													value={assetId}
													onValueChange={setAssetId}
													disabled={!assetName}
													className={`${selTrig} font-mono`}
													placeholder='Chọn mã / kho…'
													searchPlaceholder='Gõ mã VT, cấp, kho…'
													emptyText='Không có mã khớp'
													options={assetsByCatName.map(
														(a) => ({
															value: String(a.id),
															label: `${a.code || `#${a.id}`} · ${
																Number(
																	a.grade ?? 1
																) >= 5
																	? 'hư hỏng'
																	: 'ổn định'
															} · cấp ${a.grade ?? 1} · SL ${a.quantity}`,
															keywords: [
																a.code,
																a.name,
																String(a.grade),
																Number(
																	a.grade ?? 1
																) >= 5
																	? 'hu hong broken'
																	: 'on dinh stable'
															]
																.filter(Boolean)
																.join(' ')
														})
													)}
												/>
											) : (
												<Input
													className={`${inp} font-mono bg-muted`}
													value={
														selectedAsset?.code ??
														''
													}
													readOnly
													placeholder=''
												/>
											)}
										</Cell>
										<Cell label='Loại' required>
											<SearchableSelect
												value={category}
												onValueChange={onCategoryChange}
												disabled={
													!roomId || assetsQ.isLoading
												}
												className={selTrig}
												placeholder={
													!roomId
														? 'Chọn phòng trước'
														: 'Chọn loại (IT, Khác, …)'
												}
												searchPlaceholder='Gõ loại vật tư…'
												emptyText='Không có loại khớp'
												options={(mode ===
													'increase-decrease' &&
												dir === 'DECREASE'
													? categories.filter((c) =>
															assetsSelectable.some(
																(a) =>
																	a.category ===
																	c
															)
														)
													: categories
												).map((c) => ({
													value: c,
													label: c,
													keywords: c
												}))}
											/>
										</Cell>
										{!needCatalogPurchase ? (
											<Cell label='Tên thiết bị' required>
												{isNewOtherAsset ? (
													// Tăng + Khác (không phải Mua sắm): nhập tên VT mới
													<Input
														className={inp}
														value={assetName}
														onChange={(e) => {
															setAssetName(
																e.target.value
															)
															setAssetId('')
														}}
														disabled={!category}
														placeholder='Nhập tên thiết bị mới'
														required
													/>
												) : !category ? (
													<Input
														className={`${inp} bg-muted text-muted-foreground`}
														value=''
														readOnly
														disabled
														placeholder='Chọn loại trước'
													/>
												) : namesInCategory.length ===
												  0 ? (
													// Không có VT (vd. Khác khi Giảm mà phòng không có / SL = 0)
													<Input
														className={`${inp} bg-muted text-muted-foreground`}
														value='Không có thiết bị'
														readOnly
														disabled
														title={
															isOtherCategory
																? 'Phòng này không có vật tư loại Khác (hoặc SL = 0) để chọn'
																: 'Không có thiết bị thuộc loại này để chọn'
														}
													/>
												) : (
													// Có thiết bị → cho chọn
													<SearchableSelect
														value={assetName}
														onValueChange={
															onNameChange
														}
														className={selTrig}
														placeholder={
															isOtherCategory
																? 'Chọn thiết bị loại Khác…'
																: 'Chọn tên thiết bị…'
														}
														searchPlaceholder='Gõ tên thiết bị…'
														emptyText='Không có thiết bị khớp'
														options={namesInCategory.map(
															(n) => ({
																value: n,
																label: n,
																keywords: n
															})
														)}
													/>
												)}
											</Cell>
										) : (
											<Cell label='Tên thiết bị'>
												<Input
													className={`${inp} bg-muted text-muted-foreground`}
													value={
														selectedCatalogMaterial
															? selectedCatalogMaterial.name
															: ''
													}
													readOnly
													placeholder='Chọn danh mục sau «Tăng / giảm»'
												/>
											</Cell>
										)}
									</div>

									{reasonCode === 'GRADE_UP' &&
										selectedAsset && (
											<p
												className={`text-xs flex items-center gap-1 shrink-0 ${
													gradeUpBlocked
														? 'text-destructive'
														: 'text-emerald-700'
												}`}
											>
												<AlertTriangle className='w-3.5 h-3.5' />
												{gradeUpBlocked
													? 'Chưa hoàn thành sửa chữa — không được tăng phân cấp'
													: 'Đã hoàn thành sửa chữa — được tăng phân cấp'}
											</p>
										)}

									{/* Hàng 3: thực hiện + SL + cấp */}
									<div className='grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-x-5 gap-y-4 shrink-0'>
										<Cell label='Ngày giờ TH' required>
											<Input
												type='datetime-local'
												className={inp}
												value={
													executedAt.includes('T')
														? executedAt.slice(
																0,
																16
															)
														: executedAt.length >=
															  16
															? executedAt
																	.replace(
																		' ',
																		'T'
																	)
																	.slice(
																		0,
																		16
																	)
															: executedAt
												}
												onChange={(e) =>
													setExecutedAt(
														e.target.value
													)
												}
												required
											/>
										</Cell>
										<Cell label='Đơn vị TH'>
											<Input
												className={inp}
												value={executingUnit}
												onChange={(e) =>
													setExecutingUnit(
														e.target.value
													)
												}
											/>
										</Cell>
										<Cell
											label='Địa chỉ lắp đặt'
											className='md:col-span-2 xl:col-span-3'
										>
											<Input
												className={`${inp} bg-muted`}
												value={installAddress}
												readOnly
												placeholder={
													selectedAsset
														? 'Chưa có địa chỉ trên vật tư'
														: 'Chọn thiết bị — lấy địa chỉ từ VT'
												}
												title={
													selectedAsset?.installAddress?.trim()
														? 'Địa chỉ lưu trên vật tư (không ghép từ tòa/tầng/phòng form)'
														: installAddress
															? 'Gợi ý theo tòa/tầng/phòng (VT mới / chưa lưu địa chỉ)'
															: undefined
												}
											/>
										</Cell>
										<Cell
											label={
												reasonCode === 'GRADE_UP'
													? isGrade5
														? 'SL chuyển (hỏng → ổn định)'
														: 'SL (không đổi khi tăng cấp)'
													: isIncDec
														? dir === 'DECREASE'
															? 'Số lượng giảm'
															: 'Số lượng tăng'
														: 'SL mới'
											}
											required={
												reasonCode !== 'GRADE_UP' ||
												isGrade5
											}
										>
											<Input
												type='number'
												min={0}
												max={
													isIncDec &&
													dir === 'DECREASE' &&
													selectedAsset
														? selectedAsset.quantity
														: reasonCode ===
																	'GRADE_UP' &&
															  isGrade5 &&
															  selectedAsset
															? selectedAsset.quantity
															: undefined
												}
												className={inp}
												value={
													reasonCode === 'GRADE_UP' &&
													!isGrade5
														? (selectedAsset?.quantity ??
															quantity)
														: quantity
												}
												disabled={
													reasonCode === 'GRADE_UP' &&
													!isGrade5
												}
												onChange={(e) => {
													const raw = Number(
														e.target.value
													)
													if (Number.isNaN(raw)) {
														setQuantity(0)
														return
													}
													const n = Math.floor(raw)
													// Không cho nhập âm
													if (n < 0) {
														setQuantity(0)
														return
													}
													const cap =
														selectedAsset &&
														((isIncDec &&
															dir ===
																'DECREASE') ||
															(reasonCode ===
																'GRADE_UP' &&
																isGrade5))
															? Number(
																	selectedAsset.quantity
																) || 0
															: null
													if (
														cap != null &&
														n > cap
													) {
														setQuantity(cap)
														return
													}
													setQuantity(n)
												}}
												required
											/>
											{selectedAsset && (
												<p className='text-base text-muted-foreground mt-1 leading-snug'>
													{reasonCode ===
														'GRADE_UP' &&
													isGrade5 ? (
														<>
															Kho hỏng:{' '}
															<strong className='text-foreground'>
																{
																	selectedAsset.quantity
																}
															</strong>
															. Chuyển N sang cấp{' '}
															{grade} —{' '}
															<strong>
																tổng tồn không
																tăng
															</strong>{' '}
															(hỏng −N, ổn định
															+N).
														</>
													) : reasonCode ===
													  'GRADE_UP' ? (
														<>
															Đã ở cấp{' '}
															{selectedAsset.grade ??
																1}
															. Tăng phân cấp chỉ{' '}
															<strong>
																đổi số cấp
															</strong>
															, SL giữ{' '}
															<strong>
																{
																	selectedAsset.quantity
																}
															</strong>{' '}
															(không cộng thêm).
														</>
													) : isIncDec &&
													  dir === 'DECREASE' ? (
														<>
															Hiện có:{' '}
															<strong className='text-foreground'>
																{
																	selectedAsset.quantity
																}
															</strong>{' '}
															{selectedAsset.unit ||
																'cái'}
															{quantity > 0 &&
															quantity <=
																(selectedAsset.quantity ??
																	0) ? (
																<>
																	{' '}
																	· Sau giảm
																	còn{' '}
																	<strong className='text-foreground'>
																		{(selectedAsset.quantity ??
																			0) -
																			quantity}
																	</strong>
																</>
															) : null}
															{(selectedAsset.quantity ??
																0) > 0 &&
															quantity ===
																(selectedAsset.quantity ??
																	0)
																? ' — được giảm hết về 0.'
																: ''}
														</>
													) : isIncDec ? (
														<>
															Hiện có:{' '}
															<strong className='text-foreground'>
																{
																	selectedAsset.quantity
																}
															</strong>{' '}
															{selectedAsset.unit ||
																'cái'}
															{dir ===
																'INCREASE' &&
															quantity > 0 ? (
																<>
																	{' '}
																	· Sau tăng:{' '}
																	<strong className='text-foreground'>
																		{(selectedAsset.quantity ??
																			0) +
																			quantity}
																	</strong>
																</>
															) : null}
														</>
													) : (
														<>
															Hiện có:{' '}
															<strong className='text-foreground'>
																{
																	selectedAsset.quantity
																}
															</strong>
															. SL mới ≥ 0.
														</>
													)}
												</p>
											)}
										</Cell>
										<Cell label='Phân cấp'>
											<Select
												value={grade}
												onValueChange={setGrade}
											>
												<SelectTrigger
													className={selTrig}
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{(reasonCode === 'GRADE_UP'
														? GRADE_UP_TARGET_GRADES
														: ASSET_GRADES
													).map((g) => (
														<SelectItem
															key={g.value}
															value={String(
																g.value
															)}
														>
															{g.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Cell>
										<Cell label='Năm SX'>
											<Input
												type='number'
												min={MIN_ASSET_YEAR}
												max={maxAssetYear()}
												className={inp}
												value={manufactureYear}
												onChange={(e) =>
													setManufactureYear(
														clampAssetYearInput(
															e.target.value
														)
													)
												}
											/>
										</Cell>
										<Cell label='Năm SD'>
											<Input
												type='number'
												min={MIN_ASSET_YEAR}
												max={maxAssetYear()}
												className={inp}
												value={usageYear}
												onChange={(e) =>
													setUsageYear(
														clampAssetYearInput(
															e.target.value
														)
													)
												}
											/>
										</Cell>
									</div>

									{/* Cảnh báo to khi SL = 0 và đang chọn Giảm */}
									{decreaseBlocked && (
										<div
											role='alert'
											className='shrink-0 rounded-md border-2 border-destructive bg-destructive/15 px-4 py-3 text-sm font-semibold text-destructive'
										>
											Vật tư này số lượng đang không có —
											vui lòng thử lại với thiết bị khác
											(SL = 0 không được giảm tiếp).
										</div>
									)}

									{/* Hàng 3: lý do / điều chỉnh */}
									{isIncDec ? (
										<div className='grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-x-5 gap-y-4 shrink-0'>
											<Cell label='Tăng / giảm' required>
												<Select
													value={dir}
													onValueChange={(v) => {
														const next = v as
															| 'INCREASE'
															| 'DECREASE'
														setDir(next)
														setReasonCode('')
														setReasonOther('')
														// Khác + Tăng = nhập tay / danh mục; Giảm = chọn VT có sẵn → reset tên/id
														if (
															category ===
															CATEGORY_OTHER
														) {
															setAssetName('')
															setAssetId('')
															clearCatalogPick()
															setQuantity(1)
														}
														// Đổi sang Giảm: kẹp SL ≤ tồn (SL=1→0 vẫn được)
														if (
															next === 'DECREASE'
														) {
															if (
																selectedAsset &&
																category !==
																	CATEGORY_OTHER
															) {
																const cap =
																	Number(
																		selectedAsset.quantity
																	) || 0
																if (cap <= 0) {
																	// Giữ form, hiện banner cảnh báo
																	setQuantity(
																		0
																	)
																	return
																}
																setQuantity(
																	(q) =>
																		Math.min(
																			Math.max(
																				1,
																				q ||
																					1
																			),
																			cap
																		)
																)
															}
														}
													}}
												>
													<SelectTrigger
														className={selTrig}
													>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value='INCREASE'>
															Tăng
														</SelectItem>
														<SelectItem value='DECREASE'>
															Giảm
														</SelectItem>
													</SelectContent>
												</Select>
											</Cell>
											<Cell label='Lý do' required>
												<Select
													value={reasonCode}
													onValueChange={(v) => {
														const prev = reasonCode
														setReasonCode(v)
														// Vào/ra Mua sắm với loại Khác: reset chọn danh mục + tên
														if (
															isOtherCategory &&
															dir ===
																'INCREASE' &&
															(v === 'PURCHASE' ||
																prev ===
																	'PURCHASE')
														) {
															clearCatalogPick()
															setAssetName('')
															setAssetId('')
														}
													}}
												>
													<SelectTrigger
														className={selTrig}
													>
														<SelectValue placeholder='Chọn' />
													</SelectTrigger>
													<SelectContent>
														{reasons.map((r) => (
															<SelectItem
																key={r.value}
																value={r.value}
															>
																{r.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												{reasonCode ===
													'RETURN_SUPERIOR' && (
													<p className='text-sm text-amber-700 dark:text-amber-400 mt-1.5 leading-snug'>
														VT sẽ{' '}
														<strong>
															tự chuyển vào kho
															KHO-VT
														</strong>{' '}
														(không xóa số lượng).
														Xem tại menu «Kho vật
														tư».
													</p>
												)}
											</Cell>
											{reasonCode === 'OTHER' ? (
												<Cell
													label='Lý do khác'
													required
													className='md:col-span-2'
												>
													<Input
														className={inp}
														value={reasonOther}
														onChange={(e) =>
															setReasonOther(
																e.target.value
															)
														}
														required
													/>
												</Cell>
											) : (
												<>
													<Cell label='Ngày QĐ'>
														<Input
															type='date'
															className={inp}
															value={decisionDate}
															onChange={(e) =>
																setDecisionDate(
																	e.target
																		.value
																)
															}
														/>
													</Cell>
													<Cell label='Số QĐ'>
														<Input
															className={inp}
															value={
																decisionNumber
															}
															onChange={(e) =>
																setDecisionNumber(
																	e.target
																		.value
																)
															}
														/>
													</Cell>
												</>
											)}
											<Cell label='Người ký'>
												<Input
													className={inp}
													value={signer}
													onChange={(e) =>
														setSigner(
															e.target.value
														)
													}
												/>
											</Cell>
											<Cell label='Người TH'>
												<Input
													className={inp}
													value={performer}
													onChange={(e) =>
														setPerformer(
															e.target.value
														)
													}
												/>
											</Cell>
											<Cell
												label={
													reasonCode === 'GRADE_UP'
														? 'Ghi chú (sửa chữa)'
														: reasonCode ===
															  'LIQUIDATION'
															? 'Ghi chú thanh lý'
															: 'Ghi chú'
												}
												className='md:col-span-2'
											>
												<Input
													className={inp}
													value={
														reasonCode ===
														'GRADE_UP'
															? gradeUpBlocked
																? 'Chưa hoàn thành sửa chữa'
																: 'Đã hoàn thành sửa chữa'
															: note
													}
													onChange={(e) => {
														if (
															reasonCode ===
															'GRADE_UP'
														)
															return
														setNote(e.target.value)
													}}
													readOnly={
														reasonCode ===
														'GRADE_UP'
													}
													placeholder={
														reasonCode ===
														'GRADE_UP'
															? undefined
															: reasonCode ===
																  'LIQUIDATION'
																? 'VD: Quyết định thanh lý…'
																: 'Ghi chú…'
													}
												/>
											</Cell>
										</div>
									) : (
										<div className='grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-5 gap-y-4 shrink-0'>
											<Cell
												label='Diễn giải lý do'
												required
												className='col-span-2 md:col-span-3 xl:col-span-4'
											>
												<Input
													className={inp}
													value={explanation}
													onChange={(e) =>
														setExplanation(
															e.target.value
														)
													}
													required
													placeholder='Diễn giải điều chỉnh…'
												/>
											</Cell>
											<Cell
												label='Ghi chú'
												className='md:col-span-1 xl:col-span-2'
											>
												<Input
													className={inp}
													value={note}
													onChange={(e) =>
														setNote(e.target.value)
													}
												/>
											</Cell>
										</div>
									)}

									{/* Khác + Mua sắm: ngành → CN → TB — đặt dưới hàng Tăng/giảm */}
									{needCatalogPurchase && (
										<div className='grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4 shrink-0 rounded-lg border-2 border-dashed bg-muted/20 p-4 md:p-5'>
											<Cell label='Ngành' required>
												<SearchableSelect
													value={catalogNganhCode}
													onValueChange={
														onCatalogNganhChange
													}
													className={selTrig}
													placeholder={
														catalogQ.isLoading
															? 'Đang tải danh mục…'
															: 'Chọn ngành…'
													}
													searchPlaceholder='Gõ mã/tên ngành…'
													emptyText='Không có ngành khớp'
													options={catalogNganh.map(
														(n) => ({
															value: n.code,
															label: nganhLabel(
																n
															),
															keywords: `${n.code} ${n.name}`
														})
													)}
												/>
											</Cell>
											<Cell label='Loại vật' required>
												<SearchableSelect
													value={catalogCnCode}
													onValueChange={
														onCatalogCnChange
													}
													disabled={!catalogNganhCode}
													className={selTrig}
													placeholder={
														!catalogNganhCode
															? 'Chọn ngành trước'
															: cnOptions.length ===
																  0
																? 'Ngành chưa có loại vật'
																: 'Chọn loại vật…'
													}
													searchPlaceholder='Gõ mã/tên CN…'
													emptyText='Không có loại vật khớp'
													options={cnOptions.map(
														(c) => ({
															value: c.code,
															label: `${c.code} — ${c.name}`,
															keywords: `${c.code} ${c.name}`
														})
													)}
												/>
											</Cell>
											<Cell
												label='Tên thiết bị (danh mục)'
												required
											>
												<SearchableSelect
													value={catalogMaterialCode}
													onValueChange={
														onCatalogMaterialChange
													}
													disabled={!catalogCnCode}
													className={selTrig}
													placeholder={
														!catalogCnCode
															? 'Chọn loại vật trước'
															: materialOptions.length ===
																  0
																? 'CN chưa có thiết bị danh mục'
																: 'Chọn thiết bị…'
													}
													searchPlaceholder='Gõ mã/tên thiết bị…'
													emptyText='Không có thiết bị khớp'
													options={materialOptions.map(
														(m) => ({
															value: m.code,
															label: `${m.code} — ${m.name}`,
															keywords: `${m.code} ${m.name} ${m.unit}`
														})
													)}
												/>
											</Cell>
											<p className='sm:col-span-3 text-base text-muted-foreground space-y-1'>
												<span className='block'>
													Mua sắm + Khác: ngành → loại
													vật → thiết bị. Sau khi lưu,{' '}
													<strong>loại</strong> = tên
													loại vật (không còn «Khác»).
												</span>
												<span className='block'>
													<strong>Mã VT</strong> ={' '}
													<code className='text-base font-mono'>
														{'{mãTB}'}-G{'{cấp}'}-
														{'{đơn vị}'}
													</code>{' '}
													— vd.{' '}
													<code className='text-base font-mono'>
														HC2A0113-G2-D1
													</code>
													{roomUnitAlias
														? ` · đơn vị phòng: ${roomUnitAlias}`
														: ' · chưa suy ra đơn vị phòng'}
													{existingPurchaseAsset
														? ` · đã có mã này — chỉ tăng SL`
														: ''}
													.
												</span>
												<span className='block text-sm pt-0.5'>
													Phím: <strong>Tab</strong>{' '}
													qua field ·{' '}
													<strong>↑↓←→</strong> trong
													danh sách ·{' '}
													<strong>Enter</strong> chọn
													· <strong>Esc</strong> đóng
												</span>
											</p>
										</div>
									)}

									{/* Actions */}
									<div className='flex flex-wrap justify-end gap-3 shrink-0 mt-auto pt-4 border-t'>
										<p className='text-base text-muted-foreground mr-auto self-center'>
											Ổn định / hư hỏng xem tại{' '}
											<Link
												to='/vat-tu/bao-cao'
												className='underline font-semibold text-foreground'
											>
												Báo cáo vật tư
											</Link>
										</p>
										<Button
											type='button'
											variant='outline'
											size='default'
											className='h-12 px-6 text-lg'
											onClick={resetFormKeepLocation}
										>
											Xóa form
										</Button>
										<Button
											type='submit'
											size='default'
											className='h-12 min-w-[160px] px-6 text-lg font-semibold'
											disabled={
												pending ||
												!category ||
												!assetName.trim() ||
												gradeUpBlocked ||
												decreaseBlocked ||
												// Khác + Mua sắm: đủ ngành / CN / thiết bị + suy ra đơn vị phòng
												(needCatalogPurchase &&
													(!catalogNganhCode ||
														!catalogCnCode ||
														!catalogMaterialCode ||
														!selectedCatalogMaterial ||
														!purchaseCatalogCode ||
														!roomUnitAlias)) ||
												// VT mới (Khác+Tăng) không cần assetId; còn lại phải chọn VT có sẵn
												(!isNewOtherAsset &&
													!selectedAsset) ||
												// Cấp 5: chặn nút khi TĂNG thường (không phải tăng cấp / giảm)
												(!!selectedAsset &&
													(selectedAsset.grade ??
														1) >= 5 &&
													isIncDec &&
													dir === 'INCREASE' &&
													reasonCode !== 'GRADE_UP')
											}
										>
											{pending ? (
												<>
													<RefreshCw className='w-3.5 h-3.5 mr-1 animate-spin' />
													Lưu…
												</>
											) : (
												'Lưu cập nhật'
											)}
										</Button>
									</div>
								</CardContent>
							</Card>
						</form>
					</TabsContent>
				</Tabs>
			)}
		</div>
	)
}
