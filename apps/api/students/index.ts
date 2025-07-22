import { Student, StudentDB, StudentParam } from '../schema/student.js';

export interface Repository {
        create(params: StudentParam[]): Promise<StudentDB[]>;
        delete(students: StudentDB[]): Promise<StudentDB[]>;
        find(): Promise<Student[]>;
        findOne(c: StudentDB): Promise<Student>;
        update(params: StudentDB[]): Promise<StudentDB[]>;
}
