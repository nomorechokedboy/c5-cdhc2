import { useTranslation } from 'react-i18next'
import {
	ClassList,
	DashboardHeader,
	Ledger,
	useClassDashboard
} from '@/components/dashboard'

export function AdminDashboard() {
	const { t } = useTranslation()
	const { name, categories, isLoading } = useClassDashboard()

	return (
		<div className='container mx-auto space-y-8 p-6'>
			<DashboardHeader
				title={t('dashboard.admin.welcome', { name })}
				subtitle={t('dashboard.admin.subtitle')}
				roleLabel={t('dashboard.admin.roleLabel')}
			/>

			<Ledger
				items={[
					{
						label: t('dashboard.admin.totalClasses'),
						value: categories.length
					}
				]}
			/>

			<section className='space-y-3'>
				<h2 className='text-xl font-semibold'>
					{t('dashboard.admin.allClasses')}
				</h2>
				<ClassList
					categories={categories}
					isLoading={isLoading}
					emptyText={t('dashboard.admin.noClasses')}
					skeletonCount={6}
				/>
			</section>
		</div>
	)
}
