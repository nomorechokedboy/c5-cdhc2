import usePatchStudent from '@/hooks/usePatchStudent'
import type { Student } from '@/types'
import type { CellContext } from '@tanstack/react-table'
import ToggleInput from '@/components/toggle-input'
import { Badge } from '@/components/ui/badge'
import { MilitaryRankOptions } from './data/data'

export type EditableMilitaryRankProps = CellContext<Student, unknown> & {
	className?: string
}

export default function EditableMilitaryRank({
	className,
	column,
	row
}: EditableMilitaryRankProps) {
	const { handlePatchStudentData, isPending } = usePatchStudent(row, column)
	return (
		<ToggleInput
			type='combobox'
			options={MilitaryRankOptions}
			className={`font-medium min-w-32 ${className}`}
			onSave={handlePatchStudentData}
			isLoading={isPending}
			placeholder={
				<Badge className='bg-blue-500 font-bold'>
					{row.getValue(column.id)}
				</Badge>
			}
		/>
	)
}
