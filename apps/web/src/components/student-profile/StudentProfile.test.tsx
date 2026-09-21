import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Student } from '@/types'

const { updateStudents } = vi.hoisted(() => ({
	updateStudents: vi.fn(async () => ({}))
}))

vi.mock('@/api', () => ({ UpdateStudents: updateStudents }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../export-student-data-dialog', () => ({
	ExportStudentDataDialog: ({ children }: { children: React.ReactNode }) =>
		children
}))
vi.mock('../StudentEditForm', () => ({
	default: () => <div>edit-form</div>
}))
vi.mock('@/lib/utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/utils')>()),
	isSuperAdmin: () => false
}))

import { StudentProfile } from '.'

const student = {
	id: 5,
	createdAt: '',
	updatedAt: '',
	studentId: 'HV001',
	fullName: 'Nguyễn Văn An',
	rank: 'Binh nhất',
	position: 'Học viên',
	dob: '2005-02-11',
	ethnic: 'Kinh',
	politicalOrg: 'cpv',
	isMarried: true,
	spouseName: 'Trần Thị B',
	childrenInfos: [{ fullName: 'Bé Na', dob: '2024-01-01' }],
	status: 'pending',
	unit: {
		id: 10,
		name: 'Lớp Y1',
		alias: 'y1',
		level: 'class',
		parent: { id: 2, name: 'Đại đội 1', alias: 'c1', level: 'company' }
	}
} as unknown as Student

function renderProfile(overrides: Partial<Student> = {}) {
	const client = new QueryClient()
	return render(
		<QueryClientProvider client={client}>
			<StudentProfile student={{ ...student, ...overrides }} />
		</QueryClientProvider>
	)
}

beforeEach(() => updateStudents.mockClear())
afterEach(cleanup)

const openTab = (name: string) =>
	fireEvent.click(screen.getByRole('button', { name }))

describe('StudentProfile', () => {
	it('shows the header facts and the class label built from the unit', () => {
		renderProfile()
		const card = within(
			screen.getByRole('complementary', { name: 'Thẻ hồ sơ' })
		)
		expect(card.getByText('Nguyễn Văn An')).toBeTruthy()
		expect(card.getByText('Binh nhất')).toBeTruthy()
		expect(card.getByText('Học viên')).toBeTruthy()
		expect(card.getByText('Lớp Y1 - Đại đội 1')).toBeTruthy()
		expect(card.getByText('11/02/2005')).toBeTruthy()
	})

	it('shows the personal fields, with a dash for missing values', () => {
		renderProfile()
		expect(screen.getByText('Kinh')).toBeTruthy()
		// Tôn giáo, địa chỉ, số điện thoại... chưa có → «-»
		expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3)
	})

	it('shows the pen on the first group and draws a beat on the ones already read', () => {
		renderProfile()
		const tab = (name: string) => screen.getByRole('button', { name })
		expect(tab('Thông tin cá nhân').getAttribute('aria-current')).toBe(
			'step'
		)
		expect(document.querySelectorAll('[data-drawn=beat]')).toHaveLength(0)

		openTab('Gia đình')
		expect(tab('Gia đình').getAttribute('aria-current')).toBe('step')
		expect(tab('Thông tin cá nhân').getAttribute('aria-current')).toBeNull()
		expect(document.querySelectorAll('[data-drawn=beat]')).toHaveLength(1)
	})

	it('only shows the active group, and switches on demand', () => {
		renderProfile()
		expect(screen.queryByText('Trần Thị B')).toBeNull()
		openTab('Gia đình')
		expect(screen.getByText('Trần Thị B')).toBeTruthy()
		expect(screen.getByText('Bé Na', { exact: false })).toBeTruthy()
		expect(screen.getByText('Chưa có thông tin anh chị em')).toBeTruthy()
	})

	it('maps the political org code to its label', () => {
		renderProfile()
		openTab('Quân sự & Chính trị')
		expect(screen.getByText('Đảng')).toBeTruthy()
	})

	it('marks a confirmed profile with the stamp and hides confirm', () => {
		renderProfile({ status: 'confirmed' })
		expect(
			screen.getByRole('img', { name: 'Hồ sơ đã xác nhận' })
		).toBeTruthy()
		expect(screen.queryByRole('button', { name: /Xác nhận/ })).toBeNull()
		// đã xác nhận, không phải super admin → không được sửa
		expect(screen.queryByRole('button', { name: /Chỉnh sửa/ })).toBeNull()
	})

	it('asks in a dialog before confirming, then sends the update', async () => {
		renderProfile()
		expect(screen.getByText('Chờ xác nhận')).toBeTruthy()
		expect(
			screen.queryByRole('img', { name: 'Hồ sơ đã xác nhận' })
		).toBeNull()

		fireEvent.click(screen.getByRole('button', { name: /^Xác nhận$/ }))
		expect(updateStudents).not.toHaveBeenCalled()

		fireEvent.click(
			await screen.findByRole('button', { name: 'Xác nhận hồ sơ' })
		)
		await waitFor(() =>
			expect(updateStudents).toHaveBeenCalledWith({
				data: [{ id: 5, status: 'confirmed', unitId: 10 }]
			})
		)
	})

	it('cancels the confirm dialog without updating', async () => {
		renderProfile()
		fireEvent.click(screen.getByRole('button', { name: /^Xác nhận$/ }))
		fireEvent.click(await screen.findByRole('button', { name: 'Hủy' }))
		expect(updateStudents).not.toHaveBeenCalled()
	})
})
