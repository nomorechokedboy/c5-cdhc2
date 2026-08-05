/**
 * Danh mục đào tạo:
 *   Hệ (Quân sự A / Dân sự B)
 *     → Ngành (cột chương trình: Y sĩ TC/CD/LT, Điều dưỡng…)
 *       → Khoa → Môn
 *
 * Mã số: định danh duy nhất của từng chương trình/ngành (vd A.6720301).
 * Mã ngành: mã danh mục quốc gia, có thể trùng giữa các chương trình trong cùng hệ.
 * Mã môn: {mã_số}_{mã_gốc}
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, eq, inArray, like, or, sql, isNull } from 'drizzle-orm'
import orm from '../database'
import {
	examClasses,
	examFaculties,
	examMajors,
	examSubjects,
	examSystems,
	examTeachingAssignments
} from '../schema/exam-bank'
import {
	assertCohortHasMonthYear,
	canManageCatalogApi,
	getActor,
	getClassCohortStatus,
	getDeptHeadFacultyCodes,
	getDeptHeadMajorIds,
	isBgh,
	isExamOffice,
	isLecturer,
	isScopedDeptHead,
	type ExamClassLifecycleStatus
} from './helpers'

export interface SystemResponse {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	letter: string
	description: string | null
}

export interface MajorResponse {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	systemId: number
	levelCode: string | null
	shortCode: string | null
	catalogNumber: string | null
	nationalMajorCode: string | null
	qualification: string | null
	trainingDuration: string | null
	trainingForm: string | null
	systemCode?: string | null
	systemName?: string | null
	systemLetter?: string | null
	description: string | null
}

export interface FacultyResponse {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	majorId: number | null
	majorCode?: string | null
	majorName?: string | null
	description: string | null
}

export interface ClassCatalogResponse {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	/** Hệ đào tạo (từ ngành) */
	systemId?: number | null
	systemCode?: string | null
	systemName?: string | null
	majorId: number | null
	majorCode?: string | null
	majorName?: string | null
	facultyId: number | null
	facultyCode?: string | null
	facultyName?: string | null
	cohort: string | null
	/**
	 * ACTIVE = còn trong khóa (tháng-năm hiện tại ≤ tháng-năm kết thúc)
	 * EXPIRED = hết niên khóa
	 */
	status: ExamClassLifecycleStatus
	statusLabel: string
	/** Năm kết thúc khóa (từ cohort), null nếu không parse được */
	cohortEndYear: number | null
	/** YYYY-MM kết thúc khóa */
	cohortEndMonth?: string | null
	description: string | null
}

export interface SubjectResponse {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	baseCode: string | null
	name: string
	creditHours: number | null
	lessonHours: number | null
	facultyId: number
	facultyCode?: string | null
	facultyName?: string | null
	majorId: number | null
	majorCode?: string | null
	majorName?: string | null
	/** Hệ đào tạo (QS/DS) — để UI cố định khi GV import */
	systemId?: number | null
	systemCode?: string | null
	systemName?: string | null
	description: string | null
}

function canManageCatalog(actor: Awaited<ReturnType<typeof getActor>>) {
	return canManageCatalogApi(actor)
}

export function buildMajorCode(opts: {
	letter: string
	levelCode?: string | null
	shortCode?: string | null
	majorName: string
	manualCode?: string | null
}): string {
	const manual = (opts.manualCode || '').trim().toUpperCase()
	if (manual) return manual
	const letter = (opts.letter || 'X').trim().toUpperCase()
	const level = (opts.levelCode || '').trim().toUpperCase()
	let short = (opts.shortCode || '').trim().toUpperCase()
	if (!short) {
		short = opts.majorName
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\(.*?\)/g, '')
			.split(/[\s\-_/]+/)
			.filter(Boolean)
			.map((w) => w[0]!.toUpperCase())
			.join('')
	}
	return `${letter}_${level}${short}`
}

export function buildSubjectCode(majorCode: string, baseCode: string): string {
	const base = baseCode.trim().toUpperCase()
	const maj = majorCode.trim().toUpperCase()
	if (base.startsWith(maj + '_')) return base
	return `${maj}_${base}`
}

type LegacySystemRow = {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	letter: string
	description: string | null
	trainingTypeId?: number | null
}

async function hasTrainingTypeColumn(): Promise<boolean> {
	const columns = await orm.all(sql`PRAGMA table_info(exam_systems)`)
	return columns.some((column) => column.name === 'training_type_id')
}

async function listSystems(kw?: string): Promise<LegacySystemRow[]> {
	const hasTrainingType = await hasTrainingTypeColumn()
	const pattern = kw ? `%${kw}%` : null
	const rows = await orm.all(
		sql`SELECT id, createdAt, updatedAt, code, name, letter,
			description${hasTrainingType ? sql`, training_type_id AS trainingTypeId` : sql``}
		FROM exam_systems
		${pattern ? sql`WHERE code LIKE ${pattern} OR name LIKE ${pattern} OR letter LIKE ${pattern}` : sql``}
		ORDER BY letter`
	)
	return rows as LegacySystemRow[]
}

async function getSystem(id: number): Promise<LegacySystemRow | null> {
	const rows = await listSystems()
	return rows.find((row) => row.id === id) ?? null
}

// ── Hệ (chỉ 2: QS/DS) ─────────────────────────────────────────

export const ListExamSystems = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/systems' },
	async (q: { q?: Query<string> }): Promise<{ data: SystemResponse[] }> => {
		await getActor()
		const kw = (q.q || '').trim()
		const rows = await listSystems(kw)
		return {
			data: rows.map((r) => ({
				id: r.id,
				createdAt: r.createdAt,
				updatedAt: r.updatedAt,
				code: r.code,
				name: r.name,
				letter: r.letter,
				description: r.description
			}))
		}
	}
)

