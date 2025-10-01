import { EhtnicOptions, religionOptions, eduLevelOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import { useMemo } from 'react'

export default function PersonalStep({ form }: { form: any }) {
	const { data: classes = [], refetch } = useClassData()

	const classOptions = useMemo(
		() =>
			classes.map((c) => ({
				value: c.id.toString(),
				label: `${c.name} - ${c.unit.name}`
			})),
		[classes]
	)

	return (
		<div className='space-y-6'>
			{/* Full Name - Full Width */}
			<div className='grid grid-cols-3 gap-6'>
				<form.AppField name='fullName'>
					{(field: any) => <field.TextField label='Họ và tên' />}
				</form.AppField>

				<form.AppField name='avatar'>
					{(field: any) => (
						<field.UploadField
							label='Ảnh học viên'
							accept='image/*'
							maxSize={10 * 1024 * 1024}
							dragDropSize='small'
							showBrowseButton={false}
						/>
					)}
				</form.AppField>

				<form.AppField name='classId'>
					{(field: any) => (
						<field.Select
							values={classOptions}
							label='Lớp'
							// defaultValue={
							//         eduLevelOptions[0]
							//                 .value
							// }
						/>
					)}
				</form.AppField>
			</div>

			{/* Birth Place and Address - Two Columns  1*/}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				<form.AppField name='birthPlace'>
					{(field: any) => <field.TextField label='Quê quán' />}
				</form.AppField>

				<form.AppField name='address'>
					{(field: any) => <field.TextField label='Trú quán' />}
				</form.AppField>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				<form.AppField name='ethnic'>
					{(field: any) => (
						<field.Combobox
							values={EhtnicOptions}
							label='Dân tộc'
							placeholder='Chọn dân tộc'
							defaultValue={eduLevelOptions[0].value}
							className=''
						/>
					)}
				</form.AppField>

				<form.AppField name='religion'>
					{(field: any) => (
						<field.Select
							values={religionOptions}
							label='Tôn giáo'
							placeholder='Chọn tôn giáo'
							defaultValue={religionOptions[0].value}
						/>
					)}
				</form.AppField>
			</div>

			{/* School Name and Major - Two Columns */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
				<form.AppField name='educationLevel'>
					{(field: any) => (
						<field.Select
							label='Trình độ học vấn'
							placeholder='Chọn trình độ học vấn'
							values={eduLevelOptions}
							defaultValue={eduLevelOptions[5].value}
						/>
					)}
				</form.AppField>
				<form.AppField name='schoolName'>
					{(field: any) => <field.TextField label='Tên trường' />}
				</form.AppField>

				<form.AppField name='major'>
					{(field: any) => <field.TextField label='Ngành' />}
				</form.AppField>
			</div>

			{/* Phone - Full Width */}
			<div className='grid grid-cols-2 gap-6'>
				<form.AppField name='phone'>
					{(field: any) => (
						<field.TextField
							label='Số điện thoại'
							placeholder='123-456-7890'
						/>
					)}
				</form.AppField>
				<form.AppField name='dob'>
					{(field: any) => (
						<field.TextField
							label='Ngày sinh'
							placeholder='Ngày/tháng/năm'
						/>
					)}
				</form.AppField>
			</div>
		</div>
	)
}
