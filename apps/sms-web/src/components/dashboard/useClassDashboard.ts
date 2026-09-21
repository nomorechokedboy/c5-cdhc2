import { useQuery } from '@tanstack/react-query'
import { CategoryApi } from '@/api'
import useAuth from '@/hooks/useAuth'

/** Dữ liệu chung của các trang chủ giảng viên, quản lý, quản trị: tên người dùng và danh sách lớp. */
export function useClassDashboard() {
	const { user } = useAuth()
	const { data: categories = [], isLoading } = useQuery({
		queryKey: ['categories'],
		queryFn: CategoryApi.GetCategories
	})
	const name = `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()

	return { name, categories, isLoading }
}