export const CreateExamSystem = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/systems' },
	async (body: {
		code: string
		name: string
		letter: string
		trainingTypeId?: number
		description?: string
	}): Promise<{ data: SystemResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền quản lý danh mục')
		}
		if (
			typeof body.code !== 'string' ||
			typeof body.name !== 'string' ||
			typeof body.letter !== 'string' ||
			body.trainingTypeId === null
		) {
			throw APIError.invalidArgument(
				'Mã, tên, letter và loại đào tạo là bắt buộc'
			)
		}
		const code = body.code.trim().toUpperCase()
		const name = body.name.trim()
		const letter = body.letter.trim().toUpperCase()
		// Giữ tương thích với bundle FE cũ còn cache trong lúc rollout.
		// Mọi insert xuống DB vẫn luôn có training_type_id hợp lệ, không gửi null.
		const trainingTypeId = Number(body.trainingTypeId ?? 1)
		if (!code || !name || !letter) {
			throw APIError.invalidArgument('Mã, tên và letter (A/B) bắt buộc')
		}
		if (!Number.isInteger(trainingTypeId) || trainingTypeId <= 0) {
			throw APIError.invalidArgument('Loại đào tạo không hợp lệ')
		}
		const [duplicate] = await orm
			.select({ id: examSystems.id })
			.from(examSystems)
			.where(
				or(eq(examSystems.code, code), eq(examSystems.letter, letter))
			)
			.limit(1)
		if (duplicate) {
			throw APIError.alreadyExists('Mã hoặc letter của hệ đã tồn tại')
		}
		const hasTrainingType = await hasTrainingTypeColumn()
		let row: LegacySystemRow | undefined
		if (hasTrainingType) {
			const [inserted] = await orm
				.insert(examSystems)
				.values({
					code,
					name,
					letter,
					trainingTypeId,
					description: body.description || null
				})
				.returning()
			row = inserted
		} else {
			await orm.run(
				sql`INSERT INTO exam_systems (code, name, letter, description) VALUES (${code}, ${name}, ${letter}, ${body.description || null})`
			)
			row = await listSystems().then((rows) =>
				rows.find((item) => item.code === code)
			)
		}
		return {
			data: {
				id: row!.id,
				createdAt: row!.createdAt,
				updatedAt: row!.updatedAt,
				code: row!.code,
				name: row!.name,
				letter: row!.letter,
				description: row!.description
			}
		}
	}
)

export const UpdateExamSystem = api(
	{ auth: true, expose: true, method: 'PUT', path: '/exam/systems/:id' },
	async (params: {
		id: number
		code?: string
		name?: string
		letter?: string
		trainingTypeId?: number
		description?: string | null
	}): Promise<{ data: SystemResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền sửa hệ đào tạo')
		}
		const existing = await getSystem(params.id)
		if (!existing) throw APIError.notFound('Hệ đào tạo không tồn tại')

		if (
			(params.code !== undefined && typeof params.code !== 'string') ||
			(params.name !== undefined && typeof params.name !== 'string') ||
			(params.letter !== undefined &&
				typeof params.letter !== 'string') ||
			params.trainingTypeId === null
		) {
			throw APIError.invalidArgument(
				'Mã, tên, letter và loại đào tạo không được là null'
			)
		}
		const code =
			typeof params.code === 'string'
				? params.code.trim().toUpperCase()
				: existing.code
		const name =
			typeof params.name === 'string' ? params.name.trim() : existing.name
		const letter =
			typeof params.letter === 'string'
				? params.letter.trim().toUpperCase()
				: existing.letter
		const trainingTypeId =
			params.trainingTypeId !== undefined
				? Number(params.trainingTypeId)
				: Number(existing.trainingTypeId ?? 1)
		if (!code || !name || !letter) {
			throw APIError.invalidArgument('Mã, tên và letter (A/B) bắt buộc')
		}
		if (!Number.isInteger(trainingTypeId) || trainingTypeId <= 0) {
			throw APIError.invalidArgument('Loại đào tạo không hợp lệ')
		}

		const [duplicate] = await orm
			.select({ id: examSystems.id })
			.from(examSystems)
			.where(
				and(
					or(
						eq(examSystems.code, code),
						eq(examSystems.letter, letter)
					),
					sql`${examSystems.id} != ${params.id}`
				)
			)
			.limit(1)
		if (duplicate) {
			throw APIError.alreadyExists('Mã hoặc letter của hệ đã tồn tại')
		}

		const hasTrainingType = await hasTrainingTypeColumn()
		let row: LegacySystemRow | undefined
		if (hasTrainingType) {
			const [updated] = await orm
				.update(examSystems)
				.set({
					code,
					name,
					letter,
					trainingTypeId,
					description:
						params.description !== undefined
							? params.description
							: existing.description
				})
				.where(eq(examSystems.id, params.id))
				.returning()
			row = updated
		} else {
			await orm.run(
				sql`UPDATE exam_systems SET code = ${code}, name = ${name}, letter = ${letter}, description = ${params.description !== undefined ? params.description : existing.description} WHERE id = ${params.id}`
			)
			row = (await getSystem(params.id)) ?? undefined
		}
		return { data: row! }
	}
)

export const DeleteExamSystem = api(
	{ auth: true, expose: true, method: 'DELETE', path: '/exam/systems/:id' },
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền xóa')
		}
		const [m] = await orm
			.select({ c: sql<number>`count(*)` })
			.from(examMajors)
			.where(eq(examMajors.systemId, params.id))
		if (Number(m?.c || 0) > 0) {
			throw APIError.failedPrecondition('Hệ còn ngành — xóa ngành trước')
		}
		await orm.delete(examSystems).where(eq(examSystems.id, params.id))
		return { ok: true }
	}
)

// ── Ngành (thuộc hệ) ──────────────────────────────────────────

async function mapMajor(
	r: typeof examMajors.$inferSelect
): Promise<MajorResponse> {
	const sys = await getSystem(r.systemId)
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		code: r.code,
		name: r.name,
		systemId: r.systemId,
		levelCode: r.levelCode ?? null,
		shortCode: r.shortCode ?? null,
		catalogNumber: r.catalogNumber ?? null,
		nationalMajorCode: r.nationalMajorCode ?? null,
		qualification: r.qualification ?? null,
		trainingDuration: r.trainingDuration ?? null,
		trainingForm: r.trainingForm ?? null,
		systemCode: sys?.code ?? null,
		systemName: sys?.name ?? null,
		systemLetter: sys?.letter ?? null,
		description: r.description
	}
}

