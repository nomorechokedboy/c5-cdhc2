import userRepo from '../users/repo'
import { Repository as UserRepository } from '../users'
import log from 'encore.dev/log'
import { UserDB } from '../schema'
import { AppError } from '../errors'
import argon2 from 'argon2'
import { appConfig } from '../configs'
import jwt from 'jsonwebtoken'
import authzController from '../authz/controller'

type LoginRequest = {
	username: string
	password: string
}

type TokenPayload = {
	userId: number
	permissions: string[]
	type: 'access' | 'refresh'
	iat?: number
	exp?: number
}

type TokenResponse = {
	accessToken: string
	refreshToken: string
}

class controller {
	constructor(private readonly userRepo: UserRepository) {}

	async genTokens(
		user: UserDB
	): Promise<{ accessToken: string; refreshToken: string }> {
		try {
			// Get user permissions from RBAC system
			const permissions = await authzController.getUserPermissions(
				user.id
			)

			const accessPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
				userId: user.id,
				permissions,
				type: 'access'
			}

			const refreshPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
				userId: user.id,
				permissions: [], // Refresh tokens don't need permissions
				type: 'refresh'
			}

			// Generate Access Token (short-lived: 30 minutes)
			const accessToken = jwt.sign(
				accessPayload,
				appConfig.JWT_PRIVATE_KEY,
				{
					expiresIn: '30m',
					issuer: 'cdhc2-student-management-api',
					audience: ['cdhc2-student-management-web']
				}
			)

			// Generate Refresh Token (long-lived: 7 days)
			const refreshToken = jwt.sign(
				refreshPayload,
				appConfig.JWT_PRIVATE_KEY,
				{
					expiresIn: '7d',
					issuer: 'cdhc2-student-management-api',
					audience: ['cdhc2-student-management-web']
				}
			)

			return { accessToken, refreshToken }
		} catch (error) {
			log.error('Error generating tokens', { error, userId: user.id })
			throw AppError.internal('Failed to generate tokens')
		}
	}

	verifyToken(token: string): TokenPayload {
		try {
			return jwt.verify(token, appConfig.JWT_PRIVATE_KEY, {
				issuer: 'cdhc2-student-management-api',
				audience: ['cdhc2-student-management-web']
			}) as TokenPayload
		} catch (err) {
			if (err instanceof jwt.JsonWebTokenError) {
				throw AppError.unauthenticated('Invalid token')
			}
			if (err instanceof jwt.TokenExpiredError) {
				throw AppError.unauthenticated('Token expired')
			}
			throw AppError.internal('Token verification failed')
		}
	}

	async login(req: LoginRequest): Promise<TokenResponse> {
		log.trace('AuthController.login request', { req })
		const { username, password } = req

		const user = await this.userRepo
			.findOne({ username } as UserDB)
			.catch(AppError.handleAppErr)

		try {
			const isPasswordMatch = argon2.verify(password, user.password, {
				secret: Buffer.from(appConfig.HASH_SECRET)
			})
			if (!isPasswordMatch) {
				throw AppError.invalidArgument(
					'username or password is incorrect'
				)
			}

			const tokens = await this.genTokens(user)
			log.info('User logged in successfully', {
				userId: user.id,
				username: user.username
			})

			return { ...tokens }
		} catch (err) {
			log.error('AuthController.login error', { err })
			AppError.handleAppErr(err)
		}
	}
}

const authController = new controller(userRepo)

export default authController
