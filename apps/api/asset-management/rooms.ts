import { api, Query } from 'encore.dev/api'
import log from 'encore.dev/log'
import type { RoomDB } from '../schema/rooms'
import type { RoomProfile } from './index'
import assetController from './controller'
import {
	formatAccountLabel,
	logRoomAccountChange,
	logRoomAccountDeleteBefore
} from './account-audit'
import {
	deleteUserForRoomAccount,
	upsertUserFromRoomAccount
} from './room-account-users'
import { roomRepo } from './repo'

export interface RoomResponse {
	id: number
	createdAt: string
	updatedAt: string
	floorId: number
	roomCode: string
	roomName: string
	roomType: string | null
	manager: string | null
	managerCode: string | null
	/** Có mật khẩu tài khoản (không trả hash) */
	hasAccountPassword: boolean
	capacity: number
	status: string
	description: string | null
	/** Lớp gắn phòng dạy (null = chưa gán) */
	classId: number | null
}

interface RoomBody {
	floorId: number
	roomCode: string
	roomName: string
	roomType?: string
	manager?: string
	managerCode?: string
	/** Plain password — server hash; mặc định 123456 nếu có tài khoản */
	accountPassword?: string
	capacity?: number
	status?: string
	description?: string
	classId?: number | null
}

interface UpdateRoomBody {
	floorId?: number
	roomCode?: string
	roomName?: string
	roomType?: string
	manager?: string
	/** Mã tài khoản — được phép sửa */
	managerCode?: string
	/** Plain password mới; bỏ trống = giữ cũ */
	accountPassword?: string
	capacity?: number
	status?: string
	description?: string
	classId?: number | null
}

interface DeleteRoomsBody {
	ids: number[]
}

interface GetRoomsQuery {
	floorId?: Query<number>
	buildingId?: Query<number>
	status?: Query<string>
}

function toRoomResponse(r: RoomDB): RoomResponse {
	const hasPw =
		r.hasAccountPassword === true ||
		!!(r as RoomDB & { accountPassword?: string | null }).accountPassword
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		floorId: r.floorId,
		roomCode: r.roomCode,
		roomName: r.roomName,
		roomType: r.roomType ?? null,
		manager: r.manager ?? null,
		managerCode: r.managerCode ?? null,
		hasAccountPassword: hasPw,
		capacity: r.capacity ?? 0,
		status: r.status ?? 'ACTIVE',
		description: r.description ?? null,
		classId: r.classId ?? null
	}
}

export const CreateRoom = api(
	{ auth: true, expose: true, method: 'POST', path: '/rooms' },
	async (body: RoomBody): Promise<{ data: RoomResponse }> => {
		log.trace('CreateRoom', { body })
		const created = await assetController.createRoom(body)
		await logRoomAccountChange({ action: 'CREATE', room: created })
		// Có mã TK phòng → đồng bộ user (pending nếu chưa gán role)
		if ((created.managerCode || '').trim()) {
			await upsertUserFromRoomAccount(created, {
				plainPassword: body.accountPassword || '123456'
			})
		}
		return { data: toRoomResponse(created) }
	}
)

export const GetRooms = api(
	{ auth: true, expose: true, method: 'GET', path: '/rooms' },
	async (q: GetRoomsQuery): Promise<{ data: RoomResponse[] }> => {
		const list = await assetController.listRooms({
			floorId: q.floorId,
			buildingId: q.buildingId,
			status: q.status
		})
		return { data: list.map(toRoomResponse) }
	}
)

/** Kho hệ thống KHO-VT (tự tạo nếu chưa có) — VT thu hồi / trả trên */
export const GetWarehouseRoom = api(
	{ auth: true, expose: true, method: 'GET', path: '/rooms/warehouse' },
	async (): Promise<{ data: RoomResponse }> => {
		const room = await assetController.ensureSystemWarehouse()
		return { data: toRoomResponse(room) }
	}
)

export const GetRoom = api(
	{ auth: true, expose: true, method: 'GET', path: '/rooms/:id' },
	async ({ id }: { id: number }): Promise<{ data: RoomResponse }> => {
		const room = await assetController.getRoom(id)
		return { data: toRoomResponse(room) }
	}
)

/** Full room profile: general info + assets + images + 3 log streams */
export const GetRoomProfile = api(
	{ auth: true, expose: true, method: 'GET', path: '/rooms/:id/profile' },
	async ({ id }: { id: number }): Promise<{ data: RoomProfile }> => {
		const profile = await assetController.getRoomProfile(id)
		return { data: profile }
	}
)

export const UpdateRoom = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/rooms/:id' },
	async ({
		id,
		...body
	}: UpdateRoomBody & { id: number }): Promise<{ data: RoomResponse }> => {
		log.trace('UpdateRoom', { id, body })
		const before = await roomRepo.findById(id)
		const updated = await assetController.updateRoom({ id, ...body })
		await logRoomAccountChange({
			action: 'UPDATE',
			room: updated,
			before: before
				? {
						roomCode: before.roomCode,
						roomName: before.roomName,
						accountLabel: formatAccountLabel(
							before.manager,
							before.managerCode
						)
					}
				: null
		})
		// Có mã TK phòng → đồng bộ user (đổi mã / mật khẩu / tên)
		if ((updated.managerCode || '').trim()) {
			await upsertUserFromRoomAccount(updated, {
				plainPassword: body.accountPassword,
				oldManagerCode: before?.managerCode
			})
		} else if (before?.managerCode) {
			// Gỡ mã TK phòng → xóa user đồng bộ (nếu không super)
			await deleteUserForRoomAccount(before.managerCode)
		}
		return { data: toRoomResponse(updated) }
	}
)

export const DeleteRooms = api(
	{ auth: true, expose: true, method: 'POST', path: '/rooms/delete' },
	async (body: DeleteRoomsBody): Promise<{ ids: number[] }> => {
		log.trace('DeleteRooms', { body })
		// Ghi log + xóa user đồng bộ trước khi xóa phòng
		const toDelete = await roomRepo.findByIds(body.ids)
		await logRoomAccountDeleteBefore(body.ids)
		for (const r of toDelete) {
			await deleteUserForRoomAccount(r.managerCode)
		}
		await assetController.deleteRooms(body.ids)
		return { ids: body.ids }
	}
)

/**
 * Chỉ reset mật khẩu tài khoản phòng về mặc định 123456.
 * Không đổi mã / tên tài khoản.
 */
export const ResetRoomAccount = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/rooms/:id/reset-account'
	},
	async ({
		id
	}: {
		id: number
	}): Promise<{ data: RoomResponse; defaultPassword: string }> => {
		const before = await roomRepo.findById(id)
		const updated = await assetController.resetRoomAccount(id)
		await logRoomAccountChange({
			action: 'UPDATE',
			room: updated,
			before: before
				? {
						roomCode: before.roomCode,
						roomName: before.roomName,
						accountLabel: formatAccountLabel(
							before.manager,
							before.managerCode
						)
					}
				: null
		})
		if (updated.managerCode) {
			await upsertUserFromRoomAccount(updated, {
				plainPassword: '123456'
			})
		}
		return {
			data: toRoomResponse(updated),
			defaultPassword: '123456'
		}
	}
)
