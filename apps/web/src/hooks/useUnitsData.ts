import { GetUnits } from '@/api'
import type { GetUnitQuery } from '@/types'
import { useQuery } from '@tanstack/react-query'

export default function useUnitsData(params?: GetUnitQuery) {
	return useQuery({
		queryKey: ['units', params],
		queryFn: () => GetUnits(params)
	})
}
