import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import * as sqlite from 'drizzle-orm/sqlite-core';

export const classes = sqlite.sqliteTable('classes', {
        id: sqlite.int().primaryKey({ autoIncrement: true }),
        name: sqlite.text().unique().notNull(),
        description: sqlite.text().default(''),
});

export type Class = InferSelectModel<typeof classes>;

export type ClassParam = InferInsertModel<typeof classes>;
