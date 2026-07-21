/**
 * Nhật ký thao tác tài khoản (phòng).
 * Gọi sau create / update / delete room — mọi user & admin.
 */
import { api, Query } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import log from 'encore.dev/log'
import type { Room } from '../schema/rooms'
import type { AccountAuditLogDB } from '../schema/account-audit-logs'
import userRepo from '../users/repo'
import { accountAuditLogRepo, roomRepo } from './repo'

export interface AccountAuditLogResponse {
	id: number
	createdAt: string
	action: string
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	actorIsAdmin: boolean
	roomId: number | null
	roomCode: string | null
	roomName: string | null
	address: string | null
	floorName: string | null
	buildingCode: string | null
	buildingName: string | null
	accountLabel: string | null
	summary: string
	details: string | null
}

function toResponse(row: AccountAuditLogDB): AccountAuditLogResponse {
	return {
		id: row.id,
		createdAt: row.createdAt,
		action: row.action,
		actorUserId: row.actorUserId ?? null,
		actorUsername: row.actorUsername ?? null,
		actorDisplayName: row.actorDisplayName ?? null,
		actorIsAdmin: !!row.actorIsAdmin,
		roomId: row.roomId ?? null,
		roomCode: row.roomCode ?? null,
		roomName: row.roomName ?? null,
		address: row.address ?? null,
		floorName: row.floorName ?? null,
		buildingCode: row.buildingCode ?? null,
		buildingName: row.buildingName ?? null,
		accountLabel: row.accountLabel ?? null,
		summary: row.summary,
		details: row.details ?? null
	}
}

export function formatAccountLabel(
	manager?: string | null,
	managerCode?: string | null
): string {
	const name = (manager ?? '').trim()
	const code = (managerCode ?? '').trim()
	if (name && code) return `${name} (${code})`
	return name || code || ''
}

export async function resolveActor(): Promise<{
	userId: number | null
	username: string | null
	displayName: string | null
	isAdmin: boolean
}> {
	try {
		const auth = getAuthData()
		if (!auth?.userID) {
			return {
				userId: null,
				username: null,
				displayName: null,
				isAdmin: false
			}
		}
		const userId = Number(auth.userID)
		const isAdmin = !!auth.isSuperAdmin
		try {
			const u = await userRepo.findOne({ id: userId } as any)
			return {
				userId,
				username: u.username ?? null,
				displayName: u.displayName ?? u.username ?? null,
				isAdmin: isAdmin || !!u.isSuperUser
			}
		} catch {
			return {
				userId,
				username: null,
				displayName: `User #${userId}`,
				isAdmin
			}
		}
	} catch {
		return {
			userId: null,
			username: null,
			displayName: null,
			isAdmin: false
		}
	}
}

function locationFromRoom(room: Room | undefined | null) {
	const floor = room?.floor
	const building = floor?.building
	return {
		floorName: floor?.name ?? null,
		buildingCode: building?.code ?? null,
		buildingName: building?.name ?? null,
		address: building?.address ?? null
	}
}

