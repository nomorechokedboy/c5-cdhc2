import { createFileRoute, useNavigate } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { SidebarInset } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserPlus, BarChart3 } from 'lucide-react'
import StudentForm from '@/components/student-form'
import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export const Route = createFileRoute('/')({
	component: RouteComponent
})

function RouteComponent() {
	const navigate = useNavigate()
	const [showStudentForm, setShowStudentForm] = useState(false)
	const handleFormSuccess = () => {
		setShowStudentForm(false)
	}
	const [urlSite, setUrlSite] = useState('')

	return (
		<ProtectedRoute>
			<SidebarInset>
				{/* Gradient background */}
				<div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 animate-fadeIn'>
					{/* Hero */}
					<div className='flex flex-col items-center text-center space-y-4 mb-12'>
						<img
							src='logo.png'
							alt='Logo'
							className='w-35 h-35 drop-shadow-md animate-fadeInUp'
						/>
						<h1 className='text-4xl font-extrabold text-gray-800 animate-fadeInUp delay-100'>
							Hệ thống Quản lý Học viên
						</h1>
						<p className='text-gray-600 max-w-2xl animate-fadeInUp delay-200'>
							Nền tảng giúp quản lý thông tin học viên nhanh
							chóng, dễ dàng và chính xác. Bạn có thể thêm mới,
							chỉnh sửa, tìm kiếm và xuất báo cáo học viên.
						</p>
						<div className='flex gap-4 animate-fadeInUp delay-300'>
							<Button
								size='lg'
								className='cursor-pointer flex items-center gap-2 shadow-md hover:shadow-lg transition-all'
								onClick={() => setShowStudentForm(true)}
							>
								<UserPlus className='w-5 h-5' />
								Thêm học viên mới
							</Button>
							<Button
								size='lg'
								variant='outline'
								className='cursor-pointer not-first-of-type:flex items-center gap-2 shadow-sm hover:shadow-md transition-all'
								// onclick redrect to /dai-doi/c5
								onClick={() => {
									setUrlSite('/dai-doi/c5')
									navigate({ to: urlSite })
								}}
							>
								<Users className='w-5 h-5' />
								Xem danh sách học viên
							</Button>
						</div>
					</div>

					{/* Thống kê */}
					<div className='cursor-pointer grid grid-cols-1 md:grid-cols-3 gap-6'>
						<StatCard
							icon={<Users className='w-6 h-6' />}
							title='Tổng số học viên'
							value='120'
							color='blue'
							delay={100}
						/>
						<StatCard
							icon={<UserPlus className='w-6 h-6' />}
							title='Học viên mới trong tháng'
							value='8'
							color='green'
							delay={200}
						/>
						<StatCard
							icon={<BarChart3 className='w-6 h-6' />}
							title='Đã tốt nghiệp'
							value='45'
							color='purple'
							delay={300}
						/>
					</div>
				</div>
				{/* Student Form Dialog */}
				{showStudentForm && (
					<Dialog
						open={!!showStudentForm}
						onOpenChange={(open) => {
							if (!open) setShowStudentForm(false)
						}}
					>
						<DialogContent className='max-w-7xl h-[90vh] overflow-y-auto p-6'>
							<StudentForm onSuccess={handleFormSuccess} />
						</DialogContent>
					</Dialog>
				)}
			</SidebarInset>
		</ProtectedRoute>
	)
}

function StatCard({
	icon,
	title,
	value,
	color,
	delay
}: {
	icon: React.ReactNode
	title: string
	value: string
	color: 'blue' | 'green' | 'purple'
	delay?: number
}) {
	const colorMap = {
		blue: 'bg-blue-50 border-blue-200 text-blue-700',
		green: 'bg-green-50 border-green-200 text-green-700',
		purple: 'bg-purple-50 border-purple-200 text-purple-700'
	}

	return (
		<Card
			className={`${colorMap[color]} border shadow-sm hover:shadow-lg transition-all animate-fadeInUp`}
			style={{ animationDelay: `${delay}ms` }}
		>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					{icon}
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className='text-3xl font-bold'>{value}</p>
			</CardContent>
		</Card>
	)
}
