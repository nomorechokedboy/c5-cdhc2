/**
 * Tạo GV soạn đề + vài đề nháp đã gửi CNK (có CH + ĐA + chuông).
 *
 *   cd apps/api && pnpm exec tsx scripts/seed-lecturer-and-draft-exams.ts
 */
import { createClient } from '@libsql/client'
import argon2 from 'argon2'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve('./.env') })

const DB = process.env.DATABASE_URI?.replace(/^file:/, '') || './local.db'
const HASH_SECRET = process.env.HASH_SECRET
const API = process.env.API_URL || 'http://127.0.0.1:4000'

if (!HASH_SECRET) {
	console.error('Thiếu HASH_SECRET')
	process.exit(1)
}

async function hashPwd(password: string) {
	return argon2.hash(password, { secret: Buffer.from(HASH_SECRET!) })
}

async function ensureRole(
	client: ReturnType<typeof createClient>,
	name: string,
	description: string
) {
	const ex = await client.execute({
		sql: 'SELECT id FROM roles WHERE name = ?',
		args: [name]
	})
	if (ex.rows.length) return ex.rows[0]!.id as number
	await client.execute({
		sql: 'INSERT INTO roles (name, description) VALUES (?, ?)',
		args: [name, description]
	})
	const row = await client.execute({
		sql: 'SELECT id FROM roles WHERE name = ?',
		args: [name]
	})
	return row.rows[0]!.id as number
}

/** GV chỉ soạn đề — không bank/draw/duyệt */
async function grantLecturerExamPerms(
	client: ReturnType<typeof createClient>,
	roleId: number
) {
	// Gỡ quyền thừa (bank/draw) nếu từng seed nhầm
	await client.execute({
		sql: `
		DELETE FROM role_permissions
		WHERE role_id = ?
		AND permission_id IN (
			SELECT id FROM permissions
			WHERE name LIKE 'exam-draw:%' OR name LIKE 'exam-bank:%'
		)`,
		args: [roleId]
	})
	await client.execute({
		sql: `
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT ?, p.id FROM permissions p
		WHERE p.name IN (
			'exams:create', 'exams:read', 'exams:update', 'exams:delete'
		)
		AND NOT EXISTS (
			SELECT 1 FROM role_permissions rp
			WHERE rp.role_id = ? AND rp.permission_id = p.id
		)`,
		args: [roleId, roleId]
	})
}

async function upsertUser(
	client: ReturnType<typeof createClient>,
	u: {
		username: string
		password: string
		displayName: string
		role: string
	}
) {
	const hashed = await hashPwd(u.password)
	const existing = await client.execute({
		sql: 'SELECT id FROM users WHERE username = ?',
		args: [u.username]
	})
	let userId: number
	if (existing.rows.length) {
		userId = existing.rows[0]!.id as number
		await client.execute({
			sql: `UPDATE users SET password = ?, displayName = ?, isSuperUser = 0, status = 'approved' WHERE id = ?`,
			args: [hashed, u.displayName, userId]
		})
		console.log(`↻ ${u.username} — ${u.displayName}`)
	} else {
		await client.execute({
			sql: `INSERT INTO users (username, password, displayName, isSuperUser, status)
			      VALUES (?, ?, ?, 0, 'approved')`,
			args: [u.username, hashed, u.displayName]
		})
		const row = await client.execute({
			sql: 'SELECT id FROM users WHERE username = ?',
			args: [u.username]
		})
		userId = row.rows[0]!.id as number
		console.log(`+ ${u.username} — ${u.displayName}`)
	}

	const role = await client.execute({
		sql: 'SELECT id FROM roles WHERE name = ?',
		args: [u.role]
	})
	if (!role.rows.length) {
		console.warn(`  ! role ${u.role} missing`)
		return userId
	}
	const roleId = role.rows[0]!.id as number
	// Giữ các role khác, chỉ đảm bảo có exam_lecturer
	const has = await client.execute({
		sql: 'SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?',
		args: [userId, roleId]
	})
	if (!has.rows.length) {
		await client.execute({
			sql: 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
			args: [userId, roleId]
		})
	}
	return userId
}

const SAMPLE_DIR = path.resolve('./samples/exam-import')

/** File mẫu import (txt) — form app parse được */
const SAMPLE_FILES: Record<
	string,
	{ questions: string; answers: string; title: string; subjectCode: string }
