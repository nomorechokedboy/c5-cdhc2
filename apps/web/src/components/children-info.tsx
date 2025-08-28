import type { ChildrenInfo } from '@/types'
import { Trash2, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface ChildrenInfoProps {
	form: any
}

export default function ChildrenInfo({ form }: ChildrenInfoProps) {
	return (
		<form.AppField name='childrenInfos' defaultValue={[]}>
			{(field: any) => (
				<div className='space-y-6'>
					<div className='space-y-4'>
						{field.state.value.map(
							(child: ChildrenInfo, index: number) => (
								<Card key={index} className='relative'>
									<CardHeader className='pb-3'>
										<div className='flex items-center justify-between'>
											<CardTitle className='text-lg'>
												Con thứ {index + 1}
											</CardTitle>
											{field.state.value.length > 0 && (
												<Button
													type='button'
													variant='ghost'
													size='sm'
													onClick={() => {
														const newValue =
															field.state.value.filter(
																(
																	_: any,
																	i: number
																) => i !== index
															)

														field.handleChange(
															newValue
														)
														field.removeValue(index)
													}}
													className='text-red-500 hover:text-red-700 hover:bg-red-50'
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											)}
										</div>
									</CardHeader>
									<CardContent className='space-y-4'>
										<form.AppField
											name={`childrenInfos[${index}].fullName`}
											defaultValue=''
										>
											{(field: any) => (
												<field.TextField
													label='Họ và tên con'
													placeholder='Họ và tên con...'
												/>
											)}
										</form.AppField>

										<form.AppField
											name={`childrenInfos[${index}].dob`}
											defaultValue=''
										>
											{(field: any) => (
												<field.TextField
													placeholder='Ngày/tháng/năm'
													label='Ngày sinh'
												/>
											)}
										</form.AppField>
									</CardContent>
								</Card>
							)
						)}
					</div>

					<div className='flex flex-col sm:flex-row gap-3'>
						<Button
							type='button'
							variant='outline'
							onClick={() => {
								const newChild = {
									fullName: '',
									dob: ''
								}
								field.handleChange([
									...field.state.value,
									newChild
								])
							}}
							className='flex items-center gap-2 bg-transparent'
						>
							<Plus className='h-4 w-4' />
							Thêm thông tin con cái
						</Button>
					</div>
				</div>
			)}
		</form.AppField>
	)
}
