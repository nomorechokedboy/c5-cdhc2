import { api } from 'encore.dev/api'
import log from 'encore.dev/log'
import { ClassDB, ClassParam } from '../schema/classes.js'
import classController from './controller.js'

interface ClassBody {
	name: string
	description?: string

	graduatedAt?: string
	unitId: number
}

export interface ClassResponse {
	id: number
	createdAt: string
	updatedAt: string

	name: string
	description: string

	graduatedAt: string | null
	status: 'ongoing' | 'graduated'

	unitId: number
}

interface BulkClassResponse {
	data: ClassResponse[]
}

export const CreateClass = api(
	{ expose: true, method: 'POST', path: '/classes' },
	async (body: ClassBody): Promise<BulkClassResponse> => {
		const classParam: ClassParam = {
			...body
		}
		log.trace('classes.CreateClass body', { classParam })

		const createdClass = await classController.create([classParam])

		const resp = createdClass.map(
			(c) =>
				({
					...c
				}) as ClassResponse
		)

		return { data: resp }
	}
)

interface GetClassesResponse extends BulkClassResponse {}

export const GetClasses = api(
	{ expose: true, method: 'GET', path: '/classes' },
	async (): Promise<GetClassesResponse> => {
		const classes = await classController.find()
		const resp = classes.map(
			(c) =>
				({
					...c
				}) as ClassResponse
		)

		return { data: resp }
	}
)

interface DeleteClassRequest {
	ids: number[]
}

interface DeleteClassResponse {
	ids: number[]
}

export const DeleteClasss = api(
	{ expose: true, method: 'DELETE', path: '/classes' },
	async (body: DeleteClassRequest): Promise<DeleteClassResponse> => {
		log.trace('classes.DeleteClasss body', { body })

		const classes: ClassDB[] = body.ids.map((id) => ({ id }) as ClassDB)
		await classController.delete(classes)

		return { ids: body.ids }
	}
)

interface UpdatePayload extends Partial<ClassBody> {
	id: number
}

interface UpdateClassBody {
	data: UpdatePayload[]
}

export const UpdateClasss = api(
	{ expose: true, method: 'PATCH', path: '/classes' },
	async (body: UpdateClassBody) => {
		const classes: ClassDB[] = body.data.map((s) => ({ ...s }) as ClassDB)

		await classController.update(classes)

		return {}
	}
)
