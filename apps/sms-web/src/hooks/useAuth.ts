import { AuthApi } from '@/api'
import { APIError } from '@/api/client'
import { AuthController } from '@/biz'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export type AppRole = 'admin' | 'manager' | 'teacher' | 'student'

export const AUTH_QUERY_KEY = ['auth', 'user'] as const

/**
 * Turns the raw /authn/me query result into auth state. Only a definitive
 * 401 means "you are not logged in". Any other failure — a network blip,
 * the backend being down, a 5xx — means we simply couldn't check, and must
 * not be treated the same as a real logout: doing so would bounce a
 * legitimately signed-in user out to /login the moment the backend blips,
 * losing their place instead of letting them retry in place.
 */
export function deriveAuthState(
	hasUser: boolean,
	isAuthError: boolean,
	authError: unknown
): { isAuthenticated: boolean; isAuthUnreachable: boolean } {
	const isDefinitivelyUnauthenticated =
		isAuthError && authError instanceof APIError && authError.status === 401
	return {
		isAuthenticated: hasUser && !isDefinitivelyUnauthenticated,
		isAuthUnreachable:
			!hasUser && isAuthError && !isDefinitivelyUnauthenticated
	}
}

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

	const { isAuthenticated, isAuthUnreachable } = deriveAuthState(
		!!user,
		isAuthError,
		authError
	)

	const role: AppRole = (user?.role as AppRole) ?? 'student'

	return {
		user,
		isAuthenticated,
		isAuthUnreachable,
		isAuthLoading,
		authError,
		logout,
		refetchUser,
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
