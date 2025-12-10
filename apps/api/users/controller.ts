import log from 'encore.dev/log'
import { Repository } from '.'
import {
	CreateUserRequest,
	InitAdminRequest,
	InitAdminResponse,
	UpdateUserRequest,
	User,
	UserDB
} from '../schema'
import argon2 from 'argon2'
import { appConfig } from '../configs'
import { AppError } from '../errors'
import userRepo from './repo'
import userRolesRepo from '../user-roles/repo'

class controller {
	constructor(private readonly repo: Repository) {}

	async create(params: CreateUserRequest) {
		log.trace('userController.create params', { params })

		try {
			const hashPassword = await argon2.hash(params.password, {
				secret: Buffer.from(appConfig.HASH_SECRET)
			})
			params.password = hashPassword
		} catch (err) {
			log.error('UserController.create error', { err })
			throw AppError.handleAppErr(AppError.internal('Internal error'))
		}

		// Extract roleIds before creating user
		const { roleIds, ...userParams } = params

		// Create user
		const user = await this.repo
			.create(userParams)
			.catch(AppError.handleAppErr)

		// Assign roles if provided
		if (roleIds && roleIds.length > 0) {
			await userRolesRepo
				.assignRolesToUser({
					userId: user.id,
					roleIds
				})
				.catch(AppError.handleAppErr)
		}

		return user
	}

	find(): Promise<Omit<User[], 'password'>> {
		return this.repo
			.find()
			.then((resp) => resp.map(({ password: _, ...user }) => user))
			.catch(AppError.handleAppErr)
	}

	findOne(params: UserDB): Promise<Omit<User, 'password'>> {
		log.trace('UserController.findOne params', { params })
		return this.repo
			.findOne(params)
			.then(({ password: _, ...user }) => user)
			.catch(AppError.handleAppErr)
	}

	async update(params: UpdateUserRequest): Promise<UserDB> {
		log.trace('UserController.update params', { params })

		// Hash password if provided (for password change)
		if (params.password) {
			try {
				const hashPassword = await argon2.hash(params.password, {
					secret: Buffer.from(appConfig.HASH_SECRET)
				})
				params.password = hashPassword
			} catch (err) {
				log.error('UserController.update password hash error', { err })
				throw AppError.handleAppErr(AppError.internal('Internal error'))
			}
		}

		return this.repo.update(params).catch(AppError.handleAppErr)
	}

	async delete(ids: number[]) {
		log.trace('UserController.delete params', { ids })
		const users = await this.repo
			.findByIds(ids)
			.catch(AppError.handleAppErr)
		if (users.length !== ids.length) {
			AppError.handleAppErr(AppError.invalidArgument('Invalid user ids'))
		}

		return this.repo.delete(ids).catch(AppError.handleAppErr)
	}

	async isInitAdmin(): Promise<boolean> {
		log.trace('UserController.isInitAdmin processing')
		const admins = await this.repo
			.find({ isAdmin: true })
			.catch(AppError.handleAppErr)
		if (admins.length !== 0) {
			return true
		}

		return false
	}

	async initAdmin(req: InitAdminRequest): Promise<InitAdminResponse> {
		log.trace('UserController.initAdmin request', { req })
		const isInitAdmin = await this.isInitAdmin().catch(
			AppError.handleAppErr
		)
		if (isInitAdmin) {
			AppError.handleAppErr(
				AppError.unavailable('Admin user is already init')
			)
		}

		await userController
			.create({
				password: req.password,
				displayName: req.displayName,
				username: req.username,
				isSuperUser: true,
				unitId: null
			})
			.catch(AppError.handleAppErr)

		return {}
	}
}

const userController = new controller(userRepo)

export default userController
