import { GetUnits } from '@/api'
import { buildBoard } from '@/lib/unit-board'
import { useQuery } from '@tanstack/react-query'

/** Bảng giao ban: mọi đơn vị kèm số học viên, gộp theo tiểu đoàn/đại đội. */
export default function useUnitBoard() {
	return useQuery({
		queryKey: ['units', { withStudentCount: true }],
		queryFn: () => GetUnits({ withStudentCount: true }),
		select: buildBoard
	})
}
