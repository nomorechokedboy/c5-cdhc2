/**
 * Form cập nhật tăng/giảm nhiều dòng:
 * - Hàng lọc cố định: Ngành → Tòa → Tầng → Phòng
 * - Bảng: loại, tên TB, năm SX/SD, ngày TH, địa chỉ, SL, phân cấp, số QĐ
 * - Loại «Khác»: fuzzy khớp danh mục ngành; không khớp thì sinh mã theo cấu trúc ngành
 * - Giảm + Khác: chọn từ toàn bộ TB loại Khác trong phòng
 */
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
	CreateAssetMovement,
	CreateRoomAsset,
	GetAssetCatalog,
	GetMyNganh,
	GetRoomAssets
} from '@/api/asset'
import {
	buildCatalogRoomAssetCode,
	resolveUnitAliasFromCodes
} from '@/lib/asset-code'
import {
	findFuzzyInList,
	fuzzyEqual,
	resolveCategoryFuzzy,
	resolveMaterialFuzzy
} from '@/lib/fuzzy-asset-match'
import { nganhLabel } from '@/lib/nganh'
import { resolveInstallAddress } from '@/lib/export-asset-excel'
import useIsNganhUser from '@/hooks/useIsNganhUser'
import useAuth from '@/hooks/useAuth'
import {
	getTokenNganhCodes,
	nowVNDateTimeLocal,
	nowVNStoredDateTime,
	toStoredDateTime
} from '@/lib/utils'
import { ASSET_GRADES } from '@/lib/asset-grade'
import {
	MIN_ASSET_YEAR,
	clampAssetYearInput,
	maxAssetYear,
	validateAssetYears
} from '@/lib/asset-year'
import useUnitsData from '@/hooks/useUnitsData'
import { useBuildingTree } from '@/hooks/useBuildings'
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import type { RoomAsset } from '@/types/asset'

const CATEGORY_OTHER = 'Khác'
/** Giá trị chọn «Khác» ở cột Tên thiết bị → bắt buộc nhập tay */
const NAME_OTHER = '__name_other__'
const PRESET_CATEGORIES = [
	'IT',
	'Điện lạnh',
	'Nội thất',
	'Điện',
	'Khác'
] as const

/** Lý do tăng (không gồm GRADE_UP — dùng form nhập từng VT) */
const INCREASE_REASONS = [
	{ value: 'FROM_SUPERIOR', label: 'Trên cấp' },
	{ value: 'PURCHASE', label: 'Mua sắm' },
	{ value: 'INVENTORY', label: 'Kiểm kê' },
	{ value: 'OTHER', label: 'Khác' }
] as const

const DECREASE_REASONS = [
	{ value: 'RETURN_SUPERIOR', label: 'Trả trên → kho KHO-VT' },
	{ value: 'LOSS', label: 'Hao hụt' },
	{ value: 'LIQUIDATION', label: 'Thanh lý' },
	{ value: 'INVENTORY', label: 'Kiểm kê' },
	{ value: 'OTHER', label: 'Khác' }
] as const

type Dir = 'INCREASE' | 'DECREASE'

type DraftRow = {
	key: string
	category: string
	/** Khi loại Khác (tăng): gõ loại tự do → fuzzy */
	categoryFree?: string
	assetName: string
	assetId: string
	/**
	 * pick = chọn TB có sẵn (ẩn ô nhập mới)
	 * new = nhập TB mới (ẩn ô chọn)
	 */
	nameMode?: 'pick' | 'new'
	manufactureYear: string
	usageYear: string
	executedAt: string
	installAddress: string
	quantity: string
	grade: string
	decisionNumber: string
	/** Gợi ý sau fuzzy */
	resolveHint?: string
}

function today() {
	return nowVNDateTimeLocal()
}

function newRow(defaults?: Partial<DraftRow>): DraftRow {
	return {
		key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		category: '',
		categoryFree: '',
		assetName: '',
		assetId: '',
		nameMode: 'pick',
		manufactureYear: String(MIN_ASSET_YEAR),
		usageYear: String(MIN_ASSET_YEAR),
		executedAt: today(),
		installAddress: '',
		quantity: '1',
		grade: '1',
		decisionNumber: '',
		...defaults
	}
}

