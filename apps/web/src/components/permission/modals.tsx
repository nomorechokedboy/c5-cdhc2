import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { Role } from '@/types'
import { useMutation, useQuery } from '@tanstack/react-query'
import { GetPermissions, UpdateRole } from '@/api'
import { ErrorState } from '@/components/error-state'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose
} from '@/components/ui/dialog'
import { Shield } from 'lucide-react'
import { toast } from 'sonner'
import { queryClient } from '@/integrations/tanstack-query/root-provider'

interface PermissionsModalProps {
	role: Role
}

export default function PermissionsModal({ role }: PermissionsModalProps) {
	const [open, setOpen] = useState(false)
	const {
		data: permissions = [],
		isLoading,
		error,
		refetch
	} = useQuery({ queryKey: ['permissions'], queryFn: GetPermissions })
	const [selectedPermissions, setSelectedPermissions] = useState<
		Record<number, boolean>
	>({})
	const { mutateAsync, isPending } = useMutation({
		mutationFn: UpdateRole,
		onSuccess: () => {
			toast.success('Chỉnh sửa vai trò thành công!')
			refetch()
			queryClient.invalidateQueries({ queryKey: ['roles'] })
		},
		onError: (err) => {
			toast.error('Chỉnh sửa vai trò thất bại.', {
				description: err.message
			})
		}
	})

	useEffect(() => {
		if (open) {
			setSelectedPermissions(
				role?.permissions.reduce(
					(acc, perm) => ({ ...acc, [perm.id]: true }),
					{}
				) || {}
			)
		}
	}, [open, role])

	const handlePermissionToggle = (key: number) => {
		setSelectedPermissions((prev) => ({
			...prev,
			[key]: !prev[key]
		}))
	}

	const handleSave = () => {
		const selectedKeyIds: number[] = []
		for (const key in selectedPermissions) {
			if (selectedPermissions[key] === true) {
				selectedKeyIds.push(Number(key))
			}
		}

		mutateAsync({
			id: role.id,
			name: role.name,
			description: role.description,
			permissionIds: selectedKeyIds
		})
	}

	const categories = Array.from(new Set(permissions.map((p) => p.category)))

	const handleRetry = () => {
		refetch()
	}

	if (error) {
		return <ErrorState error={error} onRetry={handleRetry} />
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='flex-1 gap-2 bg-transparent'
				>
					<Shield className='h-4 w-4' />
					Các quyền
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Gán quyền cho vai trò {role?.name}
					</DialogTitle>
					<DialogDescription>
						Hãy chọn các quyền mà vai trò này sẽ có
					</DialogDescription>
				</DialogHeader>

				{isLoading && (
					<div className='mt-6 space-y-6'>
						{[1, 2, 3].map((i) => (
							<div key={i}>
								<div className='mb-3 h-5 w-24 animate-pulse rounded bg-muted' />
								<div className='space-y-2'>
									{[1, 2, 3].map((j) => (
										<div
											key={j}
											className='flex items-center space-x-2'
										>
											<div className='h-5 w-5 animate-pulse rounded bg-muted' />
											<div className='flex flex-1 flex-col gap-2'>
												<div className='h-4 w-32 animate-pulse rounded bg-muted' />
												<div className='h-3 w-24 animate-pulse rounded bg-muted' />
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}

				{!isLoading && (
					<div className='mt-6 space-y-6 grid grid-cols-3 gap-4'>
						{categories.map((category) => {
							const categoryPermissions = permissions.filter(
								(p) => p.category === category
							)

							return (
								<div key={category}>
									<h4 className='mb-3 font-semibold text-foreground'>
										{category}
									</h4>
									<div className='space-y-2'>
										{categoryPermissions.map(
											(permission) => (
												<div
													key={permission.id}
													className='flex items-center space-x-2'
												>
													<Checkbox
														id={permission.key}
														checked={
															selectedPermissions[
																permission.id
															] || false
														}
														onCheckedChange={() =>
															handlePermissionToggle(
																permission.id
															)
														}
													/>
													<Label
														htmlFor={permission.key}
														className='flex cursor-pointer flex-col gap-1'
													>
														<span className='font-medium'>
															{permission.name}
														</span>
														<span className='text-xs text-muted-foreground'>
															{permission.key}
														</span>
													</Label>
												</div>
											)
										)}
									</div>
								</div>
							)
						})}
					</div>
				)}
				<DialogFooter className='sticky bottom-0'>
					<DialogClose asChild>
						<Button
							variant='outline'
							disabled={isLoading || isPending}
						>
							Hủy
						</Button>
					</DialogClose>
					<Button
						onClick={handleSave}
						disabled={isLoading || isPending}
					>
						Lưu lại
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
