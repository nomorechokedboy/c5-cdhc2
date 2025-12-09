import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { Role } from './roles-tab'

const ALL_PERMISSIONS = [
	{ key: 'users.read', name: 'Read Users', category: 'Users' },
	{ key: 'users.write', name: 'Write Users', category: 'Users' },
	{ key: 'users.delete', name: 'Delete Users', category: 'Users' },
	{ key: 'content.read', name: 'Read Content', category: 'Content' },
	{ key: 'content.write', name: 'Write Content', category: 'Content' },
	{ key: 'content.publish', name: 'Publish Content', category: 'Content' },
	{ key: 'roles.manage', name: 'Manage Roles', category: 'System' },
	{
		key: 'permissions.manage',
		name: 'Manage Permissions',
		category: 'System'
	}
]

interface PermissionAssignModalProps {
	role: Role
	onUpdate: (permissions: string[]) => void
	children: React.ReactNode
}

export default function PermissionAssignModal({
	role,
	onUpdate,
	children
}: PermissionAssignModalProps) {
	const [open, setOpen] = useState(false)
	const [selectedPermissions, setSelectedPermissions] = useState<
		Record<string, boolean>
	>(role.permissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), {}))

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
		onUpdate(selectedKeys)
		setOpen(false)
	}

	const categories = Array.from(
		new Set(ALL_PERMISSIONS.map((p) => p.category))
	)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className='max-h-[80vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Assign Permissions to {role.name}</DialogTitle>
					<DialogDescription>
						Select which permissions this role should have
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-6 py-4'>
					{categories.map((category) => {
						const categoryPermissions = ALL_PERMISSIONS.filter(
							(p) => p.category === category
						)

						return (
							<div key={category}>
								<h4 className='mb-3 font-semibold text-foreground'>
									{category}
								</h4>
								<div className='space-y-2'>
									{categoryPermissions.map((permission) => (
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
									))}
								</div>
							</div>
						)
					})}
				</div>

				<div className='flex gap-2'>
					<Button variant='outline' onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave}>Save Permissions</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
