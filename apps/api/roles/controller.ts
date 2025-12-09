import { Repository } from '.'
import { CreateRoleRequest, UpdateRoleRequest, Role } from '../schema'
import { AppError } from '../errors'
import roleRepo from './repo'
import log from 'encore.dev/log'

class Controller {
	constructor(private readonly repo: Repository) {}

	async create(params: CreateRoleRequest): Promise<Role> {
		log.trace('RoleController.create params', { params })
		return this.repo
			.create(params)
			.catch(AppError.handleAppErr) as Promise<Role>
	}

	find(): Promise<Role[]> {
		log.trace('RoleController.find')
		return this.repo.find().catch(AppError.handleAppErr)
	}

	findOne(id: number): Promise<Role | undefined> {
		log.trace('RoleController.findOne params', { id })
		return this.repo.findOne(id).catch(AppError.handleAppErr)
	}

	async update(params: UpdateRoleRequest): Promise<Role> {
		log.trace('RoleController.update params', { params })

		// Validate role exists
		const existing = await this.repo.findOne(params.id)
		if (!existing) {
			throw AppError.notFound(`Role with id ${params.id} not found`)
		}

		return this.repo
			.update(params)
			.catch(AppError.handleAppErr) as Promise<Role>
	}

	async delete(ids: number[]): Promise<void> {
		log.trace('RoleController.delete params', { ids })

		if (!ids || ids.length === 0) {
			throw AppError.invalidArgument('No role IDs provided')
		}

		await this.repo.delete(ids).catch(AppError.handleAppErr)
	}
}

const roleController = new Controller(roleRepo)

export default roleController
