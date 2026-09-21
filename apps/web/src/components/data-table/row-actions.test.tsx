import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Student } from '@/types'

const { deleteStudents } = vi.hoisted(() => ({
	deleteStudents: vi.fn(async () => undefined)
}))

vi.mock('@/hooks/useDeleteStudents', () => ({
	default: () => ({ mutateAsync: deleteStudents, isPending: false })
}))
vi.mock('@/lib/utils', async (orig) => ({
	...(await orig<typeof import('@/lib/utils')>()),
	isSuperAdmin: () => true
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../student-profile', () => ({ StudentProfile: () => null }))

import { DataTableRowActions } from './data-table-row-actions'

const row = { original: { id: 42, status: 'pending' } as unknown as Student }

describe('DataTableRowActions delete', () => {
	const confirmSpy = vi.fn()

	beforeEach(() => {
		deleteStudents.mockClear()
		confirmSpy.mockClear()
		vi.stubGlobal('confirm', confirmSpy)
	})
	afterEach(cleanup)

	const openDelete = async (onDeleteRows = vi.fn()) => {
		render(
			<QueryClientProvider client={new QueryClient()}>
				<DataTableRowActions
					row={row as never}
					onDeleteRows={onDeleteRows}
				/>
			</QueryClientProvider>
		)
		// Radix mở menu bằng bàn phím được trong jsdom; pointerdown thì không
		fireEvent.keyDown(screen.getByRole('button', { name: 'Open menu' }), {
			key: 'Enter'
		})
		fireEvent.click(await screen.findByRole('menuitem', { name: /Xóa/ }))
		return onDeleteRows
	}

	it('asks in the themed dialog, not the browser, and does not delete on Hủy', async () => {
		await openDelete()
		expect(await screen.findByText('Xóa học viên này?')).toBeTruthy()
		fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(deleteStudents).not.toHaveBeenCalled()
		expect(confirmSpy).not.toHaveBeenCalled()
	})

	it('deletes only after the user confirms', async () => {
		const onDeleteRows = await openDelete()
		await screen.findByText('Xóa học viên này?')
		fireEvent.click(screen.getAllByRole('button', { name: 'Xóa' }).at(-1)!)
		await waitFor(() =>
			expect(deleteStudents).toHaveBeenCalledWith({ ids: [42] })
		)
		await waitFor(() => expect(onDeleteRows).toHaveBeenCalledWith([42]))
	})
})
