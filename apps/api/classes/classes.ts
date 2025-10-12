import { api } from 'encore.dev/api'
import log from 'encore.dev/log'
import { ClassDB, ClassParam } from '../schema/classes.js'
import classController from './controller.js'
import { UnitDB } from '../units/units.js'
import { getAuthData } from '~encore/auth'

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
	{ auth: true, expose: true, method: 'POST', path: '/classes' },
	async (body: ClassBody): Promise<BulkClassResponse> => {
		const classParam: ClassParam = {
			...body
		}
		log.trace('classes.CreateClass body', { classParam })
		const validUntiIds = getAuthData()!.validUnitIds

		const createdClass = await classController.create(
			[classParam],
			validUntiIds
		)

		const resp = createdClass.map(
			(c) =>
				({
					...c
				}) as ClassResponse
		)

		return { data: resp }
	}
)

interface GetClassesRequest {
	ids?: number[]
	unitIds?: number[]
}

interface GetClassesResponse extends BulkClassResponse {}

export const GetClasses = api(
	{ expose: true, method: 'GET', path: '/classes' },
	async ({
		ids,
		unitIds
	}: GetClassesRequest): Promise<GetClassesResponse> => {
		const classIds = getAuthData()!.validClassIds
		const classes = await classController.find({ ids: classIds, unitIds })
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
	{ auth: true, expose: true, method: 'DELETE', path: '/classes' },
	async (body: DeleteClassRequest): Promise<DeleteClassResponse> => {
		log.trace('classes.DeleteClasss body', { body })
		const validClassIds = getAuthData()!.validClassIds
		const validUntiIds = getAuthData()!.validUnitIds
		const classes: ClassDB[] = body.ids.map((id) => ({ id }) as ClassDB)
		await classController.delete(classes, validClassIds, validUntiIds)

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
	{ auth: true, expose: true, method: 'PATCH', path: '/classes' },
	async (body: UpdateClassBody) => {
		const classes: ClassDB[] = body.data.map((s) => ({ ...s }) as ClassDB)

		await classController.update(classes)

		return {}
	}
)

interface GetClassByIdRequest {
	id: number
}

type Class = Omit<ClassResponse, 'unitId'> & { unit: UnitDB }

interface GetClassByIdResponse {
	data: Class | undefined
}

export const GetClassById = api(
	{ auth: true, expose: true, method: 'GET', path: '/classes/:id' },
	async ({ id }: GetClassByIdRequest): Promise<GetClassByIdResponse> => {
		const classIds = getAuthData()!.validClassIds
		const data = await classController
			.findOne(id, classIds)
			.then((resp) =>
				resp !== undefined ? ({ ...resp } as Class) : undefined
			)

		return { data }
	}
)
