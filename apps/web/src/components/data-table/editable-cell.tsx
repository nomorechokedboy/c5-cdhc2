import usePatchStudent from '@/hooks/usePatchStudent'
import type { Student } from '@/types'
import type { CellContext } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import ToggleInput from '@/components/toggle-input'

export type EditableCellProps = CellContext<Student, unknown> & {
	className?: string
}

export default function EditableCell({
	className,
	column,
	row
}: EditableCellProps) {
	const { handlePatchStudentData, isPending } = usePatchStudent(row, column)
	return (
		<ToggleInput
			type='text'
			className={`font-medium min-w-32 ${className}`}
			onSave={handlePatchStudentData}
			initialValue={row.getValue(column.id)}
			isLoading={isPending}
			placeholder={
				<Badge className='bg-primary text-primary-foreground font-bold'>
					Chưa có thông tin...
				</Badge>
			}
		/>
	)
}
