import type { Student } from '@/types'
import { toast } from 'sonner'
import useUpdateStudent from './useUpdateStudent'
import { queryClient } from '@/integrations/tanstack-query/root-provider'

export default function usePatchStudentInfo(_student: Student) {
	const handleSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ['students'] })
	}
	const { mutateAsync, isPending } = useUpdateStudent({
		onSuccess: handleSuccess
	})
	const handlePatchStudentInfo = async (_student: Student) => {
		try {
			await mutateAsync({
				data: [_student]
			})
			toast.success('Cập nhật thông tin học viên thành công')
		} catch (err) {
			console.error(err)
			toast.error('Cập nhật thông tin học viên thất bại!')
		}
	}

	return { handlePatchStudentInfo, isPending }
}
