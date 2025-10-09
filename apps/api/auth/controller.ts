import userRepo from '../users/repo'
import { Repository as UserRepository } from '../users'
import { Repository as UnitRespository } from '../units'
import log from 'encore.dev/log'
import { UserDB } from '../schema'
import { AppError } from '../errors'
import argon2 from 'argon2'
import { appConfig } from '../configs'
import jwt from 'jsonwebtoken'
import authzController from '../authz/controller'
import type { StringValue } from 'ms'
import unitRepo from '../units/repo'

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
	validUnitIds?: number[]

	validClassIds: number[]
}

type TokenResponse = {
	accessToken: string
	refreshToken: string
}

type RefreshTokenRequest = {
	token: string
}

type ChangePasswordRequest = {
	userId: number
	prevPassword: string
	password: string
}

class controller {
	constructor(
		private readonly userRepo: UserRepository,
		private readonly unitRepo: UnitRespository,
		private readonly repo = userRepo
	) {}

	async getValidIds(unitId: number) {
		const unit = await this.unitRepo.getOne({ id: unitId })
		if (unit === null || unit === undefined) {
			AppError.handleAppErr(
				AppError.invalidArgument("User don'have unit")
			)
		}
		let classIds: number[] = []
		let unitIds: number[] = []
		if (unit?.level === 'battalion') {
			classIds = unit.children
				.map((c) => c.classes.map((cl) => cl.id))
				.flat()
			unitIds = unit.children.map((c) => c.id).flat()
		} else if (unit?.level === 'company') {
			classIds = unit.classes.map((cl) => cl.id)
		}
		unitIds.push(unitId)

		return { validClassIds: classIds, validUnitIds: unitIds }
	}


	async genTokens(user: UserDB): Promise<TokenResponse> {
		try {
			// Get user permissions from RBAC system
			const permissions = await authzController.getUserPermissions(
				user.id
			)
			// const classIds  = await this.getUserClassIds(user.id)
			const unit = await this.unitRepo.getOne({ id: user.unitId })
			if (unit === null || unit === undefined) {
				AppError.handleAppErr(
					AppError.invalidArgument("User don'have unit")
				)
			}
			let classIds: number[] = []
			let unitIds: number[] = []
			if (unit?.level === 'battalion') {
				classIds = unit.children
					.map((c) => c.classes.map((cl) => cl.id))
					.flat()
				unitIds = unit.children.map((c) => c.id).flat()
			} else if (unit?.level === 'company') {
				classIds = unit.classes.map((cl) => cl.id)
			}
			unitIds.push(user.unitId)

			let classIds: number[] = [],
				unitIds: number[] = []
			if (user.unitId !== null) {
				const validIds = await this.getValidIds(user.unitId)
				classIds = validIds.validClassIds
				unitIds = validIds.validUnitIds
			}

			const accessPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
				userId: user.id,
				permissions,
				type: 'access',
				validClassIds: classIds || [],
				validUnitIds: unitIds || []
			}

			const refreshPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
				userId: user.id,
				permissions: [], // Refresh tokens don’t need permissions
				type: 'refresh',
				validClassIds: [],
				validUnitIds: []
			}

			// Use genToken for both
			const accessToken = await this.genToken(
				accessPayload,
				appConfig.JWT_PRIVATE_KEY,
				{
					expiresIn: '30m'
				}
			)

			const refreshToken = await this.genToken(
				refreshPayload,
				appConfig.JWT_PRIVATE_KEY,
				{
					expiresIn: '7d'
				}
			)

			return { accessToken, refreshToken }
		} catch (error) {
			log.error('AuthController.genTokens Error generating tokens', {
				error,
				userId: user.id
			})
			throw AppError.internal('Failed to generate tokens')
		}
	}

	async genToken(
		payload: Omit<TokenPayload, 'iat' | 'exp'>,
		secret: string,
		{ expiresIn }: { expiresIn?: number | StringValue }
	): Promise<string> {
		try {
			// Generate Access Token (short-lived: 30 minutes)
			const token = jwt.sign(payload, secret, {
				issuer: 'cdhc2-student-management-api',
				audience: ['cdhc2-student-management-web'],
				expiresIn
			})

			return token
		} catch (error) {
			console.error('Test', error)

			log.error('AuthController.genToken error generating tokens', {
				error,
				userId: payload.userId
			})
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

	verifyPwd(hashStr: string, pwd: string): Promise<boolean> {
		return argon2.verify(hashStr, pwd, {
			secret: Buffer.from(appConfig.HASH_SECRET)
		})
	}

	async login(req: LoginRequest): Promise<TokenResponse> {
		log.trace('AuthController.login request', { req })
		const { username, password } = req

		const user = await this.userRepo
			.findOne({ username } as UserDB)
			.catch(AppError.handleAppErr)

		try {
			const isPasswordMatch = await this.verifyPwd(
				user.password,
				password
			)
			if (isPasswordMatch === false) {
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

	async refreshToken(req: RefreshTokenRequest): Promise<TokenResponse> {
		try {
			const { userId } = this.verifyToken(req.token)

			const permissions = await authzController.getUserPermissions(userId)

			const accessToken = await this.genToken(
				{
					userId,
					permissions,
					type: 'access',
					validUnitId: 0
				},
				appConfig.JWT_PRIVATE_KEY,
				{ expiresIn: '30m' }
			)

			return { accessToken, refreshToken: req.token }
		} catch (err) {
			log.error('AuthController.refreshToken err', { err })
			AppError.handleAppErr(err)
		}
	}

	async changePassword(params: ChangePasswordRequest) {
		log.trace('AuthController.changePassword params', { params })

		try {
			const user = await this.userRepo.findOne({
				id: params.userId
			} as UserDB)
			const isOldPwdMatchPwd = await this.verifyPwd(
				user.password,
				params.prevPassword
			)
			if (isOldPwdMatchPwd === false) {
				throw AppError.invalidArgument('Incorrect password')
			}

			const hashPwd = await argon2.hash(params.password, {
				secret: Buffer.from(appConfig.HASH_SECRET)
			})

			await this.userRepo.update({ id: user.id, password: hashPwd })
		} catch (err) {
			log.error('AuthController.changePassword error', { err })
			AppError.handleAppErr(err)
		}
	}
}

const authController = new controller(userRepo, unitRepo)

export default authController
