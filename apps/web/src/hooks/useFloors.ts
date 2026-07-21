import { CreateFloor, DeleteFloors, GetFloors, UpdateFloor } from '@/api/asset'
import type { CreateFloorBody, UpdateFloorBody } from '@/types/asset'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useFloors(buildingId?: number) {
	return useQuery({
		queryKey: ['floors', { buildingId }],
		queryFn: () => GetFloors(buildingId),
		enabled: buildingId !== undefined
	})
}

export function useFloorMutations() {
	const qc = useQueryClient()
	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ['floors'] })
		qc.invalidateQueries({ queryKey: ['buildings'] })
		qc.invalidateQueries({ queryKey: ['rooms'] })
	}

	const create = useMutation({
		mutationFn: (body: CreateFloorBody) => CreateFloor(body),
		onSuccess: invalidate
	})
	const update = useMutation({
		mutationFn: ({ id, body }: { id: number; body: UpdateFloorBody }) =>
			UpdateFloor(id, body),
		onSuccess: invalidate
	})
	const remove = useMutation({
		mutationFn: (ids: number[]) => DeleteFloors(ids),
		onSuccess: invalidate
	})

	return { create, update, remove }
}
