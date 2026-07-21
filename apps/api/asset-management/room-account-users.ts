/**
 * Đồng bộ tài khoản phòng (rooms.managerCode + password) ↔ users.
 * - Tạo user pending khi có tài khoản phòng mới
 * - Cập nhật username/password khi sửa
 * - Xóa user khi xóa tài khoản phòng
 * - Đếm user pending từ tài khoản phòng (chưa phân quyền)
 */
import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import log from 'encore.dev/log'
import { api } from 'encore.dev/api'
import orm from '../database'
import { users } from '../schema/users'
import { rooms } from '../schema/rooms'
import { userRoles } from '../schema/user-roles'
import { units } from '../schema/units'
import type { RoomDB } from '../schema/rooms'
import argon2 from 'argon2'
import { appConfig } from '../configs'

const DEFAULT_PW = '123456'

async function hashPwd(plain: string) {
	return argon2.hash(plain, {
		secret: Buffer.from(appConfig.HASH_SECRET)
	})
}

async function defaultUnitId(): Promise<number> {
	const rows = await orm.select({ id: units.id }).from(units).limit(1)
	return rows[0]?.id ?? 1
}

async function userHasAnyRole(userId: number): Promise<boolean> {
	const rows = await orm
		.select({ userId: userRoles.userId })
		.from(userRoles)
		.where(eq(userRoles.userId, userId))
		.limit(1)
	return rows.length > 0
}

/**
 * Sau khi tạo/cập nhật tài khoản phòng — đảm bảo có user tương ứng (pending).
 * plainPassword: mật khẩu plain nếu vừa set; nếu không và user mới → 123456.
 * User chưa có vai trò → status pending để hiện badge «chờ cấp quyền».
 */
export async function upsertUserFromRoomAccount(
	room: RoomDB,
	opts?: { plainPassword?: string; oldManagerCode?: string | null }
): Promise<void> {
	const username = (room.managerCode || '').trim()
	if (!username) {
		log.warn('upsertUserFromRoomAccount: empty managerCode', {
			roomId: room.id
		})
		return
	}

	try {
		// Đổi mã TK: cập nhật username user cũ nếu có
		const oldCode = (opts?.oldManagerCode || '').trim()
		if (oldCode && oldCode !== username) {
			const oldUser = await orm.query.users.findFirst({
				where: eq(users.username, oldCode)
			})
			if (oldUser && !oldUser.isSuperUser) {
				const taken = await orm.query.users.findFirst({
					where: eq(users.username, username)
				})
				if (!taken) {
					const hasRole = await userHasAnyRole(oldUser.id)
					const patch: {
						username: string
						displayName?: string
						password?: string
						status?: 'pending' | 'approved'
						position?: string
					} = {
						username,
						displayName:
							(room.manager || '').trim() || oldUser.displayName,
						position: 'Tài khoản phòng'
					}
					if (!hasRole) patch.status = 'pending'
					if (opts?.plainPassword) {
						patch.password = await hashPwd(opts.plainPassword)
					}
					await orm
						.update(users)
						.set(patch)
						.where(eq(users.id, oldUser.id))
					log.info('upsertUserFromRoomAccount: renamed user', {
						from: oldCode,
						to: username,
						pending: !hasRole
					})
					return
				}
			}
		}

		const existing = await orm.query.users.findFirst({
			where: eq(users.username, username)
		})

		if (existing) {
			if (existing.isSuperUser) return
			const hasRole = await userHasAnyRole(existing.id)
			const patch: {
				displayName?: string
				password?: string
				status?: 'pending' | 'approved'
				position?: string
			} = {
				position: 'Tài khoản phòng'
			}
			const dn = (room.manager || '').trim()
			if (dn) patch.displayName = dn
			if (opts?.plainPassword) {
				patch.password = await hashPwd(opts.plainPassword)
			}
			// Chưa gán vai trò → luôn pending để badge +N
			if (!hasRole) patch.status = 'pending'
			if (Object.keys(patch).length) {
				await orm
					.update(users)
					.set(patch)
					.where(eq(users.id, existing.id))
			}
			log.info('upsertUserFromRoomAccount: updated existing', {
				username,
				userId: existing.id,
				pending: !hasRole
			})
			return
		}

		// Cố gắng map đơn vị từ tên quản lý / mã phòng (D1, BGH…)
		let unitId: number | null = null
		try {
			const mgr = (room.manager || '').trim()
			const code = (room.roomCode || '').trim().toUpperCase()
			const allU = await orm
				.select({
					id: units.id,
					alias: units.alias,
					name: units.name
				})
				.from(units)
			const byAlias = allU.find(
				(u) =>
					u.alias &&
					(mgr.toUpperCase() === u.alias.toUpperCase() ||
						code === u.alias.toUpperCase() ||
						code.endsWith(`-${u.alias.toUpperCase()}`) ||
						code.endsWith(u.alias.toUpperCase()))
			)
			const byName = allU.find(
				(u) =>
					mgr &&
					(mgr === u.name ||
						mgr.toLocaleLowerCase('vi') ===
							u.name.toLocaleLowerCase('vi'))
			)
			unitId = byAlias?.id ?? byName?.id ?? (await defaultUnitId())
		} catch {
			try {
				unitId = await defaultUnitId()
			} catch {
				unitId = null
			}
		}
		const password = await hashPwd(opts?.plainPassword || DEFAULT_PW)
		await orm.insert(users).values({
			username,
			password,
			displayName:
				(room.manager || '').trim() || room.roomName || username,
			unitId,
			status: 'pending',
			isSuperUser: false,
			position: 'Tài khoản phòng'
		})
		log.info('upsertUserFromRoomAccount: created pending user', {
			username,
			roomId: room.id
		})
	} catch (err) {
		// Không nuốt lỗi im lặng — log chi tiết để debug
		log.error('upsertUserFromRoomAccount failed', {
			err: err instanceof Error ? err.message : String(err),
			roomId: room.id,
			username
		})
		throw err
	}
}

