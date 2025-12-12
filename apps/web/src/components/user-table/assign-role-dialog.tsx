import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import useRoles from '@/hooks/useRoles'
import useUserRoles from '@/hooks/useUserRoles'
import useAssignRoles from '@/hooks/useAssignRoles'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface AssignRoleDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	userId: number
	userName: string
}

export default function AssignRoleDialog({
	open,
	onOpenChange,
	userId,
	userName
}: AssignRoleDialogProps) {
	const { data: roles = [], isLoading: isLoadingRoles } = useRoles()
	const { data: userRolesData, isLoading: isLoadingUserRoles } =
		useUserRoles(userId)
	const { mutate: assignRoles, isPending: isAssigning } = useAssignRoles()

	const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])

	useEffect(() => {
		if (userRolesData?.roleIds) {
			setSelectedRoleIds(userRolesData.roleIds)
		} else {
			setSelectedRoleIds([])
		}
	}, [userRolesData])

	const handleRoleToggle = (roleId: number) => {
		setSelectedRoleIds((prev) =>
			prev.includes(roleId)
				? prev.filter((id) => id !== roleId)
				: [...prev, roleId]
		)
	}

	const handleSubmit = () => {
		assignRoles(
			{
				userId,
				roleIds: selectedRoleIds
			},
			{
				onSuccess: () => {
					onOpenChange(false)
				}
			}
		)
	}

	const isLoading = isLoadingRoles || isLoadingUserRoles

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Phân quyền cho {userName}</DialogTitle>
				</DialogHeader>
				<div className='py-4'>
					{isLoading ? (
						<div className='flex justify-center py-4'>
							<Loader2 className='w-6 h-6 animate-spin' />
						</div>
					) : (
						<div className='space-y-4'>
							{roles.length === 0 ? (
								<p className='text-sm text-muted-foreground text-center'>
									Chưa có vai trò nào trong hệ thống
								</p>
							) : (
								roles.map((role) => (
									<div
										key={role.id}
										className='flex items-center space-x-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800'
									>
										<Checkbox
											id={`role-${role.id}`}
											checked={selectedRoleIds.includes(
												role.id
											)}
											onCheckedChange={() =>
												handleRoleToggle(role.id)
											}
										/>
										<div className='grid gap-1.5 leading-none'>
											<Label
												htmlFor={`role-${role.id}`}
												className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
											>
												{role.name}
											</Label>
											{role.description && (
												<p className='text-sm text-muted-foreground'>
													{role.description}
												</p>
											)}
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>
				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => onOpenChange(false)}
						disabled={isAssigning}
					>
						Hủy
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isAssigning || isLoading}
					>
						{isAssigning && (
							<Loader2 className='w-4 h-4 mr-2 animate-spin' />
						)}
						Lưu thay đổi
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
