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
	validClassIds: number[]
	validUnitIds: number[]
}

export const auth = authHandler<AuthParams, AuthData>(async (params) => {
	// TODO: Look up information about the user based on the authorization header.
	const token = params.authorization.replace('Bearer ', '')
	if (!token) {
		throw APIError.unauthenticated('no token provided')
	}

	try {
		const payload = authController.verifyToken(token)

		if (payload.type !== 'access') {
			throw new Error('Invalid token type')
		}

		// Return auth data that will be available in all authenticated endpoints
		return {
			userID: payload.userId.toString(),
			permissions: payload.permissions || [],
			validClassIds: payload.validClassIds || [],
			validUnitIds: payload.validUnitIds || []
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
		const data = await userController
			.findOne({ id: userId } as UserDB)
			.then((user) => ({ ...user }) as User)

		return { data }
	}
)

interface ChangeUserPasswordRequest {
	prevPassword: string
	password: string
}

export const ChangeUserPassword = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/authn/change-pwd' },
	async ({ password, prevPassword }: ChangeUserPasswordRequest) => {
		const userId = Number(getAuthData()!.userID)
		await authController.changePassword({ password, prevPassword, userId })

		return {}
	}
)
