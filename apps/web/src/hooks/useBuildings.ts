import {
	CreateBuilding,
	DeleteBuildings,
	GetBuilding,
	GetBuildings,
	GetBuildingTree,
	UpdateBuilding
} from '@/api/asset'
import type { CreateBuildingBody, UpdateBuildingBody } from '@/types/asset'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useBuildings() {
	return useQuery({
		queryKey: ['buildings'],
		queryFn: GetBuildings
	})
}

export function useBuildingTree() {
	return useQuery({
		queryKey: ['buildings', 'tree'],
		queryFn: GetBuildingTree
	})
}

export function useBuilding(id: number | undefined) {
	return useQuery({
		queryKey: ['buildings', id],
		queryFn: () => GetBuilding(id!),
		enabled: id !== undefined && !Number.isNaN(id)
	})
}

export function useBuildingMutations() {
	const qc = useQueryClient()
	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ['buildings'] })
		qc.invalidateQueries({ queryKey: ['floors'] })
		qc.invalidateQueries({ queryKey: ['rooms'] })
	}

	const create = useMutation({
		mutationFn: (body: CreateBuildingBody) => CreateBuilding(body),
		onSuccess: invalidate
	})
	const update = useMutation({
		mutationFn: ({ id, body }: { id: number; body: UpdateBuildingBody }) =>
			UpdateBuilding(id, body),
		onSuccess: invalidate
	})
	const remove = useMutation({
		mutationFn: (ids: number[]) => DeleteBuildings(ids),
		onSuccess: invalidate
	})

	return { create, update, remove }
}
