import useUserData from '@/hooks/useUsers'
import { defaultStudentColumnVisibility, type TemplType } from '@/types'
import { DataTable } from '../data-table'
import { baseStudentsColumns } from '@/components/user-table/columns'
import TableSkeleton from '../table-skeleton'
import { Button } from '../ui/button'
import { ArrowDownToLine, PlusIcon } from 'lucide-react'
import { ExportStudentDataDialog } from '../export-student-data-dialog'
import { useState } from 'react'
import UserForm from './user-form'
import { UserTableContext } from './UserTableContext'
import type { User } from '@/types'
import UserEditForm from './user-edit-form'

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
	console.log('Render UserTable')

	const {
		data: users = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useUserData()
	console.log('isloading', isLoadingStudents)

	// if (isLoadingStudents) {
	// 	return <TableSkeleton />
	// }

	const handleFormSuccess = () => {
		refetchStudents()
	}

	const [showUserForm, setShowUserForm] = useState(false)
	const hanldeAddUser = () => {
		setEditingUser(null)
		setShowUserForm(true)
	}

	const [editOpen, setEditOpen] = useState(false)
	const [editingUser, setEditingUser] = useState<User | null>(null)

	const onEditUser = (user) => {
		setEditingUser(user)
		setEditOpen(true)
	}

	const handleEditUser = (user: User) => {
		setEditingUser(user)
		setEditOpen(true)
	}

	return (
		<UserTableContext.Provider value={{ onEditUser: handleEditUser }}>
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
							<Button onClick={hanldeAddUser}>
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

				{editOpen && (
					<div className='p-4 w-full'>
						<UserEditForm
							open={editOpen}
							setOpen={setEditOpen}
							onSuccess={() => {
								refetchStudents()
								setEditOpen(false)
							}}
							editingUser={editingUser}
						/>
					</div>
				)}
			</div>
		</UserTableContext.Provider>
	)
}
