import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { mySemesterFixture, myYearFixture } from '@/lib/report/fixtures'
import { MySemesterCard, MyYearCard } from './MyResultCards'

afterEach(cleanup)

describe('MySemesterCard', () => {
	it('shows ĐTB, xếp loại, rank of the class and rèn luyện', () => {
		render(<MySemesterCard data={mySemesterFixture} />)
		expect(screen.getByText('7.33')).toBeTruthy()
		expect(screen.getByText('Khá')).toBeTruthy()
		expect(screen.getByText('Hạng 2/4 trong lớp')).toBeTruthy()
		expect(screen.getByText('8.5')).toBeTruthy()
		expect(screen.getByText('Tốt')).toBeTruthy()
	})

	it('lists each course with its credits and score', () => {
		render(<MySemesterCard data={mySemesterFixture} />)
		const gp = within(
			screen.getByText('Giải phẫu').closest('tr') as HTMLElement
		)
		expect(gp.getByText('4')).toBeTruthy()
		expect(gp.getByText('8.00')).toBeTruthy()
		expect(
			within(
				screen.getByText('Sinh lý').closest('tr') as HTMLElement
			).getByText('6.00')
		).toBeTruthy()
	})

	it('says so when the student is not ranked, and dashes an empty result', () => {
		render(
			<MySemesterCard
				data={{
					...mySemesterFixture,
					row: {
						...mySemesterFixture.row,
						gpa: null,
						classification: null,
						rank: null,
						conduct: null,
						scores: {}
					}
				}}
			/>
		)
		expect(screen.getByText('Chưa xếp hạng')).toBeTruthy()
		expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
	})

	it('never shows another student', () => {
		const { container } = render(
			<MySemesterCard data={mySemesterFixture} />
		)
		expect(container.textContent).not.toContain('Bình')
	})
})

describe('MyYearCard', () => {
	it('shows the year result and a card for each semester', () => {
		render(<MyYearCard data={myYearFixture} />)
		expect(screen.getByText('Tổng kết năm 1')).toBeTruthy()
		expect(screen.getByText('7.25')).toBeTruthy()
		// The year card and the HK2 card (also ranked 2/2) share this text.
		expect(
			screen.getAllByText('Hạng 2/2 trong lớp').length
		).toBeGreaterThan(0)
		expect(screen.getByText('Học kỳ 1, Năm 1')).toBeTruthy()
		expect(screen.getByText('Học kỳ 2, Năm 1')).toBeTruthy()
	})
})
