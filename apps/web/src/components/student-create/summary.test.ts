import { describe, expect, it } from 'vitest'
import { summaryRows } from './summary'

const base = {
	fullName: ' Nguyễn Văn A ',
	studentId: '',
	dob: '06/05/2001',
	rank: 'Binh nhì',
	fatherName: 'Cha',
	motherName: '',
	childrenInfos: [{ fullName: 'Con', dob: '' }]
}

describe('summaryRows', () => {
	it('trims values, shows a dash for empty ones and joins the parents', () => {
		const rows = Object.fromEntries(
			summaryRows(base, 'Lớp 1').map((r) => [r.label, r.value])
		)
		expect(rows['Họ và tên']).toBe('Nguyễn Văn A')
		expect(rows['Mã số học viên']).toBe('-')
		expect(rows['Lớp']).toBe('Lớp 1')
		expect(rows['Cha, mẹ']).toBe('Cha')
		expect(rows['Con']).toBe('1')
	})

	it('falls back to dashes when the unit is unknown and nothing is filled', () => {
		const rows = summaryRows({
			...base,
			fatherName: '',
			childrenInfos: []
		})
		expect(rows.find((r) => r.label === 'Lớp')?.value).toBe('-')
		expect(rows.find((r) => r.label === 'Cha, mẹ')?.value).toBe('-')
		expect(rows.find((r) => r.label === 'Con')?.value).toBe('0')
	})
})
