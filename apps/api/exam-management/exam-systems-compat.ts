import type { Client } from '@libsql/client'

export interface ExamSystemInsert {
	code: string
	name: string
	letter: string
	description: string | null
}

export interface InsertedExamSystem extends ExamSystemInsert {
	id: number
	createdAt: string
	updatedAt: string
}

/**
 * Migration 0033 created exam_systems.training_type_id as NOT NULL. Newer
 * deployments removed that relationship, but some persistent production
 * databases can legitimately miss the rebuilding migration.
 *
 * Return null for the current schema so callers can use the normal Drizzle
 * insert. For the legacy schema, supply a private compatibility training type
 * and include its id in the insert. This repairs writes without rebuilding a
 * referenced production table or deleting any catalog data.
 */
export async function insertLegacyExamSystem(
	client: Client,
	input: ExamSystemInsert
): Promise<InsertedExamSystem | null> {
	const tableInfo = await client.execute('PRAGMA table_info(exam_systems)')
	const hasLegacyColumn = tableInfo.rows.some(
		(column) => String(column.name) === 'training_type_id'
	)
	if (!hasLegacyColumn) return null

	await client.execute({
		sql: `INSERT OR IGNORE INTO exam_training_types
			(code, name, description)
			VALUES (?, ?, ?)`,
		args: [
			'__SYSTEM_COMPAT__',
			'Loại đào tạo tương thích',
			'Tự động tạo để hỗ trợ schema exam_systems cũ'
		]
	})
	const trainingType = await client.execute({
		sql: 'SELECT id FROM exam_training_types WHERE code = ? LIMIT 1',
		args: ['__SYSTEM_COMPAT__']
	})
	const trainingTypeId = Number(trainingType.rows[0]?.id)
	if (!Number.isInteger(trainingTypeId) || trainingTypeId <= 0) {
		throw new Error('Cannot prepare legacy exam_systems compatibility row')
	}

	const inserted = await client.execute({
		sql: `INSERT INTO exam_systems
			(code, name, letter, training_type_id, description)
			VALUES (?, ?, ?, ?, ?)
			RETURNING id, createdAt, updatedAt, code, name, letter, description`,
		args: [
			input.code,
			input.name,
			input.letter,
			trainingTypeId,
			input.description
		]
	})
	const row = inserted.rows[0]
	if (!row) throw new Error('Legacy exam_systems insert returned no row')

	return {
		id: Number(row.id),
		createdAt: String(row.createdAt),
		updatedAt: String(row.updatedAt),
		code: String(row.code),
		name: String(row.name),
		letter: String(row.letter),
		description:
			row.description === null || row.description === undefined
				? null
				: String(row.description)
	}
}
