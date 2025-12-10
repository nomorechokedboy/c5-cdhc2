import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Key } from 'lucide-react'
import PermissionModal from './modal'
import PermissionCardSkeleton from './skeleton'
import { ErrorState } from '@/components/error-state'
import type { Permission } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { GetPermissions } from '@/api'

export default function PermissionsTab() {
	const {
		data: permissions = [],
		isLoading,
		error,
		refetch: refetchPermissions
	} = useQuery({ queryKey: ['permissions'], queryFn: GetPermissions })
	const [searchQuery, setSearchQuery] = useState('')
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [editingPermissionId, setEditingPermissionId] = useState<
		number | null
	>(null)

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
	) => {}

	const handleUpdatePermission = (
		permissionId: number,
		data: Omit<Permission, 'id' | 'rolesCount' | 'createdAt'>
	) => {}

	const handleDeletePermission = (id: number) => {}

	const editingPermission = permissions.find(
		(p) => p.id === editingPermissionId
	)

	const handleRetry = async () => {
		refetchPermissions()
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
																	Dùng bởi{' '}
																	{
																		permission.rolesCount
																	}{' '}
																	vai trò
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
			{filteredPermissions.length === 0 && !isLoading && (
				<Card className='border-dashed'>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<Key className='mb-4 h-8 w-8 text-muted-foreground' />
						<p className='text-muted-foreground'>
							Chưa có quyền nào
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
