/**
 * Tab Import VT: chọn tòa → tầng → phòng + lý do (quyết định Tăng/Giảm) + upload file.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
	AlertCircle,
	CheckCircle2,
	Download,
	FileSpreadsheet,
	FileUp,
	Loader2,
	Search,
	Upload
} from 'lucide-react'
import { toast } from 'sonner'
import {
	CreateAssetMovement,
	CreateCatalogMaterial,
	CreateCatalogStockMovement,
	CreateRoomAsset,
	GetAssetCatalog,
	GetRoomAssets,
	UpdateRoomAsset
} from '@/api/asset'
import { useBuildingTree } from '@/hooks/useBuildings'
import {
	buildImportTemplateWorkbook,
	parseAssetImportFile,
	type ImportedAssetRow
} from '@/lib/parse-asset-import'
import {
	codeSourceLabel,
	resolveImportAssetCodes,
	type ResolvedImportRow
} from '@/lib/resolve-import-codes'
import { resolveInstallAddress } from '@/lib/export-asset-excel'
import {
	IMPORT_REASON_OPTIONS,
	resolveImportReason,
	type ImportReasonOption
} from '@/lib/asset-movement-labels'
import { extractMaterialBaseCode } from '@/lib/nganh'
import {
	buildCatalogRoomAssetCode,
	extractUnitAliasFromAssetCode
} from '@/lib/asset-code'
import useUnitsData from '@/hooks/useUnitsData'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
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
import { ErrorState } from '@/components/error-state'
import type { BuildingTree, RoomAsset } from '@/types/asset'

type UnitFlat = { id: number; alias: string; name: string }

type RoomRef = {
	id: number
	roomCode: string
	roomName: string
}

/** Phòng đơn vị dưới tòa CDHC2 (= danh mục đơn vị sử dụng) */
type UnitRoom = RoomRef & {
	alias: string
	holdingUnitId: number | null
}

/**
 * Thu thập phòng CDHC2-* (Đại đội 1, PTMHC, BTC…) và map → units.id.
 * Đây là nguồn «đơn vị sử dụng» khi trùng tên với địa chỉ lắp đặt.
 */
function buildUnitRoomsFromTree(
	tree: BuildingTree[],
	units: UnitFlat[]
): UnitRoom[] {
	const out: UnitRoom[] = []
	for (const b of tree) {
		const isCdhc2 =
			String(b.code || '')
				.trim()
				.toUpperCase() === 'CDHC2' ||
			normText(b.name).includes('cao dang hau can')
		for (const f of b.floors ?? []) {
			for (const r of f.rooms ?? []) {
				const code = String(r.roomCode || '')
					.trim()
					.toUpperCase()
				const name = String(r.roomName || '').trim()
				if (!isCdhc2 && !code.startsWith('CDHC2-')) continue
				const aliasRaw = code.includes('-')
					? code.split('-').pop() || ''
					: ''
				// Ưu tiên alias đúng case (D1 đại đội, không d1 tiểu đoàn)
				const u =
					units.find((x) => x.alias === aliasRaw) ||
					units.find(
						(x) => x.alias.toUpperCase() === aliasRaw.toUpperCase()
					) ||
					units.find((x) => normText(x.name) === normText(name)) ||
					null
				out.push({
					id: r.id,
					roomCode: r.roomCode || code,
					roomName: name,
					alias: (u?.alias || aliasRaw).toUpperCase(),
					holdingUnitId: u?.id ?? null
				})
			}
		}
	}
	return out
}

/**
 * Từ địa chỉ lắp đặt → đơn vị sử dụng nếu trùng tên phòng/đơn vị CDHC2.
 * VD: «…, Phòng Tham mưu Hậu cần» → PTMHC; «…, Đại đội 2» → D2.
 * Không khớp → null (dùng form mặc định).
 */
function matchUnitFromInstallAddress(
	installAddress: string,
	unitRooms: UnitRoom[],
	units: UnitFlat[]
): { alias: string; holdingUnitId: number; roomId?: number } | null {
	const raw = installAddress.replace(/\u00a0/g, ' ').trim()
	if (!raw) return null
	const addr = normText(raw)

	// 1) Mã CDHC2-XXX trong địa chỉ
	for (const m of raw.toUpperCase().matchAll(/\bCDHC2-([A-Z0-9]{1,12})\b/g)) {
		const alias = m[1]!
		const ur = unitRooms.find((x) => x.alias.toUpperCase() === alias)
		if (ur?.holdingUnitId != null) {
			return {
				alias: ur.alias,
				holdingUnitId: ur.holdingUnitId,
				roomId: ur.id
			}
		}
		const u = units.find((x) => x.alias.toUpperCase() === alias)
		if (u) {
			return {
				alias: u.alias.toUpperCase(),
				holdingUnitId: u.id,
				roomId: ur?.id
			}
		}
	}

	// 2) Trùng tên phòng đơn vị CDHC2 (tên dài trước)
	const byNameLen = [...unitRooms].sort(
		(a, b) => b.roomName.length - a.roomName.length
	)
	for (const ur of byNameLen) {
		const rn = normText(ur.roomName)
		if (rn.length < 3) continue
		// Tránh khớp «Phòng / PT» quá lỏng
		if (rn.length < 5 && !addr.includes(rn)) continue
		if (
			addr.includes(rn) ||
			// phần sau dấu phẩy cuối
			normText(raw.split(',').pop() || '') === rn
		) {
			if (ur.holdingUnitId != null) {
				return {
					alias: ur.alias,
					holdingUnitId: ur.holdingUnitId,
					roomId: ur.id
				}
			}
		}
	}

	// 3) Trùng tên đơn vị trong bảng units
	const unitsSorted = [...units].sort((a, b) => b.name.length - a.name.length)
	for (const u of unitsSorted) {
		const un = normText(u.name)
		if (un.length < 4) continue
		if (addr.includes(un) || normText(raw.split(',').pop() || '') === un) {
			const ur = unitRooms.find(
				(x) =>
					x.holdingUnitId === u.id ||
					x.alias.toUpperCase() === u.alias.toUpperCase()
			)
			return {
				alias: u.alias.toUpperCase(),
				holdingUnitId: u.id,
				roomId: ur?.id
			}
		}
	}

	// 4) Đại đội N
	const dd = addr.match(/dai\s*doi\s*(\d+)/)
	if (dd) {
		const alias = `D${dd[1]}`
		const ur = unitRooms.find((x) => x.alias.toUpperCase() === alias)
		const u =
			units.find((x) => x.alias === alias) ||
			units.find((x) => x.alias.toUpperCase() === alias)
		if (u) {
			return {
				alias: u.alias.toUpperCase(),
				holdingUnitId: u.id,
				roomId: ur?.id
			}
		}
	}

	return null
}

/**
 * Tìm phòng theo alias đơn vị (D1 → CDHC2-D1, D2 → CDHC2-D2, PTMHC → …).
 */
function findRoomByUnitAlias(
	tree: BuildingTree[],
	alias: string,
	unitName?: string
): RoomRef | null {
	const want = alias.trim().toUpperCase()
	if (!want) return null
	const wantName = unitName ? normText(unitName) : ''

	let byName: RoomRef | null = null
	for (const b of tree) {
		for (const f of b.floors ?? []) {
			for (const r of f.rooms ?? []) {
				const code = String(r.roomCode || '')
					.trim()
					.toUpperCase()
				const name = String(r.roomName || '').trim()
				// CDHC2-D2 / …-D2
				if (
					code === want ||
					code.endsWith(`-${want}`) ||
					code.split('-').pop() === want
				) {
					return {
						id: r.id,
						roomCode: r.roomCode || code,
						roomName: name
					}
				}
				if (
					wantName &&
					(normText(name) === wantName ||
						normText(name).includes(wantName) ||
						wantName.includes(normText(name)))
				) {
					byName = {
						id: r.id,
						roomCode: r.roomCode || code,
						roomName: name
					}
				}
			}
		}
	}
	return byName
}

function today() {
	return new Date().toISOString().slice(0, 10)
}

function normText(s: string | null | undefined): string {
	return String(s ?? '')
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'd')
		.toLocaleLowerCase('vi')
		.replace(/\s+/g, ' ')
		.trim()
}

function normAddr(s: string | null | undefined): string {
	return normText(s)
}

/** «Đại đội 2» khớp «…, Đại đội 2» hoặc hậu tố D2 */
function installAddressMatches(
	a: string | null | undefined,
	b: string | null | undefined
): boolean {
	const na = normAddr(a)
	const nb = normAddr(b)
	if (!na || !nb) return false
	if (na === nb) return true
	if (na.includes(nb) || nb.includes(na)) return true
	const ma = na.match(/dai\s*doi\s*(\d+)/)
	const mb = nb.match(/dai\s*doi\s*(\d+)/)
	if (ma && mb && ma[1] === mb[1]) return true
	return false
}

/**
 * Suy đơn vị sử dụng (D1, PTMHC, BTC…) từ địa chỉ lắp đặt / mã phòng.
 *
 * Hỗ trợ format thực tế trong DB:
 * - «Trường …, Toàn trường, Phòng Tham mưu Hậu cần»
 * - «CDHC2 / CDHC2-BTC — Ban Tài chính»
 * - «Đại đội 2»
 */
