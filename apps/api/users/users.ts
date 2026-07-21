import { api } from 'encore.dev/api'
import userController from './controller'
import { getAuthData } from '~encore/auth'
import { AppError } from '../errors'

interface CreateUserRequest {
	username: string
	password: string
	displayName: string
	unitId?: number
	isSuperUser?: boolean
	status?: string
	rank?: string
	position?: string
	alias?: string
	signatureUrl?: string
}

interface UpdateUserRequest {
	id: number
	password?: string
	displayName?: string
	unitId?: number
	isSuperUser?: boolean
	rank?: string
	position?: string
	alias?: string
	signatureUrl?: string | null
}

interface GetUserRequest {
	id: number
	username: string
	displayName: string
	unitId: number
}

interface GetUserResponse {
	data: UserResponse[]
}

interface CreateUserResponse {
	data: UserDB
}

interface UpdateUserResponse {
	data: UserDB
}

interface UserDB extends Omit<CreateUserRequest, 'password'> {
	id: number
	createdAt: string
	updatedAt: string
}

interface RoleDB {
	id: number
	createdAt: string
	updatedAt: string
	name: string
	description?: string
}
interface UserResponse {
	id: number
	createdAt: string
	updatedAt: string
	username: string
	password: string
	displayName: string
	unitId: number
}
interface BulkUserResponse {
	data: UserResponse[]
}

export interface User extends UserDB {
	roles: RoleDB[]
}
interface GetUsersResponse extends BulkUserResponse {}

export const GetUsers = api(
	{ expose: true, method: 'GET', path: '/users' },
	async (): Promise<GetUserResponse> => {
		const data = await userController.find()
		const resp = data.map(
			(c) =>
				({
					...c
				}) as UserResponse
		)

		return { data: resp }
	}
)

export const CreateUser = api(
	{ expose: true, auth: true, method: 'POST', path: '/users' },
	async (req: CreateUserRequest): Promise<CreateUserResponse> => {
		const isAdmin = getAuthData()!.isSuperAdmin
		if (!isAdmin) {
			AppError.handleAppErr(AppError.permissionDenied('Unauthorized'))
		}

		const {
			username,
			password,
			displayName,
			unitId,
			isSuperUser,
			status,
			rank,
			position,
			alias,
			signatureUrl
		} = req

		const data = await userController
			.create({
				password,
				username,
				displayName,
				unitId,
				isSuperUser,
				status,
				rank,
				position,
				alias,
				signatureUrl
			})
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)

/** Chức vụ gắn loại TK (CNK/GV/BGH/ngành/đv) — không cho đổi qua UpdateUser */
const ACCOUNT_BOUND_POSITIONS = new Set([
	'Chủ nhiệm khoa',
	'Giáo viên',
	'Ban Giám Hiệu',
	'User ngành',
	'Đơn vị sử dụng'
])

export const UpdateUser = api(
	{ expose: true, auth: true, method: 'PUT', path: '/users' },
	async (req: UpdateUserRequest): Promise<UpdateUserResponse> => {
		const auth = getAuthData()!
		// Chỉ admin / super admin được đổi mật khẩu người khác
		if (req.password && !auth.isSuperAdmin) {
			const selfId = Number(auth.userID)
			if (Number(req.id) !== selfId) {
				throw AppError.handleAppErr(
					AppError.permissionDenied(
						'Chỉ admin được đặt lại mật khẩu user khác'
					)
				)
			}
		}
		// BGH / chính chủ được upload chữ ký số của mình
		if (req.signatureUrl !== undefined && !auth.isSuperAdmin) {
			const selfId = Number(auth.userID)
			if (Number(req.id) !== selfId) {
				throw AppError.handleAppErr(
					AppError.permissionDenied(
						'Chỉ được cập nhật chữ ký số của chính mình (hoặc admin)'
					)
				)
			}
		}
		const {
			id,
			displayName,
			unitId,
			isSuperUser,
			password,
			rank,
			position,
			alias,
			signatureUrl
		} = req

		// Chức vụ luôn gắn loại tài khoản khi tạo — không cho sửa
		let safeUnitId = unitId
		const existing = await userController
			.findOne({ id } as any)
			.catch(() => null)
		const curPos = (existing?.position || '').trim()

		if (position !== undefined && (position || '').trim() !== curPos) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'Chức vụ gắn theo loại tài khoản — không được chỉnh sửa'
				)
			)
		}

		// CNK / GV / BGH / ngành: không gán đơn vị
		if (
			ACCOUNT_BOUND_POSITIONS.has(curPos) &&
			curPos !== 'Đơn vị sử dụng'
		) {
			safeUnitId = undefined
		}

		const data = await userController
			.update({
				id,
				displayName,
				unitId: safeUnitId,
				isSuperUser,
				password,
				rank,
				// Không ghi đè position — giữ nguyên từ lúc tạo TK
				alias,
				signatureUrl
			})
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)
interface DeleteUserRequest {
	ids: number[]
}

interface DeleteUserResponse {
	ids: number[]
}

export const DeleteUsers = api(
	{ expose: true, auth: true, method: 'DELETE', path: '/users' },
	async (body: DeleteUserRequest): Promise<DeleteUserResponse> => {
		console.log('users.DeleteStudents body', { body })
		const users = body.ids
		const validUnitIds = getAuthData()!.validUnitIds
		const userId = Number(getAuthData()!.userID)
		if (body.ids.includes(userId)) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Bạn không thể xóa chính mình!')
			)
		}
		await userController.delete(users, validUnitIds)

		return { ids: body.ids }
	}
)

interface IsInitAdminResponse {
	data: boolean
}

export const IsInitAdmin = api(
	{ expose: true, method: 'GET', path: '/users/check-init-admin' },
	async (): Promise<IsInitAdminResponse> => {
		const result = await userController.isInitAdmin()

		return { data: result }
	}
)

/**
 * User chưa có vai trò (hoặc status pending) — cần admin cấp quyền.
 * Badge đỏ +N trên Danh sách người dùng.
 */
export const GetPendingPermissionUsers = api(
	{
		expose: true,
		auth: true,
		method: 'GET',
		path: '/users/pending-permissions'
	},
	async (): Promise<{
		data: {
			count: number
			items: Array<{
				userId: number
				username: string
				displayName: string
				status: string | null
				createdAt: string
			}>
		}
	}> => {
		const data = await userController.listPendingPermissions()
		return { data }
	}
)

interface InitAdminRequest {
	username: string
	password: string
	displayName: string
}

interface InitAdminResponse {
	message: string
}

export const InitAdmin = api(
	{ auth: false, expose: true, method: 'POST', path: '/users/init-admin' },
	async (req: InitAdminRequest): Promise<InitAdminResponse> => {
		await userController.initAdmin({
			username: req.username,
			displayName: req.displayName,
			password: req.password
		})

		return { message: 'Success' }
	}
)
