import { AppError } from '../errors/index.js';
import { Student, StudentParam } from '../schema/student.js';
import { Repository } from './index.js';
import studentRepo from './repo.js';

export class Controller {
        constructor(private repo: Repository) {}

        async create(params: StudentParam[]): Promise<Student[]> {
                const createdStudent = await this.repo
                        .create(params)
                        .catch(AppError.handleAppErr);

                return createdStudent;
        }

        async find(): Promise<Student[]> {
                const resp = await await this.repo
                        .find()
                        .catch(AppError.handleAppErr);

                return resp;
        }
}

const studentController = new Controller(studentRepo);

export default studentController;