function resolveUnitFromContext(
	opts: {
		installAddress?: string | null
		roomCode?: string | null
		roomName?: string | null
	},
	units: UnitFlat[]
): { alias: string; holdingUnitId: number } | null {
	const rawAddr = String(opts.installAddress ?? '')
		.replace(/\u00a0/g, ' ')
		.trim()
	const addr = normAddr(rawAddr)
	const roomCode = String(opts.roomCode || '')
		.trim()
		.toUpperCase()
	const roomName = normAddr(opts.roomName)

	const byAlias = (alias: string) => {
		const a = alias.trim().toUpperCase()
		if (!a) return null
		const u = units.find((x) => x.alias.toUpperCase() === a)
		return u ? { alias: u.alias.toUpperCase(), holdingUnitId: u.id } : null
	}

	if (addr || rawAddr) {
		// a) Mã phòng nhúng: CDHC2-BTC, CDHC2-D2, CDHC2-PTMHC
		const codeHits = [
			...rawAddr.toUpperCase().matchAll(/\bCDHC2-([A-Z0-9]{1,12})\b/g)
		]
		for (const m of codeHits) {
			const hit = byAlias(m[1]!)
			if (hit) return hit
		}
		// b) «— Ban Tài chính» / «- Ban Kỹ thuật» sau gạch
		const afterDash = rawAddr.split(/[—–-]/).pop()?.trim() || ''
		if (afterDash.length >= 3) {
			const nDash = normAddr(afterDash)
			const sorted = [...units].sort(
				(a, b) => b.name.length - a.name.length
			)
			for (const u of sorted) {
				const un = normText(u.name)
				if (un.length < 4) continue
				if (nDash === un || nDash.includes(un) || un.includes(nDash)) {
					return {
						alias: u.alias.toUpperCase(),
						holdingUnitId: u.id
					}
				}
			}
		}
		// c) Phần sau dấu phẩy cuối: «…, Phòng Tham mưu Hậu cần»
		const parts = rawAddr
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean)
		if (parts.length >= 1) {
			const last = parts[parts.length - 1]!
			const nLast = normAddr(last)
			// bỏ tiền tố «Toàn trường» nếu lỡ
			if (nLast && !/^toan\s*truong$/.test(nLast)) {
				const sorted = [...units].sort(
					(a, b) => b.name.length - a.name.length
				)
				for (const u of sorted) {
					const un = normText(u.name)
					if (un.length < 4) continue
					if (
						nLast === un ||
						nLast.includes(un) ||
						un.includes(nLast)
					) {
						return {
							alias: u.alias.toUpperCase(),
							holdingUnitId: u.id
						}
					}
				}
			}
		}
		// d) Đại đội N
		const dd = addr.match(/dai\s*doi\s*(\d+)/)
		if (dd) {
			const hit = byAlias(`D${dd[1]}`)
			if (hit) return hit
		}
		// e) Khớp tên đơn vị trong cả chuỗi địa chỉ (tên dài trước, bỏ tên quá ngắn)
		const sorted = [...units].sort((a, b) => b.name.length - a.name.length)
		for (const u of sorted) {
			const un = normText(u.name)
			// «Phòng / PT» quá ngắn/mơ hồ — chỉ exact segment
			if (un.length < 5) continue
			if (addr.includes(un)) {
				return {
					alias: u.alias.toUpperCase(),
					holdingUnitId: u.id
				}
			}
		}
		// f) Alias đứng riêng trong địa chỉ
		for (const u of units) {
			const ua = u.alias.toUpperCase()
			if (ua.length < 2) continue
			const re = new RegExp(
				`(^|[^A-Z0-9])${ua.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Z0-9]|$)`,
				'i'
			)
			if (re.test(rawAddr)) {
				return { alias: ua, holdingUnitId: u.id }
			}
		}
	}

	// 2) roomCode: CDHC2-D2 → D2
	if (roomCode.includes('-')) {
		const tail = roomCode.split('-').pop() || ''
		const hit = byAlias(tail)
		if (hit) return hit
	} else if (roomCode) {
		const hit = byAlias(roomCode)
		if (hit) return hit
	}

	// 3) Tên phòng
	if (roomName) {
		const sorted = [...units].sort((a, b) => b.name.length - a.name.length)
		for (const u of sorted) {
			const un = normText(u.name)
			if (un.length < 4) continue
			if (roomName.includes(un) || un.includes(roomName)) {
				return {
					alias: u.alias.toUpperCase(),
					holdingUnitId: u.id
				}
			}
		}
	}

	return null
}

function matchRoomAsset(
	list: RoomAsset[],
	code: string,
	opts?: {
		installAddress?: string | null
		holdingUnitId?: number | null
		unitAlias?: string | null
		grade?: number | null
	}
): RoomAsset | undefined {
	const raw = (code || '').trim().toUpperCase()
	if (!raw) return undefined
	const base = extractMaterialBaseCode(raw) || raw
	const wantAlias = (
		opts?.unitAlias ||
		extractUnitAliasFromAssetCode(raw) ||
		''
	)
		.trim()
		.toUpperCase()
	const wantHold = opts?.holdingUnitId ?? null
	const wantGrade =
		opts?.grade != null && opts.grade >= 1
			? Math.min(5, Math.round(opts.grade))
			: null

	const byMaterial = list.filter((a) => {
		const ac = (a.code || '').trim().toUpperCase()
		if (!ac) return false
		if (ac === raw) return true
		const ab = extractMaterialBaseCode(ac) || ac
		return ab === base || ac === base
	})
	if (!byMaterial.length) return undefined

	const stable = (a: RoomAsset) => {
		const g = Number(a.grade ?? 1)
		const st = String(a.status || 'NORMAL').toUpperCase()
		return g <= 4 && st !== 'BROKEN' && st !== 'REPAIRING'
	}

	// 1) Khớp mã đầy đủ (đã có -G2-D2)
	const exact = byMaterial.find((a) => (a.code || '').toUpperCase() === raw)
	if (exact) {
		// Vẫn kiểm tra đơn vị nếu chỉ định rõ khác
		if (
			wantHold != null &&
			exact.holdingUnitId != null &&
			exact.holdingUnitId !== wantHold
		) {
			// mã exact nhưng unit lệch — vẫn tin mã
		}
		return exact
	}

	// 2) Cùng holdingUnitId
	if (wantHold != null) {
		const byUnit = byMaterial.filter((a) => a.holdingUnitId === wantHold)
		if (byUnit.length) {
			const gHit =
				wantGrade != null
					? byUnit.find((a) => Number(a.grade ?? 1) === wantGrade)
					: undefined
			return gHit || byUnit.find(stable) || byUnit[0]
		}
	}

	// 3) Cùng hậu tố đơn vị trên mã (-D2)
	if (wantAlias) {
		const byAlias = byMaterial.filter((a) => {
			const al = extractUnitAliasFromAssetCode(a.code)
			return al && al.toUpperCase() === wantAlias
		})
		if (byAlias.length) {
			const gHit =
				wantGrade != null
					? byAlias.find((a) => Number(a.grade ?? 1) === wantGrade)
					: undefined
			return gHit || byAlias.find(stable) || byAlias[0]
		}
	}

	// 4) Fuzzy địa chỉ lắp đặt (Đại đội 2 ⊆ full address)
	const wantAddr = opts?.installAddress
	if (wantAddr && normAddr(wantAddr)) {
		const byAddr = byMaterial.filter((a) =>
			installAddressMatches(a.installAddress, wantAddr)
		)
		if (byAddr.length) {
			const gHit =
				wantGrade != null
					? byAddr.find((a) => Number(a.grade ?? 1) === wantGrade)
					: undefined
			return gHit || byAddr.find(stable) || byAddr[0]
		}
		// Có địa chỉ chỉ định nhưng không khớp dòng nào → KHÔNG gộp sang đơn vị khác
		return undefined
	}

	// 5) Không có gợi ý đơn vị: chỉ gộp dòng không có unit / cùng base ổn định
	// Tránh gộp nhầm D1 khi import D2
	if (wantAlias || wantHold != null) {
		return undefined
	}

	return byMaterial.find(stable) || byMaterial[0]
}

/**
 * Địa chỉ lắp đặt khi import — ưu tiên tuyệt đối:
 * 1) fileInstallAddress / installAddress từ Excel → chỉ dùng file
 * 2) Không có trong file → form / gợi ý tòa–tầng–phòng
 *
 * Lưu ý: form mặc định KHÔNG được ghi đè địa chỉ từng dòng trong file.
 */
function resolveRowInstallAddress(
	row: {
		installAddress?: string
		fileInstallAddress?: string
		effectiveInstallAddress?: string
	},
	formInstall: string,
	roomDefault: string
): { address: string; source: 'file' | 'form' | 'none' } {
	// Snapshot từ file (parse) — ưu tiên cao nhất
	const fromFile = String(row.fileInstallAddress ?? row.installAddress ?? '')
		.replace(/\u00a0/g, ' ')
		.trim()
	if (fromFile) {
		return { address: fromFile, source: 'file' }
	}
	// Chỉ khi file không có địa chỉ mới dùng form / gợi ý phòng
	const fromForm = formInstall.replace(/\u00a0/g, ' ').trim()
	if (fromForm) {
		return { address: fromForm, source: 'form' }
	}
	const fromRoom = roomDefault.replace(/\u00a0/g, ' ').trim()
	if (fromRoom) {
		return { address: fromRoom, source: 'form' }
	}
	return { address: '', source: 'none' }
}

