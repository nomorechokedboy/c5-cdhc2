import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Key } from 'lucide-react'
import PermissionModal from './modal'
import PermissionCardSkeleton from './skeleton'
import { ErrorState } from '@/components/error-state'
import type { Permission } from '@/types'

const MOCK_PERMISSIONS: Permission[] = [
	{
		id: '1',
		key: 'users.read',
		name: 'Read Users',
		description: 'View user information and details',
		category: 'Users',
		rolesCount: 3,
		createdAt: '2024-01-15'
	},
	{
		id: '2',
		key: 'users.write',
		name: 'Write Users',
		description: 'Create and update user information',
		category: 'Users',
		rolesCount: 1,
		createdAt: '2024-01-15'
	},
	{
		id: '3',
		key: 'users.delete',
		name: 'Delete Users',
		description: 'Remove users from the system',
		category: 'Users',
		rolesCount: 1,
		createdAt: '2024-01-15'
	},
	{
		id: '4',
		key: 'content.read',
		name: 'Read Content',
		description: 'View published and draft content',
		category: 'Content',
		rolesCount: 2,
		createdAt: '2024-01-20'
	},
	{
		id: '5',
		key: 'content.write',
		name: 'Write Content',
		description: 'Create and edit content',
		category: 'Content',
		rolesCount: 2,
		createdAt: '2024-01-20'
	},
	{
		id: '6',
		key: 'content.publish',
		name: 'Publish Content',
		description: 'Publish content to production',
		category: 'Content',
		rolesCount: 1,
		createdAt: '2024-01-20'
	},
	{
		id: '7',
		key: 'roles.manage',
		name: 'Manage Roles',
		description: 'Create, update, and delete roles',
		category: 'System',
		rolesCount: 1,
		createdAt: '2024-01-15'
	},
	{
		id: '8',
		key: 'permissions.manage',
		name: 'Manage Permissions',
		description: 'Define and modify system permissions',
		category: 'System',
		rolesCount: 1,
		createdAt: '2024-01-15'
	}
]

export default function PermissionsTab() {
	const [permissions, setPermissions] =
		useState<Permission[]>(MOCK_PERMISSIONS)
	const [searchQuery, setSearchQuery] = useState('')
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [editingPermissionId, setEditingPermissionId] = useState<
		string | null
	>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const loadPermissions = async () => {
			setIsLoading(true)
			setError(null)
			try {
				await new Promise((resolve) => setTimeout(resolve, 1000))
				setPermissions(MOCK_PERMISSIONS)
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: 'Failed to load permissions'
				)
			} finally {
				setIsLoading(false)
			}
		}

		loadPermissions()
	}, [])

	const filteredPermissions = permissions.filter(
		(permission) =>
			permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			permission.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
			permission.category
				.toLowerCase()
				.includes(searchQuery.toLowerCase())
	)

	const categories = Array.from(new Set(permissions.map((p) => p.category)))

	const handleCreatePermission = (
		data: Omit<Permission, 'id' | 'rolesCount' | 'createdAt'>
	) => {
		const newPermission: Permission = {
			...data,
			id: String(permissions.length + 1),
			rolesCount: 0,
			createdAt: new Date().toISOString().split('T')[0]
		}
		setPermissions([...permissions, newPermission])
		setIsCreateModalOpen(false)
	}

	const handleUpdatePermission = (
		permissionId: string,
		data: Omit<Permission, 'id' | 'rolesCount' | 'createdAt'>
	) => {
		setPermissions(
			permissions.map((permission) =>
				permission.id === permissionId
					? { ...permission, ...data }
					: permission
			)
		)
		setEditingPermissionId(null)
	}

	const handleDeletePermission = (id: string) => {
		setPermissions(permissions.filter((permission) => permission.id !== id))
	}

	const editingPermission = permissions.find(
		(p) => p.id === editingPermissionId
	)

	const handleRetry = async () => {
		setIsLoading(true)
		setError(null)
		try {
			await new Promise((resolve) => setTimeout(resolve, 1000))
			setPermissions(MOCK_PERMISSIONS)
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to load permissions'
			)
		} finally {
			setIsLoading(false)
		}
	}

	if (error) {
		return <ErrorState error={error} onRetry={handleRetry} />
	}

	return (
		<div className='space-y-6 p-8'>
			{/* Header with Search and Create Button */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<Input
					placeholder='Search permissions...'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className='sm:max-w-xs'
				/>
				<Button
					onClick={() => setIsCreateModalOpen(true)}
					className='gap-2'
				>
					<Plus className='h-4 w-4' />
					Create Permission
				</Button>
			</div>

			{/* Permissions by Category */}
			{isLoading ? (
				<div className='space-y-6'>
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className='space-y-2'>
							<div className='h-5 w-20 animate-pulse rounded bg-muted' />
							<div className='space-y-2'>
								{Array.from({ length: 2 }).map((_, j) => (
									<PermissionCardSkeleton key={j} />
								))}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className='space-y-6'>
					{categories.map((category) => {
						const categoryPermissions = filteredPermissions.filter(
							(p) => p.category === category
						)

						if (categoryPermissions.length === 0) return null

						return (
							<div key={category}>
								<h3 className='mb-3 text-sm font-semibold text-foreground'>
									{category}
								</h3>
								<div className='space-y-2 flex flex-col gap-4'>
									{categoryPermissions.map((permission) => (
										<Card key={permission.id}>
											<CardContent className='flex items-center justify-between py-4'>
												<div className='flex-1'>
													<div className='flex items-center gap-2'>
														<Key className='h-4 w-4 text-muted-foreground' />
														<div>
															<p className='font-medium text-foreground'>
																{
																	permission.name
																}
															</p>
															<p className='text-sm text-muted-foreground'>
																{permission.key}
															</p>
															<p className='mt-1 text-xs text-muted-foreground'>
																{
																	permission.description
																}
															</p>
															<div className='mt-2'>
																<Badge
																	variant='outline'
																	className='text-xs'
																>
																	Used by{' '}
																	{
																		permission.rolesCount
																	}{' '}
																	role
																	{permission.rolesCount !==
																	1
																		? 's'
																		: ''}
																</Badge>
															</div>
														</div>
													</div>
												</div>

												{/* Actions */}
												<div className='flex gap-2'>
													<Button
														variant='ghost'
														size='sm'
														onClick={() =>
															setEditingPermissionId(
																permission.id
															)
														}
													>
														<Edit2 className='h-4 w-4' />
													</Button>

													<Button
														variant='ghost'
														size='sm'
														onClick={() =>
															handleDeletePermission(
																permission.id
															)
														}
													>
														<Trash2 className='h-4 w-4' />
													</Button>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							</div>
						)
					})}
				</div>
			)}

			{/* Empty State */}
			{filteredPermissions.length === 0 && (
				<Card className='border-dashed'>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<Key className='mb-4 h-8 w-8 text-muted-foreground' />
						<p className='text-muted-foreground'>
							No permissions found
						</p>
					</CardContent>
				</Card>
			)}

			{/* Modals */}
			<PermissionModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				onSubmit={handleCreatePermission}
				title='Create New Permission'
			/>

			{editingPermission && (
				<PermissionModal
					isOpen={!!editingPermission}
					onClose={() => setEditingPermissionId(null)}
					onSubmit={(data) =>
						handleUpdatePermission(editingPermission.id, data)
					}
					initialData={editingPermission}
					title='Edit Permission'
				/>
			)}
		</div>
	)
}
