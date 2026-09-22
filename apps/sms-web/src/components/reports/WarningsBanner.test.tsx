import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { semesterFixture } from '@/lib/report/fixtures'
import { WarningsBanner } from './WarningsBanner'

afterEach(cleanup)

describe('WarningsBanner', () => {
	it('renders nothing without warnings', () => {
		const { container } = render(
			<WarningsBanner warnings={[]} courses={[]} />
		)
		expect(container.firstChild).toBeNull()
	})

	it('names the course a warning is about', () => {
		render(
			<WarningsBanner
				warnings={semesterFixture.warnings}
				courses={semesterFixture.courses}
			/>
		)
		expect(screen.getByRole('status')).toBeTruthy()
		expect(screen.getByText(/Học phần SL chưa có điểm thi/)).toBeTruthy()
	})

	it('falls back to the course id when the course is unknown', () => {
		render(
			<WarningsBanner
				warnings={[{ code: 'course_no_credits', courseId: 99 }]}
				courses={[]}
			/>
		)
		expect(screen.getByText(/Học phần #99 chưa có số tín chỉ/)).toBeTruthy()
	})

	it('lists courses that are in no semester', () => {
		render(
			<WarningsBanner
				warnings={[]}
				courses={[]}
				unassigned={[{ id: 8, shortname: 'OLD', missing: ['year'] }]}
			/>
		)
		expect(
			screen.getByText(/1 học phần chưa được xếp vào kỳ nào/)
		).toBeTruthy()
		expect(screen.getByText(/OLD/)).toBeTruthy()
	})
})
