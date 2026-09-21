import { useTranslation } from 'react-i18next'
import {
	ClassList,
	DashboardHeader,
	Ledger,
	useClassDashboard
} from '@/components/dashboard'

export function TeacherDashboard() {
	const { t } = useTranslation()
	const { name, categories, isLoading } = useClassDashboard()

	return (
		<div className='container mx-auto space-y-8 p-6'>
			<DashboardHeader
				title={t('dashboard.teacher.welcome', { name })}
				subtitle={t('dashboard.teacher.subtitle')}
			/>

			<Ledger
				items={[
					{
						label: t('dashboard.teacher.classes'),
						value: categories.length
					},
					{ label: t('dashboard.teacher.subjects'), value: '—' },
					{ label: t('dashboard.teacher.students'), value: '—' }
				]}
			/>

			<section className='space-y-3'>
				<h2 className='text-xl font-semibold'>
					{t('dashboard.teacher.yourClasses')}
				</h2>
				<ClassList
					categories={categories}
					isLoading={isLoading}
					emptyText={t('dashboard.teacher.noClasses')}
				/>
			</section>
		</div>
	)
}
