import { describe, expect, it } from 'vitest'
import { hasConditionalAfter } from './columns'

describe('hasConditionalAfter', () => {
	it('puts the conditional column before the last column', () => {
		expect(hasConditionalAfter(2, 4)).toBe(true)
		expect(hasConditionalAfter(1, 4)).toBe(false)
		expect(hasConditionalAfter(3, 4)).toBe(false)
	})

	it('adds none when there are two columns or fewer', () => {
		expect(hasConditionalAfter(0, 2)).toBe(false)
		expect(hasConditionalAfter(0, 1)).toBe(false)
		expect(hasConditionalAfter(0, 0)).toBe(false)
	})
})
