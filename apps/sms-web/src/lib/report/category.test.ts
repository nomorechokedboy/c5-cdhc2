import { describe, expect, it } from 'vitest'
import { CourseCategory } from '@/types'
import { categoryFromParam } from './category'

const cats = [
	new CourseCategory(1, 'Lớp A', '', 'Y53', true, 0, 0),
	new CourseCategory(2, 'Lớp B', '', '', true, 0, 0)
]

describe('categoryFromParam', () => {
	it('matches by idnumber, or by id when the category has none', () => {
		expect(categoryFromParam(cats, 'Y53')?.id).toBe(1)
		expect(categoryFromParam(cats, '2')?.id).toBe(2)
	})
	it('does not match the id of a category that has an idnumber', () => {
		expect(categoryFromParam(cats, '1')).toBeUndefined()
	})
})
