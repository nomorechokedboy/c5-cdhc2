import { createFileRoute, Navigate } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ExportTemplateManager } from '@/components/admin/export-template-manager'
import useAuth from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/admin/export-templates')({
	component: ExportTemplatesPage
})

function ExportTemplatesPage() {
	const { t } = useTranslation()
	const { isAdmin, isManager, isAuthLoading } = useAuth()
	const hasAccess = isAdmin || isManager

	if (!isAuthLoading && !hasAccess) {
		return <Navigate to='/' replace />
	}

	return (
		<ProtectedRoute>
			<div className='container max-w-2xl mx-auto p-6 space-y-6'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>
						{t('nav.exportTemplates')}
					</h1>
					<p className='text-muted-foreground'>
						{t('export.templateManagerSubtitle')}
					</p>
				</div>
				<ExportTemplateManager />
			</div>
		</ProtectedRoute>
	)
}
