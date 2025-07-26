import { AppError } from '../errors/index.js';
import {
        StudentDB,
        StudentParam,
        StudentQuery,
        Student,
} from '../schema/student.js';
import { Repository } from './index.js';
import studentRepo from './repo.js';

export class Controller {
        constructor(private repo: Repository) {}

        async create(params: StudentParam[]): Promise<StudentDB[]> {
                const createdStudent = await this.repo
                        .create(params)
                        .catch(AppError.handleAppErr);

                return createdStudent;
        }

        async delete(students: StudentDB[]) {
                return await this.repo
                        .delete(students)
                        .catch(AppError.handleAppErr);
        }

        async find(q: StudentQuery): Promise<Student[]> {
                const resp = await await this.repo
                        .find(q)
                        .catch(AppError.handleAppErr);

                return resp;
        }
}

const studentController = new Controller(studentRepo);

export default studentController;
