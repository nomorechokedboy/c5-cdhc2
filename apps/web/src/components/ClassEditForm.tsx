import { useState } from 'react'
import type { Class } from '@/types'
import { useUpdateClasses } from '@/hooks/useUpdateClasses'
import { toast } from 'sonner'

interface ClassEditFormProps {
	classData: Class
	onUpdate: (updated: { name: string; description: string }) => void
	onClose: () => void
}

export default function ClassEditForm({
	classData,
	onUpdate,
	onClose
}: ClassEditFormProps) {
	const [name, setName] = useState(classData.name)
	const [description, setDescription] = useState(classData.description)
	const updateClassMutation = useUpdateClasses()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		/* try catch */
		try {
			await updateClassMutation.mutateAsync([
				{ ...classData, name, description, graduatedAt: classData.graduatedAt ?? "" }
			])
			toast.success('Cập nhật thông tin lớp học thành công')
		} catch (err) {
			console.error('Error updating class:', err)
			toast.error('Cập nhật thông tin lớp học thất bại!')
		}
		onUpdate({ name, description })
		onClose()
	}

	return (
		<div className='rounded-2xl shadow-xl w-full max-w-md p-6 relative'>
			{/* Nút đóng */}
			<button
				type='button'
				onClick={onClose}
				className='absolute top-3 right-3 text-gray-500 hover:text-gray-800'
			>
				✕
			</button>

			{/* <h2 className='text-lg font-bold mb-4'>Chỉnh sửa lớp học</h2> */}

			<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
				<label className='flex flex-col gap-1'>
					<span className='font-medium'>Tên lớp học</span>
					<input
						type='text'
						value={name}
						onChange={(e) => setName(e.target.value)}
						className='border rounded-lg px-3 py-2 focus:ring focus:ring-primary/50 outline-none'
						required
					/>
				</label>
				<label className='flex flex-col gap-1'>
					<span className='font-medium'>Mô tả</span>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className='border rounded-lg px-3 py-2 focus:ring focus:ring-primary/50 outline-none'
						rows={3}
					/>
				</label>
				<div className='flex justify-end gap-2'>
					<button
						type='button'
						onClick={onClose}
						className='px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100'
					>
						Huỷ
					</button>
					<button
						type='submit'
						className='bg-primary text-white rounded-lg px-4 py-2 font-semibold hover:bg-primary/90'
						disabled={updateClassMutation.isPending}
					>
						{updateClassMutation.isPending
							? 'Đang cập nhật...'
							: 'Cập nhật'}
					</button>
				</div>
			</form>
		</div>
	)
}
