import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import useUserData from '@/hooks/useUsers'
import { defaultStudentColumnVisibility, type TemplType } from '@/types'
import { DataTable } from '../data-table'
import { baseStudentsColumns } from '@/components/user-table/columns'
import { EhtnicOptions } from '@/data/ethnics'
import { EduLevelOptions } from '@/components/data-table/data/data'
import TableSkeleton from '../table-skeleton'
import { Button } from '../ui/button'
import { ArrowDownToLine, PlusIcon } from 'lucide-react'
import { ExportStudentDataDialog } from '../export-student-data-dialog'
import { useState } from 'react'
import { Dialog, DialogContent } from '@radix-ui/react-dialog'
import UserForm from './user-form'

interface UserTableProps {
	filename: string
	enabledCreation?: boolean
	templType?: TemplType
}

export default function UserTable({
	filename,
	enabledCreation = false,
	templType = 'UserInfoTempl'
}: UserTableProps) {
	const {
		data: users = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useUserData()

	// const { createFacetedFilter } = useDataTableToolbarConfig()

	if (isLoadingStudents) {
		return <TableSkeleton />
	}
	// const [showStudentForm, setShowStudentForm] = useState(false)
	// 	const handleFormSuccess = () => {
	// 		setShowStudentForm(false)
	// 	}

	const handleFormSuccess = () => {
		refetchStudents()
	}
	const [showUserForm, setShowUserForm] = useState(false)

	return (
		<div>
			<DataTable
				data={users}
				columns={baseStudentsColumns}
				defaultColumnVisibility={defaultStudentColumnVisibility}
				// toolbarProps={{
				//     rightSection:
				//         enabledCreation === true ? (
				//             <StudentForm onSuccess={handleFormSuccess} />
				//         ) : undefined,
				//     facetedFilters
				// }}
				withDynamicColsData={false}
				renderToolbarActions={({ exportHook }) => (
					<div style={{ display: 'flex', gap: '8px' }}>
						<ExportStudentDataDialog
							data={exportHook.exportableData.data}
							defaultFilename={filename}
							templType={templType}
						>
							<Button onClick={() => setShowUserForm(true)}>
								<ArrowDownToLine />
								Xuất file
							</Button>
						</ExportStudentDataDialog>
						<Button onClick={() => setShowUserForm(true)}>
							<PlusIcon />
							Thêm người dùng
						</Button>
					</div>
				)}
			/>
			{showUserForm && (
				<div className='p-4 w-full'>
					<UserForm
						open={showUserForm}
						setOpen={setShowUserForm}
						onSuccess={() => {
							refetchStudents()
							setShowUserForm(false)
						}}
					/>
				</div>
			)}
		</div>
	)
}
