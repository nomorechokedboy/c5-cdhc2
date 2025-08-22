import useAuth from '@/hooks/useAuth'
import { Navigate, useLocation } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'

interface ProtectedRouteProps {
	children: React.ReactNode
	fallback?: React.ReactNode
	redirectTo?: string
}

export default function ProtectedRoute({
	children,
	fallback,
	redirectTo = '/login'
}: ProtectedRouteProps) {
	const { isAuthenticated, isAuthLoading } = useAuth()
	const location = useLocation()

	// Show loading spinner while checking auth
	if (isAuthLoading) {
		return (
			fallback || (
				<div className='flex items-center justify-center min-h-screen'>
					<LoaderCircle className='animate-spin text-blue-600' />
				</div>
			)
		)
	}

	// Redirect to login if not authenticated
	if (!isAuthenticated) {
		return (
			<Navigate
				to={redirectTo}
				search={{ redirect: location.pathname.toString() }}
				replace
			/>
		)
	}

	return <>{children}</>
}