export const ListExamMajors = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/majors' },
	async (q: {
		q?: Query<string>
		systemId?: Query<number>
	}): Promise<{ data: MajorResponse[] }> => {
		const actor = await getActor()
		const conditions = []
		if (q.systemId)
			conditions.push(eq(examMajors.systemId, Number(q.systemId)))
		const kw = (q.q || '').trim()
		if (kw) {
			conditions.push(
				or(
					like(examMajors.code, `%${kw}%`),
					like(examMajors.name, `%${kw}%`)
				)!
			)
		}
		const cnkMajors = await getDeptHeadMajorIds(actor)
		if (cnkMajors !== null) {
			if (!cnkMajors.length) return { data: [] }
			conditions.push(inArray(examMajors.id, cnkMajors))
		}
		const where = conditions.length ? and(...conditions) : undefined
		const rows = await orm
			.select()
			.from(examMajors)
			.where(where)
			.orderBy(examMajors.code)
		const data: MajorResponse[] = []
		for (const r of rows) data.push(await mapMajor(r))
		return { data }
	}
)

export const CreateExamMajor = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/majors' },
	async (body: {
		name: string
		systemId: number
		levelCode?: string | null
		shortCode?: string | null
		code?: string | null
		catalogNumber?: string | null
		nationalMajorCode?: string | null
		qualification?: string | null
		trainingDuration?: string | null
		trainingForm?: string | null
		description?: string
	}): Promise<{ data: MajorResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied(
				'Không có quyền quản lý ngành đào tạo'
			)
		}
		const name = body.name.trim()
		const catalogNumber = body.catalogNumber?.trim().toUpperCase() || ''
		if (!name || !body.systemId || !catalogNumber) {
			throw APIError.invalidArgument('Mã số, tên ngành và hệ bắt buộc')
		}
		const sys = await getSystem(body.systemId)
		if (!sys) throw APIError.notFound('Hệ không tồn tại')

		const nationalMajorCode = body.nationalMajorCode?.trim() || null
		const [duplicate] = await orm
			.select({ id: examMajors.id })
			.from(examMajors)
			.where(
				or(
					eq(examMajors.code, catalogNumber),
					eq(examMajors.catalogNumber, catalogNumber)
				)
			)
			.limit(1)
		if (duplicate) {
			throw APIError.alreadyExists(`Mã số ${catalogNumber} đã tồn tại`)
		}
		const code = catalogNumber

		const [row] = await orm
			.insert(examMajors)
			.values({
				code,
				name,
				systemId: body.systemId,
				levelCode: body.levelCode?.trim().toUpperCase() || null,
				shortCode: body.shortCode?.trim().toUpperCase() || null,
				catalogNumber,
				nationalMajorCode,
				qualification: body.qualification?.trim() || null,
				trainingDuration: body.trainingDuration?.trim() || null,
				trainingForm: body.trainingForm?.trim() || null,
				description: body.description || null
			})
			.returning()
		return { data: await mapMajor(row!) }
	}
)

export const UpdateExamMajor = api(
	{ auth: true, expose: true, method: 'PUT', path: '/exam/majors/:id' },
	async (params: {
		id: number
		code?: string
		name?: string
		levelCode?: string | null
		shortCode?: string | null
		catalogNumber?: string | null
		nationalMajorCode?: string | null
		qualification?: string | null
		trainingDuration?: string | null
		trainingForm?: string | null
		systemId?: number
		description?: string | null
	}): Promise<{ data: MajorResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied(
				'Không có quyền quản lý ngành đào tạo'
			)
		}
		const [existing] = await orm
			.select()
			.from(examMajors)
			.where(eq(examMajors.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Ngành không tồn tại')
		const nextNationalMajorCode =
			params.nationalMajorCode !== undefined
				? params.nationalMajorCode?.trim() || null
				: existing.nationalMajorCode
		const nextCatalogNumber =
			params.catalogNumber !== undefined
				? params.catalogNumber?.trim().toUpperCase() || null
				: existing.catalogNumber
		if (!nextCatalogNumber) {
			throw APIError.invalidArgument('Mã số ngành là bắt buộc')
		}
		const nextCode = nextCatalogNumber
		const [duplicate] = await orm
			.select({ id: examMajors.id })
			.from(examMajors)
			.where(
				or(
					eq(examMajors.code, nextCatalogNumber),
					eq(examMajors.catalogNumber, nextCatalogNumber)
				)
			)
			.limit(1)
		if (duplicate && duplicate.id !== params.id) {
			throw APIError.alreadyExists(
				`Mã số ${nextCatalogNumber} đã tồn tại`
			)
		}

		const [row] = await orm
			.update(examMajors)
			.set({
				code: nextCode,
				name: params.name?.trim() || existing.name,
				systemId: params.systemId ?? existing.systemId,
				levelCode:
					params.levelCode !== undefined
						? params.levelCode?.trim().toUpperCase() || null
						: existing.levelCode,
				shortCode:
					params.shortCode !== undefined
						? params.shortCode?.trim().toUpperCase() || null
						: existing.shortCode,
				catalogNumber: nextCatalogNumber,
				nationalMajorCode: nextNationalMajorCode,
				qualification:
					params.qualification !== undefined
						? params.qualification?.trim() || null
						: existing.qualification,
				trainingDuration:
					params.trainingDuration !== undefined
						? params.trainingDuration?.trim() || null
						: existing.trainingDuration,
				trainingForm:
					params.trainingForm !== undefined
						? params.trainingForm?.trim() || null
						: existing.trainingForm,
				description:
					params.description !== undefined
						? params.description
						: existing.description
			})
			.where(eq(examMajors.id, params.id))
			.returning()
		if (existing.code !== nextCode) {
			const linkedSubjects = await orm
				.select({
					id: examSubjects.id,
					code: examSubjects.code,
					baseCode: examSubjects.baseCode
				})
				.from(examSubjects)
				.where(eq(examSubjects.majorId, params.id))
			for (const subject of linkedSubjects) {
				const baseCode =
					subject.baseCode?.trim() ||
					subject.code.slice(existing.code.length + 1)
				await orm
					.update(examSubjects)
					.set({ code: buildSubjectCode(nextCode, baseCode) })
					.where(eq(examSubjects.id, subject.id))
			}
		}
		return { data: await mapMajor(row!) }
	}
)

export const DeleteExamMajor = api(
	{ auth: true, expose: true, method: 'DELETE', path: '/exam/majors/:id' },
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền xóa ngành')
		}
		const [fac] = await orm
			.select({ c: sql<number>`count(*)` })
			.from(examFaculties)
			.where(eq(examFaculties.majorId, params.id))
		if (Number(fac?.c || 0) > 0) {
			throw APIError.failedPrecondition('Ngành còn khoa — xóa khoa trước')
		}
		const [subj] = await orm
			.select({ c: sql<number>`count(*)` })
			.from(examSubjects)
			.where(eq(examSubjects.majorId, params.id))
		if (Number(subj?.c || 0) > 0) {
			throw APIError.failedPrecondition('Ngành còn môn — xóa môn trước')
		}
		await orm.delete(examMajors).where(eq(examMajors.id, params.id))
		return { ok: true }
	}
)

