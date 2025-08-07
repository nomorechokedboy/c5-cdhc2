import React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import StudentTable from '@/components/student-table'
import type { StudentQueryParams } from '@/types'
import useUnitsData from '@/hooks/useUnitsData'
import ProtectedRoute from '@/components/ProtectedRoute'

export const Route = createFileRoute('/hcyu')({
	component: RouteComponent
})

function RouteComponent() {
	const filter: StudentQueryParams = {
		politicalOrg: 'hcyu'
	}
	// Fetch units with level 'battalion', data type is Unit[]
	const { data: battalions = [], isLoading: isLoadingUnits } = useUnitsData({
		level: 'battalion'
	})
	const [selectedBattalionId, setSelectedBattalionId] = React.useState<
		number | null
	>(null)
	const [selectedCompanyId, setSelectedCompanyId] = React.useState<
		number | null
	>(null)
	const [selectedClassId, setSelectedClassId] = React.useState<number | null>(
		null
	)

	// Find selected battalion, company, class
	const selectedBattalion =
		battalions.find((b) => b.id === selectedBattalionId) || null
	const companies = selectedBattalion ? selectedBattalion.children : []
	const selectedCompany =
		companies.find((c) => c.id === selectedCompanyId) || null
	const classes = selectedCompany ? selectedCompany.classes : []
	const selectedClass =
		classes.find((cls) => cls.id === selectedClassId) || null

	// Auto-select first available at each level
	React.useEffect(() => {
		if (!selectedBattalionId && battalions.length > 1) {
			setSelectedBattalionId(battalions[1].id)
		}
	}, [battalions, selectedBattalionId])
	React.useEffect(() => {
		if (selectedBattalion && companies.length > 1 && !selectedCompanyId) {
			setSelectedCompanyId(companies[1].id)
		}
	}, [selectedBattalion, companies, selectedCompanyId])
	React.useEffect(() => {
		if (selectedCompany && classes.length > 0 && !selectedClassId) {
			setSelectedClassId(classes[0].id)
		}
	}, [selectedCompany, classes, selectedClassId])

	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
					<div className='flex items-center justify-between space-y-2'>
						<div>
							<h2 className='text-2xl font-bold tracking-tight'>
								Danh sách học viên
							</h2>
							<p className='text-muted-foreground'>
								Chọn tiểu đoàn, đại đội, lớp để xem bảng học
								viên
							</p>
						</div>
					</div>
					{/* Breadcrumb + Select navigation */}
					<div className='flex items-center gap-4 mb-4'>
						{/* Battalion select */}
						<div>
							<span className='font-medium'>Tiểu đoàn:</span>
							<select
								className='ml-2 border rounded px-2 py-1'
								value={selectedBattalionId ?? ''}
								onChange={(e) => {
									const id = Number(e.target.value)
									setSelectedBattalionId(id)
									setSelectedCompanyId(null)
									setSelectedClassId(null)
								}}
							>
								{battalions.map((b) => (
									<option key={b.id} value={b.id}>
										{b.name}
									</option>
								))}
							</select>
						</div>
						<span className='mx-2'>/</span>
						{/* Company select */}
						<div>
							<span className='font-medium'>Đại đội:</span>
							<select
								className='ml-2 border rounded px-2 py-1'
								value={selectedCompanyId ?? ''}
								onChange={(e) => {
									const id = Number(e.target.value)
									setSelectedCompanyId(id)
									setSelectedClassId(null)
								}}
								disabled={companies.length === 0}
							>
								{companies.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>
						<span className='mx-2'>/</span>
						{/* Class select */}
						<div>
							<span className='font-medium'>Lớp:</span>
							<select
								className='ml-2 border rounded px-2 py-1'
								value={selectedClassId ?? ''}
								onChange={(e) =>
									setSelectedClassId(Number(e.target.value))
								}
								disabled={classes.length === 0}
							>
								{classes.map((cls) => (
									<option key={cls.id} value={cls.id}>
										{cls.name}
									</option>
								))}
							</select>
						</div>
					</div>
					{/* Student table for selected class */}
					<div className='mt-4'>
						{selectedClass ? (
							<div>
								<h1 className='text-xl font-bold text-center mb-4'>
									Danh sách học viên lớp {selectedClass.name}
								</h1>
								<StudentTable
									params={{
										...filter,
										classId: selectedClass.id
									}}
								/>
							</div>
						) : (
							<div className='text-muted-foreground'>
								Chọn lớp để xem danh sách học viên
							</div>
						)}
					</div>
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
