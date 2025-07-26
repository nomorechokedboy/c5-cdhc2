import { AppError } from '../errors/index.js';
import {
        StudentDB,
        StudentParam,
        StudentQuery,
        Student,
        UpdateStudentMap,
} from '../schema/student.js';
import { Repository } from './index.js';
import studentRepo from './repo.js';

export class Controller {
        constructor(private repo: Repository) {}

        create(params: StudentParam[]): Promise<StudentDB[]> {
                return this.repo.create(params).catch(AppError.handleAppErr);
        }

        delete(students: StudentDB[]) {
                return this.repo.delete(students).catch(AppError.handleAppErr);
        }

        find(q: StudentQuery): Promise<Student[]> {
                return this.repo.find(q).catch(AppError.handleAppErr);
        }

        async update(params: StudentDB[]): Promise<StudentDB[]> {
                const ids = params.map((s) => s.id);
                const isIdsEmpty = ids.length === 0;
                const isIdsValid = !ids || isIdsEmpty;
                if (isIdsValid) {
                        throw AppError.invalidArgument(
                                'No record IDs provided'
                        );
                }

                const updateMap: UpdateStudentMap = params.map(
                        ({ id, ...updatePayload }) => {
                                const cleanupPayload = Object.fromEntries(
                                        Object.entries(updatePayload).filter(
                                                ([_, value]) =>
                                                        value !== undefined
                                        )
                                );

                                const isUpdatePayloadEmpty =
                                        Object.keys(cleanupPayload).length ===
                                        0;
                                if (isUpdatePayloadEmpty) {
                                        throw AppError.invalidArgument(
                                                `No update data provided At least one field must be provided to update record with id: ${id}`
                                        );
                                }

                                return { id, updatePayload: cleanupPayload };
                        }
                );

                return this.repo.update(updateMap).catch(AppError.handleAppErr);
        }
}

const studentController = new Controller(studentRepo);

export default studentController;
