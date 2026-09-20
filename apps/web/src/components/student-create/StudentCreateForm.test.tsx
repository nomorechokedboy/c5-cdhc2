import { QueryClientProvider } from '@tanstack/react-query'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createStudent, getUnits } = vi.hoisted(() => ({
	createStudent: vi.fn(async (..._args: unknown[]) => ({})),
	getUnits: vi.fn(async () => [
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

vi.mock('@/api', () => ({
	CreateStudent: createStudent,
	GetUnits: getUnits,
	UploadFiles: vi.fn()
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { queryClient } from '@/integrations/tanstack-query/root-provider'
import StudentForm from '../student-form'

const change = (el: HTMLElement, value: string) =>
	fireEvent.change(el, { target: { value } })

/** Gõ từng ký tự vào DatePicker như người dùng thật */
const typeDate = (label: string, digits: string) => {
	const input = screen.getByLabelText(label) as HTMLInputElement
	for (const ch of digits) change(input, input.value + ch)
	return input
}

const openDialog = () => {
	render(
		<QueryClientProvider client={queryClient}>
			<StudentForm onSuccess={vi.fn()} />
		</QueryClientProvider>
	)
	fireEvent.click(screen.getByRole('button', { name: /Thêm học viên/ }))
}

/** Chọn option của select tìm kiếm thứ `index` (chỉ tính nút mở, không tính ô tìm kiếm) */
const pick = async (index: number, option: string) => {
	// hidden: Radix đặt aria-hidden lên phần còn lại của trang khi popover đang mở
	const triggers = screen
		.getAllByRole('combobox', { hidden: true })
		.filter((el) => el.tagName === 'BUTTON')
	fireEvent.click(triggers[index])
	// Option chọn ở mousedown (không phải click)
	fireEvent.mouseDown(
		await screen.findByRole('option', { name: new RegExp(option) })
	)
	await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
}

const next = () =>
	fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/ }))

beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	)
	Element.prototype.scrollIntoView = vi.fn()
	createStudent.mockClear()
})
afterEach(cleanup)

describe('StudentForm (create)', () => {
	it('stays on the first step and shows errors when required fields are empty', async () => {
		openDialog()
		next()

		expect(
			await screen.findByText('Họ và tên không được bỏ trống')
		).toBeTruthy()
		expect(screen.getByText('Lớp không được bỏ trống')).toBeTruthy()
		expect(screen.getByLabelText('Họ và tên')).toBeTruthy()
		expect(screen.queryByLabelText('Số thẻ Đảng')).toBeNull()
	})

	it('rejects an impossible date of birth', async () => {
		openDialog()
		change(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A')
		typeDate('Ngày sinh', '31022001')
		await pick(0, 'Lớp 1')
		await pick(1, 'Kinh')
		await pick(2, 'Không')
		await pick(3, '12/12')
		next()

		expect(
			(await screen.findAllByText(/Ngày không hợp lệ/)).length
		).toBeGreaterThan(0)
		expect(screen.queryByLabelText('Số thẻ Đảng')).toBeNull()
	}, 20_000)

	it('walks all steps and submits dd/mm/yyyy dates as yyyy-mm-dd with a numeric unitId', async () => {
		openDialog()

		// Bước 1 — cá nhân
		change(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A')
		typeDate('Ngày sinh', '06052001')
		await pick(0, 'Lớp 1')
		await pick(1, 'Kinh')
		await pick(2, 'Không')
		await pick(3, '12/12')
		next()

		// Bước 2 — quân sự
		await screen.findByLabelText('Số thẻ Đảng')
		typeDate('Ngày nhập ngũ', '01092023')
		next()

		// Bước 3 — bố mẹ
		await screen.findByLabelText('Tên cha')
		typeDate('Ngày sinh của cha', '31121975')
		next()

		// Bước 4 — vợ/chồng và con
		await screen.findByLabelText('Tên vợ/chồng')
		fireEvent.click(
			screen.getByRole('button', { name: /Thêm thông tin con cái/ })
		)
		change(await screen.findByLabelText('Họ tên'), 'Con')
		typeDate('Ngày sinh', '03022020')

		fireEvent.click(screen.getByRole('button', { name: 'Thêm học viên' }))

		await waitFor(() => expect(createStudent).toHaveBeenCalledTimes(1))
		const body = createStudent.mock.calls[0][0] as Record<string, any>
		expect(body.fullName).toBe('Nguyễn Văn A')
		expect(body.dob).toBe('2001-05-06')
		expect(body.enlistmentPeriod).toBe('2023-09-01')
		expect(body.fatherDob).toBe('1975-12-31')
		expect(body.childrenInfos).toEqual([
			{ fullName: 'Con', dob: '2020-02-03' }
		])
		expect(body.unitId).toBe(7)
		expect(typeof body.familySize).toBe('number')
		expect(body.isMarried).toBe(false)
		expect('avatar' in body).toBe(false)
	}, 20_000)
})
