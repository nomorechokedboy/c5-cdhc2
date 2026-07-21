/**
 * Chuyển trạng thái khi sửa chữa:
 * - Báo hỏng (phiếu SC): cấp bất kỳ → cấp 5, mã tạm -HONG-, status BROKEN
 * - Đề xuất SC (preserveGrade): giữ nguyên cấp, mã tạm -HONG-, status BROKEN
 * - Sửa xong: mặc định về cấp 2; đề xuất SC giữ nguyên cấp ban đầu + mã gốc, status NORMAL
 */
import { and, eq } from 'drizzle-orm'
import orm from '../database'
import { handleDatabaseErr } from '../utils'
import { roomAssets } from '../schema/room-assets'

/** Mã gốc (bỏ hậu tố tạm -HONG- / -OK-) */
export function assetBaseCode(
	code: string | null | undefined,
	fallbackId: number
): string {
	const raw = (code || '').trim()
	if (!raw) return `VT-${fallbackId}`
	let c = raw
	for (let i = 0; i < 5; i++) {
		const next = c
			.replace(/-HONG-[A-Z0-9]+$/i, '')
			.replace(/-OK-[A-Z0-9]+$/i, '')
			.replace(/-HONG$/i, '')
			.replace(/-OK$/i, '')
		if (next === c) break
		c = next
	}
	return c || `VT-${fallbackId}`
}

export async function uniqueAssetCode(
	desired: string,
	exceptId?: number | null
): Promise<string> {
	let code = desired.slice(0, 80)
	let n = 0
	for (;;) {
		const found = await orm.query.roomAssets
			.findFirst({ where: eq(roomAssets.code, code) })
			.catch(handleDatabaseErr)
		if (!found || (exceptId != null && found.id === exceptId)) return code
		n += 1
		code = `${desired.slice(0, 70)}-${n}`
	}
}

function sameUnitHolding(
	a: { unit?: string | null; holdingUnitId?: number | null },
	unit: string | null,
	holdingUnitId: number | null
): boolean {
	const u = (a.unit || '').trim() || 'cái'
	const u2 = (unit || '').trim() || 'cái'
	if (u.toLowerCase() !== u2.toLowerCase()) return false
	return (a.holdingUnitId ?? null) === (holdingUnitId ?? null)
}

export type MarkBrokenResult = {
	/** Dòng hỏng (mã -HONG-; grade 5 hoặc giữ nguyên nếu preserveGrade) */
	brokenAssetId: number
	/** Dòng nguồn còn dùng (null nếu hỏng hết cả dòng) */
	sourceAssetId: number | null
	originalGrade: number
	/** Cấp sau khi đánh dấu hỏng */
	gradeAfter: number
	originalCode: string
	baseCode: string
	quantity: number
	roomId: number
	name: string
	category: string
	unit: string | null
	holdingUnitId: number | null
}

/**
 * Đưa VT sang bảng hư hỏng: mã tạm -HONG-, status BROKEN.
 * Mặc định grade 5; preserveGrade = true → giữ nguyên cấp hiện tại.
 * Hỏng một phần → tách dòng; hỏng hết → đổi mã/status trên cùng dòng.
 */