// ── Khoa ──────────────────────────────────────────────────────

async function mapFaculty(
	r: typeof examFaculties.$inferSelect
): Promise<FacultyResponse> {
	const [m] = await orm
		.select()
		.from(examMajors)
		.where(eq(examMajors.id, r.majorId))
		.limit(1)
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		code: r.code,
		name: r.name,
		majorId: r.majorId ?? null,
		majorCode: m?.code ?? null,
		majorName: m?.name ?? null,
		description: r.description
	}
}

export const ListExamFaculties = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/faculties' },
	async (q: {
		q?: Query<string>
		majorId?: Query<number>
	}): Promise<{ data: FacultyResponse[] }> => {
		const actor = await getActor()
		const conditions = []
		if (q.majorId)
			conditions.push(eq(examFaculties.majorId, Number(q.majorId)))
		const kw = (q.q || '').trim()
		if (kw) {
			conditions.push(
				or(
					like(examFaculties.code, `%${kw}%`),
					like(examFaculties.name, `%${kw}%`)
				)!
			)
		}
		// CNK: chỉ khoa phụ trách (K1…K8), không lộ toàn bộ khoa trong ngành
		if (isScopedDeptHead(actor)) {
			const facCodes = await getDeptHeadFacultyCodes(actor)
			if (facCodes && facCodes.length) {
				const codes = facCodes.map((c) => c.toUpperCase())
				conditions.push(
					sql`upper(${examFaculties.code}) in (${sql.join(
						codes.map((c) => sql`${c}`),
						sql`, `
					)})`
				)
			} else {
				const cnkMajors = await getDeptHeadMajorIds(actor)
				if (cnkMajors !== null) {
					if (!cnkMajors.length) return { data: [] }
					conditions.push(inArray(examFaculties.majorId, cnkMajors))
				}
			}
		}
		const where = conditions.length ? and(...conditions) : undefined
		const rows = await orm
			.select()
			.from(examFaculties)
			.where(where)
			.orderBy(examFaculties.code)
		const data: FacultyResponse[] = []
		for (const r of rows) data.push(await mapFaculty(r))
		return { data }
	}
)

export const CreateExamFaculty = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/faculties' },
	async (body: {
		code: string
		name: string
		majorId?: number | null
		description?: string
	}): Promise<{ data: FacultyResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền quản lý khoa')
		}
		const code = body.code.trim().toUpperCase()
		const name = body.name.trim()
		if (!code || !name)
			throw APIError.invalidArgument('Mã và tên khoa bắt buộc')
		const [row] = await orm
			.insert(examFaculties)
			.values({
				code,
				name,
				majorId: body.majorId ?? null,
				description: body.description || null
			})
			.returning()
		return { data: await mapFaculty(row!) }
	}
)

export const UpdateExamFaculty = api(
	{ auth: true, expose: true, method: 'PUT', path: '/exam/faculties/:id' },
	async (params: {
		id: number
		code?: string
		name?: string
		majorId?: number
		description?: string | null
	}): Promise<{ data: FacultyResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền sửa khoa')
		}
		const [existing] = await orm
			.select()
			.from(examFaculties)
			.where(eq(examFaculties.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Khoa không tồn tại')

		let majorId = existing.majorId
		if (params.majorId != null) {
			const [m] = await orm
				.select({ id: examMajors.id })
				.from(examMajors)
				.where(eq(examMajors.id, params.majorId))
				.limit(1)
			if (!m) throw APIError.notFound('Ngành không tồn tại')
			majorId = params.majorId
		}

		const code =
			params.code !== undefined
				? params.code.trim().toUpperCase()
				: existing.code
		const name =
			params.name !== undefined ? params.name.trim() : existing.name
		if (!code || !name) {
			throw APIError.invalidArgument('Mã và tên khoa bắt buộc')
		}

		if (code !== existing.code || majorId !== existing.majorId) {
			const [dup] = await orm
				.select({ id: examFaculties.id })
				.from(examFaculties)
				.where(
					and(
						majorId == null
							? isNull(examFaculties.majorId)
							: eq(examFaculties.majorId, majorId),
						eq(examFaculties.code, code),
						sql`${examFaculties.id} != ${params.id}`
					)
				)
				.limit(1)
			if (dup) {
				throw APIError.alreadyExists(
					`Mã khoa ${code} đã có trong ngành này`
				)
			}
		}

		const [row] = await orm
			.update(examFaculties)
			.set({
				code,
				name,
				majorId,
				description:
					params.description !== undefined
						? params.description
						: existing.description
			})
			.where(eq(examFaculties.id, params.id))
			.returning()

		// Đồng bộ majorId môn nếu chuyển khoa sang ngành khác
		if (majorId !== existing.majorId) {
			await orm
				.update(examSubjects)
				.set({ majorId })
				.where(eq(examSubjects.facultyId, params.id))
		}

		return { data: await mapFaculty(row!) }
	}
)

export const DeleteExamFaculty = api(
	{ auth: true, expose: true, method: 'DELETE', path: '/exam/faculties/:id' },
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền xóa khoa')
		}
		const [subj] = await orm
			.select({ c: sql<number>`count(*)` })
			.from(examSubjects)
			.where(eq(examSubjects.facultyId, params.id))
		if (Number(subj?.c || 0) > 0) {
			throw APIError.failedPrecondition('Khoa còn môn — xóa môn trước')
		}
		await orm.delete(examFaculties).where(eq(examFaculties.id, params.id))
		return { ok: true }
	}
)

