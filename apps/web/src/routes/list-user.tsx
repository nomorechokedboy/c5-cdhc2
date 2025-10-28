import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import StudentTable from '@/components/student-table'
import UserTable from '@/components/user-table'
import type { StudentQueryParams } from '@/types'
import useUnitsData from '@/hooks/useUnitsData'
import ProtectedRoute from '@/components/ProtectedRoute'

export const Route = createFileRoute('/list-user')({
	component: RouteComponent
})

function RouteComponent() {
	const [studentParams, setStudentParams] =
		React.useState<StudentQueryParams>({
			isEthnicMinority: true
		})
	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
					<div className='flex items-center justify-between space-y-2'>
						<div>
							<h2 className='text-2xl font-bold tracking-tight'>
								Danh sách học viên dân tộc thiểu số
							</h2>
						</div>
					</div>
					<div className='mt-4'>
						<UserTable filename='danh-sach-nguoi-dung' />
					</div>
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
