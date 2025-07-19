import { Client } from '@libsql/client';
import { inArray } from 'drizzle-orm';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import log from 'encore.dev/log';
import orm from '../database.js';
import { Class, classes, ClassParam } from '../schema/classes.js';
import { handleDatabaseErr } from '../utils/index.js';
import { Repository } from './index.js';

class SqliteRepo implements Repository {
        constructor(
                private db: LibSQLDatabase<Record<string, never>> & {
                        $client: Client;
                }
        ) {}

        create(params: ClassParam[]): Promise<Class[]> {
                log.info('ClassSqliteRepo.create params: ', { params });
                return this.db
                        .insert(classes)
                        .values(params)
                        .returning()
                        .catch(handleDatabaseErr);
        }

        delete(c: Class[]): Promise<Class[]> {
                const ids = c.map((cl) => cl.id);
                return this.db
                        .delete(classes)
                        .where(inArray(classes.id, ids))
                        .returning()
                        .catch(handleDatabaseErr);
        }

        find(): Promise<Class[]> {
                return this.db.select().from(classes).catch(handleDatabaseErr);
        }

        findOne(c: Class): Promise<Class> {
                // return this.db.select().from(classes).where()
                throw new Error('Method not implemented.');
        }

        update(params: Class[]): Promise<Class[]> {
                throw new Error('Method not implemented.');
        }
}

const sqliteRepo = new SqliteRepo(orm);

export default sqliteRepo;
