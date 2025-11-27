import { useState } from 'react'
import type { Class } from '@/types'
import { useUpdateClasses } from '@/hooks/useUpdateClasses'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { X } from 'lucide-react'

interface ClassEditFormProps {
	classData: Class
	onUpdate: (updated: { name: string; description: string; status: 'ongoing' | 'graduated' }) => void
	onClose: () => void
}

export default function ClassEditForm({
	classData,
	onUpdate,
	onClose
}: ClassEditFormProps) {
	const [name, setName] = useState(classData.name)
	const [description, setDescription] = useState(classData.description)
	const [status, setStatus] = useState<'ongoing' | 'graduated'>(
		(classData.status as 'ongoing' | 'graduated')
	)
	const updateClassMutation = useUpdateClasses()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			await updateClassMutation.mutateAsync([
				{ ...classData, name, description, status, graduatedAt: classData.graduatedAt ?? "" }
			])
			toast.success('Cập nhật thông tin lớp học thành công')
			onUpdate({ name, description, status })
			onClose()
		} catch (err) {
			console.error('Error updating class:', err)
			toast.error('Cập nhật thông tin lớp học thất bại!')
		}
	}

	return (
		<div className='rounded-2xl shadow-xl w-full max-w-md p-6 relative'>
			<Button
				type='button'
				onClick={onClose}
				variant='ghost'
				size='icon'
				className='absolute top-3 right-3'
			>
				<X className='h-4 w-4' />
			</Button>

			<form onSubmit={handleSubmit} className='space-y-4'>
				<div className='space-y-2'>
					<Label htmlFor='name'>Tên lớp học</Label>
					<Input
						id='name'
						type='text'
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>

				<div className='space-y-2'>
					<Label htmlFor='description'>Mô tả</Label>
					<Textarea
						id='description'
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={3}
					/>
				</div>

				<div className='space-y-2'>
					<Label htmlFor='status'>Trạng thái</Label>
					<Select value={status} onValueChange={(value) => setStatus(value as 'ongoing' | 'graduated')}>
						<SelectTrigger id='status'>
							<SelectValue placeholder='Chọn trạng thái' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='ongoing'>Đang diễn ra</SelectItem>
							<SelectItem value='graduated'>Đã tốt nghiệp</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className='flex justify-end gap-2 pt-2'>
					<Button
						type='button'
						onClick={onClose}
						variant='outline'
					>
						Huỷ
					</Button>
					<Button
						type='submit'
						disabled={updateClassMutation.isPending}
					>
						{updateClassMutation.isPending
							? 'Đang cập nhật...'
							: 'Cập nhật'}
					</Button>
				</div>
			</form>
		</div>
	)
}