// ── Lớp (danh mục lớp thi — thuộc Hệ + Ngành) ─────────────────

async function fetchClassJoined(
	id: number
): Promise<ClassCatalogResponse | null> {
	const [joined] = await orm
		.select({
			id: examClasses.id,
			createdAt: examClasses.createdAt,
			updatedAt: examClasses.updatedAt,
			code: examClasses.code,
			name: examClasses.name,
			majorId: examClasses.majorId,
			facultyId: examClasses.facultyId,
			cohort: examClasses.cohort,
			description: examClasses.description,
			majorCode: examMajors.code,
			majorName: examMajors.name,
			systemId: examMajors.systemId,
			systemCode: examSystems.code,
			systemName: examSystems.name,
			facultyCode: examFaculties.code,
			facultyName: examFaculties.name
		})
		.from(examClasses)
		.leftJoin(examMajors, eq(examClasses.majorId, examMajors.id))
		.leftJoin(examSystems, eq(examMajors.systemId, examSystems.id))
		.leftJoin(examFaculties, eq(examClasses.facultyId, examFaculties.id))
		.where(eq(examClasses.id, id))
		.limit(1)
	if (!joined) return null
	const life = getClassCohortStatus(joined.cohort)
	return {
		id: joined.id,
		createdAt: joined.createdAt,
		updatedAt: joined.updatedAt,
		code: joined.code,
		name: joined.name,
		systemId: joined.systemId ?? null,
		systemCode: joined.systemCode ?? null,
		systemName: joined.systemName ?? null,
		majorId: joined.majorId ?? null,
		majorCode: joined.majorCode ?? null,
		majorName: joined.majorName ?? null,
		facultyId: joined.facultyId ?? null,
		facultyCode: joined.facultyCode ?? null,
		facultyName: joined.facultyName ?? null,
		cohort: joined.cohort,
		status: life.status,
		statusLabel: life.statusLabel,
		cohortEndYear: life.endYear,
		cohortEndMonth: life.endMonth,
		description: joined.description
	}
}

export const ListExamClasses = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/classes' },
	async (q: {
		q?: Query<string>
		/** Lọc theo hệ đào tạo (QS/DS) */
		systemId?: Query<number>
		majorId?: Query<number>
		facultyId?: Query<number>
	}): Promise<{ data: ClassCatalogResponse[] }> => {
		const actor = await getActor()
		const conditions = []
		if (q.systemId)
			conditions.push(eq(examMajors.systemId, Number(q.systemId)))
		if (q.majorId)
			conditions.push(eq(examClasses.majorId, Number(q.majorId)))
		if (q.facultyId)
			conditions.push(eq(examClasses.facultyId, Number(q.facultyId)))
		const kw = (q.q || '').trim()
		if (kw) {
			conditions.push(
				or(
					like(examClasses.code, `%${kw}%`),
					like(examClasses.name, `%${kw}%`)
				)!
			)
		}
		if (isScopedDeptHead(actor)) {
			const facCodes = await getDeptHeadFacultyCodes(actor)
			if (facCodes && facCodes.length) {
				const codes = facCodes.map((code) => code.toUpperCase())
				conditions.push(
					sql`upper(${examFaculties.code}) in (${sql.join(
						codes.map((code) => sql`${code}`),
						sql`, `
					)})`
				)
			} else {
				return { data: [] }
			}
		}
		const where = conditions.length ? and(...conditions) : undefined
		const rows = await orm
			.select({
				id: examClasses.id,
				createdAt: examClasses.createdAt,
				updatedAt: examClasses.updatedAt,
				code: examClasses.code,
				name: examClasses.name,
				majorId: examClasses.majorId,
				facultyId: examClasses.facultyId,
				cohort: examClasses.cohort,
				description: examClasses.description,
				majorCode: examMajors.code,
				majorName: examMajors.name,
				systemId: examMajors.systemId,
				systemCode: examSystems.code,
				systemName: examSystems.name,
				facultyCode: examFaculties.code,
				facultyName: examFaculties.name
			})
			.from(examClasses)
			.leftJoin(examMajors, eq(examClasses.majorId, examMajors.id))
			.leftJoin(examSystems, eq(examMajors.systemId, examSystems.id))
			.leftJoin(
				examFaculties,
				eq(examClasses.facultyId, examFaculties.id)
			)
			.where(where)
			.orderBy(examSystems.name, examMajors.name, examClasses.name)

		return {
			data: rows.map((r) => {
				const life = getClassCohortStatus(r.cohort)
				return {
					id: r.id,
					createdAt: r.createdAt,
					updatedAt: r.updatedAt,
					code: r.code,
					name: r.name,
					systemId: r.systemId ?? null,
					systemCode: r.systemCode ?? null,
					systemName: r.systemName ?? null,
					majorId: r.majorId ?? null,
					majorCode: r.majorCode ?? null,
					majorName: r.majorName ?? null,
					facultyId: r.facultyId ?? null,
					facultyCode: r.facultyCode ?? null,
					facultyName: r.facultyName ?? null,
					cohort: r.cohort,
					status: life.status,
					statusLabel: life.statusLabel,
					cohortEndYear: life.endYear,
					cohortEndMonth: life.endMonth,
					description: r.description
				}
			})
		}
	}
)

