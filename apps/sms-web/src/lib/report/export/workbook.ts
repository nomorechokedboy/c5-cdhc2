import type { Cell, Workbook, Worksheet } from 'exceljs'
import i18n from '@/i18n'
import { bandKey, BANDS, conductKey, scoreTone } from '@/lib/report/labels'
import type {
	ReportCourse,
	SemesterReport,
	StudentRow,
	Summary,
	YearReport
} from '@/lib/report/types'

const XLSX_MIME =
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const t = (key: string, options?: Record<string, unknown>) =>
	i18n.t(key, options) as string

type CellValue = string | number | null
type Kind = 'score' | 'conduct' | 'rank' | 'text'

interface ColumnSpec {
	header: string
	sub?: string
	kind: Kind
	width: number
}
interface GroupSpec {
	title: string
	columns: ColumnSpec[]
}
interface SheetSpec {
	title: string
	className: string
	groups: GroupSpec[]
	/** [mã học viên, họ tên, ...one value per column of the groups] */
	rows: CellValue[][]
}

const FIXED_COLUMNS = 3
const HEADER_ROW = 5
const FIRST_ROW = 7

const NUMBER_FORMAT: Record<Kind, string | undefined> = {
	score: '0.00',
	conduct: '0.0',
	rank: '0',
	text: undefined
}
const TONE_FILL = { good: 'FFD9EAD3', warn: 'FFFCE8B2' } as const
const FAIL_COLOR = 'FFC00000'

const thin = { style: 'thin' as const }
const BORDER = { top: thin, left: thin, bottom: thin, right: thin }

type ExcelModule = typeof import('exceljs')

async function newWorkbook(): Promise<Workbook> {
	const mod = (await import('exceljs')) as ExcelModule & {
		default?: ExcelModule
	}
	const wb = new (mod.default ?? mod).Workbook()
	wb.creator = t('report.export.school')
	return wb
}

const fill = (argb: string) => ({
	type: 'pattern' as const,
	pattern: 'solid' as const,
	fgColor: { argb }
})

function styleHeader(cell: Cell, value: string) {
	cell.value = value
	cell.font = { bold: true }
	cell.alignment = {
		horizontal: 'center',
		vertical: 'middle',
		wrapText: true
	}
	cell.border = BORDER
	cell.fill = fill('FFF2F2F2')
}

function styleScore(cell: Cell, value: number) {
	const tone = scoreTone(value)
	if (tone !== 'none') cell.fill = fill(TONE_FILL[tone])
	if (value < 5) cell.font = { color: { argb: FAIL_COLOR } }
}

function mergedLine(
	ws: Worksheet,
	row: number,
	lastColumn: number,
	text: string,
	size: number,
	bold: boolean
) {
	ws.mergeCells(row, 1, row, lastColumn)
	const cell = ws.getCell(row, 1)
	cell.value = text
	cell.font = { bold, size }
	cell.alignment = { horizontal: 'center' }
}

function writeMainSheet(wb: Workbook, spec: SheetSpec) {
	const ws = wb.addWorksheet(t('report.export.sheetResults'), {
		pageSetup: {
			orientation: 'landscape',
			paperSize: 9,
			fitToPage: true,
			fitToWidth: 1,
			fitToHeight: 0
		}
	})
	const columns = spec.groups.flatMap((g) => g.columns)
	const last = FIXED_COLUMNS + columns.length
	ws.columns = [
		{ width: 6 },
		{ width: 14 },
		{ width: 26 },
		...columns.map((c) => ({ width: c.width }))
	]

	mergedLine(ws, 1, last, t('report.export.school'), 12, true)
	mergedLine(ws, 2, last, spec.title, 14, true)
	mergedLine(
		ws,
		3,
		last,
		t('report.export.class', { name: spec.className }),
		11,
		false
	)
	;[
		t('report.col.no'),
		t('report.col.idnumber'),
		t('report.col.name')
	].forEach((text, i) => {
		ws.mergeCells(HEADER_ROW, i + 1, HEADER_ROW + 1, i + 1)
		styleHeader(ws.getCell(HEADER_ROW, i + 1), text)
		ws.getCell(HEADER_ROW + 1, i + 1).border = BORDER
	})
	let col = FIXED_COLUMNS + 1
	for (const group of spec.groups) {
		if (group.columns.length === 0) continue
		if (group.columns.length > 1) {
			ws.mergeCells(
				HEADER_ROW,
				col,
				HEADER_ROW,
				col + group.columns.length - 1
			)
		}
		styleHeader(ws.getCell(HEADER_ROW, col), group.title)
		group.columns.forEach((c, k) => {
			ws.getCell(HEADER_ROW, col + k).border = BORDER
			styleHeader(
				ws.getCell(HEADER_ROW + 1, col + k),
				c.sub ? `${c.header}\n${c.sub}` : c.header
			)
		})
		col += group.columns.length
	}
	ws.getRow(HEADER_ROW + 1).height = 32

	spec.rows.forEach((values, i) => {
		const r = FIRST_ROW + i
		const no = ws.getCell(r, 1)
		no.value = i + 1
		no.alignment = { horizontal: 'center' }
		no.border = BORDER
		values.forEach((value, k) => {
			const cell = ws.getCell(r, 2 + k)
			cell.value = value
			cell.border = BORDER
			const spec = columns[k - 2]
			if (!spec) return
			cell.alignment = {
				horizontal: spec.kind === 'text' ? 'left' : 'center'
			}
			if (typeof value === 'number') {
				const fmt = NUMBER_FORMAT[spec.kind]
				if (fmt) cell.numFmt = fmt
				if (spec.kind === 'score') styleScore(cell, value)
			}
		})
	})

	writeFooter(ws, FIRST_ROW + spec.rows.length + 1, last)
}