export async function markAssetBrokenForRepair(opts: {
	roomAssetId: number
	quantity: number
	damageNote?: string | null
	brokenAt?: string
	/** Đề xuất SC: không hạ cấp 5, giữ nguyên cấp */
	preserveGrade?: boolean
}): Promise<MarkBrokenResult> {
	const brokenAt = opts.brokenAt || new Date().toISOString().slice(0, 10)
	const brokenQty = Math.max(1, Math.floor(Number(opts.quantity) || 1))

	const asset = await orm.query.roomAssets
		.findFirst({ where: eq(roomAssets.id, opts.roomAssetId) })
		.catch(handleDatabaseErr)
	if (!asset) {
		throw new Error(`Không tìm thấy VT #${opts.roomAssetId}`)
	}

	const st = (asset.status || 'NORMAL').toUpperCase()
	if (st === 'BROKEN' || st === 'REPAIRING' || st === 'DISPOSED') {
		throw new Error(
			`«${asset.name}» đang ${st === 'BROKEN' ? 'hỏng' : st === 'REPAIRING' ? 'sửa chữa' : 'thanh lý'} — không đề xuất/báo hỏng tiếp`
		)
	}
	const usable = Math.max(0, Number(asset.quantity) || 0)
	if (usable <= 0) {
		throw new Error(`«${asset.name}» không còn số lượng đang dùng`)
	}
	if (brokenQty > usable) {
		throw new Error(
			`Số lượng hỏng (${brokenQty}) vượt SL đang dùng (${usable}) của «${asset.name}»`
		)
	}

	const originalGrade =
		Number(asset.grade) >= 1 && Number(asset.grade) <= 5
			? Number(asset.grade)
			: 1
	const gradeAfter = opts.preserveGrade ? originalGrade : 5
	const base = assetBaseCode(asset.code, asset.id)
	const originalCode = (asset.code || base).trim() || base
	const hongCode = await uniqueAssetCode(
		`${base}-HONG-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
	)
	const hongDesc =
		opts.damageNote?.trim() ||
		`Hỏng từ mã gốc ${originalCode} (SL ${brokenQty}/${usable})`

	let brokenAssetId = asset.id
	let sourceAssetId: number | null = asset.id

	if (brokenQty === usable) {
		// Hỏng hết dòng
		await orm
			.update(roomAssets)
			.set({
				code: hongCode,
				status: 'BROKEN',
				grade: gradeAfter,
				brokenAt,
				repairCompletedAt: null,
				repairStartedAt: null,
				brokenQuantity: 0,
				description: hongDesc
			})
			.where(eq(roomAssets.id, asset.id))
			.catch(handleDatabaseErr)
		// Cùng id nguồn = hỏng (source = broken)
		sourceAssetId = asset.id
	} else {
		const remain = usable - brokenQty
		await orm
			.update(roomAssets)
			.set({
				code: await uniqueAssetCode(base, asset.id),
				quantity: remain,
				status: 'NORMAL',
				brokenQuantity: Number(asset.brokenQuantity) || 0
			})
			.where(eq(roomAssets.id, asset.id))
			.catch(handleDatabaseErr)

		const [brokenRow] = await orm
			.insert(roomAssets)
			.values({
				roomId: asset.roomId,
				code: hongCode,
				name: asset.name,
				category: asset.category,
				quantity: brokenQty,
				brokenQuantity: 0,
				unit: asset.unit,
				holdingUnitId: asset.holdingUnitId,
				grade: gradeAfter,
				manufactureYear: asset.manufactureYear,
				usageYear: asset.usageYear,
				installAddress: asset.installAddress,
				status: 'BROKEN',
				purchaseDate: asset.purchaseDate,
				expiryDate: asset.expiryDate,
				brokenAt,
				description: hongDesc,
				repairCompletedAt: null
			})
			.returning()
			.catch(handleDatabaseErr)

		brokenAssetId = brokenRow.id
		sourceAssetId = asset.id
	}

	return {
		brokenAssetId,
		sourceAssetId,
		originalGrade,
		gradeAfter,
		originalCode,
		baseCode: base,
		quantity: brokenQty,
		roomId: asset.roomId,
		name: asset.name,
		category: asset.category,
		unit: asset.unit ?? null,
		holdingUnitId: asset.holdingUnitId ?? null
	}
}

/**
 * Hủy / từ chối: trả SL về dòng nguồn (cấp cũ), xóa dòng -HONG- nếu có.
 */
export async function restoreBrokenAssetOnCancel(opts: {
	brokenAssetId: number | null
	sourceAssetId: number | null
	originalGrade?: number | null
	quantity: number
}): Promise<void> {
	const qty = Math.max(1, Number(opts.quantity) || 1)
	const sourceId = opts.sourceAssetId
	const brokenId = opts.brokenAssetId

	if (brokenId && sourceId && sourceId !== brokenId) {
		const source = await orm.query.roomAssets
			.findFirst({ where: eq(roomAssets.id, sourceId) })
			.catch(handleDatabaseErr)
		if (source) {
			await orm
				.update(roomAssets)
				.set({
					quantity: (Number(source.quantity) || 0) + qty,
					status: 'NORMAL'
				})
				.where(eq(roomAssets.id, sourceId))
				.catch(handleDatabaseErr)
		}
		await orm
			.delete(roomAssets)
			.where(eq(roomAssets.id, brokenId))
			.catch(handleDatabaseErr)
		return
	}

	if (brokenId) {
		const restoreGrade =
			opts.originalGrade != null &&
			Number(opts.originalGrade) >= 1 &&
			Number(opts.originalGrade) <= 5
				? Number(opts.originalGrade)
				: 1
		const broken = await orm.query.roomAssets
			.findFirst({ where: eq(roomAssets.id, brokenId) })
			.catch(handleDatabaseErr)
		if (!broken) return

		const base = assetBaseCode(broken.code, broken.id)
		const restoredCode = await uniqueAssetCode(base, broken.id)
		await orm
			.update(roomAssets)
			.set({
				code: restoredCode,
				status: 'NORMAL',
				grade: restoreGrade,
				brokenAt: null,
				repairStartedAt: null,
				repairCompletedAt: null,
				repairPerformer: null,
				description: null
			})
			.where(eq(roomAssets.id, brokenId))
			.catch(handleDatabaseErr)
	}
}

/**
 * Sửa xong → mã gốc + status NORMAL.
 * targetGrade mặc định 2; đề xuất SC truyền originalGrade để giữ nguyên cấp.
 */
export async function mergeRepairedIntoGrade2(opts: {
	roomId: number
	name: string
	category: string
	unit: string | null
	holdingUnitId: number | null
	qty: number
	baseCode: string
	sourceAssetId: number | null
	brokenAssetId: number | null
	performer?: string | null
	completedAt: string
	/** Cấp sau sửa xong (mặc định 2). Đề xuất SC: giữ originalGrade. */
	targetGrade?: number
}): Promise<number | null> {
	const qty = Math.max(1, opts.qty)
	const base = opts.baseCode.trim() || `VT-${opts.brokenAssetId || 'X'}`
	const targetGrade =
		opts.targetGrade != null &&
		Number(opts.targetGrade) >= 1 &&
		Number(opts.targetGrade) <= 5
			? Number(opts.targetGrade)
			: 2

	const clearRepair = {
		status: 'NORMAL' as const,
		grade: targetGrade,
		repairCompletedAt: opts.completedAt,
		repairPerformer: opts.performer ?? null,
		brokenAt: null as null,
		repairStartedAt: null as null
	}

	async function deleteBrokenIfNeeded(targetId: number) {
		if (opts.brokenAssetId && opts.brokenAssetId !== targetId) {
			await orm
				.delete(roomAssets)
				.where(eq(roomAssets.id, opts.brokenAssetId))
				.catch(handleDatabaseErr)
		}
	}

	// 1) Cộng về dòng nguồn (còn mã gốc)
	if (opts.sourceAssetId && opts.sourceAssetId !== opts.brokenAssetId) {
		const source = await orm.query.roomAssets
			.findFirst({ where: eq(roomAssets.id, opts.sourceAssetId) })
			.catch(handleDatabaseErr)
		if (source) {
			const restored = await uniqueAssetCode(base, source.id)
			await orm
				.update(roomAssets)
				.set({
					code: restored,
					quantity: (Number(source.quantity) || 0) + qty,
					brokenQuantity: Number(source.brokenQuantity) || 0,
					...clearRepair,
					description: null
				})
				.where(eq(roomAssets.id, source.id))
				.catch(handleDatabaseErr)
			await deleteBrokenIfNeeded(source.id)
			return source.id
		}
	}

	// 2) Dòng ổn định cùng phòng + tên + ĐVT + ĐV giữ
	const siblings = await orm.query.roomAssets
		.findMany({
			where: and(
				eq(roomAssets.roomId, opts.roomId),
				eq(roomAssets.name, opts.name)
			)
		})
		.catch(handleDatabaseErr)

	const matchPreferred =
		siblings.find((a) => {
			if (a.id === opts.brokenAssetId) return false
			if (!sameUnitHolding(a, opts.unit, opts.holdingUnitId)) return false
			return assetBaseCode(a.code, a.id) === base
		}) ||
		siblings.find((a) => {
			if (a.id === opts.brokenAssetId) return false
			const st = (a.status || 'NORMAL').toUpperCase()
			if (st === 'BROKEN' || st === 'DISPOSED') return false
			if (!sameUnitHolding(a, opts.unit, opts.holdingUnitId)) return false
			const g = Number(a.grade ?? 1)
			return g >= 1 && g <= 4 && st === 'NORMAL'
		})

	if (matchPreferred) {
		const restored = await uniqueAssetCode(base, matchPreferred.id)
		await orm
			.update(roomAssets)
			.set({
				code: restored,
				quantity: (Number(matchPreferred.quantity) || 0) + qty,
				brokenQuantity: Number(matchPreferred.brokenQuantity) || 0,
				...clearRepair,
				description: null
			})
			.where(eq(roomAssets.id, matchPreferred.id))
			.catch(handleDatabaseErr)
		await deleteBrokenIfNeeded(matchPreferred.id)
		return matchPreferred.id
	}

	// 3) Đổi dòng hỏng → ổn định, gán lại mã gốc
	if (opts.brokenAssetId) {
		const restored = await uniqueAssetCode(base, opts.brokenAssetId)
		await orm
			.update(roomAssets)
			.set({
				code: restored,
				quantity: qty,
				brokenQuantity: 0,
				...clearRepair,
				description: null
			})
			.where(eq(roomAssets.id, opts.brokenAssetId))
			.catch(handleDatabaseErr)
		return opts.brokenAssetId
	}

	// 4) Không có dòng hỏng → tạo mới
	const restored = await uniqueAssetCode(base)
	const [created] = await orm
		.insert(roomAssets)
		.values({
			roomId: opts.roomId,
			code: restored,
			name: opts.name,
			category: opts.category,
			quantity: qty,
			brokenQuantity: 0,
			unit: opts.unit,
			holdingUnitId: opts.holdingUnitId,
			grade: targetGrade,
			status: 'NORMAL',
			repairCompletedAt: opts.completedAt,
			repairPerformer: opts.performer ?? null
		})
		.returning()
		.catch(handleDatabaseErr)
	return created.id
}

/**
 * Hoàn tất sửa trên roomAssetId (đề xuất / phiếu SC).
 * Mặc định về cấp 2 + mã gốc; targetGrade để giữ nguyên cấp (đề xuất SC).
 */
export async function completeRepairToGrade2(opts: {
	roomAssetId: number
	sourceAssetId?: number | null
	quantity?: number
	performer?: string | null
	completedAt?: string
	/** Cấp sau sửa xong (mặc định 2). Đề xuất SC: originalGrade. */
	targetGrade?: number
}): Promise<number | null> {
	const doneAt = opts.completedAt || new Date().toISOString().slice(0, 10)
	const asset = await orm.query.roomAssets
		.findFirst({ where: eq(roomAssets.id, opts.roomAssetId) })
		.catch(handleDatabaseErr)
	if (!asset) return null

	const st = (asset.status || 'NORMAL').toUpperCase()
	const grade = Number(asset.grade ?? 1)
	const isBrokenLike =
		grade >= 5 ||
		st === 'BROKEN' ||
		st === 'REPAIRING' ||
		/-HONG/i.test(asset.code || '')

	const qty = Math.max(
		1,
		Math.floor(Number(opts.quantity) || Number(asset.quantity) || 1)
	)
	const base = assetBaseCode(asset.code, asset.id)
	const targetGrade =
		opts.targetGrade != null &&
		Number(opts.targetGrade) >= 1 &&
		Number(opts.targetGrade) <= 5
			? Number(opts.targetGrade)
			: 2

	if (isBrokenLike) {
		return mergeRepairedIntoGrade2({
			roomId: asset.roomId,
			name: asset.name,
			category: asset.category,
			unit: asset.unit ?? null,
			holdingUnitId: asset.holdingUnitId ?? null,
			qty,
			baseCode: base,
			sourceAssetId: opts.sourceAssetId ?? null,
			brokenAssetId: asset.id,
			performer: opts.performer ?? asset.repairPerformer ?? null,
			completedAt: doneAt,
			targetGrade
		})
	}

	// Đã ở kho ổn định — set cấp đích (mặc định 2)
	await orm
		.update(roomAssets)
		.set({
			grade: targetGrade,
			status: 'NORMAL',
			repairCompletedAt: doneAt,
			repairPerformer: opts.performer ?? asset.repairPerformer ?? null,
			brokenAt: null,
			repairStartedAt: null
		})
		.where(eq(roomAssets.id, asset.id))
		.catch(handleDatabaseErr)
	return asset.id
}
