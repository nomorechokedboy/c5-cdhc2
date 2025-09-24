import type { entities } from '@/api/client'

export type AppToken = {
	accessToken: string
	refreshToken: string
}

export type TokenEvent = {
	token: AppToken
}

export class CourseCategory {
	constructor(
		public id: number,
		public name: string,
		public description: string,
		public idnumber: string,
		public visible: boolean,
		public updatedAt: number
	) {}

	static fromEntity({
		id,
		name,
		description,
		idnumber,
		visible,
		timemodified
	}: entities.Category) {
		return new CourseCategory(
			id,
			name ?? '',
			description ?? '',
			idnumber ?? '',
			visible ?? false,
			timemodified ?? Date.now()
		)
	}
}
