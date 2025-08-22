import { GetUserInfo, Login } from '@/api'
import { AuthController } from '@/biz'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

export default function useAuth() {
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	// Query to check authentication status
	const {
		data: user,
		isLoading: isAuthLoading,
		error: authError,
		isError: isAuthError,
		refetch: refetchUser
	} = useQuery({
		queryKey: ['auth', 'user'],
		queryFn: GetUserInfo,
		retry: false,
		staleTime: 30 * 60 * 1000, // 30 minutes
		gcTime: 35 * 60 * 1000, // 35 minutes
		refetchOnWindowFocus: true
	})

	// Login mutation
	const loginMutation = useMutation({
		mutationFn: Login,
		onSuccess: async ({ refreshToken, accessToken }) => {
			// Store token
			AuthController.setTokens({ accessToken, refreshToken })
			toast.info('Đăng nhập thành công')

			const user = await refetchUser()

			// Update auth query cache
			queryClient.setQueryData(['auth', 'user'], user)
			// Navigate to dashboard or intended page
			navigate({
				to: '/'
			})
		},
		onError: (error) => {
			console.error('Login failed:', error)
			toast.error('Đăng nhập thất bại')
		}
	})

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
		login: loginMutation.mutate,
		logout,
		isLoggingIn: loginMutation.isPending,
		loginError: loginMutation.error
	}
}
