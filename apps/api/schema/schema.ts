import * as p from 'drizzle-orm/sqlite-core';

export const users = p.sqliteTable('users', {
        id: p.int().primaryKey({ autoIncrement: true }),
        name: p.text(),
        email: p.text().unique(),
});
