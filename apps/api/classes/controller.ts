import { AppError } from '../errors/index'
import { ClassDB, ClassParam } from '../schema/classes'
import { Repository } from './index'
import sqliteRepo from './repo'

class Controller {
	constructor(private readonly repo: Repository) {}

	create(classParam: ClassParam[]): Promise<ClassDB[]> {
		return this.repo.create(classParam).catch(AppError.handleAppErr)
	}

	find(): Promise<ClassDB[]> {
		return this.repo.find({}).catch(AppError.handleAppErr)
	}
}

const classController = new Controller(sqliteRepo)

export default classController
