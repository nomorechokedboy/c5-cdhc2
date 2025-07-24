import { drizzle } from 'drizzle-orm/libsql/node';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { Logger } from 'drizzle-orm';
import log from 'encore.dev/log';

class AppDBLogger implements Logger {
        logQuery(query: string, params: unknown[]): void {
                log.trace(`Query info: ${query}`, { params });
        }
}

const client = createClient({ url: 'file:local.db' });

const orm = drizzle({ schema, client, logger: new AppDBLogger() });

export type DrizzleDatabase = typeof orm;

export default orm;
