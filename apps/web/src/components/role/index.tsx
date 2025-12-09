import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Shield } from 'lucide-react'
import RoleModal from './modal'
import PermissionsModal from '@/components/permission/modals'
import RoleCardSkeleton from './skeleton'
import { ErrorState } from '@/components/error-state'
import type { Role } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { GetRoles } from '@/api'
import PermissionModal from '../permission/modal'

export default function RolesTab() {
	const {
		data: roles = [],
		isLoading,
		error,
		refetch
	} = useQuery({ queryKey: ['roles'], queryFn: GetRoles })
	const [searchQuery, setSearchQuery] = useState('')
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
	const [permissionsRoleId, setPermissionsRoleId] = useState<number | null>(
		null
	)

	const filteredRoles = roles.filter(
		(role) =>
			role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			role.description.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const handleCreateRole = (data: { name: string; description: string }) => {
		setIsCreateModalOpen(false)
	}

	const handleUpdateRole = (
		roleId: number,
		data: { name: string; description: string }
	) => {
		setEditingRoleId(null)
	}

	const handleUpdatePermissions = (roleId: number, permissions: string[]) => {
		setPermissionsRoleId(null)
	}

	const handleDeleteRole = (id: number) => {}

	const editingRole = roles?.find((r) => r.id === editingRoleId)
	const permissionsRole = roles?.find((r) => r.id === permissionsRoleId)

	const handleRetry = () => {
		refetch()
	}

	if (error) {
		return <ErrorState error={error} onRetry={handleRetry} />
	}

	return (
		<div className='space-y-6 p-8'>
			{/* Header with Search and Create Button */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<Input
					placeholder='Tìm kiếm...'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className='sm:max-w-xs'
				/>
				<Button
					onClick={() => setIsCreateModalOpen(true)}
					className='gap-2'
				>
					<Plus className='h-4 w-4' />
					Tạo quyền
				</Button>
			</div>

			{/* Roles Grid */}
			{isLoading ? (
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{Array.from({ length: 6 }).map((_, i) => (
						<RoleCardSkeleton key={i} />
					))}
				</div>
			) : (
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{filteredRoles.map((role) => (
						<Card key={role.id} className='flex flex-col'>
							<CardHeader>
								<CardTitle className='text-lg'>
									{role.name}
								</CardTitle>
								<CardDescription>
									{role.description}
								</CardDescription>
							</CardHeader>
							<CardContent className='flex-1 space-y-4'>
								{/* Permission Badges */}
								<div className='space-y-2'>
									<p className='text-xs font-semibold text-muted-foreground'>
										{role.permissions.length} quyền
										{role.permissions.length !== 1
											? 's'
											: ''}
									</p>
									<div className='flex flex-wrap gap-1'>
										{role.permissions
											.slice(0, 3)
											.map((permission) => (
												<Badge
													key={permission}
													variant='secondary'
													className='text-xs'
												>
													{permission}
												</Badge>
											))}
										{role.permissions.length > 3 && (
											<Badge
												variant='secondary'
												className='text-xs'
											>
												+{role.permissions.length - 3}
											</Badge>
										)}
									</div>
								</div>

								{/* User Count */}
								<div className='text-sm text-muted-foreground'>
									{role.userCount} người dùng
									{role.userCount !== 1 ? 's' : ''}
								</div>

								{/* Actions */}
								<div className='flex gap-2 pt-2'>
									<PermissionsModal
										role={role}
										onSubmit={(permissions) =>
											handleUpdatePermissions(
												permissionsRole!.id,
												permissions
											)
										}
										onRoleIdChange={(id) => {
											setPermissionsRoleId(id)
										}}
									/>

									<Button
										variant='outline'
										size='sm'
										onClick={() =>
											setEditingRoleId(role.id)
										}
									>
										<Edit2 className='h-4 w-4' />
									</Button>

									<Button
										variant='outline'
										size='sm'
										onClick={() =>
											handleDeleteRole(role.id)
										}
									>
										<Trash2 className='h-4 w-4' />
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Empty State */}
			{filteredRoles.length === 0 && (
				<Card className='border-dashed'>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<Shield className='mb-4 h-8 w-8 text-muted-foreground' />
						<p className='text-muted-foreground'>
							Chưa có vai trò...
						</p>
					</CardContent>
				</Card>
			)}

			{/* Modals */}
			<RoleModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				onSubmit={handleCreateRole}
				title='Tạo vai trò mới'
			/>

			{editingRole && (
				<RoleModal
					isOpen={!!editingRole}
					onClose={() => setEditingRoleId(null)}
					onSubmit={(data) => handleUpdateRole(editingRole.id, data)}
					initialData={editingRole}
					title='Chỉnh sửa vai trò'
				/>
			)}

			{permissionsRole && (
				<PermissionsModal
					isOpen={!!permissionsRole}
					onClose={() => setPermissionsRoleId(null)}
					role={permissionsRole}
					onSubmit={(permissions) =>
						handleUpdatePermissions(permissionsRole.id, permissions)
					}
				/>
			)}
		</div>
	)
}