export const CreateExamClass = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/classes' },
	async (body: {
		code: string
		name: string
		/** Bắt buộc — lớp thuộc ngành (và hệ qua ngành) */
		majorId: number
		facultyId?: number | null
		cohort?: string
		description?: string
	}): Promise<{ data: ClassCatalogResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền quản lý lớp')
		}
		const code = body.code.trim().toUpperCase()
		const name = body.name.trim()
		if (!code || !name) {
			throw APIError.invalidArgument('Mã và tên lớp bắt buộc')
		}
		if (!body.majorId) {
			throw APIError.invalidArgument(
				'Lớp phải thuộc một ngành đào tạo (chọn hệ → ngành)'
			)
		}
		const [major] = await orm
			.select()
			.from(examMajors)
			.where(eq(examMajors.id, body.majorId))
			.limit(1)
		if (!major) throw APIError.notFound('Ngành không tồn tại')

		const majorId = body.majorId
		const facultyId = body.facultyId ?? null
		if (facultyId) {
			const [f] = await orm
				.select()
				.from(examFaculties)
				.where(eq(examFaculties.id, facultyId))
				.limit(1)
			if (!f) throw APIError.notFound('Khoa không tồn tại')
			if (f.majorId !== majorId) {
				throw APIError.invalidArgument('Khoa không thuộc ngành đã chọn')
			}
		}
		const [existing] = await orm
			.select({ id: examClasses.id })
			.from(examClasses)
			.where(eq(examClasses.code, code))
			.limit(1)
		if (existing) {
			throw APIError.alreadyExists(`Mã lớp ${code} đã tồn tại`)
		}

		const cohort = assertCohortHasMonthYear(body.cohort)

		const [row] = await orm
			.insert(examClasses)
			.values({
				code,
				name,
				majorId,
				facultyId,
				cohort,
				description: body.description || null
			})
			.returning()

		const data = await fetchClassJoined(row!.id)
		return { data: data! }
	}
)

export const UpdateExamClass = api(
	{ auth: true, expose: true, method: 'PUT', path: '/exam/classes/:id' },
	async (params: {
		id: number
		code?: string
		name?: string
		majorId?: number | null
		facultyId?: number | null
		cohort?: string | null
		description?: string | null
	}): Promise<{ data: ClassCatalogResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền quản lý lớp')
		}
		const [cur] = await orm
			.select()
			.from(examClasses)
			.where(eq(examClasses.id, params.id))
			.limit(1)
		if (!cur) throw APIError.notFound('Lớp không tồn tại')

		const patch: Partial<typeof examClasses.$inferInsert> = {}
		if (params.code != null) {
			const code = params.code.trim().toUpperCase()
			if (!code) throw APIError.invalidArgument('Mã lớp không hợp lệ')
			if (code !== cur.code) {
				const [dup] = await orm
					.select({ id: examClasses.id })
					.from(examClasses)
					.where(eq(examClasses.code, code))
					.limit(1)
				if (dup)
					throw APIError.alreadyExists(`Mã lớp ${code} đã tồn tại`)
			}
			patch.code = code
		}
		if (params.name != null) {
			const name = params.name.trim()
			if (!name) throw APIError.invalidArgument('Tên lớp bắt buộc')
			patch.name = name
		}
		if (params.majorId !== undefined) {
			if (params.majorId == null) {
				throw APIError.invalidArgument(
					'Lớp phải thuộc một ngành đào tạo'
				)
			}
			const [major] = await orm
				.select()
				.from(examMajors)
				.where(eq(examMajors.id, params.majorId))
				.limit(1)
			if (!major) throw APIError.notFound('Ngành không tồn tại')
			patch.majorId = params.majorId
		}
		if (params.facultyId !== undefined) {
			const facultyId = params.facultyId
			if (facultyId != null) {
				const [f] = await orm
					.select()
					.from(examFaculties)
					.where(eq(examFaculties.id, facultyId))
					.limit(1)
				if (!f) throw APIError.notFound('Khoa không tồn tại')
				const mid = (patch.majorId as number | undefined) ?? cur.majorId
				if (mid != null && f.majorId !== mid) {
					throw APIError.invalidArgument(
						'Khoa không thuộc ngành của lớp'
					)
				}
			}
			patch.facultyId = facultyId
		}
		if (params.cohort !== undefined) {
			patch.cohort = assertCohortHasMonthYear(params.cohort)
		}
		if (params.description !== undefined) {
			patch.description = params.description || null
		}

		if (Object.keys(patch).length > 0) {
			await orm
				.update(examClasses)
				.set(patch)
				.where(eq(examClasses.id, params.id))
		}

		const data = await fetchClassJoined(params.id)
		return { data: data! }
	}
)

export const DeleteExamClass = api(
	{ auth: true, expose: true, method: 'DELETE', path: '/exam/classes/:id' },
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền xóa lớp')
		}
		await orm.delete(examClasses).where(eq(examClasses.id, params.id))
		return { ok: true }
	}
)

// ── Môn ───────────────────────────────────────────────────────

