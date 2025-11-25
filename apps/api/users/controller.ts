import log from 'encore.dev/log'
import { Repository } from '.'
import { CreateUserRequest, UpdateUserRequest, User, UserDB } from '../schema'
import argon2 from 'argon2'
import { appConfig } from '../configs'
import { AppError } from '../errors'
import userRepo from './repo'

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

		return this.repo.create(params).catch(AppError.handleAppErr)
	}
	find(): Promise<User[]> {
		return this.repo.find()
	}

	findOne(params: UserDB): Promise<Omit<User, 'password'>> {
		log.trace('UserController.findOne params', { params })
		return this.repo
			.findOne(params)
			.then(({ password, ...user }) => user)
			.catch(AppError.handleAppErr)
	}

	update(params: UpdateUserRequest): Promise<UserDB> {
		log.trace('UserController.update params', { params })
		return this.repo.update(params).catch(AppError.handleAppErr)
	}

	async delete(ids: number[], validUnitIds: number[]) {
		const users = await this.repo.findByIds(ids)
		const checkUnitIds = users.every((user) =>
			validUnitIds.includes(user.unitId!)
		)
		if (checkUnitIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission Delete student"
				)
			)
		}
		return this.repo.delete(ids).catch(AppError.handleAppErr)
	}
}

const userController = new controller(userRepo)

export default userController