function writeFooter(ws: Worksheet, start: number, last: number) {
	ws.getCell(start, 2).value = t('report.export.legendTitle')
	ws.getCell(start, 2).font = { bold: true }
	const legend: [string, string | null][] = [
		[t('report.export.legendGood'), TONE_FILL.good],
		[t('report.export.legendWarn'), TONE_FILL.warn],
		[t('report.export.legendFail'), null]
	]
	legend.forEach(([text, argb], i) => {
		const swatch = ws.getCell(start + 1 + i, 2)
		swatch.border = BORDER
		if (argb) swatch.fill = fill(argb)
		else swatch.font = { color: { argb: FAIL_COLOR } }
		ws.getCell(start + 1 + i, 3).value = text
	})

	const mid = Math.max(4, Math.floor(last / 2))
	const signRow = start + 6
	ws.mergeCells(signRow, mid + 1, signRow, last)
	const place = ws.getCell(signRow, mid + 1)
	place.value = t('report.export.place')
	place.font = { italic: true }
	place.alignment = { horizontal: 'center' }

	const blocks: [number, number, string][] = [
		[2, mid, t('report.export.dean')],
		[mid + 1, last, t('report.export.principal')]
	]
	for (const [from, to, title] of blocks) {
		ws.mergeCells(signRow + 1, from, signRow + 1, to)
		const head = ws.getCell(signRow + 1, from)
		head.value = title
		head.font = { bold: true }
		head.alignment = { horizontal: 'center' }
		ws.mergeCells(signRow + 2, from, signRow + 2, to)
		const hint = ws.getCell(signRow + 2, from)
		hint.value = t('report.export.signHint')
		hint.font = { italic: true }
		hint.alignment = { horizontal: 'center' }
	}
}

function writeSummarySheet(
	wb: Workbook,
	summary: Summary,
	courses: ReportCourse[] | undefined,
	className: string
) {
	const ws = wb.addWorksheet(t('report.export.sheetSummary'))
	ws.columns = [
		{ width: 26 },
		{ width: 24 },
		{ width: 14 },
		...BANDS.slice(3).map(() => ({ width: 14 }))
	]
	let r = 1
	const line = (values: CellValue[], bold = false) => {
		values.forEach((v, i) => {
			const cell = ws.getCell(r, i + 1)
			cell.value = v
			if (bold) cell.font = { bold: true }
		})
		r += 1
	}

	line([`${t('report.summary.title')} - ${className}`], true)
	r += 1
	line([t('report.summary.headcount'), summary.headcount])
	line([t('report.summary.classGpa'), summary.classGpa])
	line([t('report.summary.maxGpa'), summary.maxGpa])
	ws.getCell(r - 2, 2).numFmt = '0.00'
	ws.getCell(r - 1, 2).numFmt = '0.00'
	r += 1
	line([t('report.summary.distribution')], true)
	for (const band of BANDS) {
		line([t(bandKey(band)), summary.byClassification[band] ?? 0])
	}
	r += 1
	line([t('report.summary.top')], true)
	for (const entry of summary.top) {
		line([entry.rank, entry.fullname, entry.gpa])
		ws.getCell(r - 1, 3).numFmt = '0.00'
	}

	if (courses && summary.perCourse) {
		r += 1
		line([t('report.summary.perCourse')], true)
		line(
			[
				t('report.summary.course'),
				t('report.summary.mean'),
				...BANDS.map((b) => t(bandKey(b)))
			],
			true
		)
		for (const c of courses) {
			const stats = summary.perCourse[String(c.id)]
			line([
				c.shortname,
				stats?.mean ?? null,
				...BANDS.map((b) => stats?.bands[b] ?? 0)
			])
			ws.getCell(r - 1, 2).numFmt = '0.00'
		}
	}
}