> = {
	'ctdl-de1': {
		subjectCode: 'CTDL',
		title: '[GV] CTDL — Đề giữa kỳ (import)',
		questions: `Câu 1 (3 điểm): Stack và Queue khác nhau thế nào? Nêu 2 ứng dụng thực tế của mỗi cấu trúc.
Câu 2 (3 điểm): Độ phức tạp thời gian trung bình và xấu nhất của tìm kiếm nhị phân trên mảng đã sắp xếp?
Câu 3 (2 điểm): Mô tả thuật toán duyệt cây nhị phân theo thứ tự trung tố (in-order).
Câu 4 (2 điểm): Linked list đơn có ưu điểm gì so với mảng khi chèn/xóa phần tử ở giữa?
`,
		answers: `Đáp án câu 1: Stack LIFO (ngăn xếp), Queue FIFO (hàng đợi). Stack: undo, call stack. Queue: hàng đợi in, BFS.
Đáp án câu 2: Trung bình O(log n), xấu nhất O(log n) nếu mảng đã sắp; không tìm thấy cũng O(log n).
Đáp án câu 3: Duyệt trái → nút gốc → phải (đệ quy hoặc stack).
Đáp án câu 4: Chèn/xóa O(1) nếu đã có con trỏ tới nút; mảng phải dời phần tử O(n).
`
	},
	'csdl-de1': {
		subjectCode: 'CSDL',
		title: '[GV] CSDL — Đề kiểm tra (import)',
		questions: `Câu 1 (3 điểm): Khóa chính (PRIMARY KEY) và khóa ngoại (FOREIGN KEY) khác nhau như thế nào?
Câu 2 (3 điểm): Viết câu SQL liệt kê tên sinh viên và tên lớp (JOIN bảng students, classes).
Câu 3 (2 điểm): Dạng chuẩn 3NF yêu cầu gì so với 2NF?
Câu 4 (2 điểm): Transaction ACID — giải thích ngắn gọn từng chữ cái.
`,
		answers: `Đáp án câu 1: PK định danh duy nhất một dòng; FK tham chiếu PK/unique của bảng khác để đảm bảo toàn vẹn tham chiếu.
Đáp án câu 2: SELECT s.name, c.name FROM students s JOIN classes c ON s.class_id = c.id;
Đáp án câu 3: 3NF: đã 2NF và không phụ thuộc bắc cầu (non-prime → non-prime).
Đáp án câu 4: Atomicity, Consistency, Isolation, Durability.
`
	},
	'mmt-de1': {
		subjectCode: 'MMT',
		title: '[GV] MMT — Đề ôn tập (import)',
		questions: `Câu 1 (3 điểm): So sánh mô hình OSI và TCP/IP (số tầng, vai trò).
Câu 2 (3 điểm): IP và MAC address khác nhau ở đâu? ARP dùng để làm gì?
Câu 3 (2 điểm): TCP đảm bảo tin cậy bằng những cơ chế nào?
Câu 4 (2 điểm): Phân biệt switch lớp 2 và router.
`,
		answers: `Đáp án câu 1: OSI 7 tầng (lý thuyết); TCP/IP 4 tầng (thực tế: Link, Internet, Transport, Application).
Đáp án câu 2: IP logic/tầng mạng, MAC vật lý/tầng data link. ARP map IP → MAC trong LAN.
Đáp án câu 3: Sequence number, ACK, retransmission, flow control, congestion control.
Đáp án câu 4: Switch L2 chuyển theo MAC trong LAN; router định tuyến theo IP giữa các mạng.
`
	}
}

async function login(username: string, password: string) {
	const resp = await fetch(`${API}/authn/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	})
	const data = (await resp.json()) as {
		accessToken?: string
		message?: string
		code?: string
	}
	if (!resp.ok || !data.accessToken) {
		throw new Error(
			`Login ${username} failed: ${data.message || resp.status}`
		)
	}
	return data.accessToken
}

async function apiJson<T>(
	token: string,
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const resp = await fetch(`${API}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: body !== undefined ? JSON.stringify(body) : undefined
	})
	const text = await resp.text()
	let data: unknown = null
	if (text.trim()) {
		try {
			data = JSON.parse(text)
		} catch {
			throw new Error(
				`${method} ${path}: non-JSON (${resp.status}): ${text.slice(0, 200)}`
			)
		}
	}
	if (!resp.ok) {
		const msg =
			(data as { message?: string } | null)?.message ||
			text ||
			String(resp.status)
		throw new Error(`${method} ${path}: ${msg}`)
	}
	return data as T
}

