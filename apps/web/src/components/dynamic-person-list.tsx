import { Trash2, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ChildrenInfo } from '@/types'

export interface DynamicPersonListProps {
	form: any
	fieldName: 'siblings' | 'childrenInfos'
	config: {
		title: (index: number) => string
		addButtonText: string
		fullNameLabel: string
		fullNamePlaceholder: string
	}
}

export default function DynamicPersonList({
	form,
	fieldName,
	config
}: DynamicPersonListProps) {
	return (
		<form.AppField name={fieldName}>
			{(field: any) => {
				// Ensure we always have an array, even if empty
				const items = Array.isArray(field.state.value)
					? field.state.value
					: []

				return (
					<div className='space-y-6'>
						<div className='space-y-4'>
							{items.map((item: ChildrenInfo, index: number) => (
								<Card key={index} className='relative'>
									<CardHeader className='pb-3'>
										<div className='flex items-center justify-between'>
											<CardTitle className='text-lg'>
												{config.title(index)}
											</CardTitle>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												onClick={() => {
													field.removeValue(index)
												}}
												className='text-red-500 hover:text-red-700 hover:bg-red-50'
											>
												<Trash2 className='h-4 w-4' />
											</Button>
										</div>
									</CardHeader>
									<CardContent className='space-y-4'>
										<form.AppField
											name={`${fieldName}[${index}].fullName`}
										>
											{(subField: any) => (
												<subField.TextField
													label={config.fullNameLabel}
													placeholder={
														config.fullNamePlaceholder
													}
												/>
											)}
										</form.AppField>

										<form.AppField
											name={`${fieldName}[${index}].dob`}
										>
											{(subField: any) => (
												<subField.TextField
													placeholder='Ngày/tháng/năm'
													label='Ngày sinh'
												/>
											)}
										</form.AppField>
									</CardContent>
								</Card>
							))}
						</div>

						<div className='flex flex-col sm:flex-row gap-3'>
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									const newItem = {
										fullName: '',
										dob: ''
									}
									field.handleChange([...items, newItem])
								}}
								className='flex items-center gap-2 bg-transparent'
							>
								<Plus className='h-4 w-4' />
								{config.addButtonText}
							</Button>
						</div>
					</div>
				)
			}}
		</form.AppField>
	)
}
