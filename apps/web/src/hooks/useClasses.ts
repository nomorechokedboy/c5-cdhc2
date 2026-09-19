import { GetUnits } from '@/api'
import { useQuery } from '@tanstack/react-query'

/** Lớp = đơn vị cấp `class`; `parentId` là id đại đội */
export default function useClassData(params?: {
	parentId?: number
	search?: string
	enabled?: boolean
}) {
	const { enabled = true, ...query } = params ?? {}
	return useQuery({
		queryKey: ['classes', query],
		queryFn: () =>
			GetUnits({ ...query, level: 'class', withStudentCount: true }),
		enabled
	})
}
