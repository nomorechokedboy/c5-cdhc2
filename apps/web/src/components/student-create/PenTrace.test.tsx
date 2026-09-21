import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PenTrace } from './PenTrace'

const steps = [
	{ id: 'a', title: 'Một' },
	{ id: 'b', title: 'Hai' },
	{ id: 'c', title: 'Ba' }
]

afterEach(cleanup)

const beats = () => document.querySelectorAll('[data-drawn=beat]').length

describe('PenTrace', () => {
	it('marks the current step and draws no beat before anything is done', () => {
		render(
			<PenTrace
				steps={steps}
				currentStep={0}
				completedSteps={[]}
				onStepClick={vi.fn()}
			/>
		)
		expect(
			screen
				.getByRole('button', { name: 'Một' })
				.getAttribute('aria-current')
		).toBe('step')
		expect(
			screen
				.getByRole('button', { name: 'Hai' })
				.getAttribute('aria-current')
		).toBeNull()
		expect(beats()).toBe(0)
	})

	it('draws one beat per completed step and keeps them when stepping back', () => {
		const { rerender } = render(
			<PenTrace
				steps={steps}
				currentStep={2}
				completedSteps={[0, 1]}
				onStepClick={vi.fn()}
			/>
		)
		expect(beats()).toBe(2)
		rerender(
			<PenTrace
				steps={steps}
				currentStep={0}
				completedSteps={[0, 1]}
				onStepClick={vi.fn()}
			/>
		)
		expect(beats()).toBe(2)
	})

	it('reports the clicked step', () => {
		const onStepClick = vi.fn()
		render(
			<PenTrace
				steps={steps}
				currentStep={1}
				completedSteps={[0]}
				onStepClick={onStepClick}
			/>
		)
		fireEvent.click(screen.getByRole('button', { name: 'Một' }))
		expect(onStepClick).toHaveBeenCalledWith(0)
	})
})
