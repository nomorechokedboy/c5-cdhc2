import type { CourseCategory } from '@/types'

/** The URL segment of a category is its idnumber, or its id when it has none (same rule as the sidebar). */
export function categoryFromParam(
	categories: CourseCategory[],
	param: string
): CourseCategory | undefined {
	return categories.find(
		(c) => (c.idnumber?.trim() ? c.idnumber : String(c.id)) === param
	)
}
