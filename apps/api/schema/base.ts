import { sql } from 'drizzle-orm';
import * as sqlite from 'drizzle-orm/sqlite-core';

export const baseSchema = {
        id: sqlite.int().primaryKey({ autoIncrement: true }),
        createdAt: sqlite.text().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: sqlite
                .text()
                .default(sql`CURRENT_TIMESTAMP`)
                .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
};
