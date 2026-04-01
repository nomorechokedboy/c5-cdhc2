import { AuthApi } from '@/api'
import { AuthController } from '@/biz'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export type AppRole = 'admin' | 'manager' | 'teacher' | 'student'

export const AUTH_QUERY_KEY = ['auth', 'user'] as const

export default function useAuth() {
	const queryClient = useQueryClient()

	const {
		data: user,
		isLoading: isAuthLoading,
		error: authError,
		isError: isAuthError,
		refetch: refetchUser
	} = useQuery({
		queryKey: AUTH_QUERY_KEY,
		queryFn: AuthApi.GetUserInfo,
		retry: false,
		staleTime: 60 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
		refetchOnWindowFocus: true
	})

	const logout = () => {
		AuthController.clearTokens()
		// Re-fetch /authn/me with no token → 401 → isAuthError = true →
		// isAuthenticated = false. ProtectedRoute then renders <Navigate to="/login">
		// AFTER the state is already settled. No race condition.
		refetchUser()
	}

	const role: AppRole = (user?.role as AppRole) ?? 'student'

	return {
		user,
		isAuthenticated: !!user && !isAuthError,
		isAuthLoading,
		authError,
		logout,
		queryClient,
		role,
		isTeacher: role === 'teacher',
		isManager: role === 'manager',
		isAdmin: role === 'admin',
		isStudent: role === 'student',
		hasElevatedAccess:
			role === 'teacher' || role === 'manager' || role === 'admin'
	}
}
