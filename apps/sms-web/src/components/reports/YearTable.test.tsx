import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { yearFixture } from '@/lib/report/fixtures'
import { YearTable } from './YearTable'

afterEach(cleanup)

const rowOf = (name: string) =>
	screen.getByText(name).closest('tr') as HTMLTableRowElement

describe('YearTable', () => {
	it('has a group per semester, then the year totals', () => {
		render(<YearTable report={yearFixture} />)
		expect(screen.getByText('Học kỳ 1')).toBeTruthy()
		expect(screen.getByText('Học kỳ 2')).toBeTruthy()
		expect(screen.getByText('Tổng kết')).toBeTruthy()
		expect(screen.getByText('ĐTB năm')).toBeTruthy()
		expect(screen.getByText('Rèn luyện năm')).toBeTruthy()
	})

	it('shows each semester result next to the year result', () => {
		render(<YearTable report={yearFixture} />)
		const an = within(rowOf('An Test'))
		expect(an.getByText('7.33')).toBeTruthy() // HK1 ĐTB
		expect(an.getByText('7.25')).toBeTruthy() // năm
		expect(an.getByText('8.0')).toBeTruthy() // rèn luyện năm
		expect(an.getByText('Tốt')).toBeTruthy()
		expect(an.getByText('8.5')).toBeTruthy() // rèn luyện HK1
		expect(an.getByText('7.5')).toBeTruthy() // rèn luyện HK2
	})

	it('leaves the year conduct empty when a semester has none, and never edits', () => {
		render(<YearTable report={yearFixture} />)
		const binh = within(rowOf('Bình Test'))
		expect(binh.getAllByText('—').length).toBeGreaterThanOrEqual(3)
		expect(screen.queryByRole('textbox')).toBeNull()
	})

	it('shows dashes for a semester a student has no row in', () => {
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
			]
		}
		render(<YearTable report={report} />)
		expect(
			within(rowOf('Giang Test')).getAllByText('—').length
		).toBeGreaterThanOrEqual(3)
	})
})
