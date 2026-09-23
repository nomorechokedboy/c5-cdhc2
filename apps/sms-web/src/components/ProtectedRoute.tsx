import useAuth from '@/hooks/useAuth'
import { Navigate, useLocation } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FullPageErrorState } from './error-state'

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
	const {
		isAuthenticated,
		isAuthLoading,
		isAuthUnreachable,
		authError,
		refetchUser
	} = useAuth()
	const location = useLocation()
	const { t } = useTranslation()

	// Show loading spinner while checking auth
	if (isAuthLoading) {
		return (
			fallback || (
				<div
					role='status'
					aria-label={t('error.loading')}
					className='grid min-h-64 flex-1 place-items-center'
				>
					<LoaderCircle className='text-muted-foreground h-6 w-6 animate-spin' />
				</div>
			)
		)
	}

	// The auth check itself failed to reach the server (down, network blip,
	// a 5xx) — we don't actually know whether the session is valid, so don't
	// bounce to /login as if it were a real logout. Let the person retry in
	// place instead.
	if (isAuthUnreachable) {
		return (
			<FullPageErrorState
				error={authError instanceof Error ? authError : undefined}
				title={t('error.authUnreachableTitle')}
				description={t('error.authUnreachableDesc')}
				onRetry={() => refetchUser()}
			/>
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
