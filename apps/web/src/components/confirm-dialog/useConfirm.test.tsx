import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useConfirm } from './useConfirm'

let ask: ReturnType<typeof useConfirm>['confirm']

function Host() {
	const { confirm, confirmDialog } = useConfirm()
	ask = confirm
	return <>{confirmDialog}</>
}

afterEach(cleanup)

const open = (options = {}) => {
	let result: Promise<boolean>
	act(() => {
		result = ask({
			title: 'Xóa học viên này?',
			description: 'Hành động này không thể hoàn tác.',
			confirmLabel: 'Xóa',
			destructive: true,
			...options
		})
	})
	return result!
}

describe('useConfirm', () => {
	it('shows nothing until asked, then the title, description and confirm label', () => {
		render(<Host />)
		expect(screen.queryByRole('dialog')).toBeNull()
		open()
		expect(screen.getByRole('dialog')).toBeTruthy()
		expect(screen.getByText('Xóa học viên này?')).toBeTruthy()
		expect(
			screen.getByText('Hành động này không thể hoàn tác.')
		).toBeTruthy()
		expect(screen.getByRole('button', { name: 'Xóa' })).toBeTruthy()
	})

	it('resolves true when confirmed and closes', async () => {
		render(<Host />)
		const answer = open()
		fireEvent.click(screen.getByRole('button', { name: 'Xóa' }))
		expect(await answer).toBe(true)
		expect(screen.queryByRole('dialog')).toBeNull()
	})

	it('resolves false on Hủy', async () => {
		render(<Host />)
		const answer = open()
		fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
		expect(await answer).toBe(false)
	})

	it('resolves false when dismissed with Escape', async () => {
		render(<Host />)
		const answer = open()
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
		expect(await answer).toBe(false)
	})

	it('cancels the previous question when a new one is asked', async () => {
		render(<Host />)
		const first = open()
		const second = open({ title: 'Câu khác?' })
		expect(await first).toBe(false)
		fireEvent.click(screen.getByRole('button', { name: 'Xóa' }))
		expect(await second).toBe(true)
	})

	it('defaults the confirm label to Đồng ý', () => {
		render(<Host />)
		open({ confirmLabel: undefined })
		expect(screen.getByRole('button', { name: 'Đồng ý' })).toBeTruthy()
	})
})
