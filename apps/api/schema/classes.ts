import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import * as sqlite from 'drizzle-orm/sqlite-core';

export const classes = sqlite.sqliteTable('classes', {
        id: sqlite.int().primaryKey({ autoIncrement: true }),
        name: sqlite.text().unique().notNull(),
        description: sqlite.text().default(''),
});

export type ClassDB = InferSelectModel<typeof classes>;

export type Class = ClassDB & { studentCount: number };

export type ClassParam = InferInsertModel<typeof classes>;