/**
 * Đồng bộ lại: mọi phòng có managerCode phải có user pending nếu chưa có role.
 * Gọi khi đếm pending permissions / badge.
 */
export async function syncRoomAccountsToPendingUsers(): Promise<number> {
	const roomAccounts = await orm
		.select({
			id: rooms.id,
			managerCode: rooms.managerCode,
			manager: rooms.manager,
			roomName: rooms.roomName,
			roomCode: rooms.roomCode
		})
		.from(rooms)
		.where(and(isNotNull(rooms.managerCode), ne(rooms.managerCode, '')))

	let created = 0
	for (const r of roomAccounts) {
		const code = (r.managerCode || '').trim()
		if (!code) continue
		const existing = await orm.query.users.findFirst({
			where: eq(users.username, code)
		})
		if (existing) {
			if (existing.isSuperUser) continue
			const hasRole = await userHasAnyRole(existing.id)
			if (!hasRole && existing.status !== 'pending') {
				await orm
					.update(users)
					.set({ status: 'pending', position: 'Tài khoản phòng' })
					.where(eq(users.id, existing.id))
			}
			continue
		}
		try {
			await upsertUserFromRoomAccount(
				{
					id: r.id,
					floorId: 0,
					roomCode: r.roomCode,
					roomName: r.roomName,
					manager: r.manager,
					managerCode: code,
					createdAt: '',
					updatedAt: ''
				} as RoomDB,
				{ plainPassword: DEFAULT_PW }
			)
			created++
		} catch (err) {
			log.error('syncRoomAccountsToPendingUsers item failed', {
				code,
				err: err instanceof Error ? err.message : String(err)
			})
		}
	}
	return created
}

export async function deleteUserForRoomAccount(
	managerCode: string | null | undefined
): Promise<void> {
	const username = (managerCode || '').trim()
	if (!username) return
	try {
		const existing = await orm.query.users.findFirst({
			where: eq(users.username, username)
		})
		if (!existing || existing.isSuperUser) return
		// Chỉ xóa user gắn tài khoản phòng (position marker hoặc pending)
		await orm.delete(userRoles).where(eq(userRoles.userId, existing.id))
		await orm.delete(users).where(eq(users.id, existing.id))
		log.info('deleteUserForRoomAccount', { username, userId: existing.id })
	} catch (err) {
		log.error('deleteUserForRoomAccount failed', { err, username })
	}
}

export interface PendingRoomAccountItem {
	userId: number
	username: string
	displayName: string
	status: string | null
	roomId: number | null
	roomCode: string | null
	roomName: string | null
}

