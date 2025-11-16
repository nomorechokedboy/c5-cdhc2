import { useState } from 'react'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Edit3, Save, X } from 'lucide-react'

interface EditableGradeCellProps {
	studentId: number
	category: string
	value: number
	isHighlighted?: boolean
	onSave: (studentId: number, category: string, value: number) => void
	gradeClassName?: string
}

export default function EditableGradeCell({
	studentId,
	category,
	value,
	isHighlighted = false,
	onSave,
	gradeClassName
}: EditableGradeCellProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState('')

	const handleEditStart = () => {
		setIsEditing(true)
		setEditValue(value.toFixed(2))
	}

	const handleEditSave = () => {
		const newValue = Number.parseFloat(editValue)
		if (isNaN(newValue) || newValue < 0 || newValue > 100) return

		onSave(studentId, category, newValue)
		setIsEditing(false)
		setEditValue('')
	}

	const handleEditCancel = () => {
		setIsEditing(false)
		setEditValue('')
	}

	if (isEditing) {
		return (
			<div className='flex items-center gap-2 justify-center'>
				<Input
					type='number'
					min='0'
					max='10'
					step='0.1'
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					className='w-16 h-8 text-center'
					autoFocus
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleEditSave()
						if (e.key === 'Escape') handleEditCancel()
					}}
				/>
				<Button
					size='sm'
					variant='ghost'
					onClick={handleEditSave}
					className='h-8 w-8 p-0'
				>
					<Save className='h-3 w-3' />
				</Button>
				<Button
					size='sm'
					variant='ghost'
					onClick={handleEditCancel}
					className='h-8 w-8 p-0'
				>
					<X className='h-3 w-3' />
				</Button>
			</div>
		)
	}

	return (
		<Button
			variant='ghost'
			className={`h-8 px-2 hover:bg-muted/50 group ${isHighlighted ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
			onClick={handleEditStart}
		>
			<span className={`font-medium ${gradeClassName}`}>
				{value.toFixed(2) || 0}
			</span>
			<Edit3 className='h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity' />
		</Button>
	)
}
