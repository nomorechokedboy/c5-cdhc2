import type { UpdateStudentBody } from '@/types'
import { toast } from 'sonner'
import useUpdateStudent from './useUpdateStudent'
import { queryClient } from '@/integrations/tanstack-query/root-provider'

export default function usePatchStudentInfo() {
	const handleSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ['students'] })
	}
	const { mutateAsync, isPending } = useUpdateStudent({
		onSuccess: handleSuccess
	})

	/** Trả về true nếu cập nhật thành công (đã toast lỗi khi thất bại) */
	const handlePatchStudentInfo = async (
		student: UpdateStudentBody
	): Promise<boolean> => {
		try {
			await mutateAsync({ data: [student] })
			toast.success('Cập nhật thông tin học viên thành công')
			return true
		} catch (err) {
			console.error(err)
			toast.error('Cập nhật thông tin học viên thất bại!')
			return false
		}
	}

	return { handlePatchStudentInfo, isPending }
}
