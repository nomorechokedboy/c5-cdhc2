import { Client } from '@libsql/client';
import { inArray } from 'drizzle-orm';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import log from 'encore.dev/log';
import orm from '../database.js';
import { Student, StudentParam, students } from '../schema/student.js';
import { handleDatabaseErr } from '../utils/index.js';
import { Repository } from './index.js';

class StudentSqliteRepo implements Repository {
        constructor(
                private db: LibSQLDatabase<Record<string, never>> & {
                        $client: Client;
                }
        ) {}

        create(params: StudentParam[]): Promise<Student[]> {
                log.info('StudentSqliteRepo.create params: ', { params });
                return this.db
                        .insert(students)
                        .values(params)
                        .returning()
                        .catch(handleDatabaseErr);
        }

        delete(s: Student[]): Promise<Student[]> {
                const ids = s.map((student) => student.id);
                return this.db
                        .delete(students)
                        .where(inArray(students.id, ids))
                        .returning()
                        .catch(handleDatabaseErr);
        }

        find(): Promise<Student[]> {
                return this.db.select().from(students).catch(handleDatabaseErr);
        }

        findOne(s: Student): Promise<Student> {
                throw new Error('Method not implemented');
        }

        update(params: Student[]): Promise<Student[]> {
                throw new Error('Method not implemented');
        }
}

const studentRepo = new StudentSqliteRepo(orm);

export default studentRepo;
