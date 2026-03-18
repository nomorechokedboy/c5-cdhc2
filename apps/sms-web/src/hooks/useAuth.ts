import { AuthApi } from '@/api'
import { AuthController } from '@/biz'
import { useQuery } from '@tanstack/react-query'

export type AppRole = 'admin' | 'manager' | 'teacher' | 'student'

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

	const logout = () => {
		AuthController.clearTokens()
		refetchUser()
	}

	// Use the canonical role from the API.
	// The PHP plugin computes: admin > manager > teacher > student
	const role: AppRole = (user?.role as AppRole) ?? 'student'

	return {
		user,
		isAuthenticated: !!user && !isAuthError,
		isAuthLoading,
		authError,
		logout,
		role,
		isTeacher: role === 'teacher',
		isManager: role === 'manager',
		isAdmin: role === 'admin',
		isStudent: role === 'student',
		// True for any role that manages courses
		hasElevatedAccess:
			role === 'teacher' || role === 'manager' || role === 'admin'
	}
}
