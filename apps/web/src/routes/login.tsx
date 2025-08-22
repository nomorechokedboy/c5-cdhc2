import { createFileRoute, Navigate } from '@tanstack/react-router'
import { LoginForm } from '@/components/login-form'
import useAuth from '@/hooks/useAuth'

export const Route = createFileRoute('/login')({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: (search.redirect as string) || '/'
	})
})

function RouteComponent() {
	const { isAuthenticated, isAuthLoading } = useAuth()
	const { redirect } = Route.useSearch()

	if (isAuthenticated && !isAuthLoading) {
		return <Navigate to={redirect} replace />
	}

	return (
		<div>
			<LoginForm />
		</div>
	)
}
