import { AppError } from '../errors/index'
import {
	Class,
	ClassDB,
	ClassParam,
	ClassQuery,
	UpdateClassMap
} from '../schema/classes'
import { Repository } from './index'
import { Repository as UnitRepository } from '../units'
import sqliteRepo from './repo'
import log from 'encore.dev/log'
import unitRepo from '../units/repo'

class Controller {
	constructor(
		private readonly repo: Repository,
		private readonly unitRepo: UnitRepository
	) {}

	async create(
		classParams: ClassParam[],
		validUnitIds: number[]
	): Promise<ClassDB[]> {
		log.trace('classController.create params', { classParam: classParams })

		const unitIds = classParams.map((p) => p.unitId)
		const checkUnitIds = unitIds.every((a) => validUnitIds.includes(a))
		if (checkUnitIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission create class in this unit"
				)
			)
		}

		const units = await this.unitRepo.findByIds(unitIds)
		const isNotfoundUnit = units.length !== unitIds.length
		if (isNotfoundUnit) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('There are invalid unit ids')
			)
		}

		const isBattalionUnitExist = units.some(
			(unit) => unit.level === 'battalion'
		)
		if (isBattalionUnitExist) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'There are invalid unit. Class unit must be company'
				)
			)
		}

		return this.repo.create(classParams).catch(AppError.handleAppErr)
	}

	delete(classes: ClassDB[], validClassIds: number[]) {
		log.trace('classController.delete params', {
			params: classes,
			validClassIds
		})
		const checkClassIds = classes.every((c) => validClassIds.includes(c.id))
		if (checkClassIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission delete class with this classId"
				)
			)
		}

		return this.repo.delete(classes).catch(AppError.handleAppErr)
	}

	findByIds(ids: number[]): Promise<ClassDB[]> {
		log.trace('classController.findByIds ids', { ids })

		return this.repo.findByIds(ids).catch(AppError.handleAppErr)
	}

	find(params: ClassQuery, validClassIds: number[]): Promise<ClassDB[]> {
		log.trace('classController.find params', { params, validClassIds })
		const isValidRequest = params.ids?.every((id) =>
			validClassIds.includes(id)
		)
		if (isValidRequest === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission to read one of those classes"
				)
			)
		}

		return this.repo.find(params).catch(AppError.handleAppErr)
	}

	async update(
		params: ClassDB[],
		{
			validClassIds,
			validUnitIds
		}: { validUnitIds: number[]; validClassIds: number[] }
	): Promise<ClassDB[]> {
		log.trace('classController.update params', {
			params,
			validClassIds,
			validUnitIds
		})

		const ids = params.map((s) => s.id),
			isIdsEmpty = ids.length === 0,
			isValidClassIds = ids.every((id) => validClassIds.includes(id)),
			isValidParams = params.every((param) =>
				validUnitIds.includes(param.unitId)
			)
		const isValidRequest = isValidClassIds && isValidParams
		if (isValidRequest === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					'You are not authorized update this unitid'
				)
			)
		}

		const isInvalidIds = isIdsEmpty === true
		if (isInvalidIds) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('No record IDs provided')
			)
		}
		const updateMap: UpdateClassMap = params.map(
			({ id, ...updatePayload }) => {
				const cleanupPayload = Object.fromEntries(
					Object.entries(updatePayload).filter(
						([_, value]) => value !== undefined
					)
				)

				const isUpdatePayloadEmpty =
					Object.keys(cleanupPayload).length === 0
				if (isUpdatePayloadEmpty) {
					throw AppError.handleAppErr(
						AppError.invalidArgument(
							`No update data provided At least one field must be provided to update record with id: ${id}`
						)
					)
				}

				return { id, updatePayload: cleanupPayload }
			}
		)

		return this.repo.update(updateMap).catch(AppError.handleAppErr)
	}

	async findOne(id: number, classIds: number[]): Promise<Class | undefined> {
		log.trace('classController.findOne params', { params: { id } })
		const isClassId = classIds.includes(id)
		if (isClassId === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission to read those class"
				)
			)
		}

		const classData = await this.repo
			.findOne({ id } as ClassDB)
			.catch(AppError.handleAppErr)
		if (classData === undefined) {
			AppError.handleAppErr(AppError.invalidArgument('Validate classId'))
		}
		return classData
	}

	/**
	 * Liệt kê khóa Moodle (học chung khóa) — không bịa dữ liệu.
	 * alreadyImported: đã có lớp local (cùng unit) mô tả chứa moodleCourseId=
	 */
	async listMoodleCourses(unitId?: number): Promise<{
		data: {
			id: number
			fullname: string
			shortname: string
			alreadyImported: boolean
		}[]
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

		const importedIds = new Set<number>()
		if (unitId != null) {
			const local = await this.repo
				.find({ unitIds: [unitId] })
				.catch(() => [] as Class[])
			for (const c of local) {
				const m = String(c.description || '').match(
					/moodleCourseId=(\d+)/
				)
				if (m) importedIds.add(Number(m[1]))
			}
		}

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
	 * Import khóa Moodle → lớp local gắn đại đội (unitId).
	 * Học chung khóa: cùng danh sách course, mỗi đại đội import về unit của mình.
	 * Bỏ qua course đã import (cùng unit + moodleCourseId).
	 */
	async importMoodleClasses(
		unitId: number,
		courseIds: number[],
		validUnitIds: number[]
	): Promise<{ created: ClassDB[]; skipped: number }> {
		if (!validUnitIds.includes(unitId)) {
			throw AppError.handleAppErr(
				AppError.unauthorized('Không có quyền thêm lớp vào đại đội này')
			)
		}
		const units = await this.unitRepo.findByIds([unitId])
		if (!units.length || units[0].level === 'battalion') {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'Chỉ được import lớp vào đại đội (không phải tiểu đoàn)'
				)
			)
		}
		if (!courseIds?.length) {
			return { created: [], skipped: 0 }
		}

		const { getMariaCourseData } = await import('../maria-data.js')
		const all = await getMariaCourseData(500)
		const byId = new Map(all.map((c) => [Number(c.id), c]))
		const local = await this.repo.find({ unitIds: [unitId] })
		const importedIds = new Set<number>()
		const existingNames = new Set(
			local.map((c) => (c.name || '').toLowerCase())
		)
		for (const c of local) {
			const m = String(c.description || '').match(/moodleCourseId=(\d+)/)
			if (m) importedIds.add(Number(m[1]))
		}

		const toCreate: ClassParam[] = []
		let skipped = 0
		for (const cid of courseIds) {
			const course = byId.get(cid)
			if (!course) {
				skipped += 1
				continue
			}
			if (importedIds.has(cid)) {
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
				name,
				description,
				unitId
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

const classController = new Controller(sqliteRepo, unitRepo)

export default classController
