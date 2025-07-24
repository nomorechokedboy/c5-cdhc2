import { Client } from '@libsql/client';
import { inArray, eq, sql, and } from 'drizzle-orm';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import log from 'encore.dev/log';
import orm from '../database.js';
import { AppError } from '../errors/index.js';
import { classes } from '../schema/classes.js';
import {
        Month,
        Student,
        StudentDB,
        StudentParam,
        StudentQuery,
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

        private birthdayThisMonth(month?: Month) {
                const now = "strftime('%m', 'now')";
                return sql`strftime('%m', ${students.dob}) = ${month ?? now}`;
        }

        private birthdayThisWeek() {
                return and(
                        sql`strftime('%W', ${students.dob}) = strftime('%W', 'now')`,
                        this.birthdayThisMonth()
                );
        }

        find(q: StudentQuery): Promise<Student[]> {
                const baseQuery = this.db
                        .select()
                        .from(students)
                        .leftJoin(classes, eq(classes.id, students.classId));

                const whereConds = [];
                const isClassIdExist = q.classId !== undefined;
                if (isClassIdExist) {
                        whereConds.push(eq(students.classId, q.classId!));
                }

                const isPolicicalOrgExist = q.politicalOrg !== undefined;
                if (isPolicicalOrgExist) {
                        whereConds.push(
                                eq(students.politicalOrg, q.politicalOrg!)
                        );
                }

                const isBirthdayInMonthExist = q.birthdayInMonth !== undefined;
                const isBirthdayInWeekExist = q.birthdayInWeek !== undefined;
                if (isBirthdayInMonthExist && isBirthdayInWeekExist) {
                        throw AppError.invalidArgument(
                                "birthdayInMonth and birthdayInWeek can't be sent together"
                        );
                }

                if (isBirthdayInMonthExist) {
                        whereConds.push(
                                this.birthdayThisMonth(q.birthdayInMonth)
                        );
                }

                if (isBirthdayInWeekExist) {
                        whereConds.push(this.birthdayThisWeek());
                }

                const isWhereCondEmpty = whereConds.length === 0;
                if (!isWhereCondEmpty) {
                        baseQuery.where(and(...whereConds));
                }

                return baseQuery
                        .all()
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
                                                        class: {
                                                                description:
                                                                        classes?.description,
                                                                id: classes?.id,
                                                                name: classes?.name,
                                                        },
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
