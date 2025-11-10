import { GetAllUnits } from '@/api'
import { useQuery } from '@tanstack/react-query'

export default function useAllUnitsData() {
	console.log('Render useAllUnitsData')
	return useQuery({
		queryKey: ['allUnits'],
		queryFn: () => GetAllUnits()
	})
}
