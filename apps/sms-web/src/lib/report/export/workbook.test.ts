// @vitest-environment node
import { describe, expect, it } from 'vitest'
import '@/i18n'
import {
	semester2Fixture,
	semesterFixture,
	yearFixture
} from '@/lib/report/fixtures'
import {
	buildSemesterWorkbook,
	buildYearWorkbook,
	exportFileName
} from './workbook'

// Semester fixture columns: A STT, B mã, C tên, D GP, E SL, F ĐTB, G xếp loại, H hạng, I RL, J xếp loại RL.
// Rows: 5-6 header, 7 An, 8 Bình, 9 Em, 10 Giang.

const reload = async (
	wb: Awaited<ReturnType<typeof buildSemesterWorkbook>>
) => {
	const buffer = await wb.xlsx.writeBuffer()
	const { default: ExcelJS } = await import('exceljs')
	const out = new ExcelJS.Workbook()
	await out.xlsx.load(buffer)
	return out
}

describe('buildSemesterWorkbook', () => {
	it('has the results sheet and the summary sheet', async () => {
		const wb = await buildSemesterWorkbook(semesterFixture)
		expect(wb.worksheets.map((w) => w.name)).toEqual([
			'Kết quả',
			'Tổng hợp'
		])
	})

	it('writes the header block, merged group headers and one row per student in order', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet(
			'Kết quả'
		)!
		expect(ws.getCell('A1').value).toBe('TRƯỜNG CAO ĐẲNG HẬU CẦN 2')
		expect(ws.getCell('A2').value).toBe('KẾT QUẢ HỌC TẬP HỌC KỲ 1 NĂM 1')
		expect(ws.getCell('A3').value).toBe('Lớp: Lớp TEST báo cáo')
		expect(ws.getCell('D5').value).toBe('Điểm học phần')
		expect(ws.getCell('F5').value).toBe('Tổng kết')
		expect(ws.model.merges).toEqual(
			expect.arrayContaining([
				'A1:J1',
				'A2:J2',
				'A3:J3',
				'D5:E5',
				'F5:J5',
				'A5:A6',
				'B5:B6',
				'C5:C6'
			])
		)
		expect(ws.getCell('D6').value).toBe('GP\n4 TC')
		expect([7, 8, 9, 10].map((r) => ws.getCell(`C${r}`).value)).toEqual([
			'An Test',
			'Bình Test',
			'Em Test',
			'Giang Test'
		])
		expect([7, 8, 9, 10].map((r) => ws.getCell(`A${r}`).value)).toEqual([
			1, 2, 3, 4
		])
	})

	it('writes scores as numbers with the number formats, and leaves missing values empty', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet(
			'Kết quả'
		)!
		expect(ws.getCell('D7').value).toBe(8)
		expect(ws.getCell('D7').numFmt).toBe('0.00')
		expect(ws.getCell('F7').value).toBe(7.33)
		expect(ws.getCell('G7').value).toBe('Khá')
		expect(ws.getCell('H7').value).toBe(2)
		expect(ws.getCell('H7').numFmt).toBe('0')
		expect(ws.getCell('I7').value).toBe(8.5)
		expect(ws.getCell('I7').numFmt).toBe('0.0')
		expect(ws.getCell('J7').value).toBe('Tốt')
		expect(ws.getCell('I8').value).toBeNull() // Bình has no rèn luyện
		expect(ws.getCell('J8').value).toBeNull()
		expect(ws.getCell('E10').value).toBeNull() // Giang, course not scored
		for (const addr of ['D7', 'E7', 'F7', 'H7', 'I7']) {
			expect(typeof ws.getCell(addr).value).toBe('number')
		}
	})

	it('fills the colour bands and reds the failing scores', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet(
			'Kết quả'
		)!
		const argb = (addr: string) =>
			(
				ws.getCell(addr).fill as
					| { fgColor?: { argb?: string } }
					| undefined
			)?.fgColor?.argb
		expect(argb('D8')).toBeDefined() // 9.00 good
		expect(argb('E7')).toBeDefined() // 6.00 warn
		expect(argb('D8')).not.toBe(argb('E7'))
		expect(argb('D7')).toBeUndefined() // 8.00 no fill
		expect(ws.getCell('D9').font?.color?.argb).toBe('FFC00000') // 3.20 fails
	})

	it('has a legend and two signature blocks under the table', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet(
			'Kết quả'
		)!
		const texts: string[] = []
		ws.eachRow((row) =>
			row.eachCell((c) => {
				if (typeof c.value === 'string') texts.push(c.value)
			})
		)
		expect(texts).toEqual(
			expect.arrayContaining([
				'Chú thích',
				'Từ 9,00 trở lên',
				'Từ 5,00 đến dưới 7,00',
				'Dưới 5,00 (chưa đạt)',
				'HIỆU TRƯỞNG',
				'TRƯỞNG PHÒNG ĐÀO TẠO'
			])
		)
	})

	it('is landscape A4 and fits one page wide', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet(
			'Kết quả'
		)!
		expect(ws.pageSetup.orientation).toBe('landscape')
		expect(ws.pageSetup.paperSize).toBe(9)
		expect(ws.pageSetup.fitToWidth).toBe(1)
	})

	it('keeps numbers and formats after a save and reload', async () => {
		const ws = (
			await reload(await buildSemesterWorkbook(semesterFixture))
		).getWorksheet('Kết quả')!
		expect(ws.getCell('F7').value).toBe(7.33)
		expect(ws.getCell('F7').numFmt).toBe('0.00')
		expect(ws.getCell('D5').value).toBe('Điểm học phần')
	})

	it('summarises the class on the second sheet', async () => {
		const ws = (await buildSemesterWorkbook(semesterFixture)).getWorksheet(
			'Tổng hợp'
		)!
		const rows: unknown[][] = []
		ws.eachRow((row) => rows.push((row.values as unknown[]).slice(1)))
		expect(rows).toEqual(
			expect.arrayContaining([
				['Sĩ số', 4],
				['ĐTB lớp', 6.87],
				['ĐTB cao nhất', 9],
				['Khá', 2],
				[1, 'Bình Test', 9]
			])
		)
		// per-course: GP mean 6.8
		expect(rows.some((r) => r[0] === 'GP' && r[1] === 6.8)).toBe(true)
	})
})

