import { useQuery } from '@tanstack/react-query'
import { CategoryApi } from '@/api'
import { Link } from '@tanstack/react-router'
import useAuth from '@/hooks/useAuth'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { BookOpen, Users, ChevronRight, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function CategoryCard({
	category
}: {
	category: {
		id: number
		name: string
		idnumber: string
		description: string
	}
}) {
	return (
		<Link
			to='/khoa-hoc/$categoryIdnumber'
			params={{ categoryIdnumber: category.idnumber }}
			state={{ category: { id: category.id } }}
		>
			<Card className='hover:bg-accent/50 transition-colors cursor-pointer h-full'>
				<CardHeader className='pb-2'>
					<div className='flex items-start justify-between gap-2'>
						<div className='p-2 rounded-md bg-primary/10'>
							<Layers className='w-5 h-5 text-primary' />
						</div>
						<ChevronRight className='w-4 h-4 text-muted-foreground mt-1 shrink-0' />
					</div>
					<CardTitle className='text-base leading-snug mt-2'>
						{category.name}
					</CardTitle>
					{category.description && (
						<CardDescription className='line-clamp-2 text-xs'>
							{category.description}
						</CardDescription>
					)}
				</CardHeader>
			</Card>
		</Link>
	)
}

export function TeacherDashboard() {
	const { t } = useTranslation()
	const { user } = useAuth()
	const { data: categories = [], isLoading } = useQuery({
		queryKey: ['categories'],
		queryFn: CategoryApi.GetCategories
	})

	const name = `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()

	return (
		<div className='container mx-auto p-6 space-y-6'>
			<div className='space-y-1'>
				<h1 className='text-2xl font-bold tracking-tight'>
					{t('dashboard.teacher.welcome', { name })}
				</h1>
				<p className='text-muted-foreground'>
					{t('dashboard.teacher.subtitle')}
				</p>
			</div>

			<div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
				<Card>
					<CardContent className='flex items-center gap-3 pt-6'>
						<div className='p-2 rounded-md bg-blue-500/10'>
							<Layers className='w-5 h-5 text-blue-500' />
						</div>
						<div>
							<p className='text-2xl font-bold'>
								{categories.length}
							</p>
							<p className='text-xs text-muted-foreground'>
								{t('dashboard.teacher.classes')}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='flex items-center gap-3 pt-6'>
						<div className='p-2 rounded-md bg-green-500/10'>
							<BookOpen className='w-5 h-5 text-green-500' />
						</div>
						<div>
							<p className='text-2xl font-bold'>—</p>
							<p className='text-xs text-muted-foreground'>
								{t('dashboard.teacher.subjects')}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='flex items-center gap-3 pt-6'>
						<div className='p-2 rounded-md bg-purple-500/10'>
							<Users className='w-5 h-5 text-purple-500' />
						</div>
						<div>
							<p className='text-2xl font-bold'>—</p>
							<p className='text-xs text-muted-foreground'>
								{t('dashboard.teacher.students')}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className='space-y-3'>
				<h2 className='text-lg font-semibold'>
					{t('dashboard.teacher.yourClasses')}
				</h2>
				{isLoading && (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
						{Array.from({ length: 6 }).map((_, i) => (
							<Card key={i}>
								<CardHeader className='space-y-2'>
									<div className='w-9 h-9 rounded-md bg-muted animate-pulse' />
									<div className='h-4 w-3/4 rounded bg-muted animate-pulse' />
									<div className='h-3 w-full rounded bg-muted animate-pulse' />
								</CardHeader>
							</Card>
						))}
					</div>
				)}
				{!isLoading && categories.length === 0 && (
					<Card>
						<CardContent className='pt-6 text-center text-muted-foreground'>
							{t('dashboard.teacher.noClasses')}
						</CardContent>
					</Card>
				)}
				{!isLoading && categories.length > 0 && (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
						{categories.map((cat) => (
							<CategoryCard key={cat.id} category={cat} />
						))}
					</div>
				)}
			</div>
		</div>
	)
}
