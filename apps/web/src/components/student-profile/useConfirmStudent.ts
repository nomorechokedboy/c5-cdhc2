import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import useUpdateStudent from '@/hooks/useUpdateStudent'
import type { Student } from '@/types'

/** Xác nhận hồ sơ học viên (pending → confirmed) rồi tải lại dữ liệu liên quan */
export function useConfirmStudent(student: Student) {
	const queryClient = useQueryClient()
	const { mutateAsync, isPending } = useUpdateStudent()

	const confirm = async () => {
		try {
			await mutateAsync({
				data: [
					{
						id: student.id,
						status: 'confirmed',
						unitId: student.unit?.id
					}
				]
			})
			toast.success('Xác nhận học viên thành công!')
			queryClient.invalidateQueries({ queryKey: ['students'] })
			queryClient.invalidateQueries({ queryKey: ['student', student.id] })
			return true
		} catch (error) {
			toast.error('Xác nhận học viên thất bại!')
			console.error(error)
			return false
		}
	}

	return { confirm, isPending }
}