/** Parse txt đơn giản → questions[] (đồng bộ logic app) */
function parseQuestions(
	qText: string,
	aText: string
): Array<{
	questionNumber: number
	content: string
	answer: string
	points: number
}> {
	const Q_LINE =
		/^\s*(?:câu\s*)?(\d+)\s*(?:\((\d+(?:[.,]\d+)?)\s*điểm?\))?\s*[:.\-–—)]\s*(.*)$/i
	const A_LINE =
		/^\s*(?:đáp\s*án|da|answer)\s*(?:câu\s*(\d+))?\s*[:.\-–—]\s*(.*)$/i
	const map = new Map<
		number,
		{
			questionNumber: number
			content: string
			answer: string
			points: number
		}
	>()

	let current: number | null = null
	for (const raw of qText.replace(/\r\n/g, '\n').split('\n')) {
		const t = raw.trim()
		if (!t) continue
		const m = t.match(Q_LINE)
		if (m) {
			const n = Number(m[1])
			const pts = m[2] ? Number(String(m[2]).replace(',', '.')) : 1
			map.set(n, {
				questionNumber: n,
				content: (m[3] || '').trim(),
				answer: '',
				points: Number.isFinite(pts) && pts > 0 ? pts : 1
			})
			current = n
		} else if (current && map.has(current)) {
			const q = map.get(current)!
			q.content = q.content ? `${q.content}\n${t}` : t
		}
	}

	current = null
	for (const raw of aText.replace(/\r\n/g, '\n').split('\n')) {
		const t = raw.trim()
		if (!t) continue
		const m = t.match(A_LINE)
		if (m) {
			const n = m[1] ? Number(m[1]) : current
			if (n) {
				if (!map.has(n)) {
					map.set(n, {
						questionNumber: n,
						content: '',
						answer: '',
						points: 1
					})
				}
				map.get(n)!.answer = (m[2] || '').trim()
				current = n
			}
		} else if (current && map.has(current)) {
			const q = map.get(current)!
			q.answer = q.answer ? `${q.answer}\n${t}` : t
		}
	}

	return [...map.values()].sort((a, b) => a.questionNumber - b.questionNumber)
}

