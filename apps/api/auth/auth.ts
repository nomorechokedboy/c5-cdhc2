import { api, APIError, Gateway, Header } from 'encore.dev/api'
import { authHandler } from 'encore.dev/auth'
import log from 'encore.dev/log'
import authController from './controller'
import { AppError } from '../errors'
import { getAuthData } from '~encore/auth'
import userController from '../users/controller'
import { UserDB } from '../schema'
import { User } from '../users/users'

interface AuthParams {
	authorization: Header<'Authorization'>
}

interface AuthData {
	userID: string
	permissions: string[]
	isSuperAdmin: boolean
}

export const auth = authHandler<AuthParams, AuthData>(async (params) => {
	const token = params.authorization.replace('Bearer ', '')
	if (!token) {
		throw APIError.unauthenticated('no token provided')
	}

	try {
		const payload = authController.verifyToken(token)

		if (payload.type !== 'access') {
			throw new Error('Invalid token type')
		}

		// Return simplified auth data - validClassIds and validUnitIds computed in middleware
		return {
			userID: payload.userId.toString(),
			permissions: payload.permissions || [],
			isSuperAdmin: payload.isSuperUser
		}
	} catch (err) {
		log.error('authHandler error', { err })
		AppError.handleAppErr(err)
	}
})

export const mygw = new Gateway({ authHandler: auth })

interface LoginRequest {
	username: string
	password: string
}

interface LoginResponse {
	accessToken: string
	refreshToken: string
}

export const Login = api(
	{ expose: true, method: 'POST', path: '/authn/login' },
	async ({ username, password }: LoginRequest): Promise<LoginResponse> => {
		const { accessToken, refreshToken } = await authController.login({
			password,
			username
		})
		return { refreshToken, accessToken }
	}
)

interface RefreshTokenRequest {
	token: string
}

interface RefreshTokenResponse extends LoginResponse {}

export const RefreshToken = api(
	{ expose: true, method: 'POST', path: '/authn/refresh' },
	async ({ token }: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
		const { accessToken, refreshToken } = await authController.refreshToken(
			{ token }
		)

		return { accessToken, refreshToken }
	}
)

interface GetUserInfoResponse {
	data: User
}

export const GetUserInfo = api(
	{ auth: true, expose: true, method: 'GET', path: '/authn/me' },
	async (): Promise<GetUserInfoResponse> => {
		const userId = Number(getAuthData()!.userID)
		const userData = await userController.findOne({ id: userId } as UserDB)

		// Gắn ngành / cờ user ngành cho frontend (sidebar)
		let nganhCodes: string[] = []
		let roleNames: string[] = []
		try {
			const { default: orm } = await import('../database')
			const { userNganh } = await import('../schema/user-nganh')
			const { userRoles } = await import('../schema/user-roles')
			const { roles } = await import('../schema/roles')
			const { eq } = await import('drizzle-orm')
			const rows = await orm
				.select({ code: userNganh.nganhCode })
				.from(userNganh)
				.where(eq(userNganh.userId, userId))
			nganhCodes = rows.map((r) => r.code.toUpperCase())
			const rrows = await orm
				.select({ name: roles.name })
				.from(userRoles)
				.innerJoin(roles, eq(userRoles.roleId, roles.id))
				.where(eq(userRoles.userId, userId))
			roleNames = rrows.map((r) => r.name)
		} catch {
			/* ignore */
		}

		const roleHit = roleNames.some((n) => {
			const s = n.toLowerCase()
			return (
				s === 'user_nganh' ||
				s === 'exam_dept_head' ||
				s.includes('ngành') ||
				s.includes('nganh') ||
				s.includes('chu_nhiem') ||
				s.includes('cnk')
			)
		})
		const commanderLike = roleNames.some((n) => {
			const s = n.toLowerCase()
			return (
				s.includes('commander') ||
				s === 'admin' ||
				s === 'super_admin' ||
				s === 'viewer'
			)
		})
		// User ngành: role user_nganh / Khoa Ngành, hoặc có gán ngành và không phải chỉ huy
		const isNganhScoped =
			!userData.isSuperUser &&
			(roleHit || (nganhCodes.length > 0 && !commanderLike))

		const data = {
			...userData,
			unitName: userData.unit?.name || null,
			nganhCodes,
			roles: roleNames,
			isNganhScoped
		} as User

		return { data }
	}
)

interface ChangeUserPasswordRequest {
	prevPassword: string
	password: string
}

/**
 * Upload chữ ký số của chính mình (CNK / BGH) — không cần users:update.
 * body.signatureUrl: data URL hoặc URL ảnh.
 */
export const UpdateMySignature = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/authn/my-signature'
	},
	async (body: {
		signatureUrl: string
	}): Promise<{ ok: boolean; signatureUrl: string }> => {
		const userId = Number(getAuthData()!.userID)
		const url = (body.signatureUrl || '').trim()
		if (!url) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Thiếu signatureUrl')
			)
		}
		if (url.length > 2_000_000) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Ảnh chữ ký quá lớn')
			)
		}
		const { default: orm } = await import('../database')
		const { users } = await import('../schema/users')
		const { eq } = await import('drizzle-orm')
		await orm
			.update(users)
			.set({ signatureUrl: url })
			.where(eq(users.id, userId))
		return { ok: true, signatureUrl: url }
	}
)

/**
 * Cập nhật hồ sơ chính mình (họ tên, cấp bậc) — không cần users:update.
 * Chức vụ gắn loại tài khoản khi tạo — không cho đổi tại đây.
 */
export const UpdateMyProfile = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/authn/my-profile'
	},
	async (body: {
		displayName?: string
		rank?: string
	}): Promise<{
		ok: boolean
		displayName: string
		rank: string | null
		position: string | null
	}> => {
		const userId = Number(getAuthData()!.userID)
		const { default: orm } = await import('../database')
		const { users } = await import('../schema/users')
		const { eq } = await import('drizzle-orm')

		const [existing] = await orm
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)
		if (!existing) {
			throw AppError.handleAppErr(
				AppError.notFound('Tài khoản không tồn tại')
			)
		}

		const patch: {
			displayName?: string
			rank?: string | null
		} = {}

		if (body.displayName !== undefined) {
			const dn = body.displayName.trim()
			if (!dn) {
				throw AppError.handleAppErr(
					AppError.invalidArgument('Họ và tên không được bỏ trống')
				)
			}
			patch.displayName = dn
		}

		if (body.rank !== undefined) {
			patch.rank = (body.rank || '').trim() || null
		}

		if (Object.keys(patch).length) {
			await orm.update(users).set(patch).where(eq(users.id, userId))
		}

		const [updated] = await orm
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)

		return {
			ok: true,
			displayName: updated!.displayName,
			rank: updated!.rank ?? null,
			position: updated!.position ?? null
		}
	}
)

export const ChangeUserPassword = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/authn/change-pwd' },
	async ({ password, prevPassword }: ChangeUserPasswordRequest) => {
		const userId = Number(getAuthData()!.userID)
		await authController.changePassword({ password, prevPassword, userId })

		return {}
	}
)
