/**
 * Đồng bộ đơn vị sử dụng (khoa) theo đúng mã chuẩn danh mục đào tạo.
 * Nguồn: exam_faculties (DISTINCT code + name) — K1…K8.
 *
 *   cd apps/api && pnpm sync:units-khoa
 */
import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env') })

const dbUrl = process.env.DATABASE_URI || 'file:local.db'
const client = createClient({
	url: dbUrl.startsWith('file:') ? dbUrl : `file:${dbUrl}`
})

/** Map alias cũ → mã chuẩn K1–K8 (khi unit chưa có mã Kx) */
const LEGACY_TO_CODE: Record<string, string> = {
	KQSC: 'K1',
	k1: 'K1',
	KXHNV: 'K2',
	k2: 'K2',
	KCB: 'K3',
	kcb: 'K3',
	k3: 'K3',
	KYHCS: 'K4',
	k4: 'K4',
	KYHLS: 'K5',
	k5: 'K5',
	KYHQS: 'K6',
	k6: 'K6',
	KDD: 'K7',
	k7: 'K7',
	KD: 'K8',
	k8: 'K8'
}

async function main() {
	// 1) Mã chuẩn từ danh mục đào tạo
	const fac = await client.execute(
		`SELECT code, name FROM exam_faculties
     GROUP BY code
     ORDER BY code`
	)
	if (!fac.rows.length) {
		console.error('Chưa có exam_faculties — chạy import:exam-catalog trước')
		process.exit(1)
	}

	const catalog: Array<{ code: string; name: string }> = fac.rows.map(
		(r) => ({
			code: String(r.code).trim().toUpperCase(),
			name: String(r.name).trim()
		})
	)
	const catalogCodes = new Set(catalog.map((c) => c.code))

	console.log('Mã chuẩn danh mục đào tạo (exam_faculties):')
	for (const c of catalog) console.log(`  ${c.code}  ${c.name}`)
	console.log('')

	// 2) Đảm bảo mỗi mã Kx có đúng 1 unit (alias = code, name = catalog)
	for (const c of catalog) {
		const byCode = await client.execute({
			sql: 'SELECT id, alias, name FROM units WHERE upper(alias) = ?',
			args: [c.code]
		})

		// Tìm unit legacy cần gộp
		const legacyAliases = Object.entries(LEGACY_TO_CODE)
			.filter(([, code]) => code === c.code)
			.map(([a]) => a)

		let legacyId: number | null = null
		for (const a of legacyAliases) {
			const r = await client.execute({
				sql: 'SELECT id FROM units WHERE alias = ? LIMIT 1',
				args: [a]
			})
			if (r.rows.length) {
				legacyId = r.rows[0]!.id as number
				break
			}
		}

		if (byCode.rows.length) {
			const id = byCode.rows[0]!.id as number
			await client.execute({
				sql: 'UPDATE units SET alias = ?, name = ?, level = 1 WHERE id = ?',
				args: [c.code, c.name, id]
			})
			if (legacyId && legacyId !== id) {
				await mergeUnitInto(legacyId, id)
				console.log(
					`  ${c.code}: cập nhật tên + gộp legacy#${legacyId} → #${id}`
				)
			} else {
				console.log(`  ${c.code}: đồng bộ tên (#${id})`)
			}
			continue
		}

		if (legacyId) {
			await client.execute({
				sql: 'UPDATE units SET alias = ?, name = ?, level = 1 WHERE id = ?',
				args: [c.code, c.name, legacyId]
			})
			console.log(`  ${c.code}: đổi alias unit#${legacyId} → ${c.code}`)
			continue
		}

		await client.execute({
			sql: 'INSERT INTO units (alias, level, name, parentId) VALUES (?, 1, ?, NULL)',
			args: [c.code, c.name]
		})
		console.log(`  ${c.code}: thêm unit mới`)
	}

	// 3) Unit tên «Khoa …» nhưng không phải mã DMĐT → đánh dấu ngoài danh mục
	const extra2 = await client.execute({
		sql: `SELECT id, alias, name FROM units
          WHERE (name LIKE 'Khoa %' OR name LIKE 'khoa %')
            AND upper(alias) NOT IN (${[...catalogCodes].map(() => '?').join(',')})
          ORDER BY alias`,
		args: [...catalogCodes]
	})

	for (const row of extra2.rows) {
		const id = row.id as number
		const oldAlias = String(row.alias)
		// Nếu đã map legacy mà còn sót — bỏ qua (đã xử lý)
		if (LEGACY_TO_CODE[oldAlias]) continue

		const newAlias = `X_${oldAlias}`.slice(0, 32)
		const clash = await client.execute({
			sql: 'SELECT id FROM units WHERE alias = ?',
			args: [newAlias]
		})
		const alias = clash.rows.length
			? `X${id}_${oldAlias}`.slice(0, 32)
			: newAlias

		await client.execute({
			sql: `UPDATE units SET alias = ?, name = ? WHERE id = ?`,
			args: [alias, `(ngoài DMĐT) ${row.name}`, id]
		})
		console.log(`  Ngoài DMĐT: ${oldAlias} → ${alias}  (${row.name})`)
	}

	console.log('\n=== Đơn vị khoa chuẩn (alias = mã DMĐT) ===')
	const list = await client.execute({
		sql: `SELECT id, alias, name FROM units
          WHERE upper(alias) IN (${[...catalogCodes].map(() => '?').join(',')})
          ORDER BY alias`,
		args: [...catalogCodes]
	})
	for (const u of list.rows) {
		console.log(`  ${u.alias}\t${u.name}\t(#${u.id})`)
	}
	console.log('Done.')
}

async function mergeUnitInto(fromId: number, toId: number) {
	await client.execute({
		sql: 'UPDATE room_assets SET holding_unit_id = ? WHERE holding_unit_id = ?',
		args: [toId, fromId]
	})
	await client.execute({
		sql: 'UPDATE users SET unitId = ? WHERE unitId = ?',
		args: [toId, fromId]
	})
	// classes.unitId nếu có
	try {
		await client.execute({
			sql: 'UPDATE classes SET unitId = ? WHERE unitId = ?',
			args: [toId, fromId]
		})
	} catch {
		/* ignore */
	}
	const ha = await client.execute({
		sql: 'SELECT count(*) c FROM room_assets WHERE holding_unit_id = ?',
		args: [fromId]
	})
	const hu = await client.execute({
		sql: 'SELECT count(*) c FROM users WHERE unitId = ?',
		args: [fromId]
	})
	if (Number(ha.rows[0]?.c || 0) + Number(hu.rows[0]?.c || 0) === 0) {
		await client.execute({
			sql: 'DELETE FROM units WHERE id = ?',
			args: [fromId]
		})
	} else {
		await client.execute({
			sql: `UPDATE units SET alias = ?, name = ? WHERE id = ?`,
			args: [`_MERGED_${fromId}`, `merged→${toId}`, fromId]
		})
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