async function main() {
	const client = createClient({
		url: DB.startsWith('file:') ? DB : `file:${path.resolve(DB)}`
	})

	console.log(
		'=== 1) Role exam_lecturer + quyền exams:* (không bank/draw) ==='
	)
	const lectRole = await ensureRole(
		client,
		'exam_lecturer',
		'Giảng viên soạn đề thi tự luận'
	)
	await grantLecturerExamPerms(client, lectRole)

	console.log('\n=== 2) Tài khoản giảng viên ===')
	const lecturers = [
		{
			username: 'gv.cntt',
			password: 'User@123',
			displayName: 'GV — Nguyễn Văn A (CNTT)',
			role: 'exam_lecturer'
		},
		{
			username: 'gv.b',
			password: 'User@123',
			displayName: 'GV — Trần Thị B (soạn đề demo)',
			role: 'exam_lecturer'
		}
	]
	const gvIds: number[] = []
	for (const u of lecturers) {
		gvIds.push(await upsertUser(client, u))
	}

	// Phân công môn CNTT cho GV (nếu bảng có)
	try {
		const subjects = await client.execute({
			sql: `SELECT id, code FROM exam_subjects WHERE code IN ('CTDL','CSDL','MMT')`
		})
		for (const gvId of gvIds) {
			for (const s of subjects.rows) {
				const sid = s.id as number
				const ex = await client.execute({
					sql: `SELECT 1 FROM exam_teaching_assignments WHERE user_id = ? AND subject_id = ?`,
					args: [gvId, sid]
				})
				if (!ex.rows.length) {
					await client.execute({
						sql: `INSERT INTO exam_teaching_assignments (user_id, subject_id) VALUES (?, ?)`,
						args: [gvId, sid]
					})
				}
			}
		}
		console.log('  ✓ Phân công CTDL/CSDL/MMT cho GV')
	} catch (e) {
		console.log('  (bỏ qua phân công — bảng có thể khác schema)', e)
	}

	// Ghi file mẫu import
	console.log('\n=== 3) File import mẫu (CH + ĐA) ===')
	fs.mkdirSync(SAMPLE_DIR, { recursive: true })
	for (const [key, sample] of Object.entries(SAMPLE_FILES)) {
		const qPath = path.join(SAMPLE_DIR, `${key}-cau-hoi.txt`)
		const aPath = path.join(SAMPLE_DIR, `${key}-dap-an.txt`)
		fs.writeFileSync(qPath, sample.questions, 'utf8')
		fs.writeFileSync(aPath, sample.answers, 'utf8')
		console.log(`  ✓ ${qPath}`)
		console.log(`  ✓ ${aPath}`)
	}

	// Tạo đề qua API + submit → CNK (chuông)
	console.log('\n=== 4) Login GV & tạo đề + gửi CNK ===')
	const token = await login('gv.cntt', 'User@123')

	const subjRows = await client.execute({
		sql: `SELECT id, code, name FROM exam_subjects WHERE code IN ('CTDL','CSDL','MMT')`
	})
	const subjByCode = new Map(
		subjRows.rows.map((r) => [
			String(r.code),
			r as { id: number; code: string; name: string }
		])
	)

	const created: Array<{
		id: number
		code: string
		title: string
		status: string
	}> = []

	for (const [key, sample] of Object.entries(SAMPLE_FILES)) {
		const subj = subjByCode.get(sample.subjectCode)
		if (!subj) {
			console.warn(
				`  ! Không có môn ${sample.subjectCode} — bỏ qua ${key}`
			)
			continue
		}
		const questions = parseQuestions(sample.questions, sample.answers)
		const createdResp = await apiJson<{
			data: { id: number; code: string; title: string; status: string }
		}>(token, 'POST', '/exam/exams', {
			title: sample.title,
			subjectId: Number(subj.id),
			note: `Import mẫu ${key} — có CH + ĐA (GV demo)`,
			questionFileName: `${key}-cau-hoi.txt`,
			answerFileName: `${key}-dap-an.txt`,
			questions
		})
		const exam = createdResp.data
		const submitted = await apiJson<{
			data: { id: number; code: string; title: string; status: string }
		}>(token, 'POST', `/exam/exams/${exam.id}/submit`, {
			note: 'GV gửi CNK kiểm duyệt (seed demo)'
		})
		created.push(submitted.data)
		console.log(
			`  ✓ #${submitted.data.id} ${submitted.data.code} → ${submitted.data.status}`
		)
	}

	// Kiểm tra notification cho CNK
	console.log('\n=== 5) Kiểm tra chuông CNK (user.cntt / cnk.cntt) ===')
	const cnk = await client.execute({
		sql: `SELECT u.id, u.username FROM users u
		      JOIN user_roles ur ON ur.user_id = u.id
		      JOIN roles r ON r.id = ur.role_id
		      WHERE r.name IN ('user_nganh','exam_dept_head')
		      LIMIT 5`
	})
	for (const row of cnk.rows) {
		const notif = await client.execute({
			sql: `SELECT id, title, message, created_at FROM notifications
			      WHERE user_id = ? AND notification_type = 'examWorkflow'
			      ORDER BY id DESC LIMIT 3`,
			args: [row.id]
		})
		console.log(
			`  ${row.username} (id=${row.id}): ${notif.rows.length} thông báo exam gần nhất`
		)
		for (const n of notif.rows) {
			console.log(`    · ${n.title} — ${String(n.message).slice(0, 80)}…`)
		}
	}

	console.log('\n========== TÓM TẮT ==========')
	console.log('Giảng viên mới:')
	console.log('  gv.cntt / User@123  — GV Nguyễn Văn A (CNTT)')
	console.log('  gv.b    / User@123  — GV Trần Thị B')
	console.log('\nCNK duyệt (chuông):')
	console.log('  user.cntt / User@123  hoặc cnk.cntt / User@123')
	console.log('\nFile import (kéo thả khi soạn đề):')
	console.log(`  ${SAMPLE_DIR}/`)
	console.log('  *-cau-hoi.txt  +  *-dap-an.txt')
	console.log('\nĐề đã gửi CNK (PENDING_DEPT):')
	for (const e of created) {
		console.log(`  #${e.id} ${e.code} — ${e.title}`)
	}
	console.log('\nThử: login CNK → chuông 🔔 → Duyệt đề → Duyệt / Trả lại')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
