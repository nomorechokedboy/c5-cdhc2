import type React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface PermissionModalProps {
	isOpen: boolean
	title: string
	initialData?: {
		key: string
		name: string
		description: string
		category: string
	}
	onClose: () => void
	onSubmit: (data: {
		key: string
		name: string
		description: string
		category: string
	}) => void
}

export default function PermissionModal({
	isOpen,
	title,
	initialData,
	onClose,
	onSubmit
}: PermissionModalProps) {
	const [formData, setFormData] = useState({
		key: '',
		name: '',
		description: '',
		category: ''
	})

	useEffect(() => {
		if (initialData) {
			setFormData(initialData)
		} else {
			setFormData({ key: '', name: '', description: '', category: '' })
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
						<Label htmlFor='key'>Permission Key</Label>
						<Input
							id='key'
							value={formData.key}
							onChange={(e) =>
								setFormData({
									...formData,
									key: e.target.value
								})
							}
							placeholder='e.g., users.read, content.write'
							disabled={!!initialData}
							required
						/>
						<p className='mt-1 text-xs text-muted-foreground'>
							Use format: resource.action
						</p>
					</div>
					<div>
						<Label htmlFor='name'>Permission Name</Label>
						<Input
							id='name'
							value={formData.name}
							onChange={(e) =>
								setFormData({
									...formData,
									name: e.target.value
								})
							}
							placeholder='e.g., Delete Users'
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
							placeholder='What does this permission allow?'
							rows={2}
							required
						/>
					</div>
					<div>
						<Label htmlFor='category'>Category</Label>
						<Input
							id='category'
							value={formData.category}
							onChange={(e) =>
								setFormData({
									...formData,
									category: e.target.value
								})
							}
							placeholder='e.g., Users, Content, System'
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
							{initialData
								? 'Update Permission'
								: 'Create Permission'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}
