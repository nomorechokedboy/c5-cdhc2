import { int, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'
import { users } from './users'

/** User được gán ngành danh mục (HC2A, HC2B…) — vào ngành chỉ thấy VT ngành mình */
export const userNganh = sqliteTable(
	'user_nganh',
	{
		...baseSchema,
		userId: int('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		nganhCode: text('nganh_code').notNull()
	},
	(t) => ({
		uq: uniqueIndex('user_nganh_user_nganh_uq').on(t.userId, t.nganhCode)
	})
)

export interface UserNganhDB extends Base {
	userId: number
	nganhCode: string
}
