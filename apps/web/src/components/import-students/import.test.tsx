import { QueryClientProvider } from '@tanstack/react-query'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from '@testing-library/react'
import * as XLSX from 'xlsx'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UnitOption } from '@/hooks/useUnitOptions'
import { buildUnitOptions } from '@/hooks/useUnitOptions'
import type { Unit } from '@/types'

const { createStudents, getUnits } = vi.hoisted(() => ({
	createStudents: vi.fn(async (body: unknown[]) =>
		body.map((_, i) => ({ id: i }))
	),
	getUnits: vi.fn(async () => [])
}))

vi.mock('@/api', () => ({
	CreateStudents: createStudents,
	GetUnits: getUnits
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { ImportStudentsDialog } from '../import-students-dialog'
import { IMPORT_COLUMNS } from './columns'
import { ImportFormatError, parseStudentSheet } from './parse'
import { buildTemplateWorkbook } from './template'
import { resolveUnit } from './units'
import { hasErrors, validateRow } from './validate'

const unit = (id: number, name: string, parent: string, alias = ''): Unit =>
	({
		id,
		name,
		alias,
		level: 'class',
		parent: { id: id * 10, name: parent, alias: '', level: 'company' },
		children: []
	}) as unknown as Unit

const UNITS = [
	unit(7, 'Lớp 1', 'Đại đội 1', 'L1'),
	unit(8, 'Lớp 2', 'Đại đội 1'),
	unit(9, 'Lớp 1', 'Đại đội 2') // trùng tên với lớp 7
]
const OPTIONS: UnitOption[] = buildUnitOptions(UNITS)

/** Dựng file .xlsx đúng bố cục: dòng 1 tiêu đề, dòng 2 tên trường, dữ liệu từ dòng 3 */
function sheetBytes(
	rows: Array<Record<string, unknown>>,
	keys = IMPORT_COLUMNS.map((c) => c.key)
) {
	const aoa = [
		keys.map((k) => IMPORT_COLUMNS.find((c) => c.key === k)?.header ?? k),
		keys,
		...rows.map((r) => keys.map((k) => r[k] ?? ''))
	]
	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Sheet1')
	return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
}

const goodRow = (over: Record<string, unknown> = {}) => ({
	fullName: 'Nguyễn Văn A',
	dob: '06/05/2001',
	ethnic: 'Kinh',
	religion: 'Không',
	educationLevel: '12/12',
	unitId: 'Lớp 2 - Đại đội 1',
	...over
})

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

describe('ImportStudentsDialog', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			}
		)
		Element.prototype.scrollIntoView = vi.fn()
		getUnits.mockResolvedValue(UNITS as never)
		createStudents.mockClear()
		queryClient.clear()
	})
	afterEach(cleanup)

	const upload = (bytes: Uint8Array, name = 'ds.xlsx') => {
		const file = new File([bytes], name)
		fireEvent.change(screen.getByLabelText('Chọn file import'), {
			target: { files: [file] }
		})
	}

	const renderDialog = (onSuccess = vi.fn()) => {
		render(
			<QueryClientProvider client={queryClient}>
				<ImportStudentsDialog
					isOpen
					onClose={vi.fn()}
					onSuccess={onSuccess}
				/>
			</QueryClientProvider>
		)
		return onSuccess
	}

	it('previews rows, imports only valid ones and reports real counts', async () => {
		const onSuccess = renderDialog()
		await waitFor(() =>
			expect(
				(
					screen.getByRole('button', {
						name: /Tải xuống/
					}) as HTMLButtonElement
				).disabled
			).toBe(false)
		)

		upload(
			sheetBytes([
				goodRow(),
				goodRow({ fullName: 'Trần B', unitId: 7 }),
				goodRow({ fullName: 'Lê C', dob: '31/02/2001' }), // ngày sai
				goodRow({ fullName: 'Vũ D', unitId: 'Lớp 1' }) // lớp trùng tên
			])
		)

		expect(await screen.findByText('2 dòng hợp lệ')).toBeTruthy()
		expect(screen.getByText('2 dòng lỗi')).toBeTruthy()
		expect(screen.getByText(/Ngày sinh không hợp lệ/)).toBeTruthy()
		expect(screen.getByText(/trùng ở nhiều đại đội/)).toBeTruthy()

		fireEvent.click(
			screen.getByRole('button', { name: /Import 2 học viên/ })
		)

		await waitFor(() => expect(createStudents).toHaveBeenCalledTimes(1))
		const sent = createStudents.mock.calls[0][0] as Array<
			Record<string, any>
		>
		expect(sent.map((s) => s.fullName)).toEqual(['Nguyễn Văn A', 'Trần B'])
		expect(sent.map((s) => s.unitId)).toEqual([8, 7])
		expect(sent[0].dob).toBe('2001-05-06')
		expect(sent[0].childrenInfos).toEqual([])

		expect(await screen.findByText(/Đã thêm 2\/4 học viên/)).toBeTruthy()
		const skipped = screen.getByText('Các dòng đã bỏ qua:').parentElement!
		expect(within(skipped).getByText(/Dòng 5:/)).toBeTruthy()
		expect(onSuccess).toHaveBeenCalledWith(
			expect.objectContaining({
				successCount: 2,
				errorCount: 2,
				totalCount: 4
			})
		)
	})

	it('applies the default unit to rows whose unit cell is empty', async () => {
		renderDialog()
		await waitFor(() => expect(getUnits).toHaveBeenCalled())
		upload(sheetBytes([goodRow({ unitId: '' })]))

		expect(await screen.findByText('0 dòng hợp lệ')).toBeTruthy()
		expect(screen.getAllByText('Chưa chọn lớp').length).toBeGreaterThan(0)

		// Chọn lớp mặc định ở ô phía trên bảng
		const trigger = screen
			.getAllByRole('combobox', { hidden: true })
			.filter((el) => el.tagName === 'BUTTON')[0]
		fireEvent.click(trigger)
		fireEvent.mouseDown(
			await screen.findByRole('option', { name: /Lớp 2/ })
		)

		expect(await screen.findByText('1 dòng hợp lệ')).toBeTruthy()
	})

	it('shows a clear message for a file that is not the template', async () => {
		renderDialog()
		upload(sheetBytes([goodRow()], ['foo', 'bar']))
		expect(await screen.findByText(/File không đúng mẫu/)).toBeTruthy()
		expect(createStudents).not.toHaveBeenCalled()
	})

	it('rejects unsupported file types', async () => {
		renderDialog()
		upload(new Uint8Array([1, 2, 3]), 'anh.png')
		expect(
			await screen.findByText(/Vui lòng chọn file CSV hoặc Excel/)
		).toBeTruthy()
	})
})