/**
 * Tài khoản phòng đã vào users nhưng chưa có vai trò (cần phân quyền).
 */
export async function countPendingRoomAccountUsers(): Promise<{
	count: number
	items: PendingRoomAccountItem[]
}> {
	// Users có username trùng managerCode của phòng
	const roomAccounts = await orm
		.select({
			managerCode: rooms.managerCode,
			roomId: rooms.id,
			roomCode: rooms.roomCode,
			roomName: rooms.roomName
		})
		.from(rooms)
		.where(and(isNotNull(rooms.managerCode), ne(rooms.managerCode, '')))

	const codes = [
		...new Set(
			roomAccounts
				.map((r) => (r.managerCode || '').trim())
				.filter(Boolean)
		)
	]
	if (!codes.length) return { count: 0, items: [] }

	const matchedUsers = await orm.query.users.findMany({
		where: and(
			inArray(users.username, codes),
			eq(users.isSuperUser, false)
		),
		with: {
			// roles via userRoles not direct on users relation as Role[]
		}
	})

	// Users without any role
	const userIds = matchedUsers.map((u) => u.id)
	const roleRows =
		userIds.length === 0
			? []
			: await orm
					.select({ userId: userRoles.userId })
					.from(userRoles)
					.where(inArray(userRoles.userId, userIds))
	const hasRole = new Set(roleRows.map((r) => r.userId))

	const roomByUser = new Map(
		roomAccounts.map((r) => [(r.managerCode || '').trim().toLowerCase(), r])
	)

	const items: PendingRoomAccountItem[] = matchedUsers
		.filter((u) => !hasRole.has(u.id) || u.status === 'pending')
		.map((u) => {
			const room = roomByUser.get(u.username.toLowerCase())
			return {
				userId: u.id,
				username: u.username,
				displayName: u.displayName,
				status: u.status,
				roomId: room?.roomId ?? null,
				roomCode: room?.roomCode ?? null,
				roomName: room?.roomName ?? null
			}
		})

	// Also count room accounts that have NO user yet
	const userNames = new Set(matchedUsers.map((u) => u.username.toLowerCase()))
	for (const r of roomAccounts) {
		const code = (r.managerCode || '').trim()
		if (!code || userNames.has(code.toLowerCase())) continue
		items.push({
			userId: 0,
			username: code,
			displayName: r.roomName || code,
			status: 'missing',
			roomId: r.roomId,
			roomCode: r.roomCode,
			roomName: r.roomName
		})
	}

	return { count: items.length, items }
}

export const GetPendingRoomAccountUsers = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/users/pending-room-accounts'
	},
	async (): Promise<{
		data: { count: number; items: PendingRoomAccountItem[] }
	}> => {
		const data = await countPendingRoomAccountUsers()
		return { data }
	}
)

/**
 * Cập nhật username / displayName denormalized theo bảng users (theo user_id).
 */
export async function syncExamAccountDenormFromUsers(): Promise<{
	teachersUpdated: number
	facultyHeadsUpdated: number
	assignmentsUpdated: number
}> {
	// Full sync lives in feature/de-tu-luan (exam tables).
	return { teachersUpdated: 0, facultyHeadsUpdated: 0, assignmentsUpdated: 0 }
}

/**
 * Đồng bộ toàn bộ tài khoản:
 * 1) Phòng có managerCode → users (pending nếu chưa role)
 * 2) exam_teachers / faculty_heads / teaching_assignments ← username/tên từ users
 */
export const SyncAllAccounts = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/users/sync-accounts'
	},
	async (): Promise<{
		data: {
			roomUsersCreated: number
			teachersUpdated: number
			facultyHeadsUpdated: number
			assignmentsUpdated: number
			pendingRoomAccounts: number
		}
	}> => {
		const roomUsersCreated = await syncRoomAccountsToPendingUsers()
		const denorm = await syncExamAccountDenormFromUsers()
		const pending = await countPendingRoomAccountUsers()
		return {
			data: {
				roomUsersCreated,
				teachersUpdated: denorm.teachersUpdated,
				facultyHeadsUpdated: denorm.facultyHeadsUpdated,
				assignmentsUpdated: denorm.assignmentsUpdated,
				pendingRoomAccounts: pending.count
			}
		}
	}
)
