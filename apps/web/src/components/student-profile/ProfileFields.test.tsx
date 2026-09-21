import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProfileField } from './ProfileFields'
import { studentClassLabel } from './utils'

afterEach(cleanup)

describe('ProfileField', () => {
	it('shows a dash for empty, null and undefined values', () => {
		render(
			<>
				<ProfileField label='A' value='' />
				<ProfileField label='B' value={null} />
				<ProfileField label='C' />
			</>
		)
		expect(screen.getAllByText('-')).toHaveLength(3)
	})

	it('keeps zero as a real value', () => {
		render(<ProfileField label='Số con' value={0} />)
		expect(screen.getByText('0')).toBeTruthy()
	})

	it('maps a stored code to its option label, and dashes an unknown code', () => {
		const options = [{ label: 'Đảng', value: 'cpv' }]
		render(
			<>
				<ProfileField label='Tổ chức' value='cpv' options={options} />
				<ProfileField label='Khác' value='zzz' options={options} />
			</>
		)
		expect(screen.getByText('Đảng')).toBeTruthy()
		expect(screen.getByText('-')).toBeTruthy()
	})
})

describe('studentClassLabel', () => {
	it('joins the class and its company', () => {
		expect(
			studentClassLabel({
				unit: { name: 'Lớp 1', parent: { name: 'Đại đội 2' } }
			} as never)
		).toBe('Lớp 1 - Đại đội 2')
	})

	it('drops a missing parent and returns undefined without a unit', () => {
		expect(studentClassLabel({ unit: { name: 'Lớp 1' } } as never)).toBe(
			'Lớp 1'
		)
		expect(studentClassLabel({} as never)).toBeUndefined()
	})
})
