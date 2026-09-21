import { describe, expect, it } from 'vitest'
import { tabOfField, tabsWithErrors } from './tab-fields'

describe('tabOfField', () => {
	it('maps plain, dotted and indexed field names to their tab', () => {
		expect(tabOfField('dob')).toBe('personal')
		expect(tabOfField('unitId')).toBe('military')
		expect(tabOfField('contactPerson.phoneNumber')).toBe('history')
		expect(tabOfField('childrenInfos[0].dob')).toBe('family')
		expect(tabOfField('unknownField')).toBeUndefined()
	})
})

describe('tabsWithErrors', () => {
	it('collects only tabs whose fields have errors', () => {
		const tabs = tabsWithErrors({
			dob: { errors: ['x'] },
			fatherDob: { errors: [] },
			'childrenInfos[1].dob': { errors: ['y'] },
			major: undefined,
			mystery: { errors: ['z'] }
		})
		expect([...tabs].sort()).toEqual(['family', 'personal'])
	})
})
