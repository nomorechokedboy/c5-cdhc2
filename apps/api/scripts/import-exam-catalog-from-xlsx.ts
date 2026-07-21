/**
 * Import danh mục từ sheet «Tổng hợp mã môn học»
 *
 * Hierarchy (khớp header file):
 *   Hệ (2): Quân sự (A) | Dân sự (B)
 *     → Ngành = các cột: Y sĩ TC/CD/LT, Điều dưỡng CD/LT, Dược…
 *       → Khoa (dòng K1, K2…)
 *         → Môn (dòng có mã M… + x)
 *
 * Mã ngành: {A|B}_{TC|CD|LT}{short}  vd B_CDDD
 * Mã môn:   {mã_ngành}_{mã_gốc}      vd B_CDDD_M001K1
 *
 *   cd apps/api && pnpm import:exam-catalog [path.xlsx]
 */
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { execFileSync } from 'child_process'

dotenv.config({ path: path.resolve('./.env') })

const DB = process.env.DATABASE_URI?.replace(/^file:/, '') || './local.db'
const XLSX =
	process.argv[2] || '/home/itho/Downloads/Khung CT-27-03.11.2025-in.xlsx'

/** Mỗi cột = một ngành thuộc 1 trong 2 hệ */
type ProgramCol = {
	col: number
	systemLetter: 'A' | 'B'
	levelCode: string
	/** Tên ngành như trên header cột */
	name: string
	majorShort: string
}

const PROGRAMS: ProgramCol[] = [
	// Hệ quân sự — cols D–H (3–7)
	{
		col: 3,
		systemLetter: 'A',
		levelCode: 'TC',
		name: 'Y sĩ đa khoa (trung cấp)',
		majorShort: 'YSDK'
	},
	{
		col: 4,
		systemLetter: 'A',
		levelCode: 'CD',
		name: 'Y sĩ đa khoa (cao đẳng)',
		majorShort: 'YSDK'
	},
	{
		col: 5,
		systemLetter: 'A',
		levelCode: 'LT',
		name: 'Y sĩ đa khoa (liên thông)',
		majorShort: 'YSDK'
	},
	{
		col: 6,
		systemLetter: 'A',
		levelCode: 'CD',
		name: 'Điều dưỡng (cao đẳng)',
		majorShort: 'DD'
	},
	{
		col: 7,
		systemLetter: 'A',
		levelCode: 'LT',
		name: 'Điều dưỡng (liên thông)',
		majorShort: 'DD'
	},
	// Hệ dân sự — cols I–K (8–10)
	{
		col: 8,
		systemLetter: 'B',
		levelCode: 'CD',
		name: 'Y sĩ đa khoa (cao đẳng)',
		majorShort: 'YSDK'
	},
	{
		col: 9,
		systemLetter: 'B',
		levelCode: 'CD',
		name: 'Điều dưỡng (cao đẳng)',
		majorShort: 'DD'
	},
	{
		col: 10,
		systemLetter: 'B',
		levelCode: 'CD',
		name: 'Dược (cao đẳng)',
		majorShort: 'DUOC'
	}
]

function majorCode(p: ProgramCol): string {
	return `${p.systemLetter}_${p.levelCode}${p.majorShort}`
}

function subjectFullCode(majCode: string, base: string): string {
	const b = base.trim().toUpperCase()
	const m = majCode.trim().toUpperCase()
	if (b.startsWith(m + '_')) return b
	return `${m}_${b}`
}

function parseSummarySheet(xlsxPath: string): string[][] {
	const py = `
import zipfile, xml.etree.ElementTree as ET, re, json, sys
path = sys.argv[1]
ns = {'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(path) as z:
    ss=[]
    root=ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in root.findall('m:si', ns):
        texts=[t.text or '' for t in si.findall('.//m:t', ns)]
        ss.append(''.join(texts))
    root=ET.fromstring(z.read('xl/worksheets/sheet10.xml'))
    rows={}
    def colrow(ref):
        m=re.match(r'([A-Z]+)(\\d+)', ref); return m.group(1), int(m.group(2))
    def col_to_idx(col):
        n=0
        for c in col: n=n*26+(ord(c)-64)
        return n-1
    for c in root.findall('.//m:sheetData/m:row/m:c', ns):
        ref=c.attrib.get('r')
        if not ref: continue
        col,row=colrow(ref)
        t=c.attrib.get('t'); v=c.find('m:v', ns); val=v.text if v is not None else ''
        if t=='s' and val!='': val=ss[int(val)]
        is_elem=c.find('m:is', ns)
        if is_elem is not None:
            val=''.join(t.text or '' for t in is_elem.findall('.//m:t', ns))
        rows.setdefault(row,{})[col_to_idx(col)]=val
    out=[]
    for r in range(1, max(rows)+1):
        row=rows.get(r,{})
        maxc=max(row) if row else 0
        out.append([str(row.get(i,'') or '').replace('\\n',' ').strip() for i in range(0, max(11, maxc+1))])
    print(json.dumps(out, ensure_ascii=False))
`
	const out = execFileSync('python3', ['-c', py, xlsxPath], {
		encoding: 'utf8',
		maxBuffer: 20 * 1024 * 1024
	})
	return JSON.parse(out) as string[][]
}

