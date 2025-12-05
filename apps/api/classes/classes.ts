import { api } from 'encore.dev/api'
import log from 'encore.dev/log'
import { ClassDB, ClassParam } from '../schema/classes.js'
import classController from './controller.js'
import { UnitDB } from '../units/units.js'
import { getAuthData } from '~encore/auth'
import { APICallMeta, currentRequest } from 'encore.dev'

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

		const callMeta = currentRequest() as APICallMeta
		const validUnitIds = callMeta.middlewareData?.validUnitIds || []

		const createdClass = await classController.create(
			[classParam],
			validUnitIds
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
		const callMeta = currentRequest() as APICallMeta
		const classIds = callMeta.middlewareData?.validClassIds || []

		const classes = await classController.find({ ids, unitIds }, classIds)
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
		const callMeta = currentRequest() as APICallMeta
		const validClassIds = callMeta.middlewareData?.validClassIds || []

		const classes: ClassDB[] = body.ids.map((id) => ({ id }) as ClassDB)
		await classController.delete(classes, validClassIds)

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
		const callMeta = currentRequest() as APICallMeta
		const validClassIds = callMeta.middlewareData?.validClassIds || []
		const validUnitIds = callMeta.middlewareData?.validUnitIds || []

		const classes: ClassDB[] = body.data.map((s) => ({ ...s }) as ClassDB)

		await classController.update(classes, { validClassIds, validUnitIds })

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
		const callMeta = currentRequest() as APICallMeta
		const classIds = callMeta.middlewareData?.validClassIds || []
		const data = await classController
			.findOne(id, classIds)
			.then((resp) =>
				resp !== undefined ? ({ ...resp } as Class) : undefined
			)

		return { data }
	}
)
