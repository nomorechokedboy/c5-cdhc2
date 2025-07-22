import { Client } from '@libsql/client';
import { inArray, eq } from 'drizzle-orm';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import log from 'encore.dev/log';
import orm from '../database.js';
import { classes } from '../schema/classes.js';
import {
        Student,
        StudentDB,
        StudentParam,
        students,
} from '../schema/student.js';
import { handleDatabaseErr } from '../utils/index.js';
import { Repository } from './index.js';

class StudentSqliteRepo implements Repository {
        constructor(
                private db: LibSQLDatabase<Record<string, never>> & {
                        $client: Client;
                }
        ) {}

        create(params: StudentParam[]): Promise<StudentDB[]> {
                log.info('StudentSqliteRepo.create params: ', { params });
                return this.db
                        .insert(students)
                        .values(params)
                        .returning()
                        .catch(handleDatabaseErr);
        }

        delete(s: StudentDB[]): Promise<StudentDB[]> {
                const ids = s.map((student) => student.id);
                return this.db
                        .delete(students)
                        .where(inArray(students.id, ids))
                        .returning()
                        .catch(handleDatabaseErr);
        }

        find(): Promise<Student[]> {
                return this.db
                        .select()
                        .from(students)
                        .leftJoin(classes, eq(classes.id, students.id))
                        .then((resp) =>
                                resp.map(
                                        ({
                                                classes,
                                                students: {
                                                        classId,
                                                        ...students
                                                },
                                        }) =>
                                                ({
                                                        ...students,
                                                        className: classes?.name,
                                                }) as Student
                                )
                        )
                        .catch(handleDatabaseErr);
        }

        findOne(s: StudentDB): Promise<Student> {
                throw new Error('Method not implemented');
        }

        update(params: StudentDB[]): Promise<StudentDB[]> {
                throw new Error('Method not implemented');
        }
}

const studentRepo = new StudentSqliteRepo(orm);

export default studentRepo;
