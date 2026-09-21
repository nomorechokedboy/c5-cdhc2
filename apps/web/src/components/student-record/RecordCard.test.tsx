import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Student } from '@/types'
import { RecordCard } from './RecordCard'
import { recordFromStudent, recordFromValues, type RecordView } from './record'

const empty = recordFromValues({})

beforeEach(() => {
	URL.createObjectURL = vi.fn(() => 'blob:preview')
	URL.revokeObjectURL = vi.fn()
})
afterEach(cleanup)

describe('recordFromValues', () => {
	it('trims text, keeps the photo and reads unitId as a number', () => {
		const photo = new File(['x'], 'a.png')
		const r = recordFromValues({
			fullName: '  An ',
			studentId: ' HV1 ',
			unitId: '7',
			dob: '06/05/2001',
			rank: ' Binh nhì',
			avatar: photo
		})
		expect(r).toMatchObject({
			fullName: 'An',
			studentId: 'HV1',
			unitId: 7,
			rank: 'Binh nhì'
		})
		expect(r.photo).toBe(photo)
	})

	it('treats blank or missing unit as none', () => {
		expect(recordFromValues({ unitId: '' }).unitId).toBeUndefined()
		expect(recordFromValues({ unitId: null }).unitId).toBeUndefined()
	})
})

describe('recordFromStudent', () => {
	it('shows the stored date as dd/mm/yyyy and takes the unit from the student', () => {
		const r = recordFromStudent({
			fullName: 'An',
			studentId: 'HV1',
			dob: '2005-02-11',
			rank: 'Binh nhất',
			unit: { id: 10 }
		} as unknown as Student)
		expect(r.dob).toBe('11/02/2005')
		expect(r.unitId).toBe(10)
	})
})

describe('RecordCard', () => {
	const renderCard = (record: RecordView, props = {}) =>
		render(<RecordCard record={record} {...props} />)

	it('shows dashed placeholders for everything not typed yet', () => {
		renderCard(empty)
		expect(screen.getAllByText('Chưa nhập').length).toBeGreaterThanOrEqual(
			3
		)
		expect(screen.getByText('Chưa có')).toBeTruthy() // mã học viên
	})

	it('shows dashes for a saved profile with missing values', () => {
		renderCard(empty, { empty: 'dash' })
		expect(screen.queryByText('Chưa nhập')).toBeNull()
		expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3)
	})

	it('fills in as values arrive, with the unit label and the photo preview', async () => {
		renderCard(
			{
				...empty,
				fullName: 'Nguyễn Văn A',
				studentId: 'HV001',
				dob: '06/05/2001',
				photo: new File(['x'], 'a.png')
			},
			{ unitLabel: 'Lớp 1 - Đại đội 1' }
		)
		expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()
		expect(screen.getByText('HV001')).toBeTruthy()
		expect(screen.getByText('06/05/2001')).toBeTruthy()
		expect(screen.getByText('Lớp 1 - Đại đội 1')).toBeTruthy()
		expect(
			(await screen.findByAltText('Nguyễn Văn A')).getAttribute('src')
		).toBe('blob:preview')
	})

	it('prefers a stored photo url, or a slot that replaces the photo', () => {
		const { unmount } = renderCard(empty, { photoUrl: '/media/a.jpg' })
		expect(screen.getByRole('img').getAttribute('src')).toBe('/media/a.jpg')
		unmount()
		renderCard(empty, { photoSlot: <span>đổi ảnh</span> })
		expect(screen.getByText('đổi ảnh')).toBeTruthy()
		expect(screen.queryByRole('img')).toBeNull()
	})

	it('renders extra facts, badge, footer and overlay', () => {
		renderCard(empty, {
			facts: [{ label: 'Chức vụ', value: 'Học viên' }],
			badge: <p>huy hiệu</p>,
			footer: <p>chân thẻ</p>,
			overlay: <p>phủ</p>
		})
		expect(screen.getByText('Học viên')).toBeTruthy()
		expect(screen.getByText('huy hiệu')).toBeTruthy()
		expect(screen.getByText('chân thẻ')).toBeTruthy()
		expect(screen.getByText('phủ')).toBeTruthy()
	})
})