export const ListExamSubjects = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/subjects' },
	async (q: {
		majorId?: Query<number>
		facultyId?: Query<number>
		q?: Query<string>
		mine?: Query<boolean>
	}): Promise<{ data: SubjectResponse[] }> => {
		const actor = await getActor()
		const conditions = []
		if (q.majorId)
			conditions.push(eq(examSubjects.majorId, Number(q.majorId)))
		if (q.facultyId)
			conditions.push(eq(examSubjects.facultyId, Number(q.facultyId)))
		const kw = (q.q || '').trim()
		if (kw) {
			conditions.push(
				or(
					like(examSubjects.code, `%${kw}%`),
					like(examSubjects.baseCode, `%${kw}%`),
					like(examSubjects.name, `%${kw}%`)
				)!
			)
		}

		const wantMine =
			q.mine === true ||
			String(q.mine) === 'true' ||
			(!actor.isSuperAdmin &&
				isLecturer(actor) &&
				!canManageCatalog(actor))

		if (wantMine) {
			const assigns = await orm
				.select({ subjectId: examTeachingAssignments.subjectId })
				.from(examTeachingAssignments)
				.where(eq(examTeachingAssignments.userId, actor.userId))
			const ids = [...new Set(assigns.map((a) => a.subjectId))]
			if (!ids.length) return { data: [] }
			conditions.push(inArray(examSubjects.id, ids))
		}

		// CNK: ưu tiên lọc theo KHOA phụ trách — không lộ môn khoa khác trong cùng ngành
		if (!wantMine && isScopedDeptHead(actor)) {
			const facCodes = await getDeptHeadFacultyCodes(actor)
			if (facCodes && facCodes.length) {
				const codes = facCodes.map((c) => c.toUpperCase())
				conditions.push(
					sql`upper(${examFaculties.code}) in (${sql.join(
						codes.map((c) => sql`${c}`),
						sql`, `
					)})`
				)
			} else {
				const cnkMajors = await getDeptHeadMajorIds(actor)
				if (cnkMajors !== null) {
					if (!cnkMajors.length) return { data: [] }
					conditions.push(inArray(examSubjects.majorId, cnkMajors))
				}
			}
		}

		const where = conditions.length ? and(...conditions) : undefined
		const rows = await orm
			.select({
				id: examSubjects.id,
				createdAt: examSubjects.createdAt,
				updatedAt: examSubjects.updatedAt,
				code: examSubjects.code,
				baseCode: examSubjects.baseCode,
				name: examSubjects.name,
				creditHours: examSubjects.creditHours,
				lessonHours: examSubjects.lessonHours,
				facultyId: examSubjects.facultyId,
				majorId: examSubjects.majorId,
				description: examSubjects.description,
				facultyCode: examFaculties.code,
				facultyName: examFaculties.name,
				majorCode: examMajors.code,
				majorName: examMajors.name,
				systemId: examMajors.systemId,
				systemCode: examSystems.code,
				systemName: examSystems.name
			})
			.from(examSubjects)
			.leftJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
			.leftJoin(examSystems, eq(examMajors.systemId, examSystems.id))
			.where(where)
			.orderBy(examSubjects.code)

		return {
			data: rows.map((r) => ({
				id: r.id,
				createdAt: r.createdAt,
				updatedAt: r.updatedAt,
				code: r.code,
				baseCode: r.baseCode ?? null,
				name: r.name,
				creditHours: r.creditHours,
				lessonHours: r.lessonHours,
				facultyId: r.facultyId,
				facultyCode: r.facultyCode ?? null,
				facultyName: r.facultyName ?? null,
				majorId: r.majorId,
				majorCode: r.majorCode ?? null,
				majorName: r.majorName ?? null,
				systemId: r.systemId ?? null,
				systemCode: r.systemCode ?? null,
				systemName: r.systemName ?? null,
				description: r.description
			}))
		}
	}
)

export const CreateExamSubject = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/subjects' },
	async (body: {
		name: string
		facultyId: number
		majorId?: number
		sourceSubjectId?: number
		baseCode?: string
		code?: string
		creditHours?: number
		lessonHours?: number
		description?: string
	}): Promise<{ data: SubjectResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền quản lý môn')
		}
		const [sourceSubject] = body.sourceSubjectId
			? await orm
					.select()
					.from(examSubjects)
					.where(eq(examSubjects.id, body.sourceSubjectId))
					.limit(1)
			: [null]
		const name = (sourceSubject?.name || body.name).trim()
		if (!name || !body.facultyId) {
			throw APIError.invalidArgument('Tên môn và khoa bắt buộc')
		}
		let [fac] = await orm
			.select({
				id: examFaculties.id,
				code: examFaculties.code,
				name: examFaculties.name,
				majorId: examFaculties.majorId,
				majorCode: examMajors.code,
				majorName: examMajors.name
			})
			.from(examFaculties)
			.leftJoin(examMajors, eq(examFaculties.majorId, examMajors.id))
			.where(eq(examFaculties.id, body.facultyId))
			.limit(1)
		if (!fac) throw APIError.notFound('Khoa không tồn tại')

		// Khoa là danh mục dùng chung. CSDL cũ lưu một bản ghi khoa theo từng
		// ngành, vì vậy tự tạo bản ghi liên kết tương ứng khi thêm môn vào ngành.
		if (body.majorId && fac.majorId !== body.majorId) {
			const [targetMajor] = await orm
				.select({ id: examMajors.id })
				.from(examMajors)
				.where(eq(examMajors.id, body.majorId))
				.limit(1)
			if (!targetMajor) throw APIError.notFound('Ngành không tồn tại')
			let [targetFaculty] = await orm
				.select({
					id: examFaculties.id,
					code: examFaculties.code,
					name: examFaculties.name,
					majorId: examFaculties.majorId,
					majorCode: examMajors.code,
					majorName: examMajors.name
				})
				.from(examFaculties)
				.leftJoin(examMajors, eq(examFaculties.majorId, examMajors.id))
				.where(
					and(
						eq(examFaculties.majorId, body.majorId),
						eq(examFaculties.code, fac.code)
					)
				)
				.limit(1)
			if (!targetFaculty) {
				const [created] = await orm
					.insert(examFaculties)
					.values({
						code: fac.code,
						name: fac.name,
						majorId: body.majorId
					})
					.returning()
				const [major] = await orm
					.select({ code: examMajors.code, name: examMajors.name })
					.from(examMajors)
					.where(eq(examMajors.id, body.majorId))
					.limit(1)
				targetFaculty = {
					id: created!.id,
					code: created!.code,
					name: created!.name,
					majorId: created!.majorId,
					majorCode: major?.code ?? null,
					majorName: major?.name ?? null
				}
			}
			fac = targetFaculty
		}

		const baseCode = (
			sourceSubject?.baseCode ||
			sourceSubject?.code.split('_').pop() ||
			body.baseCode ||
			body.code ||
			''
		)
			.trim()
			.toUpperCase()
		if (!baseCode) {
			throw APIError.invalidArgument('Mã môn (baseCode) bắt buộc')
		}
		const fullCode = body.code?.includes('_')
			? body.code.trim().toUpperCase()
			: buildSubjectCode(fac.majorCode || 'X', baseCode)

		const [row] = await orm
			.insert(examSubjects)
			.values({
				code: fullCode,
				baseCode: baseCode.includes('_')
					? baseCode.split('_').pop()!
					: baseCode,
				name,
				creditHours:
					sourceSubject?.creditHours ?? body.creditHours ?? 0,
				lessonHours:
					sourceSubject?.lessonHours ?? body.lessonHours ?? 0,
				facultyId: fac.id,
				majorId: fac.majorId,
				description: body.description || null
			})
			.returning()

		return {
			data: {
				id: row!.id,
				createdAt: row!.createdAt,
				updatedAt: row!.updatedAt,
				code: row!.code,
				baseCode: row!.baseCode ?? null,
				name: row!.name,
				creditHours: row!.creditHours,
				lessonHours: row!.lessonHours,
				facultyId: row!.facultyId,
				facultyCode: fac.code,
				facultyName: fac.name,
				majorId: row!.majorId,
				majorCode: fac.majorCode ?? null,
				majorName: fac.majorName ?? null,
				description: row!.description
			}
		}
	}
)