export async function logRoomAccountChange(opts: {
	action: 'CREATE' | 'UPDATE' | 'DELETE'
	room:
		| Room
		| {
				id: number
				roomCode: string
				roomName: string
				manager?: string | null
				managerCode?: string | null
				floorId?: number
		  }
	before?: {
		roomCode?: string | null
		roomName?: string | null
		accountLabel?: string | null
	} | null
}): Promise<void> {
	try {
		const actor = await resolveActor()
		let roomFull: Room | undefined
		if ('floor' in opts.room && (opts.room as Room).floor) {
			roomFull = opts.room as Room
		} else if (opts.action !== 'DELETE') {
			roomFull = await roomRepo.findById(opts.room.id)
		} else {
			// DELETE: room may already be gone; try load if still present
			roomFull = await roomRepo
				.findById(opts.room.id)
				.catch(() => undefined)
		}

		const loc = locationFromRoom(roomFull ?? null)
		// For delete after DB delete, roomFull is empty — use passed room snapshot
		const roomCode = opts.room.roomCode
		const roomName = opts.room.roomName
		const accountLabel = formatAccountLabel(
			opts.room.manager,
			opts.room.managerCode
		)

		// If we still have floor on deleted snapshot via before-load
		let address = loc.address
		let floorName = loc.floorName
		let buildingCode = loc.buildingCode
		let buildingName = loc.buildingName

		if (opts.action === 'DELETE' && !roomFull && opts.room.floorId) {
			// best-effort: nothing more
		}

		const actorLabel =
			actor.displayName ||
			actor.username ||
			(actor.userId != null ? `User #${actor.userId}` : 'Hệ thống')
		const roleTag = actor.isAdmin ? 'admin' : 'user'
		const actionVi =
			opts.action === 'CREATE'
				? 'thêm'
				: opts.action === 'UPDATE'
					? 'sửa'
					: 'xóa'

		const summary = `[${roleTag}] ${actorLabel} ${actionVi} tài khoản ${roomCode || roomName || `#${opts.room.id}`}${
			accountLabel ? ` — ${accountLabel}` : ''
		}`

		let details: string | null = null
		if (opts.action === 'UPDATE' && opts.before) {
			const changes: string[] = []
			if (
				opts.before.roomCode != null &&
				opts.before.roomCode !== roomCode
			) {
				changes.push(`mã: ${opts.before.roomCode} → ${roomCode}`)
			}
			if (
				opts.before.roomName != null &&
				opts.before.roomName !== roomName
			) {
				changes.push(`tên: ${opts.before.roomName} → ${roomName}`)
			}
			if (
				opts.before.accountLabel != null &&
				opts.before.accountLabel !== accountLabel
			) {
				changes.push(
					`tài khoản: ${opts.before.accountLabel || '—'} → ${accountLabel || '—'}`
				)
			}
			if (changes.length) details = changes.join('; ')
		}

		// Prefer location from full room when available
		if (roomFull) {
			const l2 = locationFromRoom(roomFull)
			address = l2.address
			floorName = l2.floorName
			buildingCode = l2.buildingCode
			buildingName = l2.buildingName
		}

		await accountAuditLogRepo.create({
			action: opts.action,
			actorUserId: actor.userId,
			actorUsername: actor.username,
			actorDisplayName: actor.displayName,
			actorIsAdmin: actor.isAdmin,
			roomId: opts.action === 'DELETE' ? null : opts.room.id,
			roomCode,
			roomName,
			address,
			floorName,
			buildingCode,
			buildingName,
			accountLabel: accountLabel || null,
			summary,
			details
		})
	} catch (err) {
		// Không chặn thao tác chính nếu ghi log lỗi
		log.error('logRoomAccountChange failed', { err })
	}
}

/**
 * Ghi log DELETE **trước** khi xóa phòng (còn đủ snapshot vị trí).
 */
export async function logRoomAccountDeleteBefore(
	roomIds: number[]
): Promise<void> {
	for (const id of roomIds) {
		const room = await roomRepo.findById(id)
		if (!room) continue
		const actor = await resolveActor()
		const loc = locationFromRoom(room)
		const accountLabel = formatAccountLabel(room.manager, room.managerCode)
		const actorLabel =
			actor.displayName ||
			actor.username ||
			(actor.userId != null ? `User #${actor.userId}` : 'Hệ thống')
		const roleTag = actor.isAdmin ? 'admin' : 'user'
		const summary = `[${roleTag}] ${actorLabel} xóa tài khoản ${room.roomCode}${
			accountLabel ? ` — ${accountLabel}` : ''
		}`
		try {
			await accountAuditLogRepo.create({
				action: 'DELETE',
				actorUserId: actor.userId,
				actorUsername: actor.username,
				actorDisplayName: actor.displayName,
				actorIsAdmin: actor.isAdmin,
				roomId: null,
				roomCode: room.roomCode,
				roomName: room.roomName,
				address: loc.address,
				floorName: loc.floorName,
				buildingCode: loc.buildingCode,
				buildingName: loc.buildingName,
				accountLabel: accountLabel || null,
				summary,
				details: null
			})
		} catch (err) {
			log.error('logRoomAccountDeleteBefore failed', { err, id })
		}
	}
}

interface GetAccountAuditLogsQuery {
	q?: Query<string>
	limit?: Query<number>
}

export const GetAccountAuditLogs = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/account-audit-logs'
	},
	async (
		query: GetAccountAuditLogsQuery
	): Promise<{ data: AccountAuditLogResponse[] }> => {
		const list = await accountAuditLogRepo.find({
			search: query.q,
			limit: query.limit != null ? Number(query.limit) : 200
		})
		return { data: list.map(toResponse) }
	}
)
