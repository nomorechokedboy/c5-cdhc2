import { AuthApi } from '@/api'
import { AuthController } from '@/biz'
import { useQuery } from '@tanstack/react-query'
import useCourses from './useCourses'

export default function useAuth() {
	const {
		data: user,
		isLoading: isAuthLoading,
		error: authError,
		isError: isAuthError,
		refetch: refetchUser
	} = useQuery({
		queryKey: ['auth', 'user'],
		queryFn: AuthApi.GetUserInfo,
		retry: false,
		staleTime: 60 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		refetchOnWindowFocus: true
	})
	const { data: courses } = useCourses()

	const logout = () => {
		AuthController.clearTokens()
		refetchUser()
	}

	return {
		// Auth state
		user,
		isAuthenticated: !!user && !isAuthError,
		isAuthLoading,
		authError,

		// Actions
		logout,

		role: courses?.length !== 0 ? 'teacher' : 'student'
	}
}
