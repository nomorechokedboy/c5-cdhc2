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
import { Trash2, Shield } from 'lucide-react'
import PermissionsModal from '@/components/permission/modals'
import RoleCardSkeleton from './skeleton'
import { ErrorState } from '@/components/error-state'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DeleteRole, GetRoles } from '@/api'
import CreateRoleForm from './create-form'
import { toast } from 'sonner'
import UpdateRoleForm from './update-form'

export default function RolesTab() {
	const {
		data: roles = [],
		isLoading,
		error,
		refetch: refetchRoles
	} = useQuery({ queryKey: ['roles'], queryFn: GetRoles })
	const [searchQuery, setSearchQuery] = useState('')
	const { mutateAsync: deleteRole, isPending: isDeleteRolePending } =
		useMutation({
			mutationFn: DeleteRole,
			onSuccess: () => {
				toast.success('Xóa vai trò thành công!')
				refetchRoles()
			},
			onError: (err) => {
				console.error('DeleteRole error', err)

				toast.error('Xóa vai trò thất bại.', {
					description: err.message
				})
			}
		})

	const filteredRoles = roles.filter(
		(role) =>
			role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			role.description.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const handleDeleteRole = (id: number) => {
		deleteRole([id])
	}

	const handleRetry = () => {
		refetchRoles()
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
				<CreateRoleForm />
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
													key={permission.id}
													variant='secondary'
													className='text-xs'
												>
													{permission.key}
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
									<PermissionsModal role={role} />

									<UpdateRoleForm
										id={role.id}
										name={role.name}
										description={role.description}
									/>

									<Button
										variant='outline'
										size='sm'
										onClick={() =>
											handleDeleteRole(role.id)
										}
										disabled={isDeleteRolePending}
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
			{filteredRoles.length === 0 && !isLoading && (
				<Card className='border-dashed'>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<Shield className='mb-4 h-8 w-8 text-muted-foreground' />
						<p className='text-muted-foreground'>
							Chưa có vai trò...
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