function resolveRowMovement(
	row: ImportedAssetRow | ResolvedImportRow,
	formOpt: ImportReasonOption | null,
	formOther: string
): {
	reasonCode: string
	movementType: 'INCREASE' | 'DECREASE'
	reasonLabel: string
	reasonOther?: string
} {
	// Ưu tiên lý do từng dòng trong file
	if (row.reasonRaw?.trim() || row.reasonCode) {
		const r = resolveImportReason(row.reasonRaw || row.reasonLabel, formOpt)
		return {
			reasonCode: row.reasonCode || r.reasonCode,
			movementType: row.movementType || r.movementType,
			reasonLabel: row.reasonLabel || r.label,
			reasonOther:
				row.reasonOther ||
				r.reasonOther ||
				((row.reasonCode || r.reasonCode) === 'OTHER'
					? row.reasonRaw || formOther || 'Import file'
					: undefined)
		}
	}
	// Form mặc định
	if (formOpt) {
		return {
			reasonCode: formOpt.reasonCode,
			movementType: formOpt.movementType,
			reasonLabel: formOpt.label,
			reasonOther:
				formOpt.reasonCode === 'OTHER'
					? formOther.trim() || 'Import file'
					: undefined
		}
	}
	return {
		reasonCode: 'OTHER',
		movementType: 'INCREASE',
		reasonLabel: 'Khác (tăng)',
		reasonOther: formOther.trim() || 'Import file'
	}
}

