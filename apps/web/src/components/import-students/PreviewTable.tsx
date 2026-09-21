import { Fragment, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import UnitSelect from '@/components/unit-select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { toDisplayDate } from '@/lib/student-dates'
import { RowDetail } from './RowDetail'
import type { EvaluatedRow } from './useStudentImport'

interface PreviewTableProps {
	rows: EvaluatedRow[]
	onRowUnitChange: (rowNumber: number, id: number | undefined) => void
	disabled?: boolean
}

/**
 * Sổ kẻ dòng: mỗi dòng file là một dòng sổ; dòng lỗi nhuốm đỏ, có vạch đỏ bên trái.
 * Bấm mũi tên đầu dòng để xem đủ mọi trường của học viên đó trước khi import.
 */
export function PreviewTable({
	rows,
	onRowUnitChange,
	disabled
}: PreviewTableProps) {
	const [open, setOpen] = useState<ReadonlySet<number>>(new Set())
	const toggle = (rowNumber: number) =>
		setOpen((prev) => {
			const next = new Set(prev)
			if (!next.delete(rowNumber)) next.add(rowNumber)
			return next
		})

	return (
		<Table className='text-base [&_td]:px-3 [&_td]:py-3 [&_th]:px-3'>
			<TableHeader>
				<TableRow>
					<TableHead className='w-20'>Dòng</TableHead>
					<TableHead>Họ và tên</TableHead>
					<TableHead>Ngày sinh</TableHead>
					<TableHead>Lớp</TableHead>
					<TableHead>Kiểm tra</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map(({ row, unit, issues, valid }) => {
					const expanded = open.has(row.rowNumber)
					const tint =
						!valid &&
						'bg-destructive/5 shadow-[inset_3px_0_0_var(--destructive)] hover:bg-destructive/10'
					return (
						<Fragment key={row.rowNumber}>
							<TableRow data-valid={valid} className={cn(tint)}>
								<TableCell className='text-muted-foreground'>
									<button
										type='button'
										onClick={() => toggle(row.rowNumber)}
										aria-expanded={expanded}
										aria-label={`Xem chi tiết dòng ${row.rowNumber}`}
										className='-ml-1 flex cursor-pointer items-center gap-1 rounded-sm p-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
									>
										<ChevronRight
											className={cn(
												'size-4 transition-transform',
												expanded && 'rotate-90'
											)}
										/>
										{row.rowNumber}
									</button>
								</TableCell>
								<TableCell className='font-medium'>
									{String(row.values.fullName)}
								</TableCell>
								<TableCell>
									{toDisplayDate(String(row.values.dob))}
								</TableCell>
								<TableCell>
									<UnitSelect
										compact
										value={unit.unitId}
										onChange={(id) =>
											onRowUnitChange(row.rowNumber, id)
										}
										disabled={disabled}
									/>
								</TableCell>
								<TableCell className='min-w-44 whitespace-normal'>
									{issues.length === 0 ? (
										<span className='text-success'>
											Hợp lệ
										</span>
									) : (
										<ul className='space-y-0.5 text-sm'>
											{issues.map((issue) => (
												<li
													key={`${issue.field}-${issue.level}`}
													className={
														issue.level === 'error'
															? 'text-destructive'
															: 'text-warning'
													}
												>
													{issue.message}
												</li>
											))}
										</ul>
									)}
								</TableCell>
							</TableRow>
							{expanded && (
								<TableRow
									data-detail-for={row.rowNumber}
									className={cn('hover:bg-transparent', tint)}
								>
									<TableCell
										colSpan={5}
										className='bg-muted/40 whitespace-normal'
									>
										<RowDetail row={row} />
									</TableCell>
								</TableRow>
							)}
						</Fragment>
					)
				})}
			</TableBody>
		</Table>
	)
}
