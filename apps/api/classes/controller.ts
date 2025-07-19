import { AppError } from '../errors/index.js';
import { Class, ClassParam } from '../schema/classes.js';
import { Repository } from './index.js';
import sqliteRepo from './repo.js';

export class Controller {
        constructor(private repo: Repository) {}

        async create(classParam: ClassParam[]): Promise<Class[]> {
                const createdClass = await this.repo
                        .create(classParam)
                        .catch(AppError.handleAppErr);

                return createdClass;
        }

        async find(): Promise<Class[]> {
                const resp = await this.repo
                        .find()
                        .catch(AppError.handleAppErr);
                return resp;
        }
}

const classController = new Controller(sqliteRepo);

export default classController;
