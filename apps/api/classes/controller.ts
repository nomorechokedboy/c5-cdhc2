import { AppError } from '../errors/index'
import { ClassDB, ClassParam } from '../schema/classes'
import { Repository } from './index'
import sqliteRepo from './repo'

export class Controller {
	constructor(private repo: Repository) {}

	async create(classParam: ClassParam[]): Promise<ClassDB[]> {
		const createdClass = await this.repo
			.create(classParam)
			.catch(AppError.handleAppErr)

		return createdClass
	}

	async find(): Promise<ClassDB[]> {
		const resp = await this.repo.find().catch(AppError.handleAppErr)
		return resp
	}
}

const classController = new Controller(sqliteRepo)

export default classController
