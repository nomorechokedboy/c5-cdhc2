import { describe, expect, it } from 'vitest'
import type { ImportRow } from './parse'
import { reviewFields } from './review-fields'

const row = (values: ImportRow['values']): ImportRow => ({
	rowNumber: 3,
	values,
	unitText: 'Lớp 1'
})

const byKey = (fields: ReturnType<typeof reviewFields>) =>
	Object.fromEntries(fields.map((f) => [f.key, f.value]))

describe('reviewFields', () => {
	it('formats each kind the way the profile shows it', () => {
		const v = byKey(
			reviewFields(
				row({
					fullName: ' Nguyễn Văn A ',
					dob: '2001-05-06',
					isMarried: true,
					isGraduated: false,
					politicalOrg: 'cpv',
					familySize: 5
				})
			)
		)
		expect(v.fullName).toBe('Nguyễn Văn A')
		expect(v.dob).toBe('06/05/2001')
		expect(v.isMarried).toBe('Có')
		expect(v.isGraduated).toBe('Không')
		expect(v.politicalOrg).toBe('Đảng')
		expect(v.familySize).toBe('5')
	})

	it('leaves blanks empty so the review can flag what the file did not fill', () => {
		const v = byKey(reviewFields(row({ familySize: 0, ethnic: '' })))
		expect(v.familySize).toBe('')
		expect(v.ethnic).toBe('')
		expect(v.rank).toBe('')
	})

	it('skips the unit column, which has its own selector', () => {
		expect(reviewFields(row({})).some((f) => f.key === 'unitId')).toBe(
			false
		)
	})
})
