import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api', () => ({
	GetUnits: vi.fn(async () => [
		{
			id: 7,
			alias: 'L1',
			name: 'Lớp 1',
			level: 'class',
			parent: { id: 3, name: 'Đại đội 1', alias: 'D1' },
			children: []
		}
	])
}))

import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { RecordCard } from './RecordCard'
import { recordFromValues, type RecordView } from './record'

const empty = recordFromValues({
	fullName: '',
	studentId: '',
	unitId: undefined,
	dob: '',
	rank: '',
	avatar: null
})

const renderCard = (record: RecordView, extra = {}) =>
	render(
		<QueryClientProvider client={queryClient}>
			<RecordCard record={record} done={1} total={4} {...extra} />
		</QueryClientProvider>
	)

beforeEach(() => {
	URL.createObjectURL = vi.fn(() => 'blob:preview')
	URL.revokeObjectURL = vi.fn()
})
afterEach(cleanup)

describe('recordFromValues', () => {
	it('trims text and keeps the photo file', () => {
		const photo = new File(['x'], 'a.png')
		const r = recordFromValues({
			fullName: '  An ',
			studentId: ' HV1 ',
			unitId: 7,
			dob: '06/05/2001',
			rank: ' Binh nhì',
			avatar: photo
		})
		expect(r).toMatchObject({
			fullName: 'An',
			studentId: 'HV1',
			rank: 'Binh nhì'
		})
		expect(r.photo).toBe(photo)
	})
})

describe('RecordCard', () => {
	it('shows placeholders for everything not typed yet', () => {
		renderCard(empty)
		expect(screen.getAllByText('Chưa nhập').length).toBeGreaterThanOrEqual(
			3
		)
		expect(screen.getByText('Chưa có')).toBeTruthy() // mã học viên
		expect(screen.getByText('1/4')).toBeTruthy()
		expect(screen.queryByRole('img', { name: 'Hồ sơ đã lập' })).toBeNull()
	})

	it('fills in as values arrive, including the unit name and the photo preview', async () => {
		renderCard({
			...empty,
			fullName: 'Nguyễn Văn A',
			studentId: 'HV001',
			unitId: 7,
			dob: '06/05/2001',
			photo: new File(['x'], 'a.png')
		})
		expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()
		expect(screen.getByText('HV001')).toBeTruthy()
		expect(screen.getByText('06/05/2001')).toBeTruthy()
		expect(await screen.findByText(/Lớp 1/)).toBeTruthy()
		expect(
			(await screen.findByAltText('Ảnh học viên')).getAttribute('src')
		).toBe('blob:preview')
	})

	it('stamps the card once the record is created', () => {
		renderCard(empty, { stamped: true })
		expect(screen.getByRole('img', { name: 'Hồ sơ đã lập' })).toBeTruthy()
		expect(screen.getByText('Đã lập hồ sơ')).toBeTruthy()
	})
})
