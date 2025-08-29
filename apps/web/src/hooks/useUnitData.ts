import { GetUnit } from '@/api'
import type { units } from '@/api/client'
import { useQuery } from '@tanstack/react-query'

export default function useUnitData(
	params: units.GetUnitRequest & { alias: string }
) {
	return useQuery({
		queryKey: ['unit', params],
		queryFn: () => GetUnit(params)
	})
}
