import { useState } from 'react'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Edit3, Save, X, Loader2 } from 'lucide-react'
import { Score } from '@/components/score'
import { cn } from '@/lib/utils'

interface EditableGradeCellProps {
	studentId: number
	category: number
	value: number
	isHighlighted?: boolean
	onSave: (
		studentId: number,
		category: number,
		value: number
	) => Promise<void> | void
}

export default function EditableGradeCell({
	studentId,
	category,
	value,
	isHighlighted = false,
	onSave
}: EditableGradeCellProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleEditStart = () => {
		setIsEditing(true)
		setEditValue(value.toFixed(2))
	}

	const handleEditSave = async () => {
		const newValue = Number.parseFloat(editValue)
		if (isNaN(newValue) || newValue < 0 || newValue > 100) return

		try {
			setIsLoading(true)
			await Promise.resolve(onSave(studentId, category, newValue))
			setIsEditing(false)
			setEditValue('')
		} finally {
			setIsLoading(false)
		}
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
					className='h-8 w-20 text-center font-serif text-base font-semibold tabular-nums'
					autoFocus
					disabled={isLoading}
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleEditSave()
						if (e.key === 'Escape' && !isLoading) handleEditCancel()
					}}
				/>
				<Button
					size='sm'
					variant='ghost'
					onClick={handleEditSave}
					disabled={isLoading}
					className='h-8 w-8 p-0'
				>
					{isLoading ? (
						<Loader2 className='h-3 w-3 animate-spin' />
					) : (
						<Save className='h-3 w-3' />
					)}
				</Button>
				<Button
					size='sm'
					variant='ghost'
					onClick={handleEditCancel}
					disabled={isLoading}
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
			className={cn(
				'group h-8 px-3',
				isHighlighted &&
					'bg-brass/15 ring-brass/70 hover:bg-brass/25 ring-1'
			)}
			onClick={handleEditStart}
		>
			<Score value={value} className='text-lg' />
			<Edit3 className='ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100' />
		</Button>
	)
}