const SCORE_WIDTH = 9

const conductLabel = (row: { conduct: StudentRow['conduct'] }) =>
	row.conduct ? t(conductKey(row.conduct.label)) : null

const bandLabel = (band: StudentRow['classification']) =>
	band ? t(bandKey(band)) : null

function summaryColumns(
	gpaHeader: string,
	conductHeader: string
): ColumnSpec[] {
	return [
		{ header: gpaHeader, kind: 'score', width: SCORE_WIDTH },
		{ header: t('report.col.classification'), kind: 'text', width: 16 },
		{ header: t('report.col.rank'), kind: 'rank', width: 7 },
		{ header: conductHeader, kind: 'conduct', width: 11 },
		{ header: t('report.col.conductLabel'), kind: 'text', width: 16 }
	]
}

export async function buildSemesterWorkbook(
	report: SemesterReport
): Promise<Workbook> {
	const wb = await newWorkbook()
	writeMainSheet(wb, {
		title: t('report.export.titleSemester', {
			semester: report.semester,
			year: report.year
		}),
		className: report.class.name,
		groups: [
			{
				title: t('report.col.courses'),
				columns: report.courses.map((c) => ({
					header: c.shortname,
					sub: t('report.col.credits', { count: c.credits }),
					kind: 'score' as const,
					width: SCORE_WIDTH
				}))
			},
			{
				title: t('report.col.summary'),
				columns: summaryColumns(
					t('report.col.gpa'),
					t('report.col.conduct')
				)
			}
		],
		rows: report.students.map((s) => [
			s.idnumber,
			s.fullname,
			...report.courses.map((c) => s.scores[String(c.id)] ?? null),
			s.gpa,
			bandLabel(s.classification),
			s.rank,
			s.conduct?.score ?? null,
			conductLabel(s)
		])
	})
	writeSummarySheet(wb, report.summary, report.courses, report.class.name)
	return wb
}

export async function buildYearWorkbook(report: YearReport): Promise<Workbook> {
	const wb = await newWorkbook()
	const byPeriod = report.periods.map(
		(p) => new Map(p.students.map((s) => [s.id, s]))
	)
	writeMainSheet(wb, {
		title: t('report.export.titleYear', { year: report.year }),
		className: report.class.name,
		groups: [
			...report.periods.map((p) => ({
				title: t('report.semester', { number: p.semester }),
				columns: [
					{
						header: t('report.col.gpa'),
						kind: 'score' as const,
						width: SCORE_WIDTH
					},
					{
						header: t('report.col.conduct'),
						kind: 'conduct' as const,
						width: 11
					}
				]
			})),
			{
				title: t('report.col.summary'),
				columns: summaryColumns(
					t('report.col.gpaYear'),
					t('report.col.conductYear')
				)
			}
		],
		rows: report.students.map((s) => [
			s.idnumber,
			s.fullname,
			...byPeriod.flatMap((rows) => {
				const row = rows.get(s.id)
				return [row?.gpa ?? null, row?.conduct?.score ?? null]
			}),
			s.gpa,
			bandLabel(s.classification),
			s.rank,
			s.conduct?.score ?? null,
			conductLabel(s)
		])
	})
	writeSummarySheet(wb, report.summary, undefined, report.class.name)
	return wb
}

const ascii = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.replace(/[^A-Za-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')

export function exportFileName(report: SemesterReport | YearReport): string {
	const cls = ascii(report.class.idnumber || report.class.name) || 'lop'
	return 'semester' in report
		? `Ket_qua_hoc_tap_HK${report.semester}_Nam${report.year}_${cls}.xlsx`
		: `Ket_qua_hoc_tap_Nam${report.year}_${cls}.xlsx`
}

export async function downloadWorkbook(wb: Workbook, filename: string) {
	const buffer = await wb.xlsx.writeBuffer()
	const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }))
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	link.remove()
	URL.revokeObjectURL(url)
}

export async function exportReport(report: SemesterReport | YearReport) {
	const wb =
		'semester' in report
			? await buildSemesterWorkbook(report)
			: await buildYearWorkbook(report)
	await downloadWorkbook(wb, exportFileName(report))
}
