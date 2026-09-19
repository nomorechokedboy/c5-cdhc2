import log from 'encore.dev/log'
import { Repository } from '.'
import { AppError } from '../errors'
import {
	Unit,
	UnitDB,
	UnitLevel,
	UnitLevelName,
	UnitParams,
	UnitQuery
} from '../schema'
import unitRepo from './repo'
import { GetUnitsQuery } from './units'

type findOneRequest = {
	id?: number
	alias: string
	name?: string
	level?: UnitLevelName

	parentId?: number | null
	validUnitIds: number[]
}

export type MoodleCourse = {
	id: number
	fullname: string
	shortname: string
	alreadyImported: boolean
}

const MOODLE_COURSE_ID_RE = /moodleCourseId=(\d+)/

class controller {
	constructor(private readonly repo: Repository) {}

	private assertClassInScope(
		unit: Pick<UnitDB, 'level' | 'id'>,
		validUnitIds: number[] | undefined,
		message: string
	) {
		if (
			unit.level === 'class' &&
			validUnitIds !== undefined &&
			!validUnitIds.includes(unit.id)
		) {
			throw AppError.handleAppErr(AppError.unauthorized(message))
		}
	}

	async create(
		params: UnitParams[],
		validUnitIds?: number[]
	): Promise<UnitParams[]> {
		log.trace('UnitController.create params', { params })

		const validParams: UnitParams[] = []
		for (const param of params) {
			const paramLevel = UnitLevel.fromName(param.level)
			const parentId =
				param.parentId != null && Number(param.parentId) > 0
					? Number(param.parentId)
					: null

			// Tiểu đoàn (battalion) có thể không có parent
			if (parentId == null) {
				if (param.level !== 'battalion') {
					throw AppError.handleAppErr(
						AppError.invalidArgument(
							'Đại đội / lớp phải chọn đơn vị cha (tiểu đoàn / đại đội)'
						)
					)
				}
				validParams.push({ ...param, parentId: null })
				continue
			}

			const parent = await this.repo.findOne({ id: parentId })
			if (!parent) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						`Không tìm thấy đơn vị cha id=${parentId}`
					)
				)
			}

			// Mỗi cấp chỉ được nằm ngay dưới cấp liền trước:
			// tiểu đoàn → đại đội → lớp
			const parentLevel = UnitLevel.fromName(parent.level)
			if (parentLevel.value !== paramLevel.value - 1) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						`Invalid parent level. Parent level: ${parent.level} - Unit level: ${param.level}`
					)
				)
			}

			// Lớp chỉ được tạo trong phạm vi đơn vị của người dùng
			if (
				param.level === 'class' &&
				validUnitIds !== undefined &&
				!validUnitIds.includes(parentId)
			) {
				throw AppError.handleAppErr(
					AppError.unauthorized(
						"You don't have permission create class in this unit"
					)
				)
			}

			validParams.push({ ...param, parentId })
		}

		const isValidParamsEmpty = validParams.length === 0
		if (isValidParamsEmpty) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(`Empty request data`)
			)
		}

		return this.repo.create(validParams).catch(AppError.handleAppErr)
	}

	async update(
		id: number,
		params: Partial<UnitParams>,
		validUnitIds?: number[]
	): Promise<UnitDB> {
		const existing = await this.repo.findOne({ id })
		if (!existing)
			throw AppError.handleAppErr(
				AppError.notFound('Đơn vị không tồn tại')
			)
		this.assertClassInScope(
			existing,
			validUnitIds,
			"You don't have permission update this class"
		)
		if (params.alias !== undefined && !params.alias.trim())
			throw AppError.handleAppErr(
				AppError.invalidArgument('Alias không được để trống')
			)
		if (params.name !== undefined && !params.name.trim())
			throw AppError.handleAppErr(
				AppError.invalidArgument('Tên không được để trống')
			)
		const rows = await this.repo.update(id, params)
		return rows[0]!
	}

	async delete(id: number, validUnitIds?: number[]): Promise<void> {
		const existing = await this.repo.findOne({ id })
		if (!existing)
			throw AppError.handleAppErr(
				AppError.notFound('Đơn vị không tồn tại')
			)
		this.assertClassInScope(
			existing,
			validUnitIds,
			"You don't have permission delete this class"
		)
		if (existing.children.length)
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'Không thể xóa đơn vị đang có đơn vị con hoặc lớp'
				)
			)
		await this.repo.delete([existing])
	}

	/**
	 * `unitIds` là phạm vi người dùng được xem; `undefined` = toàn bộ danh mục.
	 */
	find(
		q: GetUnitsQuery,
		unitIds?: number[],
		opts?: Pick<UnitQuery, 'with'>
	): Promise<Unit[]> {
		log.trace('UnitController.find params', { params: q, unitIds })

		if (unitIds !== undefined && unitIds.length === 0) {
			AppError.handleAppErr(AppError.invalidArgument('Invalid unitIds'))
		}

		let ids = unitIds
		if (q.id !== undefined) {
			if (unitIds !== undefined && !unitIds.includes(q.id)) {
				throw AppError.handleAppErr(
					AppError.unauthorized(
						"You don't have permission to read those units"
					)
				)
			}
			ids = [q.id]
		}

		const query: UnitQuery = {
			ids,
			level: q.level as UnitLevelName | undefined,
			search: q.search,
			parentId: q.parentId,
			limit: q.limit,
			offset: q.offset,
			withStudentCount: q.withStudentCount,
			...opts
		}

		return this.repo.find(query).catch(AppError.handleAppErr)
	}

	async findById(id: number): Promise<Unit | undefined> {
		log.trace('UnitController.findById params', { params: { id } })

		return this.repo.findOne({ id }).catch(AppError.handleAppErr)
	}

	async findOne({
		validUnitIds,
		...p
	}: findOneRequest): Promise<Unit | undefined> {
		log.trace('UnitController.findOne params', {
			params: p,
			id: p.id,
			validUnitIds
		})

		const unit = await this.repo.findOne(p).catch(AppError.handleAppErr)
		if (unit === undefined) {
			AppError.handleAppErr(AppError.invalidArgument('Invalid unit'))
		}

		const isValidUnitId = validUnitIds.includes(unit.id)
		if (isValidUnitId === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission to read those units"
				)
			)
		}
		return unit
	}

	private async importedMoodleCourseIds(
		companyId: number
	): Promise<{ ids: Set<number>; names: Set<string> }> {
		const local = await this.repo
			.find({
				parentId: companyId,
				level: 'class',
				with: { parent: false, children: false }
			})
			.catch(() => [] as Unit[])
		const ids = new Set<number>()
		const names = new Set<string>()
		for (const c of local) {
			names.add((c.name || '').toLowerCase())
			const m = String(c.description || '').match(MOODLE_COURSE_ID_RE)
			if (m) ids.add(Number(m[1]))
		}
		return { ids, names }
	}

	/**
	 * Liệt kê khóa Moodle (học chung khóa) — không bịa dữ liệu.
	 * alreadyImported: đã có lớp local (cùng đại đội) mô tả chứa moodleCourseId=
	 */
	async listMoodleCourses(unitId?: number): Promise<{
		data: MoodleCourse[]
		connected: boolean
		message?: string
	}> {
		const {
			getMariaCourseData,
			isMariaSyncEnabled,
			testMariaMoodleConnection,
			getMariaConfigPublic
		} = await import('../maria-data.js')

		if (!isMariaSyncEnabled()) {
			return {
				data: [],
				connected: false,
				message: 'Đồng bộ Moodle đang tắt (MARIADB_SYNC_ENABLED=false)'
			}
		}

		// Kiểm tra kết nối trước — báo lỗi rõ (sai user/pass/host)
		const status = await testMariaMoodleConnection()
		if (!status.ok) {
			const cfg = getMariaConfigPublic()
			return {
				data: [],
				connected: false,
				message: `Không kết nối MariaDB/Moodle: ${status.error || 'unknown'} (${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}, passwordSet=${cfg.passwordSet})`
			}
		}

		const courses = await getMariaCourseData(500)
		if (!courses.length) {
			return {
				data: [],
				connected: true,
				message:
					status.courseCount === 0
						? 'Kết nối OK nhưng mdl_course trống (không có khóa id>1)'
						: `Kết nối OK (MariaDB ${status.version}, ~${status.courseCount} khóa) nhưng truy vấn không trả dòng`
			}
		}

		const importedIds =
			unitId != null
				? (await this.importedMoodleCourseIds(unitId)).ids
				: new Set<number>()

		return {
			connected: true,
			message: `Đã kết nối Moodle · ${courses.length} khóa (tổng DB ~${status.courseCount})`,
			data: courses.map((c) => ({
				id: Number(c.id),
				fullname: c.fullname || c.shortname || `Course #${c.id}`,
				shortname: c.shortname || '',
				alreadyImported: importedIds.has(Number(c.id))
			}))
		}
	}

	/**
	 * Import khóa Moodle → đơn vị cấp lớp gắn đại đội (unitId).
	 * Học chung khóa: cùng danh sách course, mỗi đại đội import về đơn vị của mình.
	 * Bỏ qua course đã import (cùng đại đội + moodleCourseId).
	 */
	async importMoodleClasses(
		unitId: number,
		courseIds: number[],
		validUnitIds: number[]
	): Promise<{ created: UnitDB[]; skipped: number }> {
		if (!validUnitIds.includes(unitId)) {
			throw AppError.handleAppErr(
				AppError.unauthorized('Không có quyền thêm lớp vào đại đội này')
			)
		}
		const company = await this.repo.findOne({ id: unitId })
		if (!company || company.level !== 'company') {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Chỉ được import lớp vào đại đội')
			)
		}
		if (!courseIds?.length) {
			return { created: [], skipped: 0 }
		}

		const { getMariaCourseData } = await import('../maria-data.js')
		const all = await getMariaCourseData(500)
		const byId = new Map(all.map((c) => [Number(c.id), c]))
		const { ids: importedIds, names: existingNames } =
			await this.importedMoodleCourseIds(unitId)

		const toCreate: UnitParams[] = []
		let skipped = 0
		for (const cid of courseIds) {
			const course = byId.get(cid)
			if (!course || importedIds.has(cid)) {
				skipped += 1
				continue
			}
			const name = (
				course.fullname ||
				course.shortname ||
				`Moodle ${cid}`
			).trim()
			// Trùng tên trong cùng đại đội → bỏ qua
			if (existingNames.has(name.toLowerCase())) {
				skipped += 1
				continue
			}
			const short = (course.shortname || '').trim()
			const description = [
				short && `Mã khóa: ${short}`,
				`moodleCourseId=${cid}`,
				'Import từ Moodle (học chung khóa)'
			]
				.filter(Boolean)
				.join(' · ')
			toCreate.push({
				alias: short || name,
				name,
				level: 'class',
				description,
				parentId: unitId
			})
			existingNames.add(name.toLowerCase())
		}

		if (!toCreate.length) {
			return { created: [], skipped }
		}
		const created = await this.repo
			.create(toCreate)
			.catch(AppError.handleAppErr)
		return { created, skipped }
	}
}

const unitController = new controller(unitRepo)

export default unitController