export default function AssetUpdateBatchForm() {
	const qc = useQueryClient()
	const { user } = useAuth()
	const nganhUser = useIsNganhUser()
	const { data: tree = [], isLoading: treeLoading } = useBuildingTree()
	const { data: unitsTree = [] } = useUnitsData()

	const [dir, setDir] = useState<Dir>('INCREASE')
	const [reasonCode, setReasonCode] = useState('')
	const [reasonOther, setReasonOther] = useState('')
	const [nganhCode, setNganhCode] = useState('')
	const [buildingId, setBuildingId] = useState('')
	const [floorId, setFloorId] = useState('')
	const [roomId, setRoomId] = useState('')
	/** Đơn vị quản lý (holding) — user chọn; dùng khi sinh mã …-G2-D1 */
	const [holdingUnitId, setHoldingUnitId] = useState('')
	const [rows, setRows] = useState<DraftRow[]>([newRow()])
	const [pending, setPending] = useState(false)

	const reasonOptions =
		dir === 'INCREASE' ? INCREASE_REASONS : DECREASE_REASONS

	function onDirChange(next: Dir) {
		setDir(next)
		// Đổi hướng → reset lý do (danh sách khác nhau)
		setReasonCode('')
		setReasonOther('')
		// Reset chọn TB trên dòng (tăng/giảm dùng pool khác)
		setRows((prev) =>
			prev.map((r) => ({
				...r,
				assetId: '',
				assetName: next === 'DECREASE' ? r.assetName : r.assetName
			}))
		)
	}

	const myNganhQ = useQuery({
		queryKey: ['my-nganh', 'batch-update'],
		queryFn: GetMyNganh,
		staleTime: 60_000
	})

	/** Ngành gán cho user (JWT / me / GetMyNganh) — form cố định theo đây */
	const assignedNganh = useMemo(() => {
		const fromApi = myNganhQ.data ?? []
		if (fromApi.length) return fromApi
		const fromUser = (user?.nganhCodes || []).map((c) => ({
			code: c.toUpperCase(),
			name: c.toUpperCase()
		}))
		if (fromUser.length) return fromUser
		return getTokenNganhCodes().map((c) => ({ code: c, name: c }))
	}, [myNganhQ.data, user?.nganhCodes])

	// User ngành: luôn gắn ngành của user (cố định)
	useEffect(() => {
		if (!nganhUser && !user?.isNganhScoped) return
		if (!assignedNganh.length) return
		const codes = assignedNganh.map((n) => n.code.toUpperCase())
		const cur = (nganhCode || '').toUpperCase()
		if (cur && codes.includes(cur)) return
		setNganhCode(assignedNganh[0]!.code)
	}, [assignedNganh, nganhUser, user?.isNganhScoped, nganhCode])

	/** Catalog đầy đủ để lấy danh sách ngành (admin) + khi đã chọn ngành */
	const catalogAllQ = useQuery({
		queryKey: ['asset-catalog', 'batch-all'],
		queryFn: () => GetAssetCatalog(),
		staleTime: 60_000
	})

	const catalogQ = useQuery({
		queryKey: ['asset-catalog', 'batch', nganhCode],
		queryFn: () => GetAssetCatalog(nganhCode ? { nganhCode } : undefined),
		enabled: !!nganhCode,
		staleTime: 60_000
	})

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
		queryKey: ['room-assets', 'batch', roomIdNum],
		queryFn: () => GetRoomAssets(roomIdNum!),
		enabled: roomIdNum != null && !Number.isNaN(roomIdNum)
	})

	const roomAssets = assetsQ.data ?? []
	const selectedBuilding = tree.find((b) => b.id === buildingIdNum)
	const selectedFloor = floors.find((f) => f.id === floorIdNum)
	const selectedRoom = rooms.find((r) => r.id === roomIdNum)

	const defaultInstall = useMemo(() => {
		if (!selectedBuilding || !selectedFloor || !selectedRoom) return ''
		return resolveInstallAddress({
			buildingName: selectedBuilding.name,
			buildingCode: selectedBuilding.code,
			floorName: selectedFloor.name,
			roomName: selectedRoom.roomName,
			roomCode: selectedRoom.roomCode
		})
	}, [selectedBuilding, selectedFloor, selectedRoom])

	const catalogNganh = catalogQ.data?.nganh ?? catalogAllQ.data?.nganh ?? []
	const catalogCn =
		catalogQ.data?.chuyenNganh ?? catalogAllQ.data?.chuyenNganh ?? []
	const catalogMaterials =
		catalogQ.data?.materials ?? catalogAllQ.data?.materials ?? []

	const nganhOptions = useMemo(() => {
		// User ngành: chỉ ngành được gán
		if (nganhUser || assignedNganh.length) {
			const codes = new Set(
				assignedNganh.map((n) => n.code.toUpperCase())
			)
			// Ghép tên đầy đủ từ catalog nếu có
			const fromCat = catalogNganh.filter((n) =>
				codes.has(n.code.toUpperCase())
			)
			if (fromCat.length) return fromCat
			return assignedNganh
		}
		const mine = myNganhQ.data ?? []
		if (mine.length) return mine
		return catalogNganh
	}, [nganhUser, assignedNganh, myNganhQ.data, catalogNganh])

	/** User ngành: ngành cố định, không cho đổi */
	const fixedNganh = nganhUser || !!user?.isNganhScoped

	const selectedNganhLabel = useMemo(() => {
		const hit =
			nganhOptions.find(
				(n) => n.code.toUpperCase() === nganhCode.toUpperCase()
			) ||
			assignedNganh.find(
				(n) => n.code.toUpperCase() === nganhCode.toUpperCase()
			)
		return hit ? nganhLabel(hit) : nganhCode || '—'
	}, [nganhOptions, assignedNganh, nganhCode])

	/** Loại chọn: preset + loại trong phòng (lọc theo ngành nếu có mã HC2) */
	const categoryOptions = useMemo(() => {
		const set = new Set<string>(PRESET_CATEGORIES)
		const prefix = nganhCode.trim().toUpperCase()
		for (const a of roomAssets) {
			const cat = a.category?.trim()
			if (!cat) continue
			if (prefix) {
				const code = (a.code || '').toUpperCase()
				// Giữ loại Khác / preset; VT thuộc ngành hoặc không có mã HC2
				if (
					cat !== CATEGORY_OTHER &&
					!PRESET_CATEGORIES.includes(
						cat as (typeof PRESET_CATEGORIES)[number]
					) &&
					code.startsWith('HC2') &&
					!code.startsWith(prefix)
				) {
					continue
				}
			}
			set.add(cat)
		}
		// Thêm tên CN từ catalog ngành
		for (const c of catalogCn) {
			if (
				!nganhCode ||
				(c.nganhCode || '').toUpperCase() === nganhCode.toUpperCase()
			) {
				if (c.name?.trim()) set.add(c.name.trim())
			}
		}
		const list = [...set].filter((c) => c !== CATEGORY_OTHER)
		list.sort((a, b) => a.localeCompare(b, 'vi'))
		list.push(CATEGORY_OTHER)
		return list
	}, [roomAssets, catalogCn, nganhCode])

	const assetsForDecrease = useMemo(() => {
		return roomAssets.filter((a) => (Number(a.quantity) || 0) > 0)
	}, [roomAssets])

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
	 * Suy ĐVQL từ phòng:
	 * 1) room.manager (trường «Đơn vị quản lý» trên hồ sơ phòng)
	 * 2) mô tả «ĐVQL: …»
	 * 3) holdingUnitId phổ biến trên VT trong phòng
	 * 4) alias từ mã VT / roomCode
	 */
	const unitFromRoom = useMemo(() => {
		if (!selectedRoom || !allUnits.length) return null
		const manager = (selectedRoom.manager || '').trim()
		const desc = (selectedRoom.description || '').trim()

		const matchUnit = (text: string) => {
			const t = text.trim()
			if (!t) return null
			const lower = t.toLocaleLowerCase('vi')
			// exact name / alias
			let hit = allUnits.find(
				(u) =>
					u.name.toLocaleLowerCase('vi') === lower ||
					u.alias.toLocaleLowerCase('vi') === lower
			)
			if (hit) return hit
			// contains
			hit = allUnits.find(
				(u) =>
					lower.includes(u.name.toLocaleLowerCase('vi')) ||
					u.name.toLocaleLowerCase('vi').includes(lower) ||
					lower.includes(u.alias.toLocaleLowerCase('vi'))
			)
			return hit ?? null
		}

		if (manager) {
			const m = matchUnit(manager)
			if (m) return m
		}
		// ĐVQL: Tiểu đoàn 1 | ...
		const mDesc = desc.match(/ĐVQL\s*:\s*([^|]+)/i)
		if (mDesc?.[1]) {
			const m = matchUnit(mDesc[1].trim())
			if (m) return m
		}

		// holdingUnitId phổ biến trên VT phòng
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
			if (u) return u
		}

		const fromCodes = resolveUnitAliasFromCodes(
			roomAssets.map((a) => a.code),
			selectedRoom.roomCode
		)
		if (fromCodes) {
			return (
				allUnits.find(
					(u) => u.alias.toUpperCase() === fromCodes.toUpperCase()
				) ?? null
			)
		}
		return null
	}, [selectedRoom, allUnits, roomAssets])

	/** Đã chọn phòng + suy được ĐVQL → cố định (không cho đổi) */
	const holdingUnitLocked = !!(roomId && unitFromRoom)

	const selectedHoldingUnit = useMemo(() => {
		if (holdingUnitLocked && unitFromRoom) return unitFromRoom
		if (!holdingUnitId) return unitFromRoom
		return allUnits.find((u) => String(u.id) === holdingUnitId) ?? null
	}, [holdingUnitLocked, unitFromRoom, holdingUnitId, allUnits])

	const roomUnitAlias = useMemo(() => {
		if (selectedHoldingUnit?.alias) {
			return selectedHoldingUnit.alias.toUpperCase()
		}
		return null
	}, [selectedHoldingUnit])

	const roomHoldingUnitId = useMemo(() => {
		return selectedHoldingUnit?.id
	}, [selectedHoldingUnit])

	const unitOptions = useMemo(
		() =>
			allUnits
				.slice()
				.sort((a, b) =>
					`${a.alias} ${a.name}`.localeCompare(
						`${b.alias} ${b.name}`,
						'vi'
					)
				)
				.map((u) => ({
					value: String(u.id),
					label: `${u.alias} — ${u.name}`,
					keywords: `${u.alias} ${u.name}`
				})),
		[allUnits]
	)

	// Chọn phòng → gắn ĐVQL cố định theo hồ sơ phòng
	useEffect(() => {
		if (!roomId) return
		if (unitFromRoom) {
			setHoldingUnitId(String(unitFromRoom.id))
		}
	}, [roomId, unitFromRoom])

	function updateRow(key: string, patch: Partial<DraftRow>) {
		setRows((prev) =>
			prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
		)
	}

	function removeRow(key: string) {
		setRows((prev) =>
			prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)
		)
	}

	function namesForCategory(
		category: string,
		forDecrease: boolean
	): string[] {
		const pool = forDecrease ? assetsForDecrease : roomAssets
		const set = new Set<string>()
		for (const a of pool) {
			const cat = (a.category || '').trim()
			// Không phân biệt hoa/thường / gần đúng
			if (
				a.name?.trim() &&
				(cat === category || fuzzyEqual(cat, category))
			) {
				set.add(a.name.trim())
			}
		}
		// Tăng: thêm tên VT danh mục thuộc loại (chuyên ngành) đã chọn
		if (!forDecrease && category && category !== CATEGORY_OTHER) {
			const cn = catalogCn.find(
				(c) =>
					c.name.trim().toLocaleLowerCase('vi') ===
						category.trim().toLocaleLowerCase('vi') ||
					fuzzyEqual(c.name, category)
			)
			const prefix = cn?.code?.toUpperCase()
			for (const m of catalogMaterials) {
				const ok =
					(cn && (m.categoryCode || '').toUpperCase() === prefix) ||
					fuzzyEqual(m.categoryName || '', category)
				if (ok && m.name?.trim()) set.add(m.name.trim())
			}
		}
		return [...set].sort((a, b) => a.localeCompare(b, 'vi'))
	}

	/**
	 * Khi gõ loại «Khác»: khớp loại có sẵn (không phân biệt hoa/thường).
	 * - matched → dùng tên loại chuẩn + chọn TB từ danh sách
	 * - new → nhập tên TB tự do
	 */
	function resolveOtherTypeUi(free: string): {
		kind: 'empty' | 'matched' | 'new'
		categoryName: string
		hint: string
	} {
		const t = free.trim()
		if (!t) return { kind: 'empty', categoryName: '', hint: '' }

		// 1) Khớp list loại UI (preset + phòng + CN catalog), bỏ «Khác»
		const optionHit = findFuzzyInList(
			t,
			categoryOptions.filter((c) => c !== CATEGORY_OTHER)
		)
		if (optionHit) {
			return {
				kind: 'matched',
				categoryName: optionHit,
				hint: `→ khớp loại có sẵn: «${optionHit}» — chọn tên thiết bị`
			}
		}

		if (!nganhCode) {
			return {
				kind: 'new',
				categoryName: t,
				hint: '→ loại mới — nhập tên thiết bị'
			}
		}

		// 2) Khớp CN danh mục ngành (fuzzy / bỏ dấu / hoa thường)
		const res = resolveCategoryFuzzy(t, catalogCn, nganhCode, {
			createCode: true,
			existingCnCodes: catalogCn.map((c) => c.code)
		})
		if (res.kind === 'matched') {
			return {
				kind: 'matched',
				categoryName: res.categoryName,
				hint: `→ khớp loại có sẵn: «${res.categoryName}» — chọn tên thiết bị`
			}
		}
		return {
			kind: 'new',
			categoryName: t,
			hint: `→ loại mới (sẽ sinh mã ${res.chuyenNganhCode || '…'}) — nhập tên thiết bị`
		}
	}

	/** Giảm + Khác: mọi TB loại Khác (và fuzzy «khac») trong phòng còn SL */
	function otherAssetsForDecrease(): RoomAsset[] {
		return assetsForDecrease.filter((a) => {
			const cat = (a.category || '').trim()
			return cat === CATEGORY_OTHER || fuzzyEqual(cat, CATEGORY_OTHER)
		})
	}

	function pickAsset(
		category: string,
		name: string,
		preferId?: string
	): RoomAsset | undefined {
		const pool = dir === 'DECREASE' ? assetsForDecrease : roomAssets
		const matches = pool.filter((a) => {
			const cat = (a.category || '').trim()
			const nm = (a.name || '').trim()
			const catOk = cat === category || fuzzyEqual(cat, category)
			const nameOk = nm === name || fuzzyEqual(nm, name)
			return catOk && nameOk
		})
		if (preferId) {
			const hit = matches.find((a) => String(a.id) === preferId)
			if (hit) return hit
		}
		// Ưu tiên exact name (sau chuẩn hoá hoa/thường)
		const exact = matches.find(
			(a) =>
				(a.name || '').trim().toLocaleLowerCase('vi') ===
				name.trim().toLocaleLowerCase('vi')
		)
		return exact || matches[0]
	}

	async function handleSubmit() {
		if (!nganhCode) {
			toast.error('Chọn ngành')
			return
		}
		if (!roomIdNum) {
			toast.error('Chọn tòa nhà → tầng → phòng')
			return
		}
		if (!holdingUnitId && !roomHoldingUnitId) {
			toast.error('Chọn đơn vị quản lý')
			return
		}
		if (!reasonCode) {
			toast.error(
				dir === 'INCREASE' ? 'Chọn lý do tăng' : 'Chọn lý do giảm'
			)
			return
		}
		if (reasonCode === 'OTHER' && !reasonOther.trim()) {
			toast.error('Nhập lý do khác')
			return
		}
		if (!rows.length) {
			toast.error('Thêm ít nhất một dòng vật tư')
			return
		}

		setPending(true)
		let ok = 0
		const errors: string[] = []

		// Track codes sinh trong batch để không trùng
		const generatedMaterialCodes = catalogMaterials.map((m) => m.code)
		const generatedCnCodes = catalogCn.map((c) => c.code)

		try {
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i]!
				const label = `Dòng ${i + 1}`

				try {
					let category = row.category.trim()
					let assetName = row.assetName.trim()
					let resolveHint = ''
					let materialCode: string | undefined
					let unit: string | undefined
					let finalCategory = category

					const isOther = category === CATEGORY_OTHER
					const yearErr = validateAssetYears({
						manufactureYear: row.manufactureYear,
						usageYear: row.usageYear
					})
					if (yearErr) throw new Error(yearErr)
					// Stamp giờ VN chính xác lúc bấm lưu (có giây).
					// Nếu user chọn ngày/giờ khác (backdate) → giữ lựa chọn + chuẩn hoá.
					const picked = (row.executedAt || '').trim()
					const nowLocal = nowVNDateTimeLocal()
					const isDefaultOrNow =
						!picked ||
						picked.slice(0, 16) === nowLocal.slice(0, 16) ||
						picked.replace(' ', 'T').slice(0, 16) ===
							nowLocal.slice(0, 16)
					const executedAtStored = isDefaultOrNow
						? nowVNStoredDateTime()
						: toStoredDateTime(picked)

					const qty = Math.floor(Number(row.quantity) || 0)
					if (qty < 1) throw new Error('Số lượng phải ≥ 1')

					const grade = Math.min(
						5,
						Math.max(1, Number(row.grade) || 1)
					)

					// —— Khác + Tăng: khớp loại (không phân biệt hoa/thường) + tên ——
					if (isOther && dir === 'INCREASE') {
						const typeInput =
							(row.categoryFree || '').trim() || assetName
						if (!typeInput && !assetName) {
							throw new Error(
								'Loại Khác: nhập loại hoặc tên thiết bị'
							)
						}

						// 1) Khớp loại: options UI trước → CN danh mục
						const typeText = (row.categoryFree || '').trim()
						let cnCode: string | undefined
						if (typeText) {
							const optionHit = findFuzzyInList(
								typeText,
								categoryOptions.filter(
									(c) => c !== CATEGORY_OTHER
								)
							)
							const catRes = resolveCategoryFuzzy(
								optionHit || typeText,
								catalogCn,
								nganhCode,
								{ existingCnCodes: generatedCnCodes }
							)
							if (optionHit) {
								// Ưu tiên tên loại chuẩn trên UI (case-insensitive match)
								finalCategory = optionHit
								category = optionHit
								cnCode = catRes.chuyenNganhCode
								if (
									catRes.kind === 'new' &&
									catRes.chuyenNganhCode
								) {
									generatedCnCodes.push(
										catRes.chuyenNganhCode
									)
								}
								resolveHint = `Khớp loại «${optionHit}»`
							} else {
								finalCategory =
									catRes.categoryName || CATEGORY_OTHER
								cnCode = catRes.chuyenNganhCode
								if (
									catRes.chuyenNganhCode &&
									catRes.kind === 'new'
								) {
									generatedCnCodes.push(
										catRes.chuyenNganhCode
									)
								}
								resolveHint = catRes.note || ''
								// Nếu khớp loại có sẵn → không còn «Khác»
								if (catRes.kind === 'matched') {
									category = finalCategory
								}
							}
						}

						if (
							!assetName.trim() ||
							assetName.trim() === NAME_OTHER
						) {
							throw new Error(
								row.nameMode === 'new'
									? 'Đã chọn «Khác» — bắt buộc nhập tên thiết bị mới'
									: 'Chọn hoặc nhập tên thiết bị'
							)
						}

						// 2) Khớp tên TB (đã chọn từ list hoặc nhập mới)
						const nameInput = assetName.trim()
						// Ưu tiên TB có sẵn trong phòng theo loại đã khớp
						const roomPick = pickAsset(
							finalCategory || category,
							nameInput,
							row.assetId || undefined
						)
						if (roomPick) {
							assetName = roomPick.name
							finalCategory = roomPick.category || finalCategory
							category = finalCategory
							row.assetId = String(roomPick.id)
							resolveHint = [
								resolveHint,
								`TB phòng «${roomPick.name}»`
							]
								.filter(Boolean)
								.join(' · ')
						}

						const matRes = resolveMaterialFuzzy(
							nameInput,
							catalogMaterials,
							cnCode,
							{ existingMaterialCodes: generatedMaterialCodes }
						)
						if (!roomPick) {
							assetName = matRes.name || nameInput
						} else if (matRes.kind === 'matched' && matRes.name) {
							// Giữ tên phòng, lấy mã DM nếu khớp
							assetName = roomPick.name
						} else {
							assetName = roomPick.name
						}
						materialCode = matRes.materialCode
						unit = matRes.unit || undefined
						if (matRes.materialCode && matRes.kind === 'new') {
							generatedMaterialCodes.push(matRes.materialCode)
						}
						if (matRes.chuyenNganhCode)
							cnCode = matRes.chuyenNganhCode
						if (matRes.kind === 'matched' && matRes.name) {
							// Đồng bộ category từ material nếu có categoryName
							const mat = catalogMaterials.find(
								(m) =>
									m.code.toUpperCase() ===
									(matRes.materialCode || '').toUpperCase()
							)
							if (mat?.categoryName) {
								finalCategory = mat.categoryName
								category = mat.categoryName
							}
						}
						resolveHint = [resolveHint, matRes.note]
							.filter(Boolean)
							.join(' · ')

						// Fallback: fuzzy tên trong phòng
						if (!materialCode && !roomPick) {
							const roomNames = roomAssets.map((a) => a.name)
							const hit = findFuzzyInList(assetName, roomNames)
							if (hit) {
								const existing = roomAssets.find(
									(a) =>
										a.name === hit ||
										fuzzyEqual(a.name, hit)
								)
								if (existing) {
									assetName = existing.name
									finalCategory =
										existing.category || finalCategory
									category = finalCategory
								}
							}
						}
					} else if (isOther && dir === 'DECREASE') {
						// Giảm + Khác: phải chọn TB loại Khác có sẵn
						const otherList = otherAssetsForDecrease()
						if (!otherList.length) {
							throw new Error(
								'Phòng không có TB loại Khác để giảm'
							)
						}
						let target = row.assetId
							? otherList.find(
									(a) => String(a.id) === row.assetId
								)
							: otherList.find(
									(a) =>
										a.name === assetName ||
										fuzzyEqual(a.name, assetName)
								)
						if (!target && assetName) {
							target = otherList.find((a) =>
								fuzzyEqual(a.name, assetName)
							)
						}
						if (!target) {
							throw new Error('Chọn thiết bị loại Khác cần giảm')
						}
						category = target.category || CATEGORY_OTHER
						finalCategory = category
						assetName = target.name
						row.assetId = String(target.id)
					} else if (!isOther) {
						if (!category) throw new Error('Chọn loại')
						if (
							!assetName.trim() ||
							assetName.trim() === NAME_OTHER
						) {
							throw new Error(
								row.nameMode === 'new'
									? 'Đã chọn «Khác» — bắt buộc nhập tên thiết bị mới'
									: 'Chọn / nhập tên thiết bị'
							)
						}
						// Fuzzy tên trong loại (phòng + gợi ý)
						const names = namesForCategory(
							category,
							dir === 'DECREASE'
						)
						const hit = findFuzzyInList(assetName, names)
						if (hit) assetName = hit

						/**
						 * Tăng + loại có sẵn:
						 * So tên với danh mục VT của chuyên ngành.
						 * - Trùng → dùng mã VT danh mục
						 * - Không trùng → sinh mã theo cấu trúc ngành
						 *   (mã CN + 01, 02… → HC2A0103)
						 */
						if (dir === 'INCREASE') {
							const cn =
								catalogCn.find(
									(c) =>
										c.name
											.trim()
											.toLocaleLowerCase('vi') ===
											category
												.trim()
												.toLocaleLowerCase('vi') ||
										fuzzyEqual(c.name, category)
								) ||
								catalogCn.find(
									(c) =>
										(c.nganhCode || '').toUpperCase() ===
											nganhCode.toUpperCase() &&
										fuzzyEqual(c.name, category)
								)

							let cnCode = cn?.code
							// Loại chọn từ phòng nhưng chưa có CN danh mục → sinh CN mới
							if (!cnCode && nganhCode) {
								const catRes = resolveCategoryFuzzy(
									category,
									catalogCn,
									nganhCode,
									{ existingCnCodes: generatedCnCodes }
								)
								cnCode = catRes.chuyenNganhCode
								if (
									catRes.kind === 'new' &&
									catRes.chuyenNganhCode
								) {
									generatedCnCodes.push(
										catRes.chuyenNganhCode
									)
								}
								if (catRes.kind === 'matched') {
									finalCategory = catRes.categoryName
									category = catRes.categoryName
								}
								resolveHint = [resolveHint, catRes.note]
									.filter(Boolean)
									.join(' · ')
							}

							const matRes = resolveMaterialFuzzy(
								assetName,
								catalogMaterials,
								cnCode,
								{
									existingMaterialCodes:
										generatedMaterialCodes
								}
							)
							assetName = matRes.name || assetName
							materialCode = matRes.materialCode
							unit = matRes.unit || unit
							if (matRes.materialCode && matRes.kind === 'new') {
								generatedMaterialCodes.push(matRes.materialCode)
							}
							resolveHint = [resolveHint, matRes.note]
								.filter(Boolean)
								.join(' · ')
						}
					}

					const install =
						row.installAddress.trim() || defaultInstall || undefined

					// Xác định asset đích
					let targetId: number | undefined
					let existing = row.assetId
						? roomAssets.find((a) => String(a.id) === row.assetId)
						: pickAsset(category, assetName, row.assetId)

					// Tăng: nếu đã có đúng mã catalog trong phòng → tăng dòng đó
					if (dir === 'INCREASE' && materialCode) {
						const want = buildCatalogRoomAssetCode(
							materialCode,
							grade,
							roomUnitAlias
						).toUpperCase()
						const byCode = roomAssets.find(
							(a) => (a.code || '').toUpperCase() === want
						)
						if (byCode) existing = byCode
					}

					// Fuzzy match existing by name+category in room
					if (!existing && dir === 'INCREASE') {
						existing = roomAssets.find(
							(a) =>
								fuzzyEqual(a.name, assetName) &&
								(fuzzyEqual(a.category || '', finalCategory) ||
									a.category === finalCategory)
						)
					}

					if (dir === 'DECREASE') {
						if (!existing) {
							throw new Error(
								`Không tìm thấy «${assetName}» trong phòng để giảm`
							)
						}
						const stock = Number(existing.quantity) || 0
						if (qty > stock) {
							throw new Error(
								`Không đủ SL (có ${stock}, giảm ${qty})`
							)
						}
						targetId = existing.id
					} else {
						// INCREASE
						if (existing) {
							targetId = existing.id
						} else {
							// Tạo VT mới — luôn ưu tiên mã cấu trúc ngành
							// HC2A0103-G2-D1 (danh mục + cấp + đơn vị)
							let code = ''
							if (materialCode) {
								code =
									buildCatalogRoomAssetCode(
										materialCode,
										grade,
										roomUnitAlias
									) || materialCode
							} else if (nganhCode) {
								// Fallback: sinh CN + VT nếu vẫn chưa có mã
								const catRes = resolveCategoryFuzzy(
									finalCategory || category || 'Khác',
									catalogCn,
									nganhCode,
									{ existingCnCodes: generatedCnCodes }
								)
								if (
									catRes.chuyenNganhCode &&
									catRes.kind === 'new'
								) {
									generatedCnCodes.push(
										catRes.chuyenNganhCode
									)
								}
								const matRes = resolveMaterialFuzzy(
									assetName,
									catalogMaterials,
									catRes.chuyenNganhCode,
									{
										existingMaterialCodes:
											generatedMaterialCodes
									}
								)
								if (matRes.materialCode) {
									generatedMaterialCodes.push(
										matRes.materialCode
									)
									code =
										buildCatalogRoomAssetCode(
											matRes.materialCode,
											grade,
											roomUnitAlias
										) || matRes.materialCode
									resolveHint = [resolveHint, matRes.note]
										.filter(Boolean)
										.join(' · ')
								}
							}
							if (!code) {
								code = `VT-${Date.now().toString(36).toUpperCase()}`
							}
							const holdingIdCreate =
								roomHoldingUnitId ??
								(holdingUnitId
									? Number(holdingUnitId)
									: undefined)
							const created = await CreateRoomAsset({
								roomId: roomIdNum,
								code,
								name: assetName,
								category: finalCategory || CATEGORY_OTHER,
								quantity: 0,
								unit,
								holdingUnitId:
									holdingIdCreate != null &&
									!Number.isNaN(holdingIdCreate)
										? holdingIdCreate
										: undefined,
								grade,
								installAddress: install,
								manufactureYear:
									Number(row.manufactureYear) || undefined,
								usageYear: Number(row.usageYear) || undefined,
								status: 'NORMAL'
							})
							targetId = created.id
						}
					}

					if (!targetId) throw new Error('Không xác định được vật tư')

					const holdingId =
						roomHoldingUnitId ??
						(holdingUnitId ? Number(holdingUnitId) : undefined)

					await CreateAssetMovement(targetId, {
						movementType: dir,
						executedAt: executedAtStored,
						executingUnit: selectedHoldingUnit
							? `${selectedHoldingUnit.alias} — ${selectedHoldingUnit.name}`
							: roomUnitAlias || undefined,
						installAddress: install,
						assetName,
						quantity: qty,
						grade,
						manufactureYear:
							Number(row.manufactureYear) || undefined,
						usageYear: Number(row.usageYear) || undefined,
						reasonCode,
						reasonOther:
							reasonCode === 'OTHER'
								? reasonOther.trim()
								: undefined,
						decisionNumber: row.decisionNumber.trim() || undefined,
						note: resolveHint || undefined,
						// Tự cập nhật đơn vị quản lý trên bản ghi VT
						holdingUnitId:
							holdingId != null && !Number.isNaN(holdingId)
								? holdingId
								: undefined
					})

					ok++
					if (resolveHint) {
						// non-blocking info
						console.info(`${label}: ${resolveHint}`)
					}
				} catch (e) {
					errors.push(`${label}: ${(e as Error).message}`)
				}
			}

			await qc.invalidateQueries({ queryKey: ['room-assets'] })
			await qc.invalidateQueries({ queryKey: ['room-profile'] })
			await qc.invalidateQueries({
				queryKey: ['asset-reports', 'movements']
			})
			await assetsQ.refetch()

			if (ok && !errors.length) {
				toast.success(`Đã cập nhật ${ok} dòng`)
				setReasonCode('')
				setReasonOther('')
				setRows([
					newRow({
						executedAt: today(),
						installAddress: defaultInstall
					})
				])
			} else if (ok && errors.length) {
				toast.warning(`Thành công ${ok}, lỗi ${errors.length}`, {
					description: errors.slice(0, 3).join('; ')
				})
			} else {
				toast.error('Không cập nhật được dòng nào', {
					description: errors.slice(0, 3).join('; ')
				})
			}
		} finally {
			setPending(false)
		}
	}

	const filterReady =
		!!nganhCode && !!roomIdNum && !!(holdingUnitId || roomHoldingUnitId)
	const maxY = maxAssetYear()

	return (
		<div className='flex flex-col gap-4 h-full min-h-0'>
			{/* Bộ lọc cố định */}
			<Card className='shrink-0 shadow-sm'>
				<CardContent className='p-4 md:p-5 space-y-4'>
					{/* Hướng tăng/giảm + lý do */}
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end'>
						<div className='space-y-1.5'>
							<Label className='font-semibold'>
								Loại cập nhật{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<div className='flex flex-wrap gap-2'>
								<button
									type='button'
									onClick={() => onDirChange('INCREASE')}
									className={
										dir === 'INCREASE'
											? 'h-10 px-5 rounded-md text-sm font-semibold bg-emerald-600 text-white border border-emerald-600'
											: 'h-10 px-5 rounded-md text-sm font-semibold border bg-background hover:bg-muted'
									}
								>
									Tăng
								</button>
								<button
									type='button'
									onClick={() => onDirChange('DECREASE')}
									className={
										dir === 'DECREASE'
											? 'h-10 px-5 rounded-md text-sm font-semibold bg-amber-600 text-white border border-amber-600'
											: 'h-10 px-5 rounded-md text-sm font-semibold border bg-background hover:bg-muted'
									}
								>
									Giảm
								</button>
							</div>
						</div>
						<div className='space-y-1.5'>
							<Label className='font-semibold'>
								Lý do {dir === 'INCREASE' ? 'tăng' : 'giảm'}{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<Select
								value={reasonCode}
								onValueChange={(v) => {
									setReasonCode(v)
									if (v !== 'OTHER') setReasonOther('')
								}}
							>
								<SelectTrigger className='h-10'>
									<SelectValue
										placeholder={
											dir === 'INCREASE'
												? 'Chọn lý do tăng…'
												: 'Chọn lý do giảm…'
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{reasonOptions.map((r) => (
										<SelectItem
											key={r.value}
											value={r.value}
										>
											{r.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{reasonCode === 'OTHER' && (
							<div className='space-y-1.5 sm:col-span-2'>
								<Label className='font-semibold'>
									Lý do khác{' '}
									<span className='text-destructive'>*</span>
								</Label>
								<Input
									className='h-10'
									placeholder='Nhập lý do cụ thể…'
									value={reasonOther}
									onChange={(e) =>
										setReasonOther(e.target.value)
									}
								/>
							</div>
						)}
					</div>

					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3'>
						<div className='space-y-1.5'>
							<Label className='font-semibold'>
								Ngành{' '}
								{fixedNganh ? (
									<span className='text-muted-foreground font-normal'>
										(cố định)
									</span>
								) : (
									<span className='text-destructive'>*</span>
								)}
							</Label>
							{fixedNganh ? (
								<div className='h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-medium'>
									{selectedNganhLabel}
								</div>
							) : (
								<SearchableSelect
									value={nganhCode}
									onValueChange={(v) => {
										setNganhCode(v)
										setRows([
											newRow({
												installAddress: defaultInstall
											})
										])
									}}
									placeholder='Chọn ngành…'
									searchPlaceholder='Gõ mã/tên ngành…'
									emptyText='Chưa gán ngành — admin gán tại DS user'
									options={nganhOptions.map((n) => ({
										value: n.code,
										label: nganhLabel(n),
										keywords: `${n.code} ${n.name}`
									}))}
								/>
							)}
						</div>
						<div className='space-y-1.5'>
							<Label className='font-semibold'>
								Tòa nhà{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={buildingId}
								onValueChange={(v) => {
									setBuildingId(v)
									setFloorId('')
									setRoomId('')
								}}
								disabled={treeLoading}
								placeholder='Chọn tòa…'
								searchPlaceholder='Gõ tên/mã tòa…'
								emptyText='Không có tòa'
								options={tree.map((b) => ({
									value: String(b.id),
									label: b.name,
									keywords: `${b.name} ${b.code}`
								}))}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label className='font-semibold'>
								Tầng <span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={floorId}
								onValueChange={(v) => {
									setFloorId(v)
									setRoomId('')
								}}
								disabled={!buildingId}
								placeholder='Chọn tầng…'
								searchPlaceholder='Gõ tầng…'
								emptyText='Không có tầng'
								options={floors.map((f) => ({
									value: String(f.id),
									label: f.name,
									keywords: `${f.name} ${f.code || ''}`
								}))}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label className='font-semibold'>
								Phòng{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={roomId}
								onValueChange={(v) => {
									setRoomId(v)
									setRows((prev) =>
										prev.map((r) => ({
											...r,
											assetId: '',
											assetName: '',
											installAddress: ''
										}))
									)
								}}
								disabled={!floorId}
								placeholder='Chọn phòng…'
								searchPlaceholder='Gõ phòng…'
								emptyText='Không có phòng'
								options={rooms.map((r) => ({
									value: String(r.id),
									label: r.roomName,
									keywords: `${r.roomName} ${r.roomCode}`
								}))}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label className='font-semibold'>
								Đơn vị quản lý{' '}
								{holdingUnitLocked ? (
									<span className='text-muted-foreground font-normal'>
										(theo phòng)
									</span>
								) : (
									<span className='text-destructive'>*</span>
								)}
							</Label>
							{holdingUnitLocked && selectedHoldingUnit ? (
								<div className='h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-medium'>
									{selectedHoldingUnit.alias} —{' '}
									{selectedHoldingUnit.name}
								</div>
							) : (
								<SearchableSelect
									value={holdingUnitId}
									onValueChange={setHoldingUnitId}
									disabled={!roomId}
									placeholder={
										roomId
											? 'Chọn đơn vị…'
											: 'Chọn phòng trước…'
									}
									searchPlaceholder='Gõ alias/tên (D1, BGH…)…'
									emptyText={
										unitOptions.length
											? 'Không khớp'
											: 'Đang tải đơn vị…'
									}
									options={unitOptions}
								/>
							)}
							<p className='text-[11px] text-muted-foreground'>
								{holdingUnitLocked
									? 'Lấy từ «Đơn vị quản lý» trên hồ sơ phòng. Khi lưu, VT gắn đúng ĐVQL này.'
									: roomId
										? 'Phòng chưa gán ĐVQL — chọn thủ công từ danh mục đơn vị.'
										: 'Chọn phòng để tự điền ĐVQL.'}
							</p>
						</div>
					</div>
					{(nganhCode || roomId || holdingUnitId) && (
						<p className='text-xs text-muted-foreground'>
							Địa chỉ mặc định: {defaultInstall || '—'}
							{selectedHoldingUnit
								? ` · ĐVQL: ${selectedHoldingUnit.alias} — ${selectedHoldingUnit.name}`
								: roomUnitAlias
									? ` · ĐV gợi ý: ${roomUnitAlias}`
									: ' · Chưa chọn đơn vị quản lý'}
							{roomUnitAlias
								? ` · Mã VT dạng …-G{cấp}-${roomUnitAlias}`
								: ''}
						</p>
					)}
				</CardContent>
			</Card>

			{/* Bảng dòng VT */}
			<Card className='flex-1 min-h-0 shadow-sm flex flex-col overflow-hidden'>
				<CardContent className='p-0 flex-1 min-h-0 flex flex-col'>
					<div className='overflow-auto flex-1 min-h-0'>
						<Table>
							<TableHeader>
								<TableRow className='bg-muted/30'>
									<TableHead className='w-10'>#</TableHead>
									<TableHead className='min-w-[220px] w-[240px]'>
										Loại
									</TableHead>
									<TableHead className='min-w-[260px] w-[280px]'>
										Tên thiết bị
									</TableHead>
									<TableHead className='w-20'>
										Năm SX
									</TableHead>
									<TableHead className='w-20'>
										Năm SD
									</TableHead>
									<TableHead className='w-32'>
										Ngày TH
									</TableHead>
									<TableHead className='min-w-[140px]'>
										Địa chỉ lắp đặt
									</TableHead>
									<TableHead className='w-20'>SL</TableHead>
									<TableHead className='w-24'>
										Phân cấp
									</TableHead>
									<TableHead className='min-w-[100px]'>
										Số QĐ
									</TableHead>
									<TableHead className='w-12' />
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((row, idx) => {
									const isOther =
										row.category === CATEGORY_OTHER
									const otherType =
										dir === 'INCREASE' && isOther
											? resolveOtherTypeUi(
													row.categoryFree || ''
												)
											: {
													kind: 'empty' as const,
													categoryName: '',
													hint: ''
												}
									// Khác + khớp loại có sẵn → list TB theo loại chuẩn (không phân biệt hoa/thường)
									const effectiveCategory =
										otherType.kind === 'matched'
											? otherType.categoryName
											: row.category
									const names = namesForCategory(
										effectiveCategory,
										dir === 'DECREASE'
									)
									const otherList =
										dir === 'DECREASE' && isOther
											? otherAssetsForDecrease()
											: []
									const otherHint = otherType.hint
									const isMatchedExistingType =
										otherType.kind === 'matched'
									const isNewTypeHint =
										otherType.kind === 'new'

									return (
										<TableRow key={row.key}>
											<TableCell className='text-muted-foreground text-xs align-top pt-3'>
												{idx + 1}
											</TableCell>
											{/* Loại: chọn danh sách; Khác → hiện ô nhập loại ngay dưới */}
											<TableCell className='align-top'>
												<div className='space-y-1.5 min-w-[200px]'>
													<SearchableSelect
														value={row.category}
														onValueChange={(v) =>
															updateRow(row.key, {
																category: v,
																categoryFree:
																	'',
																assetName: '',
																assetId: '',
																nameMode:
																	v ===
																	CATEGORY_OTHER
																		? 'new'
																		: 'pick',
																resolveHint:
																	undefined
															})
														}
														disabled={!filterReady}
														className='h-10 text-sm w-full min-w-[200px]'
														placeholder='Chọn loại…'
														searchPlaceholder='Gõ tên loại…'
														emptyText='Không có loại'
														options={categoryOptions.map(
															(c) => ({
																value: c,
																label: c,
																keywords: c
															})
														)}
													/>
													{dir === 'INCREASE' &&
														isOther && (
															<>
																<Input
																	className='h-10 text-sm'
																	placeholder='Loại là gì? vd. Máy tính để bàn'
																	value={
																		row.categoryFree ||
																		''
																	}
																	disabled={
																		!filterReady
																	}
																	onChange={(
																		e
																	) => {
																		const next =
																			e
																				.target
																				.value
																		const resolved =
																			resolveOtherTypeUi(
																				next
																			)
																		updateRow(
																			row.key,
																			{
																				categoryFree:
																					next,
																				assetName:
																					'',
																				assetId:
																					'',
																				nameMode:
																					resolved.kind ===
																					'matched'
																						? 'pick'
																						: 'new'
																			}
																		)
																	}}
																/>
																{otherHint ? (
																	<p className='text-[11px] text-muted-foreground leading-snug px-0.5'>
																		{
																			otherHint
																		}
																	</p>
																) : (
																	<p className='text-[11px] text-muted-foreground px-0.5'>
																		Chọn
																		«Khác» →
																		nhập tên
																		loại
																		(không
																		phân
																		biệt
																		hoa/thường).
																		Trùng
																		loại có
																		sẵn →
																		chọn TB;
																		không
																		trùng →
																		nhập
																		tên.
																	</p>
																)}
															</>
														)}
												</div>
											</TableCell>
											{/* Tên TB: loại có sẵn / khớp Khác → chọn; loại mới → nhập tay */}
											<TableCell className='align-top'>
												{dir === 'DECREASE' &&
												isOther ? (
													<SearchableSelect
														value={row.assetId}
														onValueChange={(v) => {
															const a =
																otherList.find(
																	(x) =>
																		String(
																			x.id
																		) === v
																)
															updateRow(row.key, {
																assetId: v,
																assetName:
																	a?.name ||
																	'',
																grade: String(
																	a?.grade ??
																		1
																),
																manufactureYear:
																	a?.manufactureYear !=
																	null
																		? String(
																				a.manufactureYear
																			)
																		: row.manufactureYear,
																usageYear:
																	a?.usageYear !=
																	null
																		? String(
																				a.usageYear
																			)
																		: row.usageYear,
																installAddress:
																	a?.installAddress ||
																	defaultInstall
															})
														}}
														disabled={!filterReady}
														className='h-10 text-sm min-w-[180px]'
														placeholder='Chọn TB loại Khác…'
														searchPlaceholder='Gõ tên…'
														emptyText='Không có TB loại Khác'
														options={otherList.map(
															(a) => ({
																value: String(
																	a.id
																),
																label: `${a.name} · SL ${a.quantity}`,
																keywords: `${a.name} ${a.code}`
															})
														)}
													/>
												) : dir === 'INCREASE' &&
												  isOther &&
												  isMatchedExistingType &&
												  names.length > 0 ? (
													// Khớp loại có sẵn → chọn TB; «Khác» → bắt buộc nhập tên mới
													<div className='space-y-1.5'>
														<SearchableSelect
															value={
																row.nameMode ===
																'new'
																	? NAME_OTHER
																	: row.assetName
															}
															onValueChange={(
																v
															) => {
																if (
																	v ===
																	NAME_OTHER
																) {
																	updateRow(
																		row.key,
																		{
																			nameMode:
																				'new',
																			assetName:
																				'',
																			assetId:
																				''
																		}
																	)
																	return
																}
																const a =
																	pickAsset(
																		otherType.categoryName,
																		v
																	)
																updateRow(
																	row.key,
																	{
																		nameMode:
																			'pick',
																		assetName:
																			v,
																		assetId:
																			a
																				? String(
																						a.id
																					)
																				: '',
																		grade: String(
																			a?.grade ??
																				row.grade
																		),
																		installAddress:
																			a?.installAddress ||
																			defaultInstall
																	}
																)
															}}
															disabled={
																!filterReady
															}
															className='h-10 text-sm min-w-[240px] w-full'
															contentClassName='min-w-[min(100vw-2rem,22rem)] max-w-[min(100vw-2rem,28rem)]'
															placeholder={`Chọn TB «${otherType.categoryName}»…`}
															searchPlaceholder='Gõ tên thiết bị…'
															emptyText='Không có thiết bị'
															options={[
																...names.map(
																	(n) => ({
																		value: n,
																		label: n,
																		keywords:
																			n
																	})
																),
																{
																	value: NAME_OTHER,
																	label: 'Khác — nhập tên mới…',
																	keywords:
																		'khac other moi nhap'
																}
															]}
														/>
														{row.nameMode ===
														'new' ? (
															<>
																<Input
																	className='h-10 text-sm min-w-[180px]'
																	value={
																		row.assetName
																	}
																	disabled={
																		!filterReady
																	}
																	placeholder='Nhập tên thiết bị mới *'
																	autoFocus
																	onChange={(
																		e
																	) =>
																		updateRow(
																			row.key,
																			{
																				nameMode:
																					'new',
																				assetName:
																					e
																						.target
																						.value,
																				assetId:
																					''
																			}
																		)
																	}
																/>
																<p className='text-[11px] text-muted-foreground'>
																	Đã chọn
																	«Khác» — bắt
																	buộc nhập
																	tên thiết bị
																	mới (sinh mã
																	theo ngành)
																</p>
															</>
														) : (
															<p className='text-[11px] text-muted-foreground'>
																Đã khớp loại «
																{
																	otherType.categoryName
																}
																» — chọn TB có
																sẵn hoặc «Khác»
																để nhập tên mới
															</p>
														)}
													</div>
												) : dir === 'INCREASE' &&
												  isOther ? (
													// Khác + loại mới (hoặc khớp nhưng chưa có TB) → nhập tên
													<div className='space-y-1'>
														<Input
															className='h-10 text-sm min-w-[180px]'
															value={
																row.assetName
															}
															disabled={
																!filterReady ||
																!(
																	row.categoryFree ||
																	''
																).trim()
															}
															placeholder={
																isNewTypeHint
																	? 'Nhập tên thiết bị mới…'
																	: isMatchedExistingType
																		? 'Nhập tên thiết bị (loại đã khớp, chưa có TB)…'
																		: 'Tên thiết bị…'
															}
															onChange={(e) =>
																updateRow(
																	row.key,
																	{
																		nameMode:
																			'new',
																		assetName:
																			e
																				.target
																				.value,
																		assetId:
																			''
																	}
																)
															}
														/>
														{!(
															row.categoryFree ||
															''
														).trim() ? (
															<p className='text-[11px] text-muted-foreground'>
																Nhập loại ở cột
																bên trái trước
															</p>
														) : isMatchedExistingType ? (
															<p className='text-[11px] text-muted-foreground'>
																Loại «
																{
																	otherType.categoryName
																}
																» chưa có TB —
																nhập tên sẽ sinh
																mã theo ngành
															</p>
														) : (
															<p className='text-[11px] text-muted-foreground'>
																Loại mới — nhập
																tên thiết bị
																(sinh mã theo
																ngành)
															</p>
														)}
													</div>
												) : !isOther &&
												  names.length > 0 ? (
													// Loại có sẵn: chọn TB; Tăng + «Khác» → nhập tên mới
													<div className='space-y-1.5'>
														<SearchableSelect
															value={
																row.nameMode ===
																	'new' &&
																dir ===
																	'INCREASE'
																	? NAME_OTHER
																	: row.assetName
															}
															onValueChange={(
																v
															) => {
																if (
																	v ===
																		NAME_OTHER &&
																	dir ===
																		'INCREASE'
																) {
																	updateRow(
																		row.key,
																		{
																			nameMode:
																				'new',
																			assetName:
																				'',
																			assetId:
																				''
																		}
																	)
																	return
																}
																const a =
																	pickAsset(
																		row.category,
																		v
																	)
																updateRow(
																	row.key,
																	{
																		nameMode:
																			'pick',
																		assetName:
																			v,
																		assetId:
																			a
																				? String(
																						a.id
																					)
																				: '',
																		grade: String(
																			a?.grade ??
																				row.grade
																		),
																		installAddress:
																			a?.installAddress ||
																			defaultInstall
																	}
																)
															}}
															disabled={
																!filterReady ||
																!row.category
															}
															className='h-10 text-sm min-w-[240px] w-full'
															contentClassName='min-w-[min(100vw-2rem,22rem)] max-w-[min(100vw-2rem,28rem)]'
															placeholder='Chọn thiết bị…'
															searchPlaceholder='Gõ tên thiết bị…'
															emptyText='Không có thiết bị'
															options={[
																...names.map(
																	(n) => ({
																		value: n,
																		label: n,
																		keywords:
																			n
																	})
																),
																...(dir ===
																'INCREASE'
																	? [
																			{
																				value: NAME_OTHER,
																				label: 'Khác — nhập tên mới…',
																				keywords:
																					'khac other moi nhap'
																			}
																		]
																	: [])
															]}
														/>
														{dir === 'INCREASE' &&
														row.nameMode ===
															'new' ? (
															<>
																<Input
																	className='h-10 text-sm min-w-[180px]'
																	value={
																		row.assetName
																	}
																	disabled={
																		!filterReady
																	}
																	placeholder='Nhập tên thiết bị mới *'
																	autoFocus
																	onChange={(
																		e
																	) =>
																		updateRow(
																			row.key,
																			{
																				nameMode:
																					'new',
																				assetName:
																					e
																						.target
																						.value,
																				assetId:
																					''
																			}
																		)
																	}
																/>
																<p className='text-[11px] text-muted-foreground'>
																	Đã chọn
																	«Khác» — bắt
																	buộc nhập
																	tên thiết bị
																	mới
																</p>
															</>
														) : null}
													</div>
												) : !isOther ? (
													// Loại có sẵn nhưng chưa có tên trong list (tăng vẫn cho nhập để sinh mã)
													dir === 'INCREASE' ? (
														<div className='space-y-1'>
															<Input
																className='h-10 text-sm min-w-[180px]'
																value={
																	row.assetName
																}
																disabled={
																	!filterReady ||
																	!row.category
																}
																placeholder={
																	row.category
																		? 'Nhập tên thiết bị…'
																		: 'Chọn loại trước'
																}
																onChange={(e) =>
																	updateRow(
																		row.key,
																		{
																			nameMode:
																				'new',
																			assetName:
																				e
																					.target
																					.value,
																			assetId:
																				''
																		}
																	)
																}
															/>
															{row.category ? (
																<p className='text-[11px] text-muted-foreground'>
																	Chưa có TB
																	trong loại
																	này — nhập
																	tên sẽ sinh
																	mã theo
																	ngành
																</p>
															) : null}
														</div>
													) : (
														<span className='text-xs text-muted-foreground'>
															Không có TB để giảm
														</span>
													)
												) : (
													// Khác + giảm: đã xử lý otherList phía trên
													<span className='text-xs text-muted-foreground'>
														—
													</span>
												)}
											</TableCell>
											<TableCell>
												<Input
													className='h-9 text-sm w-20'
													type='number'
													min={MIN_ASSET_YEAR}
													max={maxY}
													value={row.manufactureYear}
													disabled={!filterReady}
													onChange={(e) =>
														updateRow(row.key, {
															manufactureYear:
																clampAssetYearInput(
																	e.target
																		.value
																)
														})
													}
												/>
											</TableCell>
											<TableCell>
												<Input
													className='h-9 text-sm w-20'
													type='number'
													min={MIN_ASSET_YEAR}
													max={maxY}
													value={row.usageYear}
													disabled={!filterReady}
													onChange={(e) =>
														updateRow(row.key, {
															usageYear:
																clampAssetYearInput(
																	e.target
																		.value
																)
														})
													}
												/>
											</TableCell>
											<TableCell>
												<Input
													className='h-9 text-sm min-w-[168px]'
													type='datetime-local'
													value={
														row.executedAt.includes(
															'T'
														)
															? row.executedAt.slice(
																	0,
																	16
																)
															: row.executedAt
																		.length >=
																  16
																? row.executedAt
																		.replace(
																			' ',
																			'T'
																		)
																		.slice(
																			0,
																			16
																		)
																: row.executedAt
													}
													disabled={!filterReady}
													onChange={(e) =>
														updateRow(row.key, {
															executedAt:
																e.target.value
														})
													}
												/>
											</TableCell>
											<TableCell>
												<Input
													className='h-9 text-sm'
													value={
														row.installAddress ||
														defaultInstall
													}
													disabled={!filterReady}
													placeholder={defaultInstall}
													onChange={(e) =>
														updateRow(row.key, {
															installAddress:
																e.target.value
														})
													}
												/>
											</TableCell>
											<TableCell>
												<Input
													className='h-9 text-sm w-16'
													type='number'
													min={1}
													value={row.quantity}
													disabled={!filterReady}
													onChange={(e) =>
														updateRow(row.key, {
															quantity:
																e.target.value
														})
													}
												/>
											</TableCell>
											<TableCell>
												<Select
													value={row.grade}
													onValueChange={(v) =>
														updateRow(row.key, {
															grade: v
														})
													}
													disabled={!filterReady}
												>
													<SelectTrigger className='h-9 text-sm'>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{ASSET_GRADES.map(
															(g) => (
																<SelectItem
																	key={
																		g.value
																	}
																	value={String(
																		g.value
																	)}
																>
																	{g.label}
																</SelectItem>
															)
														)}
													</SelectContent>
												</Select>
											</TableCell>
											<TableCell>
												<Input
													className='h-9 text-sm'
													value={row.decisionNumber}
													disabled={!filterReady}
													placeholder='Số QĐ'
													onChange={(e) =>
														updateRow(row.key, {
															decisionNumber:
																e.target.value
														})
													}
												/>
											</TableCell>
											<TableCell>
												<Button
													type='button'
													size='icon'
													variant='ghost'
													className='h-8 w-8 text-destructive'
													disabled={rows.length <= 1}
													onClick={() =>
														removeRow(row.key)
													}
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>

					<div className='flex flex-wrap items-center justify-between gap-2 p-3 border-t shrink-0'>
						<Button
							type='button'
							variant='outline'
							size='sm'
							disabled={!filterReady}
							onClick={() =>
								setRows((prev) => [
									...prev,
									newRow({
										executedAt: today(),
										installAddress: defaultInstall
									})
								])
							}
						>
							<Plus className='h-4 w-4 mr-1' />
							Thêm dòng
						</Button>
						<div className='flex items-center gap-2'>
							<p className='text-xs text-muted-foreground hidden sm:block max-w-md'>
								{dir === 'INCREASE' ? 'Tăng' : 'Giảm'}
								{reasonCode
									? ` · ${
											reasonOptions.find(
												(r) => r.value === reasonCode
											)?.label || reasonCode
										}`
									: ' · chưa chọn lý do'}
								. Chọn loại có sẵn; chọn «Khác» → nhập tên loại
								(không phân biệt hoa/thường: trùng loại có sẵn →
								chọn TB; không trùng → nhập tên TB mới).
							</p>
							<Button
								type='button'
								disabled={
									!filterReady ||
									!reasonCode ||
									(reasonCode === 'OTHER' &&
										!reasonOther.trim()) ||
									pending
								}
								onClick={() => void handleSubmit()}
							>
								{pending ? (
									<Loader2 className='h-4 w-4 mr-2 animate-spin' />
								) : null}
								Lưu {dir === 'INCREASE' ? 'tăng' : 'giảm'} (
								{rows.length} dòng)
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
