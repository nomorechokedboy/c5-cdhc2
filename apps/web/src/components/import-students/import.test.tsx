import { describe, expect, it } from 'vitest'
import { IMPORT_COLUMNS } from './columns'
import { OPTIONS, goodRow, sheetBytes } from './fixtures'
import { ImportFormatError, parseStudentSheet } from './parse'
import { buildTemplateWorkbook } from './template'
import { resolveUnit } from './units'
import { hasErrors, validateRow } from './validate'

describe('resolveUnit', () => {
	it.each([
		['7', { unitId: 7 }],
		['Lớp 2 - Đại đội 1', { unitId: 8 }],
		['lop 2 - dai doi 1', { unitId: 8 }], // không phân biệt dấu/hoa thường
		['Lớp 2', { unitId: 8 }], // tên duy nhất
		['L1', { unitId: 7 }], // alias
		['Lớp 1 - Đại đội 2', { unitId: 9 }],
		['Lớp 1', { problem: 'ambiguous' }], // trùng giữa 2 đại đội
		['Lớp 99', { problem: 'notFound' }],
		['   ', { problem: 'empty' }]
	])('resolves %j', (input, expected) => {
		expect(resolveUnit(input, OPTIONS)).toEqual(expected)
	})
})

describe('parseStudentSheet', () => {
	it('normalises legacy template values', () => {
		const [row] = parseStudentSheet(
			sheetBytes([
				goodRow({
					unitId: 7, // ID số (file mẫu cũ)
					dob: 36892, // số ngày của Excel = 01/01/2001
					politicalOrg: 'Đảng',
					isMarried: 'Có',
					isGraduated: '',
					familySize: '5',
					cpvId: 123456
				})
			])
		)
		expect(row.rowNumber).toBe(3)
		expect(row.unitText).toBe('7')
		expect(row.values).toMatchObject({
			dob: '2001-01-01',
			politicalOrg: 'cpv',
			isMarried: true,
			isGraduated: false,
			familySize: 5,
			cpvId: '123456'
		})
	})

	it('skips blank rows, keeps the real Excel row number, ignores unknown columns', () => {
		const rows = parseStudentSheet(
			sheetBytes(
				[goodRow(), {}, goodRow({ fullName: 'B' })],
				[
					...IMPORT_COLUMNS.map((c) => c.key),
					'childrenInfos',
					'whatever'
				]
			)
		)
		expect(rows.map((r) => r.rowNumber)).toEqual([3, 5])
		expect(rows[0].values).not.toHaveProperty('childrenInfos')
		expect(rows[0].values).not.toHaveProperty('whatever')
	})

	it('rejects files that do not follow the template', () => {
		expect(() =>
			parseStudentSheet(sheetBytes([goodRow()], ['foo', 'bar']))
		).toThrow(ImportFormatError)
	})
})

describe('validateRow', () => {
	const rowOf = (over: Record<string, unknown>) =>
		parseStudentSheet(sheetBytes([goodRow(over)]))[0]

	it('accepts a complete row', () => {
		const row = rowOf({})
		expect(validateRow(row, resolveUnit(row.unitText, OPTIONS))).toEqual([])
	})

	it('blocks missing name, bad dates and unresolved unit', () => {
		const row = rowOf({
			fullName: '',
			dob: '31/02/2001',
			fatherDob: 'abc',
			unitId: 'Lớp 1'
		})
		const issues = validateRow(row, resolveUnit(row.unitText, OPTIONS))
		expect(hasErrors(issues)).toBe(true)
		expect(issues.map((i) => i.field).sort()).toEqual([
			'dob',
			'fatherDob',
			'fullName',
			'unitId'
		])
	})

	it('only warns about empty ethnic/religion/education', () => {
		const row = rowOf({ ethnic: '', religion: '', educationLevel: '' })
		const issues = validateRow(row, resolveUnit(row.unitText, OPTIONS))
		expect(issues).toHaveLength(3)
		expect(hasErrors(issues)).toBe(false)
	})
})

describe('template', () => {
	it('round-trips: the sample row of the generated file parses and validates', async () => {
		const wb = buildTemplateWorkbook(OPTIONS)
		expect(wb.worksheets.map((s) => s.name)).toEqual([
			'Mẫu Import',
			'Hướng dẫn',
			'Danh sách lớp',
			'Danh mục'
		])

		const buffer = new Uint8Array(
			(await wb.xlsx.writeBuffer()) as ArrayBuffer
		)
		const rows = parseStudentSheet(buffer)
		expect(rows).toHaveLength(1)

		const sample = rows[0]
		expect(sample.values.dob).toBe('2000-01-01')
		const unit = resolveUnit(sample.unitText, OPTIONS)
		expect(unit.unitId).toBeDefined()
		expect(hasErrors(validateRow(sample, unit))).toBe(false)
	})

	it('points dropdowns at sheet ranges so long lists are not cut at 255 chars', () => {
		const sheet = buildTemplateWorkbook(OPTIONS).getWorksheet('Mẫu Import')!
		const validations = Object.values(
			(sheet.dataValidations as any).model as Record<
				string,
				{ formulae: string[] }
			>
		)
		expect(validations.length).toBeGreaterThan(5)
		expect(validations.every((v) => v.formulae[0].startsWith("'"))).toBe(
			true
		)
		expect(
			validations.some((v) => v.formulae[0].includes('Danh sách lớp'))
		).toBe(true)
	})
})
