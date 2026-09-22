import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { semesterFixture } from '@/lib/report/fixtures'

vi.mock('@/api', () => ({ CategoryApi: { GetCategories: vi.fn() } }))
vi.mock('@/api/reports', () => ({
	ReportApi: { semester: vi.fn(), saveConduct: vi.fn() },
	ReportError: class extends Error {}
}))

import { ReportApi } from '@/api/reports'
import { SemesterReportView } from './SemesterReportView'

const api = vi.mocked(ReportApi)

const renderView = () => {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})
	return render(
		<QueryClientProvider client={client}>
			<SemesterReportView categoryId={72} year={1} semester={1} />
		</QueryClientProvider>
	)
}

beforeEach(() => {
	api.semester.mockReset()
	api.saveConduct.mockReset()
})
afterEach(cleanup)

describe('SemesterReportView', () => {
	it('shows a loading state, then the table, the summary and the warnings', async () => {
		api.semester.mockResolvedValue(semesterFixture)
		renderView()
		expect(
			screen.getByRole('status', { name: 'Đang tải kết quả' })
		).toBeTruthy()
		// "An Test" appears both in the table and in the summary's top-3 list.
		expect((await screen.findAllByText('An Test')).length).toBeGreaterThan(
			0
		)
		expect(screen.getByText('Tổng hợp lớp')).toBeTruthy()
		expect(screen.getByText(/Học phần SL chưa có điểm thi/)).toBeTruthy()
		expect(screen.getByRole('button', { name: /Tải Excel/ })).toBeTruthy()
		expect(api.semester).toHaveBeenCalledWith(72, 1, 1)
	})

	it('shows the error with a retry', async () => {
		api.semester.mockRejectedValue(new Error('boom'))
		renderView()
		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toContain('boom')
		expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
	})

	it('shows an empty state when the class has no students', async () => {
		api.semester.mockResolvedValue({ ...semesterFixture, students: [] })
		renderView()
		expect(
			await screen.findByText('Chưa có điểm để lập báo cáo.')
		).toBeTruthy()
	})

	it('saves rèn luyện for one student and refetches the report', async () => {
		api.semester.mockResolvedValue(semesterFixture)
		api.saveConduct.mockResolvedValue({ saved: 1 })
		renderView()
		const input = await screen.findByLabelText('Rèn luyện của Bình Test')
		fireEvent.change(input, { target: { value: '9,5' } })
		fireEvent.blur(input)
		await vi.waitFor(() =>
			expect(api.saveConduct).toHaveBeenCalledWith(72, [
				{ studentId: 1017, year: 1, semester: 1, score: 9.5 }
			])
		)
		await vi.waitFor(() => expect(api.semester).toHaveBeenCalledTimes(2))
	})
})
