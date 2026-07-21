import {
	CreateInventoryLog,
	CreateRepairLog,
	CreateReplacementLog,
	CreateRoomAsset,
	CreateRoomImage,
	DeleteInventoryLogs,
	DeleteRepairLogs,
	DeleteReplacementLogs,
	DeleteRoomAssets,
	DeleteRoomImages,
	GetRoomProfile,
	UpdateRoom,
	UpdateRoomAsset
} from '@/api/asset'
import type {
	CreateInventoryLogBody,
	CreateRepairLogBody,
	CreateReplacementLogBody,
	CreateRoomAssetBody,
	CreateRoomImageBody,
	UpdateRoomAssetBody,
	UpdateRoomBody
} from '@/types/asset'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useRoomProfile(roomId: number | undefined) {
	return useQuery({
		queryKey: ['room-profile', roomId],
		queryFn: () => GetRoomProfile(roomId!),
		enabled: roomId !== undefined && !Number.isNaN(roomId)
	})
}

export function useRoomProfileMutations(roomId: number) {
	const qc = useQueryClient()
	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ['room-profile', roomId] })
		qc.invalidateQueries({ queryKey: ['rooms'] })
		qc.invalidateQueries({ queryKey: ['buildings'] })
	}

	const updateRoom = useMutation({
		mutationFn: (body: UpdateRoomBody) => UpdateRoom(roomId, body),
		onSuccess: invalidate
	})

	const createAsset = useMutation({
		mutationFn: (body: CreateRoomAssetBody) => CreateRoomAsset(body),
		onSuccess: invalidate
	})
	const updateAsset = useMutation({
		mutationFn: ({ id, body }: { id: number; body: UpdateRoomAssetBody }) =>
			UpdateRoomAsset(id, body),
		onSuccess: invalidate
	})
	const deleteAssets = useMutation({
		mutationFn: (ids: number[]) => DeleteRoomAssets(ids),
		onSuccess: invalidate
	})

	const createImage = useMutation({
		mutationFn: (body: CreateRoomImageBody) => CreateRoomImage(body),
		onSuccess: invalidate
	})
	const deleteImages = useMutation({
		mutationFn: (ids: number[]) => DeleteRoomImages(ids),
		onSuccess: invalidate
	})

	const createRepair = useMutation({
		mutationFn: (body: CreateRepairLogBody) => CreateRepairLog(body),
		onSuccess: invalidate
	})
	const deleteRepairs = useMutation({
		mutationFn: (ids: number[]) => DeleteRepairLogs(ids),
		onSuccess: invalidate
	})

	const createInventory = useMutation({
		mutationFn: (body: CreateInventoryLogBody) => CreateInventoryLog(body),
		onSuccess: invalidate
	})
	const deleteInventories = useMutation({
		mutationFn: (ids: number[]) => DeleteInventoryLogs(ids),
		onSuccess: invalidate
	})

	const createReplacement = useMutation({
		mutationFn: (body: CreateReplacementLogBody) =>
			CreateReplacementLog(body),
		onSuccess: invalidate
	})
	const deleteReplacements = useMutation({
		mutationFn: (ids: number[]) => DeleteReplacementLogs(ids),
		onSuccess: invalidate
	})

	return {
		updateRoom,
		createAsset,
		updateAsset,
		deleteAssets,
		createImage,
		deleteImages,
		createRepair,
		deleteRepairs,
		createInventory,
		deleteInventories,
		createReplacement,
		deleteReplacements
	}
}
