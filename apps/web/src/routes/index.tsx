import { createFileRoute, useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { UnitBoard } from '@/components/home/unit-board'
import StudentForm from '@/components/student-form'
import { TraceLine } from '@/components/trace-line'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { SidebarInset } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import useUnitBoard from '@/hooks/useUnitBoard'

export const Route = createFileRoute('/')({
	component: RouteComponent
})

/** Một con số duy nhất của trang: tổng học viên, đứng cạnh nhịp tim. */
function Vitals() {
	const { data, isPending } = useUnitBoard()

	return (
		<div className='flex items-end gap-4'>
			<div>
				{isPending ? (
					<Skeleton className='h-14 w-28' />
				) : (
					<p className='tabular font-display text-6xl leading-none font-semibold'>
						{data?.totalStudents ?? '–'}
					</p>
				)}
				<p className='mt-1 text-sm text-muted-foreground'>
					học viên
					{data ? `, ${data.totalClasses} lớp đang học` : ''}
				</p>
			</div>
			<TraceLine variant='beat' className='mb-5 hidden w-40 sm:block' />
		</div>
	)
}

function RouteComponent() {
	const navigate = useNavigate()
	const [showStudentForm, setShowStudentForm] = useState(false)

	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='min-h-screen space-y-6 p-6'>
					<div className='flex flex-wrap items-end justify-between gap-6'>
						<div className='space-y-4'>
							<div>
								<h1 className='text-4xl font-semibold tracking-wide'>
									Trang chủ
								</h1>
								<p className='text-muted-foreground'>
									Trường Cao đẳng Hậu cần 2, ngày{' '}
									{dayjs().format('DD/MM/YYYY')}
								</p>
							</div>
							<div className='flex flex-wrap gap-3'>
								<Button
									size='lg'
									className='cursor-pointer'
									onClick={() => setShowStudentForm(true)}
								>
									<UserPlus />
									Thêm học viên
								</Button>
								<Button
									size='lg'
									variant='outline'
									className='cursor-pointer'
									onClick={() =>
										navigate({
											to: '/dai-doi/$companyAlias',
											params: { companyAlias: 'c5' }
										})
									}
								>
									<Users />
									Danh sách học viên
								</Button>
							</div>
						</div>
						<Vitals />
					</div>

					<UnitBoard />
				</div>

				{showStudentForm && (
					<Dialog
						open
						onOpenChange={(open) => {
							if (!open) setShowStudentForm(false)
						}}
					>
						<DialogContent className='max-w-7xl h-[90vh] overflow-y-auto p-6'>
							<StudentForm
								onSuccess={() => setShowStudentForm(false)}
							/>
						</DialogContent>
					</Dialog>
				)}
			</SidebarInset>
		</ProtectedRoute>
	)
}
