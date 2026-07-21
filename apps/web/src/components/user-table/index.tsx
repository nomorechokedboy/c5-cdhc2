import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import useUserData from '@/hooks/useUsers'
import type { TemplType, User } from '@/types'
import { DataTable } from '../data-table'
import { getBaseUsersColumns } from './columns'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
	ArrowDownToLine,
	Loader2,
	PlusIcon,
	RefreshCw,
	Search,
	X
} from 'lucide-react'
import { ExportStudentDataDialog } from '../export-student-data-dialog'
import UserForm from './user-form'
import { UserTableContext } from './UserTableContext'
import { canSeeUsernames } from '@/lib/utils'
import { SyncAllAccounts } from '@/api/asset'
import { toast } from 'sonner'

interface UserTableProps {
	filename: string
	enabledCreation?: boolean
	templType?: TemplType
}

export default function UserTable({
	filename,
	templType = 'UserInfoTempl'
}: UserTableProps) {
	const qc = useQueryClient()
	const { data: users = [], refetch: refetchUsers } = useUserData()
	const [search, setSearch] = useState('')
	const [syncBusy, setSyncBusy] = useState(false)

	// State for create form
	const [showCreateForm, setShowCreateForm] = useState(false)

	// State for edit form
	const [editingUser, setEditingUser] = useState<User | null>(null)
	const [showEditForm, setShowEditForm] = useState(false)

	const columns = useMemo(() => getBaseUsersColumns(), [])

	const filteredUsers = useMemo(() => {
		const q = search.trim().toLocaleLowerCase('vi')
		if (!q) return users
		const seeLogin = canSeeUsernames()
		return users.filter((u) => {
			const nganh =
				(u.nganhLabels || [])
					.map((n) => `${n.code} ${n.name}`)
					.join(' ') || (u.nganhCodes || []).join(' ')
			const unit = u.unit
				? `${u.unit.alias || ''} ${u.unit.name}`
				: u.unitName || ''
			const hay = [
				u.displayName,
				// Chỉ admin mới tìm theo username
				seeLogin ? u.username : '',
				u.rank,
				u.position,
				u.status,
				unit,
				nganh
			]
				.filter(Boolean)
				.join(' ')
				.toLocaleLowerCase('vi')
			return hay.includes(q)
		})
	}, [users, search])

	// Handle add user button click
	const handleAddUser = () => {
		setEditingUser(null)
		setShowCreateForm(true)
	}

	// Handle edit user
	const handleEditUser = (user: User) => {
		setEditingUser(user)
		setShowEditForm(true)
	}

	// Handle form success (create or edit)
	const handleFormSuccess = () => {
		refetchUsers()
		// Badge đỏ «chờ cấp quyền» +1 khi tạo user chưa gán role
		void qc.invalidateQueries({ queryKey: ['pending-permissions'] })
		void qc.invalidateQueries({ queryKey: ['pending-room-accounts'] })
		setShowCreateForm(false)
		setShowEditForm(false)
	}

	return (
		<UserTableContext.Provider value={{ onEditUser: handleEditUser }}>
			<div className='space-y-4'>
				<div className='flex flex-wrap items-center gap-3'>
					<div className='relative flex-1 min-w-[200px] max-w-md'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none' />
						<Input
							className='pl-10 h-11 pr-10 text-base'
							placeholder={
								canSeeUsernames()
									? 'Tìm họ tên, username, đơn vị, ngành…'
									: 'Tìm họ tên, đơn vị, ngành…'
							}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						{search ? (
							<button
								type='button'
								className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
								onClick={() => setSearch('')}
								aria-label='Xóa tìm kiếm'
							>
								<X className='w-4.5 h-4.5' />
							</button>
						) : null}
					</div>
					<span className='text-base text-muted-foreground whitespace-nowrap'>
						{search.trim()
							? `${filteredUsers.length} / ${users.length} người dùng`
							: `${users.length} người dùng`}
					</span>
					<Button
						type='button'
						variant='outline'
						size='sm'
						className='h-10 text-base'
						disabled={syncBusy}
						title='Đồng bộ TK phòng → users + tên GV/CNK/phân công đề'
						onClick={() => {
							void (async () => {
								setSyncBusy(true)
								try {
									const r = await SyncAllAccounts()
									toast.success(
										`Đã đồng bộ: +${r.roomUsersCreated} TK phòng` +
											`, GV ${r.teachersUpdated}` +
											`, CNK ${r.facultyHeadsUpdated}` +
											`, phân công ${r.assignmentsUpdated}` +
											(r.pendingRoomAccounts
												? ` · ${r.pendingRoomAccounts} chờ cấp quyền`
												: '')
									)
									await refetchUsers()
									void qc.invalidateQueries({
										queryKey: ['pending-permissions']
									})
									void qc.invalidateQueries({
										queryKey: ['pending-room-accounts']
									})
								} catch (e) {
									toast.error(
										e instanceof Error
											? e.message
											: 'Không đồng bộ được'
									)
								} finally {
									setSyncBusy(false)
								}
							})()
						}}
					>
						{syncBusy ? (
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						) : (
							<RefreshCw className='mr-2 h-4 w-4' />
						)}
						Đồng bộ tài khoản
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						className='h-10 text-base'
						onClick={() => void refetchUsers()}
					>
						Làm mới
					</Button>
				</div>
				<DataTable
					key={`users-${filteredUsers.length}-${search}`}
					data={filteredUsers}
					columns={columns}
					withDynamicColsData={false}
					tableClassName='w-full'
					placeholder={
						search.trim()
							? `Không tìm thấy «${search.trim()}»`
							: 'Không có dữ liệu nào'
					}
					renderToolbarActions={({ exportHook }) => (
						<div className='flex gap-2'>
							<ExportStudentDataDialog
								data={exportHook.exportableData.data}
								defaultFilename={filename}
								templType={templType}
							>
								<Button variant='outline'>
									<ArrowDownToLine className='w-4 h-4 mr-2' />
									Xuất file
								</Button>
							</ExportStudentDataDialog>

							<Button onClick={handleAddUser}>
								<PlusIcon className='w-4 h-4 mr-2' />
								Thêm người dùng
							</Button>
						</div>
					)}
				/>

				{/* Create User Form */}
				{showCreateForm && (
					<UserForm
						open={showCreateForm}
						setOpen={setShowCreateForm}
						onSuccess={handleFormSuccess}
					/>
				)}
			</div>
		</UserTableContext.Provider>
	)
}
