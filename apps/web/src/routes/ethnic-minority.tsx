import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import StudentTable from '@/components/student-table'
import type { StudentQueryParams } from '@/types'
import useUnitsData from '@/hooks/useUnitsData'
import ProtectedRoute from '@/components/ProtectedRoute'

export const Route = createFileRoute('/ethnic-minority')({
	component: RouteComponent
})

type SelectProps = {
	label: string
	options: { id: number; name: string }[]
	value: number | null
	onChange: (id: number | null) => void
	placeholder?: string
}

function Select({ label, options, value, onChange, placeholder }: SelectProps) {
	return (
		<div>
			<span className='font-medium'>{label}:</span>
			<select
				className='ml-2 border rounded px-2 py-1'
				value={value ?? '-'}
				onChange={(e) => {
					const val = e.target.value
					onChange(val === '-' ? null : Number(val))
				}}
			>
				<option value='-'>
					{placeholder ?? `--Chọn ${label.toLowerCase()}--`}
				</option>
				{options.map((o) => (
					<option key={o.id} value={o.id}>
						{o.name}
					</option>
				))}
			</select>
		</div>
	)
}

function RouteComponent() {
	const [studentParams, setStudentParams] =
		React.useState<StudentQueryParams>({
			isEthnicMinority: true
		})
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

	const selectedBattalion = React.useMemo(
		() => battalions.find((b) => b.id === selectedBattalionId) || null,
		[battalions, selectedBattalionId]
	)
	const companies = selectedBattalion?.children ?? []
	const selectedCompany = React.useMemo(
		() => companies.find((c) => c.id === selectedCompanyId) || null,
		[companies, selectedCompanyId]
	)
	const classes = selectedCompany?.classes ?? []
	const selectedClass = React.useMemo(
		() => classes.find((cls) => cls.id === selectedClassId) || null,
		[classes, selectedClassId]
	)

	function buildStudentParams() {
		if (selectedBattalion && !selectedCompanyId && !selectedClassId) {
			return {
				isEthnicMinority: true,
				unitAlias: selectedBattalion.alias,
				unitLevel: 'battalion'
			}
		}
		if (selectedBattalion && selectedCompany && !selectedClassId) {
			return {
				isEthnicMinority: true,
				unitAlias: selectedCompany.alias,
				unitLevel: 'company'
			}
		}
		if (selectedBattalion && selectedCompany && selectedClass) {
			return {
				isEthnicMinority: true,
				classId: selectedClass.id
			}
		}
		return { isEthnicMinority: true }
	}

	const handleFilter = () => {
		setStudentParams(buildStudentParams())
	}

	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
					<div className='flex items-center justify-between space-y-2'>
						<div>
							<h2 className='text-2xl font-bold tracking-tight'>
								Danh sách học viên dân tộc thiểu số
							</h2>
							<p className='text-muted-foreground'>
								Chọn tiểu đoàn, đại đội, lớp để xem bảng học
								viên
							</p>
						</div>
					</div>
					<div className='flex items-center gap-4 mb-4'>
						<Select
							label='Tiểu đoàn'
							options={battalions}
							value={selectedBattalionId}
							onChange={(id) => {
								setSelectedBattalionId(id)
								setSelectedCompanyId(null)
								setSelectedClassId(null)
							}}
						/>
						<span className='mx-2'>/</span>
						<Select
							label='Đại đội'
							options={companies}
							value={selectedCompanyId}
							onChange={(id) => {
								setSelectedCompanyId(id)
								setSelectedClassId(null)
							}}
						/>
						<span className='mx-2'>/</span>
						<Select
							label='Lớp'
							options={classes}
							value={selectedClassId}
							onChange={setSelectedClassId}
						/>
						<button
							className='ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
							onClick={handleFilter}
						>
							Lọc
						</button>
					</div>
					<div className='mt-4'>
						<StudentTable
							params={studentParams}
							filename='danh-sach-hoc-vien-la-nguoi-dong-bao'
						/>
					</div>
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
