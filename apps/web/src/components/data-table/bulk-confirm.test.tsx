import type { ColumnDef } from '@tanstack/react-table'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor
} from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { toast } = vi.hoisted(() => ({
	toast: Object.assign(vi.fn(), {
		success: vi.fn(),
		error: vi.fn(),
		dismiss: vi.fn()
	})
}))
vi.mock('sonner', () => ({ toast }))

import { DataTable } from '.'

interface Row {
	id: number
	name: string
	createdAt: string
	updatedAt: string
}
const data: Row[] = [
	{ id: 1, name: 'An', createdAt: '', updatedAt: '' },
	{ id: 2, name: 'Bình', createdAt: '', updatedAt: '' }
]
const columns: ColumnDef<Row>[] = [
	{
		id: 'select',
		cell: ({ row }) => (
			<input
				type='checkbox'
				aria-label={`Chọn ${row.original.name}`}
				checked={row.getIsSelected()}
				onChange={(e) => row.toggleSelected(e.target.checked)}
			/>
		)
	},
	{ accessorKey: 'name', header: 'Tên' }
]

describe('DataTable bulk actions', () => {
	const confirmSpy = vi.fn()
	const onDeleteRows = vi.fn(async () => ({}) as never)
	const onConfirmRows = vi.fn(async () => ({}) as never)

	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubGlobal('confirm', confirmSpy)
	})
	afterEach(cleanup)

	/** Chọn cả hai hàng, rồi hiện nút hành động mà DataTable đưa vào toast */
	const selectBoth = () => {
		render(
			<DataTable
				columns={columns}
				data={data}
				toolbarVisible={false}
				onDeleteRows={onDeleteRows}
				onConfirmRows={onConfirmRows}
			/>
		)
		fireEvent.click(screen.getByLabelText('Chọn An'))
		fireEvent.click(screen.getByLabelText('Chọn Bình'))
		const options = toast.mock.calls.at(-1)![1] as { action: ReactElement }
		render(options.action)
	}

	it('asks in the themed dialog before deleting, and never calls confirm()', async () => {
		selectBoth()
		fireEvent.click(screen.getByRole('button', { name: 'Xóa dữ liệu' }))
		expect(await screen.findByText('Xóa các mục đã chọn?')).toBeTruthy()
		expect(onDeleteRows).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Xóa' }))
		await waitFor(() => expect(onDeleteRows).toHaveBeenCalledWith([1, 2]))
		expect(confirmSpy).not.toHaveBeenCalled()
	})

	it('keeps the rows and clears the selection when the user cancels', async () => {
		selectBoth()
		fireEvent.click(screen.getByRole('button', { name: 'Xóa dữ liệu' }))
		await screen.findByText('Xóa các mục đã chọn?')
		fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(onDeleteRows).not.toHaveBeenCalled()
		expect(
			(screen.getByLabelText('Chọn An') as HTMLInputElement).checked
		).toBe(false)
	})

	it('asks before confirming the selected records', async () => {
		selectBoth()
		fireEvent.click(
			screen.getByRole('button', { name: 'Xác nhận thông tin học viên' })
		)
		expect(
			await screen.findByText('Xác nhận thông tin các mục đã chọn?')
		).toBeTruthy()
		expect(onConfirmRows).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
		await waitFor(() => expect(onConfirmRows).toHaveBeenCalledWith([1, 2]))
		expect(confirmSpy).not.toHaveBeenCalled()
	})
})
