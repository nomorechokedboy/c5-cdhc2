import { describe, expect, it } from 'vitest'
import { importStage, passedStages } from './stage'

describe('importStage', () => {
	it('follows the pane the user opened until a file is loaded', () => {
		expect(importStage('idle', 0, 0)).toBe(0)
		expect(importStage('idle', 0, 1)).toBe(1)
		expect(importStage('reading', 0, 1)).toBe(1)
		// File lỗi: ở lại chặng chọn file để chọn lại
		expect(importStage('error', 0, 1)).toBe(1)
	})

	it('moves to the check stage once rows are parsed', () => {
		expect(importStage('ready', 3, 1)).toBe(2)
	})

	it('goes back to the check stage when the import itself fails', () => {
		expect(importStage('error', 3, 1)).toBe(2)
	})

	it('is the import stage while sending and after finishing', () => {
		expect(importStage('importing', 3, 1)).toBe(3)
		expect(importStage('done', 3, 1)).toBe(3)
	})
})

describe('passedStages', () => {
	it('lists every stage before the current one', () => {
		expect(passedStages(0)).toEqual([])
		expect(passedStages(3)).toEqual([0, 1, 2])
	})
})
