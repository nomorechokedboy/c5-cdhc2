import {
	CreateRoom,
	DeleteRooms,
	GetRooms,
	ResetRoomAccount,
	UpdateRoom
} from '@/api/asset'
import type { CreateRoomBody, UpdateRoomBody } from '@/types/asset'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useRooms(params?: {
	floorId?: number
	buildingId?: number
	status?: string
}) {
	return useQuery({
		queryKey: ['rooms', params],
		queryFn: () => GetRooms(params),
		enabled:
			params?.floorId !== undefined ||
			params?.buildingId !== undefined ||
			params === undefined
	})
}

export function useRoomMutations() {
	const qc = useQueryClient()
	/** Làm mới tòa/phòng + danh sách người dùng (TK phòng → users) */
	const invalidate = async () => {
		await Promise.all([
			qc.invalidateQueries({ queryKey: ['rooms'] }),
			qc.invalidateQueries({ queryKey: ['buildings'] }),
			qc.invalidateQueries({ queryKey: ['floors'] }),
			qc.invalidateQueries({ queryKey: ['room-profile'] }),
			qc.invalidateQueries({ queryKey: ['account-audit-logs'] }),
			qc.invalidateQueries({ queryKey: ['pending-room-accounts'] }),
			// Badge đỏ «chờ cấp quyền» khi tạo TK phòng → user pending
			qc.invalidateQueries({ queryKey: ['pending-permissions'] }),
			qc.invalidateQueries({ queryKey: ['users'] })
		])
		// Bắt buộc refetch ngay (kể cả query đang mount / inactive)
		await Promise.all([
			qc.refetchQueries({ queryKey: ['users'], type: 'all' }),
			qc.refetchQueries({
				queryKey: ['pending-permissions'],
				type: 'all'
			}),
			qc.refetchQueries({
				queryKey: ['pending-room-accounts'],
				type: 'all'
			})
		])
	}

	const create = useMutation({
		mutationFn: (body: CreateRoomBody) => CreateRoom(body),
		onSuccess: () => invalidate()
	})
	const update = useMutation({
		mutationFn: ({ id, body }: { id: number; body: UpdateRoomBody }) =>
			UpdateRoom(id, body),
		onSuccess: () => invalidate()
	})
	const remove = useMutation({
		mutationFn: (ids: number[]) => DeleteRooms(ids),
		onSuccess: () => invalidate()
	})
	const resetAccount = useMutation({
		mutationFn: (id: number) => ResetRoomAccount(id),
		onSuccess: () => invalidate()
	})

	return { create, update, remove, resetAccount }
}
