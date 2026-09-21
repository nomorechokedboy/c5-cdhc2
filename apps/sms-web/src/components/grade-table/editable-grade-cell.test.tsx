import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditableGradeCell from './editable-grade-cell'

afterEach(cleanup)

const setup = (value = 6.5) => {
	const onSave = vi.fn()
	render(
		<EditableGradeCell
			studentId={7}
			category={3}
			value={value}
			onSave={onSave}
		/>
	)
	return onSave
}

describe('EditableGradeCell', () => {
	it('shows the grade with two decimals and opens an input on click', () => {
		setup()
		fireEvent.click(screen.getByRole('button', { name: /6\.50/ }))
		expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe(
			'6.50'
		)
	})

	it('saves the typed grade on Enter and closes', async () => {
		const onSave = setup()
		fireEvent.click(screen.getByRole('button', { name: /6\.50/ }))
		const input = screen.getByRole('spinbutton')
		fireEvent.change(input, { target: { value: '8.25' } })
		fireEvent.keyDown(input, { key: 'Enter' })
		expect(onSave).toHaveBeenCalledWith(7, 3, 8.25)
		expect(
			await screen.findByRole('button', { name: /6\.50/ })
		).toBeTruthy()
	})

	it('does not save an empty value', () => {
		const onSave = setup()
		fireEvent.click(screen.getByRole('button', { name: /6\.50/ }))
		const input = screen.getByRole('spinbutton')
		fireEvent.change(input, { target: { value: '' } })
		fireEvent.keyDown(input, { key: 'Enter' })
		expect(onSave).not.toHaveBeenCalled()
	})

	it('cancels with Escape without saving', () => {
		const onSave = setup()
		fireEvent.click(screen.getByRole('button', { name: /6\.50/ }))
		fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Escape' })
		expect(onSave).not.toHaveBeenCalled()
		expect(screen.queryByRole('spinbutton')).toBeNull()
	})
})