async function rebuildSchema(client: ReturnType<typeof createClient>) {
	const wipe = [
		'exam_draw_logs',
		'exam_draws',
		'exam_workflow_logs',
		'exam_questions',
		'exams',
		'exam_teaching_assignments',
		'exam_major_heads',
		'exam_classes',
		'exam_subjects',
		'exam_faculties',
		'exam_majors',
		'exam_systems',
		'exam_training_types'
	]
	for (const t of wipe) {
		try {
			await client.execute(`DELETE FROM ${t}`)
		} catch {
			/* */
		}
	}

	await client.executeMultiple(`
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS exam_subjects;
DROP TABLE IF EXISTS exam_faculties;
DROP TABLE IF EXISTS exam_majors;
DROP TABLE IF EXISTS exam_systems;
DROP TABLE IF EXISTS exam_training_types;

CREATE TABLE exam_systems (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  createdAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  letter text NOT NULL UNIQUE,
  description text
);

CREATE TABLE exam_majors (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  createdAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  system_id integer NOT NULL,
  level_code text,
  short_code text,
  description text
);
CREATE INDEX exam_majors_system_idx ON exam_majors (system_id);

CREATE TABLE exam_faculties (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  createdAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  major_id integer NOT NULL,
  description text
);
CREATE UNIQUE INDEX exam_faculties_major_code_uq ON exam_faculties (major_id, code);
CREATE INDEX exam_faculties_major_idx ON exam_faculties (major_id);

CREATE TABLE exam_subjects (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  createdAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  code text NOT NULL UNIQUE,
  base_code text,
  name text NOT NULL,
  credit_hours integer DEFAULT 0,
  lesson_hours integer DEFAULT 0,
  faculty_id integer NOT NULL,
  major_id integer NOT NULL,
  description text
);
CREATE INDEX exam_subjects_faculty_idx ON exam_subjects (faculty_id);
CREATE INDEX exam_subjects_major_idx ON exam_subjects (major_id);
CREATE INDEX exam_subjects_base_code_idx ON exam_subjects (base_code);
`)
}

async function main() {
	if (!fs.existsSync(XLSX)) {
		console.error('Không tìm thấy file:', XLSX)
		process.exit(1)
	}
	console.log('DB:', DB)
	console.log('XLSX:', XLSX)
	console.log('Hierarchy: Hệ (2) → Ngành (cột) → Khoa → Môn')

	const rows = parseSummarySheet(XLSX)
	console.log('Rows sheet tổng hợp:', rows.length)

	const client = createClient({ url: `file:${path.resolve(DB)}` })
	await rebuildSchema(client)

	// Chỉ 2 hệ
	const systemIdByLetter = new Map<string, number>()
	for (const [code, name, letter] of [
		['QS', 'Hệ quân sự', 'A'],
		['DS', 'Hệ dân sự', 'B']
	] as const) {
		const r = await client.execute({
			sql: `INSERT INTO exam_systems (code, name, letter) VALUES (?, ?, ?) RETURNING id`,
			args: [code, name, letter]
		})
		systemIdByLetter.set(letter, Number(r.rows[0]!.id))
		console.log('  Hệ', letter, name)
	}

	const majorIdByCode = new Map<string, number>()
	const majorCodeByCol = new Map<number, string>()

	for (const p of PROGRAMS) {
		const mCode = majorCode(p)
		majorCodeByCol.set(p.col, mCode)
		if (majorIdByCode.has(mCode)) continue
		const sid = systemIdByLetter.get(p.systemLetter)!
		const r = await client.execute({
			sql: `INSERT INTO exam_majors (code, name, system_id, level_code, short_code, description)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
			args: [
				mCode,
				p.name,
				sid,
				p.levelCode,
				p.majorShort,
				`Cột chương trình · ${p.systemLetter === 'A' ? 'QS' : 'DS'}`
			]
		})
		majorIdByCode.set(mCode, Number(r.rows[0]!.id))
		console.log('  Ngành', mCode, '—', p.name)
	}

	let currentFaculty: { code: string; name: string } | null = null
	const facultyCache = new Map<string, number>()
	let facultyCount = 0
	let subjectCount = 0

	async function ensureFaculty(majorId: number, code: string, name: string) {
		const key = `${majorId}|${code}`
		const hit = facultyCache.get(key)
		if (hit) return hit
		const r = await client.execute({
			sql: `INSERT INTO exam_faculties (code, name, major_id) VALUES (?, ?, ?) RETURNING id`,
			args: [code, name, majorId]
		})
		const id = Number(r.rows[0]!.id)
		facultyCache.set(key, id)
		facultyCount++
		return id
	}

	for (let i = 2; i < rows.length; i++) {
		const row = rows[i]!
		const tt = (row[0] || '').trim()
		const name = (row[1] || '').trim()
		const baseCode = (row[2] || '').trim()

		if (/^K\d+$/i.test(tt) && name) {
			currentFaculty = { code: tt.toUpperCase(), name }
			continue
		}
		if (!baseCode || !/^M\d/i.test(baseCode) || !name || !currentFaculty)
			continue

		for (const p of PROGRAMS) {
			const mark = (row[p.col] || '').trim().toLowerCase()
			if (mark !== 'x' && mark !== '×' && mark !== '✓') continue
			const mCode = majorCodeByCol.get(p.col)!
			const mid = majorIdByCode.get(mCode)!
			const facId = await ensureFaculty(
				mid,
				currentFaculty.code,
				currentFaculty.name
			)
			const full = subjectFullCode(mCode, baseCode)
			try {
				await client.execute({
					sql: `INSERT INTO exam_subjects
              (code, base_code, name, credit_hours, lesson_hours, faculty_id, major_id)
              VALUES (?, ?, ?, 0, 0, ?, ?)`,
					args: [full, baseCode.toUpperCase(), name, facId, mid]
				})
				subjectCount++
			} catch (e) {
				const msg = String(e)
				if (!msg.includes('UNIQUE')) console.warn(full, e)
			}
		}
	}

	console.log('---')
	console.log('Hệ:', 2)
	console.log('Ngành:', majorIdByCode.size)
	console.log('Khoa:', facultyCount)
	console.log('Môn:', subjectCount)
	console.log('Xong.')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
