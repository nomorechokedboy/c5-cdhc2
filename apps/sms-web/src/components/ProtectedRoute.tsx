import useAuth from '@/hooks/useAuth'
import { Navigate, useLocation } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
	children: ReactNode
	fallback?: ReactNode
	redirectTo?: string
}

export default function ProtectedRoute({
	children,
	fallback,
	redirectTo = '/login'
}: ProtectedRouteProps) {
	const { isAuthenticated, isAuthLoading, user } = useAuth()
	console.log({ isAuthenticated, user })

	const location = useLocation()

	// Show loading spinner while checking auth
	if (isAuthLoading) {
		return fallback || <LoaderCircle className='animate:spin' />
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
