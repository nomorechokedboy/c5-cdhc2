/**
 * Thông báo chuông — luồng đề thi
 *
 * CNK nhận đề theo khoa phụ trách (exam_faculty_heads) — ưu tiên;
 * bổ sung exam_major_heads (legacy). Ban KT / BGH theo vai trò.
 */
import { eq, inArray, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import log from 'encore.dev/log'
import orm from '../database'
import { notifications } from '../schema/notifications'
import { users } from '../schema/users'
import { userRoles } from '../schema/user-roles'
import { roles } from '../schema/roles'
import {
	examFaculties,
	examFacultyHeads,
	examMajorHeads,
	examMajors,
	examSubjects
} from '../schema/exam-bank'

async function userIdsByRoleNames(names: string[]): Promise<number[]> {
	if (!names.length) return []
	const rows = await orm
		.select({ userId: userRoles.userId })
		.from(userRoles)
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
		.where(inArray(roles.name, names))
	return [...new Set(rows.map((r) => r.userId).filter(Boolean))]
}

async function superAdminIds(): Promise<number[]> {
	const rows = await orm
		.select({ id: users.id })
		.from(users)
		.where(eq(users.isSuperUser, true))
	return rows.map((r) => r.id)
}

export async function loadExamBghUserIds(): Promise<number[]> {
	const ids = new Set(await userIdsByRoleNames(['admin', 'admin_bgh']))
	for (const id of await superAdminIds()) ids.add(id)
	return [...ids]
}

/**
 * @deprecated Dùng loadExamCnkUserIdsForMajor — không broadcast toàn bộ CNK.
 * Giữ để tương thích / fallback khi thiếu majorId.
 */
export async function loadExamCnkUserIds(): Promise<number[]> {
	const named = await userIdsByRoleNames(['user_nganh', 'exam_dept_head'])
	const fuzzy = await orm
		.select({ userId: userRoles.userId, name: roles.name })
		.from(userRoles)
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
	const ids = new Set(named)
	for (const r of fuzzy) {
		const n = (r.name || '').toLowerCase()
		if (
			n.includes('nganh') ||
			n.includes('ngành') ||
			n.includes('chu_nhiem') ||
			n.includes('cnk')
		) {
			ids.add(r.userId)
		}
	}
	return [...ids]
}

/**
 * CNK phụ trách đề theo môn/ngành.
 * 1) exam_faculty_heads: khoa của môn (1 CNK / khoa, mọi ngành)
 * 2) exam_major_heads: gán ngành legacy
 * 3) Fallback username cnk.{majorCode}
 */
export async function loadExamCnkUserIdsForMajor(
	majorId: number | null | undefined,
	majorCode?: string | null,
	facultyCode?: string | null
): Promise<number[]> {
	const ids = new Set<number>()

	let code = (majorCode || '').trim().toUpperCase()
	const mid =
		majorId != null && Number.isFinite(Number(majorId))
			? Number(majorId)
			: null
	let facCode = (facultyCode || '').trim().toUpperCase()

	// Resolve faculty code from major's subjects if missing
	if (!facCode && mid != null) {
		const [fac] = await orm
			.select({ code: examFaculties.code })
			.from(examSubjects)
			.innerJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.where(eq(examSubjects.majorId, mid))
			.limit(1)
		if (fac?.code) facCode = String(fac.code).toUpperCase()
	}

	// 1) CNK theo khoa (chính)
	if (facCode) {
		const facHeads = await orm
			.select({ userId: examFacultyHeads.userId })
			.from(examFacultyHeads)
			.where(eq(examFacultyHeads.facultyCode, facCode))
		for (const h of facHeads) {
			if (h.userId) ids.add(h.userId)
		}
	}

	// 2) CNK theo ngành (legacy)
	if (mid != null) {
		const heads = await orm
			.select({
				userId: examMajorHeads.userId
			})
			.from(examMajorHeads)
			.where(eq(examMajorHeads.majorId, mid))
		for (const h of heads) {
			if (h.userId) ids.add(h.userId)
		}
		if (!code) {
			const [maj] = await orm
				.select({ code: examMajors.code })
				.from(examMajors)
				.where(eq(examMajors.id, mid))
				.limit(1)
			code = (maj?.code || '').trim().toUpperCase()
		}
	}

	// Fallback: username khớp mã ngành (cnk.a_cdysdk ↔ A_CDYSDK)
	// Chỉ khi chưa có head
	if (code && !ids.size) {
		const short = code.toLowerCase()
		const tail = short.includes('_')
			? short.slice(short.lastIndexOf('_') + 1)
			: short
		const compact = short.replace(/_/g, '')
		const allCnk = await orm
			.select({ id: users.id, username: users.username })
			.from(users)
			.where(
				sql`(lower(${users.username}) like 'cnk.%' or lower(${users.username}) like 'user.%')`
			)
		for (const r of allCnk) {
			const un = (r.username || '').toLowerCase()
			const unTail = un.includes('.') ? un.slice(un.indexOf('.') + 1) : un
			if (
				un === `cnk.${short}` ||
				un === `user.${short}` ||
				un === `cnk.${tail}` ||
				un === `user.${tail}` ||
				unTail === short ||
				unTail === tail ||
				unTail === compact ||
				(tail.length >= 4 && unTail.includes(tail))
			) {
				ids.add(r.id)
			}
		}
	}

	if (!ids.size) {
		log.warn('loadExamCnkUserIdsForMajor: no CNK for major/faculty', {
			facultyCode: facCode,
			majorId: mid,
			majorCode: code
		})
	}

	return [...ids]
}

/** Ban Khảo thí = Trưởng phòng đào tạo */
export async function loadExamOfficeUserIds(): Promise<number[]> {
	const named = await userIdsByRoleNames(['exam_office'])
	const fuzzy = await orm
		.select({ userId: userRoles.userId, name: roles.name })
		.from(userRoles)
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
	const ids = new Set(named)
	for (const r of fuzzy) {
		const n = (r.name || '').toLowerCase()
		if (
			n.includes('khao_thi') ||
			n.includes('khảo thí') ||
			n.includes('dao_tao') ||
			n.includes('đào tạo') ||
			n.includes('tpdt')
		) {
			ids.add(r.userId)
		}
	}
	for (const id of await superAdminIds()) ids.add(id)
	return [...ids]
}

export async function notifyExamUsers(opts: {
	userIds: number[]
	title: string
	message: string
	actorId: number
	examId?: number
	excludeUserId?: number
}) {
	const seen = new Set<number>()
	const examTag = opts.examId ? ` [exam:${opts.examId}]` : ''
	const message = `${opts.message}${examTag}`

	for (const rid of opts.userIds) {
		if (!rid || rid === opts.excludeUserId) continue
		if (seen.has(rid)) continue
		seen.add(rid)
		try {
			await orm.insert(notifications).values({
				id: uuidv4(),
				notificationType: 'examWorkflow',
				title: opts.title,
				message,
				recipientId: rid,
				actorId: opts.actorId,
				isBatch: false,
				totalCount: 1
			})
		} catch (err) {
			log.warn('notifyExamUsers failed', {
				rid,
				err: err instanceof Error ? err.message : String(err)
			})
		}
	}
}

export async function notifyExamWorkflow(opts: {
	examId: number
	examTitle: string
	examCode: string
	actorId: number
	action: string
	fromStatus?: string | null
	toStatus?: string | null
	note?: string | null
	createdByUserId?: number | null
	/** Ngành / khoa của môn đề — lọc CNK (ưu tiên khoa) */
	majorId?: number | null
	majorCode?: string | null
	facultyCode?: string | null
}) {
	const label = `«${opts.examTitle}» (${opts.examCode})`
	const notePart = opts.note ? ` — ${opts.note}` : ''

	const cnkForMajor = () =>
		loadExamCnkUserIdsForMajor(
			opts.majorId,
			opts.majorCode,
			opts.facultyCode
		)

	// 1) Gửi duyệt → CNK đúng khoa (hoặc ngành legacy)
	if (opts.action === 'SUBMIT') {
		const userIds = await cnkForMajor()
		await notifyExamUsers({
			userIds,
			title: 'Đề thi chờ Chủ nhiệm khoa duyệt',
			message: `Có đề thuộc ngành bạn phụ trách cần duyệt: ${label}${notePart}`,
			actorId: opts.actorId,
			examId: opts.examId,
			excludeUserId: opts.actorId
		})
		return
	}

	// 2) CNK đạt → Ban Khảo thí (toàn ban — cấp trường)
	if (opts.action === 'APPROVE' && opts.toStatus === 'PENDING_EXAM_OFFICE') {
		await notifyExamUsers({
			userIds: await loadExamOfficeUserIds(),
			title: 'Đề thi chờ Ban Khảo thí thẩm định',
			message: `CNK đã duyệt, chuyển Ban KT thẩm định: ${label}${notePart}`,
			actorId: opts.actorId,
			examId: opts.examId,
			excludeUserId: opts.actorId
		})
		return
	}

	// 3) KT đạt → BGH
	if (opts.action === 'APPROVE' && opts.toStatus === 'PENDING_BGH') {
		await notifyExamUsers({
			userIds: await loadExamBghUserIds(),
			title: 'Đề thi chờ BGH phê duyệt',
			message: `Ban Khảo thí thẩm định đạt, chờ BGH phê duyệt & tạo QR: ${label}${notePart}`,
			actorId: opts.actorId,
			examId: opts.examId,
			excludeUserId: opts.actorId
		})
		return
	}

	// 4) BGH duyệt xong → GV soạn + CNK đúng ngành + Ban KT
	if (opts.action === 'APPROVE' && opts.toStatus === 'APPROVED') {
		const ids = new Set([
			...(await cnkForMajor()),
			...(await loadExamOfficeUserIds())
		])
		if (opts.createdByUserId) ids.add(opts.createdByUserId)
		await notifyExamUsers({
			userIds: [...ids],
			title: 'Đề thi đã được BGH phê duyệt',
			message: `Đề đã vào ngân hàng (khóa + QR): ${label}${notePart}`,
			actorId: opts.actorId,
			examId: opts.examId,
			excludeUserId: opts.actorId
		})
		return
	}

	// 5) Trả lại
	if (opts.action === 'RETURN') {
		// Ban KT trả về CNK đúng ngành
		if (opts.toStatus === 'PENDING_DEPT') {
			await notifyExamUsers({
				userIds: await cnkForMajor(),
				title: 'Ban Khảo thí trả đề về Chủ nhiệm khoa',
				message: `Đề ${label} không đạt thẩm định KT — trả về CNK phụ trách ngành${notePart}`,
				actorId: opts.actorId,
				examId: opts.examId,
				excludeUserId: opts.actorId
			})
			return
		}
		// BGH trả về Ban KT
		if (opts.toStatus === 'PENDING_EXAM_OFFICE') {
			await notifyExamUsers({
				userIds: await loadExamOfficeUserIds(),
				title: 'BGH trả đề về Ban Khảo thí',
				message: `Đề ${label} bị BGH trả về Ban Khảo thí${notePart}`,
				actorId: opts.actorId,
				examId: opts.examId,
				excludeUserId: opts.actorId
			})
			return
		}
		// CNK trả về người soạn — chỉ GV (không broadcast CNK khác)
		const ids = new Set<number>()
		if (opts.createdByUserId) ids.add(opts.createdByUserId)
		await notifyExamUsers({
			userIds: [...ids],
			title: 'Đề thi bị trả lại người soạn',
			message: `Đề ${label} bị Chủ nhiệm khoa trả về soạn lại${notePart}`,
			actorId: opts.actorId,
			examId: opts.examId,
			excludeUserId: opts.actorId
		})
		return
	}

	if (opts.action === 'GENERATE_QR') {
		const ids = new Set([
			...(await cnkForMajor()),
			...(await loadExamOfficeUserIds())
		])
		if (opts.createdByUserId) ids.add(opts.createdByUserId)
		await notifyExamUsers({
			userIds: [...ids],
			title: 'Đã tạo mã QR đề thi',
			message: `BGH đã tạo/cập nhật mã QR cho đề ${label}`,
			actorId: opts.actorId,
			examId: opts.examId,
			excludeUserId: opts.actorId
		})
	}
}
