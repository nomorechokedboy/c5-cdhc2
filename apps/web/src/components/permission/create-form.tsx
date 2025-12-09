import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface PermissionFormProps {
	initialData?: {
		key: string
		name: string
		description: string
		category: string
	}
	onSubmit: (data: {
		key: string
		name: string
		description: string
		category: string
	}) => void
}

export default function PermissionForm({
	initialData,
	onSubmit
}: PermissionFormProps) {
	const [formData, setFormData] = useState({
		key: initialData?.key || '',
		name: initialData?.name || '',
		description: initialData?.description || '',
		category: initialData?.category || ''
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		onSubmit(formData)
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<div>
				<Label htmlFor='key'>Permission Key</Label>
				<Input
					id='key'
					value={formData.key}
					onChange={(e) =>
						setFormData({ ...formData, key: e.target.value })
					}
					placeholder='e.g., users.read, content.write'
					disabled={!!initialData}
					required
				/>
				<p className='mt-1 text-xs text-muted-foreground'>
					Use format: resource.action (e.g., users.delete)
				</p>
			</div>
			<div>
				<Label htmlFor='name'>Permission Name</Label>
				<Input
					id='name'
					value={formData.name}
					onChange={(e) =>
						setFormData({ ...formData, name: e.target.value })
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
						setFormData({ ...formData, category: e.target.value })
					}
					placeholder='e.g., Users, Content, System'
					required
				/>
			</div>
			<Button type='submit' className='w-full'>
				{initialData ? 'Update Permission' : 'Create Permission'}
			</Button>
		</form>
	)
}
