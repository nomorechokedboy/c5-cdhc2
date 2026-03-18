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
	const { user } = useAuth()
	const { data: categories = [], isLoading } = useQuery({
		queryKey: ['categories'],
		queryFn: CategoryApi.GetCategories
	})

	return (
		<div className='container mx-auto p-6 space-y-6'>
			{/* Welcome */}
			<div className='space-y-1'>
				<h1 className='text-2xl font-bold tracking-tight'>
					Xin chào, {user?.firstname} {user?.lastname}
				</h1>
				<p className='text-muted-foreground'>
					Chọn một lớp học từ thanh bên hoặc từ danh sách dưới đây để
					xem và chỉnh sửa điểm học viên.
				</p>
			</div>

			{/* Stats row */}
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
								Lớp học
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
								Môn học
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
								Học viên
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Categories grid */}
			<div className='space-y-3'>
				<h2 className='text-lg font-semibold'>Lớp học của bạn</h2>
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
							Bạn chưa được phân công lớp học nào.
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
