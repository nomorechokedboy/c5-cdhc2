import {
	AssignRepairRequest,
	CancelRepairRequest,
	CompleteRepairRequest,
	CreateRepairRequest,
	GetRepairRequests
} from '@/api/asset'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useRepairRequests(
	params?: {
		roomId?: number
		status?: string
	},
	options?: { enabled?: boolean }
) {
	return useQuery({
		queryKey: ['repair-requests', params],
		queryFn: () => GetRepairRequests(params),
		enabled: options?.enabled ?? true
	})
}

export function useRepairRequestMutations() {
	const qc = useQueryClient()
	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ['repair-requests'] })
		qc.invalidateQueries({ queryKey: ['room-profile'] })
		qc.invalidateQueries({ queryKey: ['room-assets'] })
		qc.invalidateQueries({ queryKey: ['asset-reports'] })
		qc.invalidateQueries({ queryKey: ['rooms'] })
	}

	const create = useMutation({
		mutationFn: CreateRepairRequest,
		onSuccess: invalidate
	})
	const assign = useMutation({
		mutationFn: ({
			id,
			...body
		}: {
			id: number
			assignedToName: string
			repairStartedAt?: string
			adminNote?: string
			startRepair?: boolean
		}) => AssignRepairRequest(id, body),
		onSuccess: invalidate
	})
	const complete = useMutation({
		mutationFn: ({
			id,
			...body
		}: {
			id: number
			completedAt?: string
			adminNote?: string
		}) => CompleteRepairRequest(id, body),
		onSuccess: invalidate
	})
	const cancel = useMutation({
		mutationFn: ({ id, adminNote }: { id: number; adminNote?: string }) =>
			CancelRepairRequest(id, { adminNote }),
		onSuccess: invalidate
	})

	return { create, assign, complete, cancel }
}
