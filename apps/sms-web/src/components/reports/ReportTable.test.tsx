import {
	cleanup,
	fireEvent,
	render,
	screen,
	within
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { semesterFixture } from '@/lib/report/fixtures'
import { ReportTable } from './ReportTable'

afterEach(cleanup)

const rowOf = (name: string) =>
	screen.getByText(name).closest('tr') as HTMLTableRowElement

describe('ReportTable', () => {
	it('has group headers, course columns with credits, and one row per student in order', () => {
		render(<ReportTable report={semesterFixture} />)
		expect(screen.getByText('Điểm học phần')).toBeTruthy()
		expect(screen.getByText('Tổng kết')).toBeTruthy()
		expect(screen.getByText('GP')).toBeTruthy()
		expect(screen.getByText('4 TC')).toBeTruthy()
		const names = screen
			.getAllByRole('row')
			.slice(2)
			.map((r) => within(r).getAllByRole('cell')[2].textContent)
		expect(names).toEqual(['An Test', 'Bình Test', 'Em Test', 'Giang Test'])
	})

	it('shows the scores the API sent, two decimals, and dashes for missing ones', () => {
		render(<ReportTable report={semesterFixture} />)
		const giang = within(rowOf('Giang Test'))
		expect(giang.getAllByText('7.00').length).toBe(2) // GP score and ĐTB
		expect(giang.getAllByText('—').length).toBeGreaterThanOrEqual(1)
		const an = within(rowOf('An Test'))
		expect(an.getByText('7.33')).toBeTruthy()
		expect(an.getByText('Khá')).toBeTruthy()
		expect(an.getByText('2')).toBeTruthy()
	})

	it('colours cells by band and circles failing scores', () => {
		const { container } = render(<ReportTable report={semesterFixture} />)
		const binh = rowOf('Bình Test')
		expect(binh.querySelector('td.bg-success\\/15')).not.toBeNull()
		const an = rowOf('An Test')
		expect(an.querySelector('td.bg-warning\\/20')).not.toBeNull() // 6.00
		expect(
			container.querySelectorAll('.score-fail').length
		).toBeGreaterThan(0) // Em 3.20, 4.13
		expect(rowOf('Em Test').querySelectorAll('.score-fail').length).toBe(2)
	})

	it('shows conduct read-only, with its label, or a dash when there is none', () => {
		render(<ReportTable report={semesterFixture} />)
		const an = within(rowOf('An Test'))
		expect(an.getByText('8.5')).toBeTruthy()
		expect(an.getByText('Tốt')).toBeTruthy()
		expect(screen.queryByRole('textbox')).toBeNull()
	})

	it('turns conduct into inputs when editable and reports the change with the student id', () => {
		const onSave = vi.fn()
		render(<ReportTable report={semesterFixture} onSaveConduct={onSave} />)
		expect(screen.getAllByRole('textbox')).toHaveLength(4)
		const input = screen.getByLabelText('Rèn luyện của Bình Test')
		fireEvent.change(input, { target: { value: '9,5' } })
		fireEvent.blur(input)
		expect(onSave).toHaveBeenCalledWith(1017, 9.5)
	})
})
