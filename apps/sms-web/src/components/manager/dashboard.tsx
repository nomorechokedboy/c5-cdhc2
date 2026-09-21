import { useTranslation } from 'react-i18next'
import {
	ClassList,
	DashboardHeader,
	Ledger,
	useClassDashboard
} from '@/components/dashboard'

export function ManagerDashboard() {
	const { t } = useTranslation()
	const { name, categories, isLoading } = useClassDashboard()

	return (
		<div className='container mx-auto space-y-8 p-6'>
			<DashboardHeader
				title={t('dashboard.manager.welcome', { name })}
				subtitle={t('dashboard.manager.subtitle')}
				roleLabel={t('dashboard.manager.roleLabel')}
			/>

			<Ledger
				items={[
					{
						label: t('dashboard.manager.assignedClasses'),
						value: categories.length
					}
				]}
			/>

			<section className='space-y-3'>
				<h2 className='text-xl font-semibold'>
					{t('dashboard.manager.yourClasses')}
				</h2>
				<ClassList
					categories={categories}
					isLoading={isLoading}
					emptyText={t('dashboard.manager.noClasses')}
					skeletonCount={4}
				/>
			</section>
		</div>
	)
}
