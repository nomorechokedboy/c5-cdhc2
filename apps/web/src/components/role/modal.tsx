import type React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface RoleModalProps {
	isOpen: boolean
	title: string
	initialData?: { name: string; description: string }
	onClose: () => void
	onSubmit: (data: { name: string; description: string }) => void
}

export default function RoleModal({
	isOpen,
	title,
	initialData,
	onClose,
	onSubmit
}: RoleModalProps) {
	const [formData, setFormData] = useState({ name: '', description: '' })

	useEffect(() => {
		if (initialData) {
			setFormData(initialData)
		} else {
			setFormData({ name: '', description: '' })
		}
	}, [initialData, isOpen])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		onSubmit(formData)
	}

	if (!isOpen) return null

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
			<div className='w-full max-w-md rounded-lg border bg-background p-6 shadow-lg'>
				<h2 className='text-lg font-semibold'>{title}</h2>
				<form onSubmit={handleSubmit} className='mt-4 space-y-4'>
					<div>
						<Label htmlFor='name'>Role Name</Label>
						<Input
							id='name'
							value={formData.name}
							onChange={(e) =>
								setFormData({
									...formData,
									name: e.target.value
								})
							}
							placeholder='e.g., Manager, Moderator'
							required
						/>
					</div>
					<div>
						<Label htmlFor='description'>Description</Label>
						<Textarea
							id='description'
							value={formData.description}
							onChange={(e) =>
								setFormData({
									...formData,
									description: e.target.value
								})
							}
							placeholder='Describe what this role can do'
							rows={3}
							required
						/>
					</div>
					<div className='flex gap-2 pt-2'>
						<Button
							type='button'
							variant='outline'
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button type='submit'>
							{initialData ? 'Update Role' : 'Create Role'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}
