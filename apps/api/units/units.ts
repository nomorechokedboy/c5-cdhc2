import { api, Query } from 'encore.dev/api'
import { UnitParams } from '../schema'
import unitController from './controller'
import { getAuthData } from '~encore/auth'
import { APICallMeta, currentRequest } from 'encore.dev'

type UnitLevel = 'battalion' | 'company' | 'class'

type UnitBody = {
	alias: string
	name: string
	level: UnitLevel

	parentId?: number | null

	// Chỉ dùng cho đơn vị cấp lớp (level = 'class')
	description?: string | null
	graduatedAt?: string | null
	status?: 'ongoing' | 'graduated' | null
}

export type UnitDB = UnitBody & {
	id: number
	createdAt: string
	updatedAt: string
}

interface CreateUnitRequest {
	data: Array<UnitBody>
}

interface CreateUnitResponse {
	data: Array<UnitDB>
}

export const CreateUnit = api(
	{ auth: true, expose: true, method: 'POST', path: '/units' },
	async (body: CreateUnitRequest): Promise<CreateUnitResponse> => {
		const unitParams: Array<UnitParams> = body.data.map((u) => ({
			...u
		}))

		const callMeta = currentRequest() as APICallMeta
		const validUnitIds = callMeta.middlewareData?.validUnitIds || []

		const createdUnits = await unitController.create(
			unitParams,
			validUnitIds
		)

		const resp = createdUnits.map((u) => ({ ...u }) as UnitDB)

		return { data: resp }
	}
)

export const UpdateUnit = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/units/:id' },
	async ({
		id,
		...body
	}: {
		id: number
		alias?: string
		name?: string
		parentId?: number | null
		description?: string | null
		graduatedAt?: string | null
		status?: 'ongoing' | 'graduated' | null
	}): Promise<{ data: UnitDB }> => {
		const callMeta = currentRequest() as APICallMeta
		const validUnitIds = callMeta.middlewareData?.validUnitIds || []

		return { data: await unitController.update(id, body, validUnitIds) }
	}
)

export const DeleteUnit = api(
	{ auth: true, expose: true, method: 'DELETE', path: '/units/:id' },
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const callMeta = currentRequest() as APICallMeta
		const validUnitIds = callMeta.middlewareData?.validUnitIds || []

		await unitController.delete(params.id, validUnitIds)
		return { ok: true }
	}
)

type unit = Omit<UnitDB, 'parentId'>

export type Unit = unit & {
	parent: unit | null
	children: Unit[]
	/** Chỉ có khi truy vấn với withStudentCount */
	studentCount?: number
}

export interface GetUnitsQuery {
	id?: Query<number>
	level?: Query<UnitLevel>
	/** Tìm theo tên hoặc alias */
	search?: Query<string>
	parentId?: Query<number>
	limit?: Query<number>
	offset?: Query<number>
	/** Kèm số học viên trực tiếp của từng đơn vị (dùng cho lớp) */
	withStudentCount?: Query<boolean>
}

interface GetUnitsResponse {
	data: Array<Unit>
}

export const GetUnits = api(
	{ auth: true, expose: true, method: 'GET', path: '/units' },
	async (q: GetUnitsQuery): Promise<GetUnitsResponse> => {
		const callMeta = currentRequest() as APICallMeta
		const unitIds = callMeta.middlewareData?.validUnitIds || []
		const auth = getAuthData()
		const perms = auth?.permissions || []

		/**
		 * Form «Đơn vị quản lý» (user ngành / cập nhật VT):
		 * - có units:read + asset-catalog (ngành) nhưng không quản tòa
		 * - hoặc không có unit scope → trả full danh mục đơn vị (admin data)
		 */
		const needFullUnitCatalog =
			!auth?.isSuperAdmin &&
			perms.includes('units:read') &&
			(perms.includes('asset-catalog:read') ||
				perms.includes('catalog-stock:read') ||
				perms.includes('room-assets:create')) &&
			!perms.includes('buildings:create') &&
			!perms.includes('buildings:update')

		const scope =
			!unitIds.length || needFullUnitCatalog ? undefined : unitIds
		const resp = await unitController.find(q, scope)
		const data = resp.map((u) => ({ ...u }) as Unit)

		return { data }
	}
)

interface GetUnitRequest {
	id?: Query<number>

	alias: string
	name?: Query<string>
	level?: Query<UnitLevel>

	parentId?: Query<number> | null
}

interface GetUnitResponse {
	data: Unit | undefined
}

export const GetUnit = api(
	{ auth: true, expose: true, method: 'GET', path: '/units/:alias' },
	async ({ level, ...params }: GetUnitRequest): Promise<GetUnitResponse> => {
		const callMeta = currentRequest() as APICallMeta
		const validUnitIds = callMeta.middlewareData?.validUnitIds || []

		const data = await unitController
			.findOne({
				...params,
				level: level as UnitLevel | undefined,
				validUnitIds
			})
			.then((resp) => (resp === undefined ? resp : ({ ...resp } as Unit)))
		return { data }
	}
)
