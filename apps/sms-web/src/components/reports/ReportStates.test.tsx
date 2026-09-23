import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'

afterEach(cleanup)

describe('ReportStates', () => {
	it('announces loading', () => {
		render(<ReportSkeleton />)
		expect(
			screen.getByRole('status', { name: 'Đang tải kết quả' })
		).toBeTruthy()
	})

	it('shows the error and retries', () => {
		const onRetry = vi.fn()
		render(<ReportError message='no such class' onRetry={onRetry} />)
		expect(screen.getByRole('alert').textContent).toContain('no such class')
		fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
		expect(onRetry).toHaveBeenCalled()
	})

	it('has no retry button without a handler', () => {
		render(<ReportError message='x' />)
		expect(screen.queryByRole('button')).toBeNull()
	})

	it('shows the empty message', () => {
		render(<ReportEmpty message='Chưa có điểm' />)
		expect(screen.getByText('Chưa có điểm')).toBeTruthy()
	})
})
