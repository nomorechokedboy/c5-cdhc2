import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ConductInput, parseConduct } from './ConductInput'

afterEach(cleanup)

describe('parseConduct', () => {
	it.each([
		['8.5', 8.5],
		['8,5', 8.5],
		[' 10 ', 10],
		['0', 0],
		['10.0', 10]
	])('accepts %s', (text, value) => {
		expect(parseConduct(text)).toEqual({ ok: true, value })
	})

	it('treats blank as delete', () => {
		expect(parseConduct('  ')).toEqual({ ok: true, value: null })
	})

	it.each(['abc', '10.5', '11', '-1', '7.25', '1e1', '8.'])(
		'rejects %s',
		(text) => {
			expect(parseConduct(text)).toEqual({ ok: false })
		}
	)
})

describe('ConductInput', () => {
	const setup = (value: number | null = 8.5) => {
		const onSave = vi.fn()
		render(<ConductInput value={value} ariaLabel='RL An' onSave={onSave} />)
		return {
			onSave,
			input: screen.getByLabelText('RL An') as HTMLInputElement
		}
	}

	it('shows the stored score with one decimal, or empty', () => {
		expect(setup(9).input.value).toBe('9.0')
		cleanup()
		expect(setup(null).input.value).toBe('')
	})

	it('saves a changed valid value on blur', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '7,5' } })
		fireEvent.blur(input)
		expect(onSave).toHaveBeenCalledWith(7.5)
	})

	it('saves null when cleared', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '' } })
		fireEvent.blur(input)
		expect(onSave).toHaveBeenCalledWith(null)
	})

	it('does not save an unchanged value', () => {
		const { input, onSave } = setup()
		fireEvent.blur(input)
		expect(onSave).not.toHaveBeenCalled()
	})

	it('flags an invalid value and does not save it', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '11' } })
		fireEvent.blur(input)
		expect(onSave).not.toHaveBeenCalled()
		expect(input.getAttribute('aria-invalid')).toBe('true')
	})

	it('restores the stored value on Escape', () => {
		const { input, onSave } = setup()
		fireEvent.change(input, { target: { value: '3' } })
		fireEvent.keyDown(input, { key: 'Escape' })
		expect(input.value).toBe('8.5')
		fireEvent.blur(input)
		expect(onSave).not.toHaveBeenCalled()
	})

	it('saves on Enter', () => {
		const { input, onSave } = setup()
		input.focus()
		fireEvent.change(input, { target: { value: '6' } })
		fireEvent.keyDown(input, { key: 'Enter' })
		expect(onSave).toHaveBeenCalledWith(6)
	})
})
