import { createFileRoute, Navigate } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { DashboardHeader } from '@/components/dashboard'
import { LangPackManager } from '@/components/langpack-manager'
import useAuth from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/admin/langpack')({
	component: LangPackPage
})

function LangPackPage() {
	const { t } = useTranslation()
	const { isAdmin, isAuthLoading } = useAuth()

	if (!isAuthLoading && !isAdmin) {
		return <Navigate to='/' replace />
	}

	return (
		<ProtectedRoute>
			<div className='container max-w-2xl mx-auto p-6 space-y-6'>
				<DashboardHeader
					title={t('nav.langpack')}
					subtitle={t('langpack.subtitle')}
				/>
				<LangPackManager />
			</div>
		</ProtectedRoute>
	)
}
