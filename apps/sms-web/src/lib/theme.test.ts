import { describe, expect, it } from 'vitest'
import { THEME_KEY, otherTheme, readTheme } from './theme'

const store = (value: string | null) => ({ getItem: () => value })

describe('readTheme', () => {
	it('uses the saved theme over the system preference', () => {
		expect(readTheme(store('light'), true)).toBe('light')
		expect(readTheme(store('dark'), false)).toBe('dark')
	})

	it('follows the system preference when nothing valid is saved', () => {
		expect(readTheme(store(null), true)).toBe('dark')
		expect(readTheme(store('purple'), false)).toBe('light')
	})

	it('falls back when storage is missing or throws', () => {
		expect(readTheme(undefined, true)).toBe('dark')
		expect(
			readTheme(
				{
					getItem: () => {
						throw new Error('blocked')
					}
				},
				false
			)
		).toBe('light')
	})

	it('reads from the sms-theme key', () => {
		let asked = ''
		readTheme({ getItem: (k) => ((asked = k), null) }, false)
		expect(asked).toBe(THEME_KEY)
	})
})

describe('otherTheme', () => {
	it('flips light and dark', () => {
		expect(otherTheme('light')).toBe('dark')
		expect(otherTheme('dark')).toBe('light')
	})
})
