import { drizzle } from 'drizzle-orm/libsql/node';
import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:local.db' });

const orm = drizzle(client);

export default orm;