describe('buildYearWorkbook', () => {
	// A STT, B mã, C tên, D-E HK1 (ĐTB, RL), F-G HK2, H ĐTB năm, I xếp loại, J hạng, K RL năm, L xếp loại RL.
	it('has a group per semester and the year totals', async () => {
		const ws = (await buildYearWorkbook(yearFixture)).getWorksheet(
			'Kết quả'
		)!
		expect(ws.getCell('A2').value).toBe('KẾT QUẢ HỌC TẬP NĂM 1')
		expect(ws.getCell('D5').value).toBe('Học kỳ 1')
		expect(ws.getCell('F5').value).toBe('Học kỳ 2')
		expect(ws.getCell('H5').value).toBe('Tổng kết')
		expect(ws.model.merges).toEqual(
			expect.arrayContaining(['D5:E5', 'F5:G5', 'H5:L5', 'A1:L1'])
		)
	})

	it('puts each semester result and the year result on the student row', async () => {
		const ws = (await buildYearWorkbook(yearFixture)).getWorksheet(
			'Kết quả'
		)!
		expect(ws.getCell('C7').value).toBe('An Test')
		expect(ws.getCell('D7').value).toBe(7.33)
		expect(ws.getCell('E7').value).toBe(8.5)
		expect(ws.getCell('F7').value).toBe(7)
		expect(ws.getCell('G7').value).toBe(7.5)
		expect(ws.getCell('H7').value).toBe(7.25)
		expect(ws.getCell('K7').value).toBe(8)
		expect(ws.getCell('K8').value).toBeNull() // Bình: a semester has no rèn luyện
	})

	it('leaves a semester empty for a student who has no row in it', async () => {
		const report = {
			...yearFixture,
			students: [
				...yearFixture.students,
				{
					id: 1021,
					idnumber: 'TST0006',
					fullname: 'Giang Test',
					gpa: 7,
					classification: 'kha' as const,
					rank: 3,
					conduct: null
				}
			],
			periods: [semesterFixture, semester2Fixture]
		}
		const ws = (await buildYearWorkbook(report)).getWorksheet('Kết quả')!
		expect(ws.getCell('D9').value).toBe(7) // Giang HK1
		expect(ws.getCell('F9').value).toBeNull() // Giang HK2
	})

	it('has no per-course table on the summary sheet', async () => {
		const ws = (await buildYearWorkbook(yearFixture)).getWorksheet(
			'Tổng hợp'
		)!
		const heads: unknown[] = []
		ws.eachRow((row) => heads.push(row.getCell(1).value))
		expect(heads).not.toContain('Học phần')
	})
})

describe('exportFileName', () => {
	it('names a semester and a year file with an ASCII class name', () => {
		expect(exportFileName(semesterFixture)).toBe(
			'Ket_qua_hoc_tap_HK1_Nam1_TEST_RPT.xlsx'
		)
		expect(exportFileName(yearFixture)).toBe(
			'Ket_qua_hoc_tap_Nam1_TEST_RPT.xlsx'
		)
		expect(
			exportFileName({
				...yearFixture,
				class: { id: 1, name: 'Đại đội Y sĩ', idnumber: '' }
			})
		).toBe('Ket_qua_hoc_tap_Nam1_Dai_doi_Y_si.xlsx')
	})
})