export const UpdateExamSubject = api(
	{ auth: true, expose: true, method: 'PUT', path: '/exam/subjects/:id' },
	async (params: {
		id: number
		name?: string
		facultyId?: number
		baseCode?: string
		code?: string
		creditHours?: number
		lessonHours?: number
		description?: string | null
	}): Promise<{ data: SubjectResponse }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền sửa môn')
		}
		const [existing] = await orm
			.select()
			.from(examSubjects)
			.where(eq(examSubjects.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Môn không tồn tại')

		let facultyId = existing.facultyId
		let majorId = existing.majorId
		let facCode: string | null = null
		let facName: string | null = null
		let majorCode: string | null = null
		let majorName: string | null = null

		const resolveFac = async (fid: number) => {
			const [fac] = await orm
				.select({
					id: examFaculties.id,
					code: examFaculties.code,
					name: examFaculties.name,
					majorId: examFaculties.majorId,
					majorCode: examMajors.code,
					majorName: examMajors.name
				})
				.from(examFaculties)
				.leftJoin(examMajors, eq(examFaculties.majorId, examMajors.id))
				.where(eq(examFaculties.id, fid))
				.limit(1)
			if (!fac) throw APIError.notFound('Khoa không tồn tại')
			return fac
		}

		if (
			params.facultyId != null &&
			params.facultyId !== existing.facultyId
		) {
			const fac = await resolveFac(params.facultyId)
			facultyId = fac.id
			majorId = fac.majorId
			facCode = fac.code
			facName = fac.name
			majorCode = fac.majorCode ?? null
			majorName = fac.majorName ?? null
		} else {
			const fac = await resolveFac(existing.facultyId)
			facCode = fac.code
			facName = fac.name
			majorCode = fac.majorCode ?? null
			majorName = fac.majorName ?? null
		}

		const name =
			params.name !== undefined ? params.name.trim() : existing.name
		if (!name) throw APIError.invalidArgument('Tên môn bắt buộc')

		let baseCode = existing.baseCode
		let fullCode = existing.code
		if (params.baseCode !== undefined || params.code !== undefined) {
			const rawBase = (
				params.baseCode ||
				params.code ||
				existing.baseCode ||
				''
			)
				.trim()
				.toUpperCase()
			if (!rawBase) throw APIError.invalidArgument('Mã môn bắt buộc')
			baseCode = rawBase.includes('_')
				? rawBase.split('_').pop()!
				: rawBase
			fullCode = params.code?.includes('_')
				? params.code.trim().toUpperCase()
				: buildSubjectCode(majorCode || 'X', baseCode)
		} else if (facultyId !== existing.facultyId && majorCode) {
			// Đổi khoa → cập nhật prefix mã môn nếu đang theo convention
			const base = (
				existing.baseCode ||
				existing.code.split('_').pop() ||
				''
			).toUpperCase()
			if (base) {
				baseCode = base
				fullCode = buildSubjectCode(majorCode, base)
			}
		}

		if (fullCode !== existing.code) {
			const [dup] = await orm
				.select({ id: examSubjects.id })
				.from(examSubjects)
				.where(
					and(
						eq(examSubjects.code, fullCode),
						sql`${examSubjects.id} != ${params.id}`
					)
				)
				.limit(1)
			if (dup) {
				throw APIError.alreadyExists(`Mã môn ${fullCode} đã tồn tại`)
			}
		}

		const [row] = await orm
			.update(examSubjects)
			.set({
				name,
				code: fullCode,
				baseCode,
				facultyId,
				majorId,
				creditHours:
					params.creditHours !== undefined
						? params.creditHours
						: existing.creditHours,
				lessonHours:
					params.lessonHours !== undefined
						? params.lessonHours
						: existing.lessonHours,
				description:
					params.description !== undefined
						? params.description
						: existing.description
			})
			.where(eq(examSubjects.id, params.id))
			.returning()

		return {
			data: {
				id: row!.id,
				createdAt: row!.createdAt,
				updatedAt: row!.updatedAt,
				code: row!.code,
				baseCode: row!.baseCode ?? null,
				name: row!.name,
				creditHours: row!.creditHours,
				lessonHours: row!.lessonHours,
				facultyId: row!.facultyId,
				facultyCode: facCode,
				facultyName: facName,
				majorId: row!.majorId,
				majorCode,
				majorName,
				description: row!.description
			}
		}
	}
)

export const DeleteExamSubject = api(
	{ auth: true, expose: true, method: 'DELETE', path: '/exam/subjects/:id' },
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!canManageCatalog(actor)) {
			throw APIError.permissionDenied('Không có quyền xóa môn')
		}
		await orm.delete(examSubjects).where(eq(examSubjects.id, params.id))
		return { ok: true }
	}
)

// Teaching assignments → xem ./assignments.ts
