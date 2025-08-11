import React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import StudentTable from '@/components/student-table'
import type { StudentQueryParams } from '@/types'
import useUnitsData from '@/hooks/useUnitsData'
import ProtectedRoute from '@/components/ProtectedRoute'

export const Route = createFileRoute('/religion')({
	component: RouteComponent
})

function RouteComponent() {
	// ...existing code...
	const [studentParams, setStudentParams] =
		React.useState<StudentQueryParams>({ hasReligion: true })
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

	// Handle filter button click
	const handleFilter = () => {
		// Chỉ chọn tiểu đoàn, không chọn đại đội và chọn lớp
		if (selectedBattalion && !selectedCompanyId && !selectedClassId) {
			setStudentParams({
				hasReligion: true,
				unitAlias: selectedBattalion.alias,
				unitLevel: 'battalion'
			})
			return
		}
		// Chọn tiểu đoàn và chọn đại đội
		if (selectedBattalion && selectedCompany && !selectedClassId) {
			setStudentParams({
				hasReligion: true,
				unitAlias: selectedCompany.alias,
				unitLevel: 'company'
			})
			return
		}
		// Chọn tiểu đoàn, đại đội, lớp
		if (selectedBattalion && selectedCompany && selectedClass) {
			setStudentParams({
				hasReligion: true,
				classId: selectedClass.id
			})
			return
		}
	}

	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
					<div className='flex items-center justify-between space-y-2'>
						<div>
							<h2 className='text-2xl font-bold tracking-tight'>
								Danh sách học viên có tôn giáo
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
								value={selectedBattalionId ?? '-'}
								onChange={(e) => {
									const val = e.target.value
									if (val === '-') {
										setSelectedBattalionId(null)
										setSelectedCompanyId(null)
										setSelectedClassId(null)
									} else {
										const id = Number(val)
										setSelectedBattalionId(id)
										setSelectedCompanyId(null)
										setSelectedClassId(null)
									}
								}}
							>
								<option value='-'>--Chọn tiểu đoàn--</option>
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
								value={selectedCompanyId ?? '-'}
								onChange={(e) => {
									const val = e.target.value
									if (val === '-') {
										setSelectedCompanyId(null)
										setSelectedClassId(null)
									} else {
										const id = Number(val)
										setSelectedCompanyId(id)
										setSelectedClassId(null)
									}
								}}
							>
								<option value='-'>--Chọn đại đội--</option>
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
								value={selectedClassId ?? '-'}
								onChange={(e) => {
									const val = e.target.value
									if (val === '-') {
										setSelectedClassId(null)
									} else {
										setSelectedClassId(Number(val))
									}
								}}
							>
								<option value='-'>--Chọn lớp--</option>
								{classes.map((cls) => (
									<option key={cls.id} value={cls.id}>
										{cls.name}
									</option>
								))}
							</select>
						</div>
						{/* Filter button */}
						<button
							className='ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
							onClick={handleFilter}
						>
							Lọc
						</button>
					</div>
					{/* Student table for selected class */}
					<div className='mt-4'>
						<StudentTable
							params={studentParams}
							filename='danh-sach-hoc-vien-co-ton-giao'
						/>
					</div>
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
