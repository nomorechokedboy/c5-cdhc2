import { Student, StudentParam } from '../schema/student.js';

export interface Repository {
        create(params: StudentParam[]): Promise<Student[]>;
        delete(students: Student[]): Promise<Student[]>;
        find(): Promise<Student[]>;
        findOne(c: Student): Promise<Student>;
        update(params: Student[]): Promise<Student[]>;
}
