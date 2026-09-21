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

const { createStudents, getUnits } = vi.hoisted(() => ({
	createStudents: vi.fn(async (body: unknown[]) =>
		body.map((_, i) => ({ id: i }))
	),
	getUnits: vi.fn(async () => [])
}))

vi.mock('@/api', () => ({
	CreateStudents: createStudents,
	GetUnits: getUnits
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { ImportStudentsDialog } from '../import-students-dialog'
import { UNITS, goodRow, sheetBytes } from './fixtures'

describe('ImportStudentsDialog', () => {
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
		getUnits.mockResolvedValue(UNITS as never)
		createStudents.mockClear()
		queryClient.clear()
	})
	afterEach(cleanup)

	const upload = (bytes: Uint8Array, name = 'ds.xlsx') => {
		const file = new File([bytes], name)
		// Ô chọn file nằm ở chặng «Chọn file»; mở nó nếu đang ở chặng tải mẫu
		if (!screen.queryByLabelText('Chọn file import')) {
			fireEvent.click(
				within(
					screen.getByRole('navigation', { name: 'Các bước' })
				).getByRole('button', { name: /Chọn file/ })
			)
		}
		fireEvent.change(screen.getByLabelText('Chọn file import'), {
			target: { files: [file] }
		})
	}

	const renderDialog = (onSuccess = vi.fn()) => {
		render(
			<QueryClientProvider client={queryClient}>
				<ImportStudentsDialog
					isOpen
					onClose={vi.fn()}
					onSuccess={onSuccess}
				/>
			</QueryClientProvider>
		)
		return onSuccess
	}

	it('previews rows, imports only valid ones and reports real counts', async () => {
		const onSuccess = renderDialog()
		await waitFor(() =>
			expect(
				(
					screen.getByRole('button', {
						name: /Tải xuống/
					}) as HTMLButtonElement
				).disabled
			).toBe(false)
		)

		upload(
			sheetBytes([
				goodRow(),
				goodRow({ fullName: 'Trần B', unitId: 7 }),
				goodRow({ fullName: 'Lê C', dob: '31/02/2001' }), // ngày sai
				goodRow({ fullName: 'Vũ D', unitId: 'Lớp 1' }) // lớp trùng tên
			])
		)

		expect(await screen.findByText('2 dòng hợp lệ')).toBeTruthy()
		expect(screen.getByText('2 dòng lỗi')).toBeTruthy()
		// Dòng lỗi nhuốm đỏ để dễ tìm
		const rowsShown = screen.getAllByRole('row').slice(1)
		expect(rowsShown.map((r) => r.getAttribute('data-valid'))).toEqual([
			'true',
			'true',
			'false',
			'false'
		])
		expect(screen.getByText(/Ngày sinh không hợp lệ/)).toBeTruthy()
		expect(screen.getByText(/trùng ở nhiều đại đội/)).toBeTruthy()

		// Xem đủ mọi trường của một dòng trước khi import
		const toggle = screen.getByRole('button', {
			name: 'Xem chi tiết dòng 3'
		})
		expect(toggle.getAttribute('aria-expanded')).toBe('false')
		fireEvent.click(toggle)
		const detail = within(screen.getByLabelText('Chi tiết dòng 3'))
		expect(
			detail.getByText('Dân tộc').nextElementSibling?.textContent
		).toBe('Kinh')
		expect(
			detail.getByText('Ngày sinh').nextElementSibling?.textContent
		).toBe('06/05/2001')
		expect(
			detail.getByText('Nghề nghiệp cha').nextElementSibling?.textContent
		).toBe('-')
		fireEvent.click(toggle)
		expect(screen.queryByLabelText('Chi tiết dòng 3')).toBeNull()

		fireEvent.click(
			screen.getByRole('button', { name: /Import 2 học viên/ })
		)

		await waitFor(() => expect(createStudents).toHaveBeenCalledTimes(1))
		const sent = createStudents.mock.calls[0][0] as Array<
			Record<string, any>
		>
		expect(sent.map((s) => s.fullName)).toEqual(['Nguyễn Văn A', 'Trần B'])
		expect(sent.map((s) => s.unitId)).toEqual([8, 7])
		expect(sent[0].dob).toBe('2001-05-06')
		expect(sent[0].childrenInfos).toEqual([])

		expect(await screen.findByText(/Đã thêm 2\/4 học viên/)).toBeTruthy()
		expect(screen.getByRole('img', { name: 'Đã import xong' })).toBeTruthy()
		const skipped = screen.getByText('Các dòng đã bỏ qua:').parentElement!
		expect(within(skipped).getByText(/Dòng 5:/)).toBeTruthy()
		expect(onSuccess).toHaveBeenCalledWith(
			expect.objectContaining({
				successCount: 2,
				errorCount: 2,
				totalCount: 4
			})
		)
	})

	it('applies the default unit to rows whose unit cell is empty', async () => {
		renderDialog()
		await waitFor(() => expect(getUnits).toHaveBeenCalled())
		upload(sheetBytes([goodRow({ unitId: '' })]))

		expect(await screen.findByText('0 dòng hợp lệ')).toBeTruthy()
		expect(screen.getAllByText('Chưa chọn lớp').length).toBeGreaterThan(0)

		// Chọn lớp mặc định ở ô phía trên bảng
		const trigger = screen
			.getAllByRole('combobox', { hidden: true })
			.filter((el) => el.tagName === 'BUTTON')[0]
		fireEvent.click(trigger)
		fireEvent.mouseDown(
			await screen.findByRole('option', { name: /Lớp 2/ })
		)

		expect(await screen.findByText('1 dòng hợp lệ')).toBeTruthy()
	})

	it('walks the stages: template first, then file, and can pick another file', async () => {
		renderDialog()
		const trace = () =>
			within(screen.getByRole('navigation', { name: 'Các bước' }))
		expect(
			trace()
				.getByRole('button', { name: /Tải mẫu/ })
				.getAttribute('aria-current')
		).toBe('step')
		expect(screen.queryByLabelText('Chọn file import')).toBeNull()

		fireEvent.click(screen.getByRole('button', { name: 'Tiếp theo' }))
		expect(screen.getByLabelText('Chọn file import')).toBeTruthy()
		fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
		expect(screen.getByRole('button', { name: /Tải xuống/ })).toBeTruthy()

		upload(sheetBytes([goodRow()]))
		expect(await screen.findByText('1 dòng hợp lệ')).toBeTruthy()
		expect(
			trace()
				.getByRole('button', { name: /Kiểm tra/ })
				.getAttribute('aria-current')
		).toBe('step')
		expect(
			screen.getByRole('complementary', { name: 'Phiếu nhập' })
		).toBeTruthy()

		fireEvent.click(screen.getByRole('button', { name: 'Chọn file khác' }))
		expect(screen.getByLabelText('Chọn file import')).toBeTruthy()
		expect(screen.queryByText('1 dòng hợp lệ')).toBeNull()
	})

	it('shows a clear message for a file that is not the template', async () => {
		renderDialog()
		upload(sheetBytes([goodRow()], ['foo', 'bar']))
		expect(await screen.findByText(/File không đúng mẫu/)).toBeTruthy()
		expect(createStudents).not.toHaveBeenCalled()
	})

	it('rejects unsupported file types', async () => {
		renderDialog()
		upload(new Uint8Array([1, 2, 3]), 'anh.png')
		expect(
			await screen.findByText(/Vui lòng chọn file CSV hoặc Excel/)
		).toBeTruthy()
	})
})
