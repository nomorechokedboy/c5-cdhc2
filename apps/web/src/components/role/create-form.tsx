import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface RoleFormProps {
	initialData?: {
		name: string
		description: string
	}
	onSubmit: (data: {
		name: string
		description: string
		permissions: string[]
	}) => void
}

export default function RoleForm({ initialData, onSubmit }: RoleFormProps) {
	const [formData, setFormData] = useState({
		name: initialData?.name || '',
		description: initialData?.description || ''
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		onSubmit({
			...formData,
			permissions: []
		})
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<div>
				<Label htmlFor='name'>Role Name</Label>
				<Input
					id='name'
					value={formData.name}
					onChange={(e) =>
						setFormData({ ...formData, name: e.target.value })
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
			<Button type='submit' className='w-full'>
				{initialData ? 'Update Role' : 'Create Role'}
			</Button>
		</form>
	)
}
