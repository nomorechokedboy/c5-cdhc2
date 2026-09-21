import { Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StudentField } from './StudentField'
import { FormSection } from './FormSection'

/**
 * Danh sách người thân {fullName, dob} (con, anh chị em…) trên field mảng của form.
 * Thêm/xoá qua API mảng của TanStack Form — không cần state phụ rồi đồng bộ lại.
 * Ngày sinh dùng DatePicker (dd/mm/yyyy).
 */
export function PersonListField({
	form,
	name,
	title,
	addLabel,
	emptyText,
	compact = true
}: {
	form: any
	/** Field mảng, vd. `childrenInfos` */
	name: string
	title: string
	addLabel: string
	emptyText: string
	compact?: boolean
}) {
	return (
		<form.Field name={name} mode='array'>
			{(arrayField: any) => {
				const people: unknown[] = arrayField.state.value ?? []
				return (
					<FormSection
						title={`${title} (${people.length})`}
						icon={Users}
						columns={1}
					>
						<div className='space-y-4'>
							{people.length === 0 && (
								<div className='text-center py-6 text-muted-foreground border-2 border-dashed rounded-md'>
									<Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
									<p className='text-sm'>{emptyText}</p>
								</div>
							)}
							{people.map((_, index) => (
								<div
									key={index}
									className='grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end border p-3 rounded-md bg-card'
								>
									<StudentField
										form={form}
										name={`${name}[${index}].fullName`}
										label='Họ tên'
										compact={compact}
									/>
									<StudentField
										form={form}
										type='date'
										name={`${name}[${index}].dob`}
										label='Ngày sinh'
										compact={compact}
									/>
									<Button
										type='button'
										variant='destructive'
										size='icon'
										aria-label='Xoá'
										onClick={() =>
											arrayField.removeValue(index)
										}
									>
										<Trash2 className='h-4 w-4' />
									</Button>
								</div>
							))}
							<Button
								type='button'
								variant='outline'
								className='w-full'
								onClick={() =>
									arrayField.pushValue({
										fullName: '',
										dob: ''
									})
								}
							>
								<Plus className='mr-2 h-4 w-4' />
								{addLabel}
							</Button>
						</div>
					</FormSection>
				)
			}}
		</form.Field>
	)
}
