import { describe, expect, it } from 'vitest'
import { BANDS, TONE_CLASS, bandKey, conductKey, scoreTone } from './labels'

describe('scoreTone', () => {
	it.each([
		[10, 'good'],
		[9, 'good'],
		[8.99, 'none'],
		[7, 'none'],
		[6.99, 'warn'],
		[5, 'warn'],
		[4.99, 'none'],
		[0, 'none']
	])('%s is %s', (value, tone) => {
		expect(scoreTone(value)).toBe(tone)
	})

	it('has a class for every tone, empty for none', () => {
		expect(TONE_CLASS.good).toContain('success')
		expect(TONE_CLASS.warn).toContain('warning')
		expect(TONE_CLASS.none).toBe('')
	})
})

describe('keys', () => {
	it('lists the six study bands best first', () => {
		expect(BANDS).toEqual([
			'xuat_sac',
			'gioi',
			'kha',
			'trung_binh_kha',
			'trung_binh',
			'yeu'
		])
	})
	it('builds i18n keys', () => {
		expect(bandKey('gioi')).toBe('report.band.gioi')
		expect(conductKey('tot')).toBe('report.conductBand.tot')
	})
})
