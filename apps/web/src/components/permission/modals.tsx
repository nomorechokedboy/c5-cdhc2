import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { Role } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { GetPermissions } from '@/api'
import { ErrorState } from '@/components/error-state'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { DialogClose } from '@radix-ui/react-dialog'
import { Shield } from 'lucide-react'

interface PermissionsModalProps {
	role: Role
	onSubmit: (permissions: string[]) => void
	onRoleIdChange: (id: number) => void
}

export default function PermissionsModal({
	role,
	onSubmit,
	onRoleIdChange
}: PermissionsModalProps) {
	const [open, setOpen] = useState(false)
	const {
		data: permissions = [],
		isLoading,
		error,
		refetch
	} = useQuery({ queryKey: ['permissions'], queryFn: GetPermissions })
	const [selectedPermissions, setSelectedPermissions] = useState<
		Record<string, boolean>
	>({})

	useEffect(() => {
		if (open) {
			setSelectedPermissions(
				role?.permissions.reduce(
					(acc, perm) => ({ ...acc, [perm]: true }),
					{}
				) || {}
			)
		}
	}, [open, role])

	const handlePermissionToggle = (key: string) => {
		setSelectedPermissions((prev) => ({
			...prev,
			[key]: !prev[key]
		}))
	}

	const handleSave = () => {
		const selectedKeys = Object.keys(selectedPermissions).filter(
			(key) => selectedPermissions[key]
		)
		onSubmit(selectedKeys)
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
					onClick={() => {
						if (role) {
							onRoleIdChange(role.id)
						}
					}}
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
													key={permission.key}
													className='flex items-center space-x-2'
												>
													<Checkbox
														id={permission.key}
														checked={
															selectedPermissions[
																permission.key
															] || false
														}
														onCheckedChange={() =>
															handlePermissionToggle(
																permission.key
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
						<Button variant='outline' disabled={isLoading}>
							Hủy
						</Button>
					</DialogClose>
					<Button onClick={handleSave} disabled={isLoading}>
						Lưu lại
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