export default function AssetImportPanel() {
	const qc = useQueryClient()
	const {
		data: tree = [],
		isLoading: treeLoading,
		error: treeError,
		refetch
	} = useBuildingTree()
	const { data: unitsTree = [] } = useUnitsData()

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
		return list
	}, [unitsTree])

	const [buildingId, setBuildingId] = useState('')
	const [floorId, setFloorId] = useState('')
	const [roomId, setRoomId] = useState('')
	/**
	 * Đơn vị sử dụng form (D1, D2, BGH…) — mặc định khi file không có cột đơn vị SD.
	 * Gợi ý theo phòng đã chọn; admin chọn tay.
	 */
	const [formUnitId, setFormUnitId] = useState('')
	/**
	 * Địa chỉ lắp đặt form — dùng khi dòng file không có cột địa chỉ.
	 * Tự gợi ý theo tòa/tầng/phòng; admin có thể sửa.
	 */
	const [formInstallAddress, setFormInstallAddress] = useState('')
	/** Lý do form — quyết định Tăng/Giảm cho dòng không có cột Lý do */
	const [reasonKey, setReasonKey] = useState('PURCHASE')
	const [reasonOther, setReasonOther] = useState('')
	/**
	 * Ngành danh mục khi import (HC2A…) — chỉ cần ngành + loại vật trong file
	 * để sinh mã / đẩy vào danh mục ngành.
	 */
	const [importNganhCode, setImportNganhCode] = useState('')
	const [catalogNganhOptions, setCatalogNganhOptions] = useState<
		{ value: string; label: string; keywords: string }[]
	>([])

	useEffect(() => {
		void GetAssetCatalog()
			.then((c) => {
				setCatalogNganhOptions(
					(c.nganh || []).map((n) => ({
						value: n.code,
						label: `${n.code} — ${n.name}`,
						keywords: `${n.code} ${n.name}`
					}))
				)
				if (!importNganhCode && c.nganh?.[0]?.code) {
					// không auto-set — admin chọn ngành khi import
				}
			})
			.catch(() => {})
	}, [])
	/** Dòng sau parse + gán/sinh mã từ danh mục */
	const [rows, setRows] = useState<ResolvedImportRow[]>([])
	const [fileName, setFileName] = useState('')
	const [parsing, setParsing] = useState(false)
	const [resolvingCodes, setResolvingCodes] = useState(false)
	const [importing, setImporting] = useState(false)
	const [progress, setProgress] = useState({ done: 0, total: 0 })
	/** Lọc danh sách xem trước: all | ok | err */
	const [previewFilter, setPreviewFilter] = useState<'all' | 'ok' | 'err'>(
		'ok'
	)
	const [previewSearch, setPreviewSearch] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	/** Cuộn tới danh sách xem xét sau khi đọc file */
	const previewSectionRef = useRef<HTMLDivElement>(null)

	const formReasonOpt = useMemo(
		() => IMPORT_REASON_OPTIONS.find((o) => o.key === reasonKey) ?? null,
		[reasonKey]
	)

	const building = useMemo(
		() => tree.find((b) => String(b.id) === buildingId),
		[tree, buildingId]
	)
	const floors = building?.floors ?? []
	const floor = useMemo(
		() => floors.find((f) => String(f.id) === floorId),
		[floors, floorId]
	)
	const rooms = floor?.rooms ?? []
	const room = useMemo(
		() => rooms.find((r) => String(r.id) === roomId),
		[rooms, roomId]
	)

	/** Gợi ý địa chỉ từ tòa/tầng/phòng đã chọn */
	const roomInstallDefault = useMemo(() => {
		if (!room) return ''
		return resolveInstallAddress({
			buildingName: building?.name,
			buildingCode: building?.code,
			floorName: floor?.name,
			roomName: room.roomName,
			roomCode: room.roomCode
		})
	}, [building, floor, room])

	/**
	 * Đơn vị / quản lý gắn với phòng đã chọn (CDHC2-D2 → D2, hoặc khớp tên phòng).
	 * Đây là nguồn «đơn vị sử dụng» mặc định sau khi chọn tòa → tầng → phòng.
	 */
	const roomSuggestedUnit = useMemo(() => {
		if (!room) return null
		return resolveUnitFromContext(
			{
				roomCode: room.roomCode,
				roomName: room.roomName,
				installAddress: roomInstallDefault
			},
			allUnits
		)
	}, [room, roomInstallDefault, allUnits])

	const formUnit = useMemo(
		() => allUnits.find((u) => String(u.id) === formUnitId) ?? null,
		[allUnits, formUnitId]
	)

	/**
	 * Options «Đơn vị sử dụng» = quản lý/đơn vị của phòng đang chọn (+ Khác).
	 * Ưu tiên đơn vị map từ phòng; kèm tên người QL phòng nếu có.
	 */
	const formUnitOptions = useMemo(() => {
		const opts: {
			value: string
			label: string
			keywords: string
		}[] = []
		const seen = new Set<string>()

		const pushUnit = (u: UnitFlat, extra?: string) => {
			const id = String(u.id)
			if (seen.has(id)) return
			seen.add(id)
			const ql = extra ? ` · QL: ${extra}` : ''
			opts.push({
				value: id,
				label: `${u.alias} — ${u.name}${ql}`,
				keywords: `${u.alias} ${u.name} ${extra ?? ''}`
			})
		}

		// 1) Đơn vị map từ phòng đã chọn
		if (roomSuggestedUnit) {
			const u = allUnits.find(
				(x) => x.id === roomSuggestedUnit.holdingUnitId
			)
			if (u) {
				const managerName = (
					room as { manager?: string | null } | undefined
				)?.manager
				pushUnit(u, managerName?.trim() || undefined)
			}
		}

		// 2) Nếu phòng có managerCode trùng alias đơn vị khác
		const mgrCode = String(
			(room as { managerCode?: string | null } | undefined)
				?.managerCode ?? ''
		)
			.trim()
			.toUpperCase()
		if (mgrCode) {
			const byCode =
				allUnits.find((u) => u.alias.toUpperCase() === mgrCode) ||
				allUnits.find((u) => mgrCode.includes(u.alias.toUpperCase()))
			if (byCode) {
				const managerName = (
					room as { manager?: string | null } | undefined
				)?.manager
				pushUnit(byCode, managerName?.trim() || undefined)
			}
		}

		// 3) Các đơn vị còn lại (để chọn khi khác phòng)
		for (const u of allUnits) {
			pushUnit(u)
		}

		return opts
	}, [allUnits, roomSuggestedUnit, room])

	// Khi đổi phòng → gợi ý địa chỉ + gán đơn vị = quản lý/đơn vị của phòng đó
	const prevRoomDefaultRef = useRef('')
	useEffect(() => {
		if (!roomInstallDefault) return
		const prev = prevRoomDefaultRef.current
		setFormInstallAddress((cur) => {
			if (!cur.trim() || cur.trim() === prev.trim()) {
				return roomInstallDefault
			}
			return cur
		})
		prevRoomDefaultRef.current = roomInstallDefault
	}, [roomInstallDefault])

	// Chọn phòng → đơn vị sử dụng = đơn vị/quản lý của phòng (luôn đồng bộ khi đổi phòng)
	useEffect(() => {
		if (!room) {
			setFormUnitId('')
			return
		}
		if (roomSuggestedUnit) {
			setFormUnitId(String(roomSuggestedUnit.holdingUnitId))
		} else {
			setFormUnitId('')
		}
	}, [room, roomSuggestedUnit])

	const rowsWithInstallFromFile = useMemo(
		() =>
			rows.filter((r) =>
				String(r.fileInstallAddress ?? r.installAddress ?? '').trim()
			).length,
		[rows]
	)
	const rowsNeedFormInstall = useMemo(
		() =>
			rows.filter(
				(r) =>
					!String(
						r.fileInstallAddress ?? r.installAddress ?? ''
					).trim()
			).length,
		[rows]
	)

	/** Phòng đơn vị CDHC2 (map tên ↔ đơn vị sử dụng) */
	const unitRooms = useMemo(
		() => buildUnitRoomsFromTree(tree, allUnits),
		[tree, allUnits]
	)

	/**
	 * Đơn vị sử dụng:
	 * 1) Cột «Đơn vị sử dụng» trong file
	 * 2) Trùng tên trong địa chỉ lắp đặt với phòng CDHC2 / units
	 * 3) Form mặc định
	 */
	function resolveHoldingUnitForRow(row: {
		holdingUnitRaw?: string
		fileHoldingUnitRaw?: string
		installAddress?: string
		fileInstallAddress?: string
	}): {
		alias: string
		holdingUnitId: number
		roomId?: number
		source: 'file_col' | 'address' | 'form'
	} | null {
		const colRaw = String(
			row.fileHoldingUnitRaw ?? row.holdingUnitRaw ?? ''
		)
			.replace(/\u00a0/g, ' ')
			.trim()
		if (colRaw) {
			const fromCol =
				resolveUnitFromContext(
					{
						installAddress: colRaw,
						roomCode: colRaw,
						roomName: colRaw
					},
					allUnits
				) ||
				(() => {
					const u = allUnits.find(
						(x) =>
							x.alias.toUpperCase() === colRaw.toUpperCase() ||
							normText(x.name) === normText(colRaw)
					)
					return u
						? {
								alias: u.alias.toUpperCase(),
								holdingUnitId: u.id
							}
						: null
				})()
			if (fromCol) {
				const ur = unitRooms.find(
					(x) =>
						x.holdingUnitId === fromCol.holdingUnitId ||
						x.alias.toUpperCase() === fromCol.alias
				)
				return {
					...fromCol,
					roomId: ur?.id,
					source: 'file_col'
				}
			}
		}

		const addr = String(row.fileInstallAddress ?? row.installAddress ?? '')
			.replace(/\u00a0/g, ' ')
			.trim()
		if (addr) {
			const fromAddr = matchUnitFromInstallAddress(
				addr,
				unitRooms,
				allUnits
			)
			if (fromAddr) {
				return { ...fromAddr, source: 'address' }
			}
		}

		if (formUnit) {
			const ur = unitRooms.find(
				(x) =>
					x.holdingUnitId === formUnit.id ||
					x.alias.toUpperCase() === formUnit.alias.toUpperCase()
			)
			return {
				alias: formUnit.alias.toUpperCase(),
				holdingUnitId: formUnit.id,
				roomId: ur?.id,
				source: 'form'
			}
		}
		return null
	}

	const enrichedRows = useMemo(
		() =>
			rows.map((r) => {
				const m = resolveRowMovement(r, formReasonOpt, reasonOther)
				const inst = resolveRowInstallAddress(
					r,
					formInstallAddress,
					roomInstallDefault
				)
				// Preview: dùng địa chỉ hiệu lực (file) để suy đơn vị
				const hu = resolveHoldingUnitForRow({
					...r,
					installAddress: inst.address,
					fileInstallAddress:
						inst.source === 'file'
							? inst.address
							: r.fileInstallAddress
				})
				const unitLabel = hu
					? allUnits.find((u) => u.id === hu.holdingUnitId)
					: null
				return {
					...r,
					...m,
					effectiveInstallAddress: inst.address,
					installFromFile: inst.source === 'file',
					installSource: inst.source,
					previewUnitAlias: hu?.alias,
					previewUnitName: unitLabel
						? `${unitLabel.alias} — ${unitLabel.name}`
						: hu?.alias,
					unitFromFile:
						hu?.source === 'file_col' || hu?.source === 'address',
					unitSource: hu?.source
				}
			}),
		[
			rows,
			formReasonOpt,
			reasonOther,
			formInstallAddress,
			roomInstallDefault,
			allUnits,
			formUnit,
			unitRooms
		]
	)

	const validRows = enrichedRows.filter(
		(r) =>
			!r.error &&
			r.name.trim() &&
			(Number(r.quantity) || 0) >= 1 &&
			!!r.code?.trim() &&
			r.codeSource !== 'unresolved'
	)
	const errorRows = enrichedRows.filter(
		(r) =>
			!!r.error ||
			!r.name.trim() ||
			(Number(r.quantity) || 0) < 1 ||
			!r.code?.trim() ||
			r.codeSource === 'unresolved'
	)
	const matchedCount = validRows.filter(
		(r) => r.codeSource === 'matched'
	).length
	const generatedCount = validRows.filter(
		(r) => r.codeSource === 'generated'
	).length
	const fileCodeCount = validRows.filter(
		(r) => r.codeSource === 'file'
	).length
	const incCount = validRows.filter(
		(r) => r.movementType === 'INCREASE'
	).length
	const decCount = validRows.filter(
		(r) => r.movementType === 'DECREASE'
	).length
	const totalQty = useMemo(
		() => validRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
		[validRows]
	)

	/** Danh sách admin xem xét (lọc + tìm) */
	const previewRows = useMemo(() => {
		let list =
			previewFilter === 'ok'
				? validRows
				: previewFilter === 'err'
					? errorRows
					: enrichedRows
		const q = previewSearch
			.trim()
			.toLocaleLowerCase('vi')
			.split(/\s+/)
			.filter(Boolean)
		if (q.length) {
			list = list.filter((r) => {
				const hay = [
					r.code,
					r.name,
					r.category,
					r.unit,
					r.reasonLabel,
					r.reasonRaw,
					r.installAddress,
					(r as { effectiveInstallAddress?: string })
						.effectiveInstallAddress,
					r.description,
					String(r.grade),
					String(r.quantity)
				]
					.filter(Boolean)
					.join(' ')
					.toLocaleLowerCase('vi')
				return q.every((p) => hay.includes(p))
			})
		}
		return list
	}, [previewFilter, previewSearch, validRows, errorRows, enrichedRows])

	async function onFile(file: File | null) {
		if (!file) return
		setParsing(true)
		setResolvingCodes(true)
		setFileName(file.name)
		try {
			const parsed = await parseAssetImportFile(file)
			if (!parsed.length) {
				toast.error('Không đọc được dòng dữ liệu nào trong file')
				setRows([])
				return
			}
			// Gán / sinh mã từ danh mục (tên + loại)
			let catalog: Awaited<ReturnType<typeof GetAssetCatalog>>
			try {
				catalog = await GetAssetCatalog()
			} catch {
				catalog = { nganh: [], chuyenNganh: [], materials: [] }
				toast.warning(
					'Không tải được danh mục VT — chỉ dùng mã có sẵn trong file'
				)
			}
			const resolved = resolveImportAssetCodes(parsed, {
				materials: catalog.materials,
				chuyenNganh: catalog.chuyenNganh,
				nganh: catalog.nganh,
				defaultNganhCode: importNganhCode || undefined
			})
			setRows(resolved)
			setPreviewFilter('ok')
			setPreviewSearch('')
			const ok = resolved.filter(
				(r) =>
					!r.error &&
					r.name.trim() &&
					(Number(r.quantity) || 0) >= 1 &&
					r.codeSource !== 'unresolved' &&
					!!r.code?.trim()
			).length
			const gen = resolved.filter(
				(r) => r.codeSource === 'generated'
			).length
			const matched = resolved.filter(
				(r) => r.codeSource === 'matched'
			).length
			toast.success(
				`Đã đọc ${resolved.length} dòng · ${ok} hợp lệ` +
					(matched ? ` · ${matched} khớp DM` : '') +
					(gen ? ` · ${gen} sinh mã mới` : '')
			)
			// Cuộn xuống danh sách xem xét (layout cho phép scroll trang)
			requestAnimationFrame(() => {
				setTimeout(() => {
					previewSectionRef.current?.scrollIntoView({
						behavior: 'smooth',
						block: 'start'
					})
				}, 80)
			})
		} catch (err) {
			toast.error('Không đọc được file', {
				description: (err as Error).message
			})
			setRows([])
		} finally {
			setParsing(false)
			setResolvingCodes(false)
			if (inputRef.current) inputRef.current.value = ''
		}
	}

	function downloadTemplate() {
		const blob = buildImportTemplateWorkbook()
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'mau-import-vat-tu.xlsx'
		a.click()
		URL.revokeObjectURL(url)
	}

	async function handleImport() {
		if (!roomId) {
			toast.error('Chọn tòa nhà → tầng → phòng trước khi import')
			return
		}
		if (!formUnitId) {
			toast.error('Chọn đơn vị sử dụng trước khi import')
			return
		}
		if (!validRows.length) {
			toast.error('Không có dòng hợp lệ để import')
			return
		}
		if (!formReasonOpt && validRows.some((r) => !r.reasonRaw?.trim())) {
			toast.error('Chọn lý do import (quyết định Tăng hoặc Giảm)')
			return
		}
		if (
			formReasonOpt?.reasonCode === 'OTHER' &&
			!reasonOther.trim() &&
			validRows.some(
				(r) =>
					!r.reasonRaw?.trim() ||
					(r.reasonCode === 'OTHER' && !r.reasonOther)
			)
		) {
			// vẫn cho import với "Import file" fallback
		}

		const defaultRoomId = Number(roomId)

		setImporting(true)
		setProgress({ done: 0, total: validRows.length })
		let ok = 0
		let fail = 0
		const errors: string[] = []

		/** Cache VT theo phòng (phòng form hoặc phòng đơn vị CDHC2 khi khớp tên) */
		const assetsByRoom = new Map<number, RoomAsset[]>()
		async function loadRoomAssets(rid: number): Promise<RoomAsset[]> {
			let list = assetsByRoom.get(rid)
			if (list) return list
			try {
				list = await GetRoomAssets(rid)
			} catch {
				list = []
			}
			assetsByRoom.set(rid, list)
			return list
		}
		await loadRoomAssets(defaultRoomId)

		const unitRoomsLive = buildUnitRoomsFromTree(tree, allUnits)

		for (let i = 0; i < validRows.length; i++) {
			const row = validRows[i]!
			const mv = resolveRowMovement(row, formReasonOpt, reasonOther)
			const qty = Math.max(0, Number(row.quantity) || 0)
			/**
			 * Địa chỉ lắp đặt: file nếu có → ghi đúng text đó; không → form.
			 */
			const fileOnly = String(
				(row as { fileInstallAddress?: string }).fileInstallAddress ??
					row.installAddress ??
					''
			)
				.replace(/\u00a0/g, ' ')
				.trim()
			const formOnly = formInstallAddress.replace(/\u00a0/g, ' ').trim()
			const roomOnly = roomInstallDefault.replace(/\u00a0/g, ' ').trim()
			const installAddr = fileOnly || formOnly || roomOnly
			const installFromFile = !!fileOnly
			const grade = row.grade || 1

			/**
			 * Đơn vị sử dụng (holdingUnitId):
			 * 1) Cột «Đơn vị sử dụng» trong file
			 * 2) Trùng tên địa chỉ với phòng CDHC2 (Đại đội 1, PTMHC, BTC…)
			 * 3) Form «Đơn vị sử dụng» mặc định
			 */
			const fileUnitRaw = String(
				(
					row as {
						fileHoldingUnitRaw?: string
						holdingUnitRaw?: string
					}
				).fileHoldingUnitRaw ??
					(row as { holdingUnitRaw?: string }).holdingUnitRaw ??
					''
			)
				.replace(/\u00a0/g, ' ')
				.trim()

			let unitCtx: {
				alias: string
				holdingUnitId: number
				roomId?: number
			} | null = null

			if (fileUnitRaw) {
				const u =
					resolveUnitFromContext(
						{
							installAddress: fileUnitRaw,
							roomCode: fileUnitRaw,
							roomName: fileUnitRaw
						},
						allUnits
					) ||
					(() => {
						const hit = allUnits.find(
							(x) =>
								x.alias.toUpperCase() ===
									fileUnitRaw.toUpperCase() ||
								normText(x.name) === normText(fileUnitRaw)
						)
						return hit
							? {
									alias: hit.alias.toUpperCase(),
									holdingUnitId: hit.id
								}
							: null
					})()
				if (u) {
					const ur = unitRoomsLive.find(
						(x) =>
							x.holdingUnitId === u.holdingUnitId ||
							x.alias.toUpperCase() === u.alias
					)
					unitCtx = { ...u, roomId: ur?.id }
				}
			}

			// Trùng tên địa chỉ ↔ phòng đơn vị CDHC2
			if (!unitCtx && installFromFile && installAddr) {
				unitCtx = matchUnitFromInstallAddress(
					installAddr,
					unitRoomsLive,
					allUnits
				)
			}

			// Form mặc định
			if (!unitCtx && formUnit) {
				const ur = unitRoomsLive.find(
					(x) =>
						x.holdingUnitId === formUnit.id ||
						x.alias.toUpperCase() === formUnit.alias.toUpperCase()
				)
				unitCtx = {
					alias: formUnit.alias.toUpperCase(),
					holdingUnitId: formUnit.id,
					roomId: ur?.id
				}
			}

			if (!unitCtx) {
				throw new Error(
					`Dòng ${row.rowIndex}: không gán được đơn vị sử dụng. ` +
						`Chọn form «Đơn vị sử dụng» hoặc ghi địa chỉ trùng tên phòng CDHC2 (vd. Phòng Tham mưu Hậu cần).`
				)
			}

			// Phòng lưu: phòng đơn vị CDHC2 nếu khớp; không thì phòng form
			const targetRoomId = unitCtx.roomId ?? defaultRoomId
			const roomAssets = await loadRoomAssets(targetRoomId)

			const materialBase =
				extractMaterialBaseCode(row.code) ||
				String(row.code || '')
					.trim()
					.toUpperCase()
					.replace(/-G[1-5](-[A-Z0-9]+)?$/i, '')
			/** Mã: …-G2-PTMHC theo đơn vị sử dụng */
			const fullCode = buildCatalogRoomAssetCode(
				materialBase,
				grade,
				unitCtx.alias
			)
			const codeForMatch = fullCode || row.code

			try {
				if (qty < 1) {
					throw new Error('Số lượng phải ≥ 1')
				}

				const matchOpts = {
					installAddress: installAddr || null,
					holdingUnitId: unitCtx.holdingUnitId,
					unitAlias: unitCtx.alias,
					grade
				}
				const existing = matchRoomAsset(
					roomAssets,
					codeForMatch,
					matchOpts
				)

				if (mv.movementType === 'DECREASE') {
					const decTarget =
						existing ||
						matchRoomAsset(roomAssets, codeForMatch, matchOpts)
					if (!decTarget) {
						throw new Error(
							`Giảm (${mv.reasonLabel}): không tìm thấy VT «${codeForMatch}»` +
								(unitCtx ? ` (đơn vị ${unitCtx.alias})` : '') +
								(installAddr
									? ` · ĐC «${installAddr}»`
									: ' trong phòng')
						)
					}
					const stock = Number(decTarget.quantity) || 0
					if (stock < qty) {
						throw new Error(
							`Giảm ${qty} nhưng tồn chỉ còn ${stock} (${decTarget.code})`
						)
					}
					await CreateAssetMovement(decTarget.id, {
						movementType: 'DECREASE',
						executedAt: today(),
						quantity: qty,
						grade: grade || decTarget.grade || 1,
						installAddress: installFromFile
							? installAddr
							: installAddr ||
								decTarget.installAddress ||
								undefined,
						reasonCode: mv.reasonCode,
						reasonOther:
							mv.reasonCode === 'OTHER'
								? mv.reasonOther || 'Import file'
								: undefined,
						note: `Import từ ${fileName || 'file'} · ${mv.reasonLabel}`
					})
					decTarget.quantity = stock - qty
					// Đồng bộ giảm danh mục ngành (nếu còn SL DM)
					const cnDec =
						row.chuyenNganhCode ||
						(materialBase && materialBase.length >= 6
							? materialBase.slice(0, 6)
							: '')
					const ngDec =
						row.nganhCode ||
						importNganhCode ||
						(cnDec ? cnDec.slice(0, 4) : '') ||
						(materialBase ? materialBase.slice(0, 4) : '')
					if (ngDec && row.name.trim()) {
						try {
							await CreateCatalogStockMovement({
								movementType: 'DECREASE',
								nganhCode: ngDec,
								chuyenNganhCode: cnDec || undefined,
								materialCode: materialBase || undefined,
								materialName: row.name.trim(),
								quantity: qty,
								unit: row.unit || decTarget.unit || 'Bộ',
								reason: mv.reasonLabel || 'Import file',
								note: `Import giảm từ ${fileName || 'file'}`
							})
						} catch {
							// thiếu SL DM — bỏ qua, đã giảm trên phòng
						}
					}
				} else {
					// Đồng bộ danh mục ngành + log tăng (tạo loại/VT mới nếu cần)
					const cnCode =
						row.chuyenNganhCode ||
						(materialBase && materialBase.length >= 6
							? materialBase.slice(0, 6)
							: '')
					const ngCode =
						row.nganhCode ||
						importNganhCode ||
						(cnCode ? cnCode.slice(0, 4) : '') ||
						(materialBase ? materialBase.slice(0, 4) : '')
					if (ngCode && row.name.trim() && qty > 0) {
						try {
							await CreateCatalogStockMovement({
								movementType: 'INCREASE',
								nganhCode: ngCode,
								chuyenNganhCode: cnCode || undefined,
								chuyenNganhName:
									row.category &&
									!/^khác$/i.test(row.category)
										? row.category
										: undefined,
								materialCode: materialBase || undefined,
								materialName: row.name.trim(),
								quantity: qty,
								unit: row.unit || 'Bộ',
								reason: mv.reasonLabel || 'Import file',
								note: `Import từ ${fileName || 'file'} · phòng`
							})
						} catch {
							// fallback tạo material không cập nhật SL DM
							if (
								row.codeSource === 'generated' &&
								row.chuyenNganhCode &&
								materialBase
							) {
								try {
									await CreateCatalogMaterial({
										chuyenNganhCode: row.chuyenNganhCode,
										name: row.name,
										unit: row.unit || 'Bộ',
										code: materialBase,
										description: `Import từ ${fileName || 'file'}`
									})
								} catch {
									// đã có
								}
							}
						}
					} else if (
						row.codeSource === 'generated' &&
						row.chuyenNganhCode &&
						materialBase
					) {
						try {
							await CreateCatalogMaterial({
								chuyenNganhCode: row.chuyenNganhCode,
								name: row.name,
								unit: row.unit || 'Bộ',
								code: materialBase,
								description: `Import từ ${fileName || 'file'}`
							})
						} catch {
							// đã có trong danh mục
						}
					}

					if (existing) {
						// Gán/sửa đơn vị sử dụng + địa chỉ nếu dòng cũ thiếu
						const needHold =
							existing.holdingUnitId == null ||
							existing.holdingUnitId !== unitCtx.holdingUnitId
						const needAddr =
							!!installFromFile &&
							!!installAddr &&
							String(existing.installAddress || '').trim() !==
								installAddr
						if (needHold || needAddr) {
							try {
								await UpdateRoomAsset(existing.id, {
									...(needHold
										? {
												holdingUnitId:
													unitCtx.holdingUnitId
											}
										: {}),
									...(needAddr
										? { installAddress: installAddr }
										: {})
								})
								if (needHold) {
									existing.holdingUnitId =
										unitCtx.holdingUnitId
								}
								if (needAddr) {
									existing.installAddress = installAddr
								}
							} catch {
								// vẫn tăng SL
							}
						}
						await CreateAssetMovement(existing.id, {
							movementType: 'INCREASE',
							executedAt: today(),
							quantity: qty,
							grade: grade || existing.grade || 1,
							installAddress: installFromFile
								? installAddr
								: installAddr ||
									existing.installAddress ||
									undefined,
							reasonCode: mv.reasonCode,
							reasonOther:
								mv.reasonCode === 'OTHER'
									? mv.reasonOther || 'Import file'
									: undefined,
							note: `Import từ ${fileName || 'file'} · ${mv.reasonLabel}${
								installFromFile
									? ` · ĐC file: ${installAddr}`
									: ''
							} · ĐV ${unitCtx.alias}`
						})
						existing.quantity =
							(Number(existing.quantity) || 0) + qty
					} else {
						// Địa chỉ lắp đặt (text) + holdingUnitId + phòng đơn vị CDHC2 nếu khớp tên
						const created = await CreateRoomAsset({
							roomId: targetRoomId,
							code: codeForMatch,
							name: row.name,
							category: row.category || 'Khác',
							quantity: 0,
							unit: row.unit || 'Bộ',
							grade,
							holdingUnitId: unitCtx.holdingUnitId,
							manufactureYear: row.manufactureYear,
							usageYear: row.usageYear,
							installAddress: installAddr || undefined,
							description: row.description,
							status: 'NORMAL'
						})
						await CreateAssetMovement(created.id, {
							movementType: 'INCREASE',
							executedAt: today(),
							quantity: qty,
							grade,
							installAddress: installAddr || undefined,
							reasonCode: mv.reasonCode,
							reasonOther:
								mv.reasonCode === 'OTHER'
									? mv.reasonOther || 'Import file'
									: undefined,
							note: `Import từ ${fileName || 'file'} · ${mv.reasonLabel}${
								installFromFile
									? ` · ĐC file: ${installAddr}`
									: ' · ĐC form'
							} · ĐV ${unitCtx.alias}`
						})
						roomAssets.push({
							...created,
							quantity: qty,
							installAddress:
								installAddr || created.installAddress,
							holdingUnitId: unitCtx.holdingUnitId
						})
						assetsByRoom.set(targetRoomId, roomAssets)
					}
				}
				ok++
			} catch (err) {
				fail++
				errors.push(
					`Dòng ${row.rowIndex} (${row.code}): ${(err as Error).message}`
				)
			}
			setProgress({ done: i + 1, total: validRows.length })
		}

		await qc.invalidateQueries({ queryKey: ['buildings'] })
		await qc.invalidateQueries({ queryKey: ['room-assets'] })
		await qc.invalidateQueries({ queryKey: ['room-profile'] })
		await qc.invalidateQueries({ queryKey: ['asset-movements'] })
		await qc.invalidateQueries({ queryKey: ['asset-catalog'] })
		await qc.invalidateQueries({ queryKey: ['catalog-stock-logs'] })

		setImporting(false)
		if (ok && !fail) {
			toast.success(
				`Import thành công ${ok} dòng (${incCount} tăng · ${decCount} giảm) → ${room?.roomCode || roomId}`
			)
			setRows([])
			setFileName('')
		} else if (ok && fail) {
			toast.warning(`Import xong: ${ok} thành công, ${fail} lỗi`, {
				description: errors.slice(0, 3).join(' · ')
			})
		} else {
			toast.error('Import thất bại', {
				description: errors[0]
			})
		}
	}

	if (treeError) {
		return <ErrorState error={treeError} onRetry={() => refetch()} />
	}

	const sel = 'h-12 text-base w-full'
	const needOtherText = formReasonOpt?.reasonCode === 'OTHER'

	return (
		/* Không khóa h-full — để TabsContent overflow-y-auto cuộn được hết form + danh sách xem xét */
		<div className='flex flex-col gap-5 pb-10'>
			{/* Chỉ tòa / tầng / phòng */}
			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>
						Vị trí import (bắt buộc)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
						<div className='space-y-2'>
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
									setFormUnitId('')
								}}
								disabled={treeLoading}
								className={sel}
								placeholder='Chọn tòa nhà…'
								searchPlaceholder='Gõ tên/mã tòa…'
								emptyText='Không có tòa'
								options={tree.map((b) => ({
									value: String(b.id),
									label: b.name,
									keywords: `${b.code} ${b.name}`
								}))}
							/>
						</div>
						<div className='space-y-2'>
							<Label className='font-semibold'>
								Tầng <span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={floorId}
								onValueChange={(v) => {
									setFloorId(v)
									setRoomId('')
									setFormUnitId('')
								}}
								disabled={!buildingId}
								className={sel}
								placeholder={
									buildingId ? 'Chọn tầng…' : 'Chọn tòa trước'
								}
								searchPlaceholder='Gõ tên tầng…'
								emptyText='Không có tầng'
								options={floors.map((f) => ({
									value: String(f.id),
									label: f.name,
									keywords: `${f.code ?? ''} ${f.floorNumber}`
								}))}
							/>
						</div>
						<div className='space-y-2'>
							<Label className='font-semibold'>
								Phòng{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={roomId}
								onValueChange={(v) => {
									setRoomId(v)
									// effect sẽ gán đơn vị sử dụng = đơn vị/QL của phòng
								}}
								disabled={!floorId}
								className={sel}
								placeholder={
									floorId ? 'Chọn phòng…' : 'Chọn tầng trước'
								}
								searchPlaceholder='Gõ mã/tên phòng…'
								emptyText='Không có phòng'
								options={rooms.map((r) => ({
									value: String(r.id),
									label: `${r.roomCode} — ${r.roomName}${
										(r as { manager?: string }).manager
											? ` · QL: ${(r as { manager?: string }).manager}`
											: ''
									}`,
									keywords: `${r.roomCode} ${r.roomName} ${(r as { manager?: string }).manager ?? ''} ${(r as { managerCode?: string }).managerCode ?? ''}`
								}))}
							/>
						</div>
						<div className='space-y-2'>
							<Label className='font-semibold'>
								Đơn vị sử dụng{' '}
								<span className='text-destructive'>*</span>
							</Label>
							<SearchableSelect
								value={formUnitId}
								onValueChange={setFormUnitId}
								disabled={!roomId || !formUnitOptions.length}
								className={sel}
								placeholder={
									roomId
										? 'Đơn vị / quản lý của phòng…'
										: 'Chọn phòng trước'
								}
								searchPlaceholder='Gõ mã/tên đơn vị hoặc QL…'
								emptyText='Không có đơn vị cho phòng này'
								options={formUnitOptions}
							/>
							<p className='text-xs text-muted-foreground'>
								Sau khi chọn phòng, đơn vị sử dụng = đơn vị /
								quản lý gắn phòng đó (vd. CDHC2-D2 → D2). Có thể
								đổi sang đơn vị khác nếu cần.
							</p>
						</div>
					</div>
					{room && (
						<p className='text-sm text-muted-foreground mt-3'>
							Import vào:{' '}
							<strong>
								{building?.code} / {floor?.name} /{' '}
								{room.roomCode} — {room.roomName}
							</strong>
							{(room as { manager?: string }).manager ? (
								<>
									{' '}
									· QL phòng:{' '}
									<strong>
										{(room as { manager?: string }).manager}
										{(room as { managerCode?: string })
											.managerCode
											? ` (${(room as { managerCode?: string }).managerCode})`
											: ''}
									</strong>
								</>
							) : null}
							{formUnit ? (
								<>
									{' '}
									· Đơn vị SD{' '}
									<strong>
										{formUnit.alias} — {formUnit.name}
									</strong>
								</>
							) : (
								<span className='text-amber-700'>
									{' '}
									· Chưa map được đơn vị — chọn tay bên trên
								</span>
							)}
						</p>
					)}

					{/* Ngành danh mục — đủ để sinh mã khi file có loại + tên VT */}
					<div className='mt-4 space-y-2 border-t pt-4'>
						<Label className='font-semibold'>
							Ngành danh mục{' '}
							<span className='text-muted-foreground font-normal'>
								(khi file chỉ có loại + tên VT)
							</span>
						</Label>
						<SearchableSelect
							value={importNganhCode}
							onValueChange={setImportNganhCode}
							className={sel}
							placeholder='Chọn ngành (HC2A…)…'
							searchPlaceholder='Gõ mã/tên ngành…'
							emptyText='Không có ngành'
							options={catalogNganhOptions}
						/>
						<p className='text-xs text-muted-foreground'>
							Import chỉ cần <strong>ngành</strong> (form) +{' '}
							<strong>loại vật</strong> (cột file). VT mới tự vào
							danh mục ngành, sinh mã theo cấu trúc; tăng/giảm
							đồng bộ SL DM + log admin.
						</p>
					</div>

					{/* Địa chỉ lắp đặt: file có thì dùng file; không có thì chọn/nhập tại đây */}
					<div className='mt-4 space-y-2 border-t pt-4'>
						<Label className='font-semibold'>
							Địa chỉ lắp đặt (mặc định)
						</Label>
						<Input
							className={sel}
							value={formInstallAddress}
							onChange={(e) =>
								setFormInstallAddress(e.target.value)
							}
							placeholder={
								room
									? 'Gợi ý theo tòa/tầng/phòng — có thể sửa'
									: 'Chọn phòng hoặc nhập địa chỉ lắp đặt…'
							}
							disabled={!roomId && !formInstallAddress}
						/>
						<p className='text-xs text-muted-foreground'>
							<strong>Địa chỉ lắp đặt:</strong> text file nếu có,
							không thì form. <strong>Đơn vị sử dụng:</strong> mặc
							định theo <strong>phòng đã chọn</strong> (quản
							lý/đơn vị của phòng); dòng file có cột «Đơn vị sử
							dụng» hoặc trùng tên đơn vị CDHC2 thì ưu tiên file.
							{rows.length > 0 && (
								<>
									{' '}
									({rowsWithInstallFromFile} dòng có địa chỉ
									file
									{rowsNeedFormInstall
										? ` · ${rowsNeedFormInstall} ĐC form`
										: ''}
									)
								</>
							)}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Lý do → Tăng / Giảm */}
			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>
						Lý do import{' '}
						<span className='text-destructive font-normal'>*</span>
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label className='font-semibold'>Lý do</Label>
							<Select
								value={reasonKey}
								onValueChange={setReasonKey}
							>
								<SelectTrigger className={sel}>
									<SelectValue placeholder='Chọn lý do…' />
								</SelectTrigger>
								<SelectContent>
									<div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground'>
										Tăng
									</div>
									{IMPORT_REASON_OPTIONS.filter(
										(o) => o.movementType === 'INCREASE'
									).map((o) => (
										<SelectItem key={o.key} value={o.key}>
											{o.label}
										</SelectItem>
									))}
									<div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2'>
										Giảm
									</div>
									{IMPORT_REASON_OPTIONS.filter(
										(o) => o.movementType === 'DECREASE'
									).map((o) => (
										<SelectItem key={o.key} value={o.key}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{needOtherText && (
							<div className='space-y-2'>
								<Label className='font-semibold'>
									Ghi rõ lý do khác
								</Label>
								<Input
									className={sel}
									value={reasonOther}
									onChange={(e) =>
										setReasonOther(e.target.value)
									}
									placeholder='Nhập lý do…'
								/>
							</div>
						)}
						{!needOtherText && formReasonOpt && (
							<div className='flex items-end pb-1'>
								<p className='text-sm text-muted-foreground'>
									Hướng:{' '}
									<Badge
										variant={
											formReasonOpt.movementType ===
											'INCREASE'
												? 'default'
												: 'destructive'
										}
									>
										{formReasonOpt.movementType ===
										'INCREASE'
											? 'Tăng'
											: 'Giảm'}
									</Badge>
									<span className='ml-2'>
										— không cần chọn Tăng/Giảm riêng; lý do
										đã quyết định.
									</span>
								</p>
							</div>
						)}
					</div>
					<p className='text-xs text-muted-foreground'>
						Áp dụng cho mọi dòng <strong>không</strong> có cột «Lý
						do» trong file. Nếu file có cột Lý do (Mua sắm, Thanh
						lý…), từng dòng tự suy Tăng/Giảm.
					</p>
				</CardContent>
			</Card>

			{/* Upload */}
			<Card>
				<CardHeader className='pb-2 flex flex-row items-center justify-between gap-2'>
					<CardTitle className='text-base'>
						File dữ liệu (Excel / Word)
					</CardTitle>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={downloadTemplate}
					>
						<Download className='w-4 h-4 mr-1.5' />
						Tải mẫu Excel
					</Button>
				</CardHeader>
				<CardContent className='space-y-3'>
					<input
						ref={inputRef}
						type='file'
						accept='.xlsx,.xls,.csv,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
						className='hidden'
						onChange={(e) => onFile(e.target.files?.[0] ?? null)}
					/>
					<button
						type='button'
						disabled={parsing}
						onClick={() => inputRef.current?.click()}
						onDragOver={(e) => {
							e.preventDefault()
							e.stopPropagation()
						}}
						onDrop={(e) => {
							e.preventDefault()
							e.stopPropagation()
							const f = e.dataTransfer.files?.[0]
							if (f) void onFile(f)
						}}
						className='w-full rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 transition-colors px-6 py-10 flex flex-col items-center gap-3 text-center'
					>
						{parsing || resolvingCodes ? (
							<Loader2 className='w-10 h-10 animate-spin text-muted-foreground' />
						) : (
							<FileUp className='w-10 h-10 text-muted-foreground' />
						)}
						<div>
							<p className='font-semibold text-base'>
								{parsing
									? 'Đang đọc file…'
									: resolvingCodes
										? 'Đang gán mã từ danh mục…'
										: 'Kéo thả file vào đây hoặc bấm để chọn'}
							</p>
							<p className='text-sm text-muted-foreground mt-1'>
								Hỗ trợ <strong>.xlsx / .xls / .csv</strong> và{' '}
								<strong>.docx</strong> (bảng Word)
							</p>
						</div>
						{fileName && (
							<Badge variant='secondary' className='text-sm'>
								<FileSpreadsheet className='w-3.5 h-3.5 mr-1' />
								{fileName}
							</Badge>
						)}
					</button>
					<p className='text-xs text-muted-foreground'>
						Có thể chỉ có <strong>Tên + Loại</strong> (không cần
						mã). Cột <strong>Địa chỉ lắp đặt</strong> (nếu có) →
						tăng theo đúng địa chỉ; không có thì dùng địa chỉ form
						phía trên.
					</p>
				</CardContent>
			</Card>

			{/* Xem trước — admin rà soát VT trước khi import */}
			{rows.length > 0 && (
				<div
					ref={previewSectionRef}
					id='import-preview-list'
					className='scroll-mt-4'
				>
					<Card className='flex flex-col border-primary/20'>
						<CardHeader className='pb-3 shrink-0 space-y-3'>
							<div className='flex flex-row flex-wrap items-start justify-between gap-3'>
								<div className='space-y-1 min-w-0'>
									<CardTitle className='text-base flex items-center gap-2'>
										<CheckCircle2 className='w-5 h-5 text-primary shrink-0' />
										Danh sách vật tư — xem xét trước khi
										import
									</CardTitle>
									<p className='text-sm text-muted-foreground'>
										Admin kiểm tra mã, tên, số lượng, loại,
										cấp và hướng tăng/giảm. Chỉ các dòng{' '}
										<strong>hợp lệ</strong> mới được import.
									</p>
									{room ? (
										<p className='text-sm'>
											Sẽ ghi vào:{' '}
											<strong>
												{building?.name ||
													building?.code}{' '}
												/ {floor?.name} /{' '}
												{room.roomCode} —{' '}
												{room.roomName}
											</strong>
										</p>
									) : (
										<p className='text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5'>
											<AlertCircle className='w-4 h-4 shrink-0' />
											Chưa chọn phòng — chọn tòa → tầng →
											phòng ở trên trước khi import.
										</p>
									)}
								</div>
								<div className='flex flex-wrap gap-2 shrink-0'>
									<Button
										type='button'
										variant='outline'
										onClick={() => {
											setRows([])
											setFileName('')
											setPreviewSearch('')
										}}
									>
										Xóa dữ liệu
									</Button>
									<Button
										type='button'
										disabled={
											importing ||
											!roomId ||
											!formUnitId ||
											!validRows.length
										}
										onClick={() => void handleImport()}
									>
										{importing ? (
											<>
												<Loader2 className='w-4 h-4 mr-2 animate-spin' />
												Đang import {progress.done}/
												{progress.total}…
											</>
										) : (
											<>
												<Upload className='w-4 h-4 mr-2' />
												Xác nhận import{' '}
												{validRows.length} VT
											</>
										)}
									</Button>
								</div>
							</div>

							{/* Tóm tắt cho admin */}
							<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2'>
								<div className='rounded-lg border bg-muted/30 px-3 py-2'>
									<p className='text-xs text-muted-foreground'>
										Đọc từ file
									</p>
									<p className='text-lg font-semibold tabular-nums'>
										{enrichedRows.length}
									</p>
								</div>
								<div className='rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2'>
									<p className='text-xs text-muted-foreground'>
										Hợp lệ (sẽ import)
									</p>
									<p className='text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400'>
										{validRows.length}
									</p>
								</div>
								<div className='rounded-lg border px-3 py-2'>
									<p className='text-xs text-muted-foreground'>
										Mã: file / khớp / sinh
									</p>
									<p className='text-lg font-semibold tabular-nums'>
										{fileCodeCount}/{matchedCount}/
										{generatedCount}
									</p>
								</div>
								<div className='rounded-lg border px-3 py-2'>
									<p className='text-xs text-muted-foreground'>
										Tổng SL
									</p>
									<p className='text-lg font-semibold tabular-nums'>
										{totalQty}
									</p>
								</div>
								<div className='rounded-lg border px-3 py-2'>
									<p className='text-xs text-muted-foreground'>
										Tăng / Giảm
									</p>
									<p className='text-lg font-semibold tabular-nums'>
										{incCount}{' '}
										<span className='text-muted-foreground font-normal text-sm'>
											/
										</span>{' '}
										{decCount}
									</p>
								</div>
								<div
									className={`rounded-lg border px-3 py-2 ${
										errorRows.length
											? 'border-destructive/40 bg-destructive/5'
											: ''
									}`}
								>
									<p className='text-xs text-muted-foreground'>
										Bỏ qua / lỗi
									</p>
									<p
										className={`text-lg font-semibold tabular-nums ${
											errorRows.length
												? 'text-destructive'
												: ''
										}`}
									>
										{errorRows.length}
									</p>
								</div>
							</div>
							<p className='text-xs text-muted-foreground'>
								<strong>Gán mã tự động:</strong> nếu file không
								có mã — hệ thống khớp tên trong{' '}
								<em>loại vật tư</em> với danh mục; trùng thì lấy
								mã danh mục, khác thì sinh mã mới theo cấu trúc
								loại (vd. HC2A12 → HC2A1204). Cần có cột/loại
								(Máy tính để bàn, Camera giám sát…).
							</p>

							{/* Lọc + tìm */}
							<div className='flex flex-col sm:flex-row gap-2 sm:items-center'>
								<div className='flex flex-wrap gap-1.5'>
									<Button
										type='button'
										size='sm'
										variant={
											previewFilter === 'ok'
												? 'default'
												: 'outline'
										}
										onClick={() => setPreviewFilter('ok')}
									>
										Hợp lệ ({validRows.length})
									</Button>
									<Button
										type='button'
										size='sm'
										variant={
											previewFilter === 'all'
												? 'default'
												: 'outline'
										}
										onClick={() => setPreviewFilter('all')}
									>
										Tất cả ({enrichedRows.length})
									</Button>
									{errorRows.length > 0 && (
										<Button
											type='button'
											size='sm'
											variant={
												previewFilter === 'err'
													? 'destructive'
													: 'outline'
											}
											onClick={() =>
												setPreviewFilter('err')
											}
										>
											Lỗi ({errorRows.length})
										</Button>
									)}
								</div>
								<div className='relative flex-1 min-w-[12rem]'>
									<Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
									<Input
										className='pl-9 h-9'
										placeholder='Tìm mã, tên, loại…'
										value={previewSearch}
										onChange={(e) =>
											setPreviewSearch(e.target.value)
										}
									/>
								</div>
								{fileName && (
									<Badge
										variant='secondary'
										className='text-xs shrink-0'
									>
										<FileSpreadsheet className='w-3 h-3 mr-1' />
										{fileName}
									</Badge>
								)}
							</div>
						</CardHeader>

						<CardContent className='flex flex-col pt-0 gap-2'>
							<div className='rounded-lg border overflow-auto max-h-[min(55vh,520px)] min-h-[180px]'>
								<Table>
									<TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
										<TableRow>
											<TableHead className='w-10'>
												STT
											</TableHead>
											<TableHead className='min-w-[8rem]'>
												Mã VT
											</TableHead>
											<TableHead className='w-24'>
												Nguồn mã
											</TableHead>
											<TableHead className='min-w-[12rem]'>
												Tên vật tư
											</TableHead>
											<TableHead className='min-w-[7rem]'>
												Loại
											</TableHead>
											<TableHead className='text-right w-16'>
												SL
											</TableHead>
											<TableHead className='w-14'>
												ĐVT
											</TableHead>
											<TableHead className='text-center w-14'>
												Cấp
											</TableHead>
											<TableHead className='min-w-[10rem]'>
												Địa chỉ lắp đặt
											</TableHead>
											<TableHead className='min-w-[8rem]'>
												Đơn vị SD
											</TableHead>
											<TableHead className='min-w-[7rem]'>
												Lý do
											</TableHead>
											<TableHead className='w-20'>
												Hướng
											</TableHead>
											<TableHead className='min-w-[8rem]'>
												Ghi chú mã / TT
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{previewRows.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={13}
													className='text-center text-muted-foreground py-10'
												>
													{previewSearch
														? 'Không có vật tư khớp từ khóa tìm kiếm.'
														: previewFilter ===
															  'err'
															? 'Không có dòng lỗi.'
															: 'Không có vật tư hợp lệ để hiển thị.'}
												</TableCell>
											</TableRow>
										) : (
											previewRows.map((r, i) => {
												const isErr =
													!!r.error ||
													!r.name.trim() ||
													(Number(r.quantity) || 0) <
														1 ||
													!r.code?.trim() ||
													r.codeSource ===
														'unresolved'
												const qtyOk =
													(Number(r.quantity) || 0) >=
													1
												const src =
													r.codeSource || 'file'
												return (
													<TableRow
														key={`${r.rowIndex}-${r.code}-${i}`}
														className={
															isErr
																? 'bg-destructive/10'
																: src ===
																	  'generated'
																	? 'bg-amber-500/5'
																	: src ===
																		  'matched'
																		? 'bg-sky-500/5'
																		: undefined
														}
													>
														<TableCell className='text-muted-foreground tabular-nums text-sm'>
															{i + 1}
														</TableCell>
														<TableCell className='font-mono text-sm whitespace-nowrap font-medium'>
															{r.code || (
																<span className='text-destructive'>
																	—
																</span>
															)}
														</TableCell>
														<TableCell>
															<Badge
																variant={
																	src ===
																	'unresolved'
																		? 'destructive'
																		: src ===
																			  'generated'
																			? 'secondary'
																			: src ===
																				  'matched'
																				? 'default'
																				: 'outline'
																}
																className='text-[11px] whitespace-nowrap'
															>
																{codeSourceLabel(
																	src
																)}
															</Badge>
														</TableCell>
														<TableCell className='font-medium'>
															{r.name || (
																<span className='text-muted-foreground'>
																	(thiếu tên)
																</span>
															)}
														</TableCell>
														<TableCell className='text-sm text-muted-foreground'>
															{r.category || '—'}
														</TableCell>
														<TableCell
															className={`text-right tabular-nums font-medium ${
																!qtyOk
																	? 'text-destructive'
																	: ''
															}`}
														>
															{r.quantity}
														</TableCell>
														<TableCell className='text-sm'>
															{r.unit || '—'}
														</TableCell>
														<TableCell className='text-center tabular-nums'>
															{r.grade}
														</TableCell>
														<TableCell className='text-sm max-w-[12rem]'>
															{(
																r as {
																	effectiveInstallAddress?: string
																	installFromFile?: boolean
																}
															)
																.effectiveInstallAddress ? (
																<span
																	title={
																		(
																			r as {
																				installFromFile?: boolean
																			}
																		)
																			.installFromFile
																			? 'Địa chỉ từ file import (không dùng mặc định)'
																			: 'Không có trong file — dùng địa chỉ form/phòng'
																	}
																>
																	{
																		(
																			r as {
																				effectiveInstallAddress?: string
																			}
																		)
																			.effectiveInstallAddress
																	}
																	{(
																		r as {
																			installFromFile?: boolean
																		}
																	)
																		.installFromFile ? (
																		<Badge
																			variant='outline'
																			className='ml-1 text-[10px]'
																		>
																			từ
																			file
																		</Badge>
																	) : (
																		<Badge
																			variant='secondary'
																			className='ml-1 text-[10px]'
																		>
																			mặc
																			định
																		</Badge>
																	)}
																</span>
															) : (
																<span className='text-muted-foreground'>
																	—
																</span>
															)}
														</TableCell>
														<TableCell className='text-sm whitespace-nowrap'>
															{(
																r as {
																	previewUnitName?: string
																	previewUnitAlias?: string
																	unitFromFile?: boolean
																}
															).previewUnitName ||
															(
																r as {
																	previewUnitAlias?: string
																}
															)
																.previewUnitAlias ? (
																<span>
																	{(
																		r as {
																			previewUnitName?: string
																			previewUnitAlias?: string
																		}
																	)
																		.previewUnitName ||
																		(
																			r as {
																				previewUnitAlias?: string
																			}
																		)
																			.previewUnitAlias}
																	{(() => {
																		const src =
																			(
																				r as {
																					unitSource?: string
																				}
																			)
																				.unitSource
																		if (
																			src ===
																				'address' ||
																			src ===
																				'file_col'
																		) {
																			return (
																				<Badge
																					variant='outline'
																					className='ml-1 text-[10px]'
																				>
																					{src ===
																					'address'
																						? 'từ ĐC'
																						: 'file'}
																				</Badge>
																			)
																		}
																		return (
																			<Badge
																				variant='secondary'
																				className='ml-1 text-[10px]'
																			>
																				mặc
																				định
																			</Badge>
																		)
																	})()}
																</span>
															) : (
																<span className='text-destructive text-xs'>
																	Chưa chọn ĐV
																</span>
															)}
														</TableCell>
														<TableCell className='text-sm'>
															{r.reasonLabel ||
																r.reasonRaw ||
																formReasonOpt?.label ||
																'—'}
														</TableCell>
														<TableCell>
															{isErr &&
															!r.movementType ? (
																'—'
															) : (
																<Badge
																	variant={
																		r.movementType ===
																		'DECREASE'
																			? 'destructive'
																			: 'default'
																	}
																>
																	{r.movementType ===
																	'DECREASE'
																		? 'Giảm'
																		: 'Tăng'}
																</Badge>
															)}
														</TableCell>
														<TableCell className='text-xs max-w-[14rem]'>
															{isErr ? (
																<span className='text-destructive font-medium'>
																	{r.error ||
																		r.codeNote ||
																		(!r.name.trim()
																			? 'Thiếu tên'
																			: !qtyOk
																				? 'SL < 1'
																				: 'Chưa gán mã')}
																</span>
															) : (
																<span className='text-muted-foreground'>
																	{r.codeNote ||
																		'OK'}
																</span>
															)}
														</TableCell>
													</TableRow>
												)
											})
										)}
									</TableBody>
								</Table>
							</div>
							<p className='text-xs text-muted-foreground shrink-0'>
								Đang hiển thị{' '}
								<strong>{previewRows.length}</strong> /{' '}
								{previewFilter === 'ok'
									? validRows.length
									: previewFilter === 'err'
										? errorRows.length
										: enrichedRows.length}{' '}
								dòng
								{previewFilter === 'ok'
									? ' hợp lệ — bấm «Xác nhận import» sau khi đã kiểm tra.'
									: '.'}
							</p>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}
