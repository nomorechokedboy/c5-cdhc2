import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ClassList } from './ClassList'
import { Ledger } from './Ledger'

afterEach(cleanup)

describe('ClassList', () => {
	it('shows placeholders while loading, not the empty message', () => {
		const { container } = render(
			<ClassList
				categories={[]}
				isLoading
				emptyText='Chưa có lớp'
				skeletonCount={4}
			/>
		)
		expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4)
		expect(screen.queryByText('Chưa có lớp')).toBeNull()
	})

	it('shows the empty message when there are no classes', () => {
		render(
			<ClassList
				categories={[]}
				isLoading={false}
				emptyText='Chưa có lớp'
			/>
		)
		expect(screen.getByText('Chưa có lớp')).toBeTruthy()
	})
})

describe('Ledger', () => {
	it('writes each figure above its label', () => {
		render(
			<Ledger
				items={[
					{ label: 'Lớp học', value: 5 },
					{ label: 'Môn học', value: '—' }
				]}
			/>
		)
		expect(screen.getByText('5')).toBeTruthy()
		expect(screen.getByText('Môn học')).toBeTruthy()
	})
})
