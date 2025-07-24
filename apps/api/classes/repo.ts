import { count, eq, getTableColumns, inArray } from 'drizzle-orm';
import log from 'encore.dev/log';
import orm, { DrizzleDatabase } from '../database.js';
import { Class, ClassDB, classes, ClassParam } from '../schema/classes.js';
import { students } from '../schema/student.js';
import { handleDatabaseErr } from '../utils/index.js';
import { Repository } from './index.js';

class SqliteRepo implements Repository {
        constructor(private db: DrizzleDatabase) {}

        create(params: ClassParam[]): Promise<ClassDB[]> {
                log.info('ClassSqliteRepo.create params: ', { params });
                return this.db
                        .insert(classes)
                        .values(params)
                        .returning()
                        .catch(handleDatabaseErr);
        }

        delete(c: ClassDB[]): Promise<ClassDB[]> {
                const ids = c.map((cl) => cl.id);
                return this.db
                        .delete(classes)
                        .where(inArray(classes.id, ids))
                        .returning()
                        .catch(handleDatabaseErr);
        }

        find(): Promise<Class[]> {
                return this.db
                        .select({
                                ...getTableColumns(classes),
                                studentCount: count(students.classId),
                        })
                        .from(classes)
                        .leftJoin(students, eq(classes.id, students.classId))
                        .groupBy(classes.id)
                        .all()
                        .catch(handleDatabaseErr);
        }

        findOne(c: ClassDB): Promise<Class> {
                // return this.db.select().from(classes).where()
                throw new Error('Method not implemented.');
        }

        update(params: ClassDB[]): Promise<ClassDB[]> {
                throw new Error('Method not implemented.');
        }
}

const sqliteRepo = new SqliteRepo(orm);

export default sqliteRepo;
