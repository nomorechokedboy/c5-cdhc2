import SiblingInfo from './sibling-info'

export default function ParentInfoStep({ form }: { form: any }) {
	return (
		<div className='space-y-8 py-2'>
			<div className='space-y-6'>
				<h3 className='text-lg font-semibold border-b border-border pb-2'>
					Thông tin chung về gia cảnh
				</h3>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					<form.AppField name='familySize'>
						{(field: any) => (
							<field.TextField
								type='number'
								label='Số thành viên trong gia đình'
							/>
						)}
					</form.AppField>

					<form.AppField name='familyBirthOrder'>
						{(field: any) => (
							<field.TextField label='Con thứ bao nhiêu' />
						)}
					</form.AppField>
				</div>

				<div className='grid grid-cols-1 gap-6'>
					<form.AppField name='familyBackground'>
						{(field: any) => (
							<field.TextArea label='Sơ lược hoàn cảnh gia đình' />
						)}
					</form.AppField>
				</div>
			</div>

			{/* Father Information */}
			<div className='space-y-6'>
				<h3 className='text-lg font-semibold border-b border-border pb-2'>
					Thông tin về cha
				</h3>

				{/* Father Name and Phone - Two Columns */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					<form.AppField name='fatherName'>
						{(field: any) => <field.TextField label='Tên cha' />}
					</form.AppField>
					<form.AppField name='fatherDob'>
						{(field: any) => (
							<field.DatePicker label='Ngày sinh của cha' />
						)}
					</form.AppField>
				</div>

				{/* Father Job - Full Width */}
				<div className='grid grid-cols-2 gap-6'>
					<form.AppField name='fatherJob'>
						{(field: any) => (
							<field.TextField label='Nghề nghiệp cha' />
						)}
					</form.AppField>
					<form.AppField name='fatherPhoneNumber'>
						{(field: any) => (
							<field.TextField label='Số điện thoại cha' />
						)}
					</form.AppField>
				</div>
			</div>

			{/* Mother Information */}
			<div className='space-y-6'>
				<h3 className='text-lg font-semibold border-b border-border pb-2'>
					Thông tin về mẹ
				</h3>

				{/* Mother Name and Phone - Two Columns */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					<form.AppField name='motherName'>
						{(field: any) => <field.TextField label='Tên mẹ' />}
					</form.AppField>

					<form.AppField name='motherDob'>
						{(field: any) => (
							<field.DatePicker label='Ngày sinh mẹ' />
						)}
					</form.AppField>
				</div>

				{/* Mother Job - Full Width */}
				<div className='grid grid-cols-2 gap-6'>
					<form.AppField name='motherJob'>
						{(field: any) => (
							<field.TextField label='Nghề nghiệp mẹ' />
						)}
					</form.AppField>
					<form.AppField name='motherPhoneNumber'>
						{(field: any) => (
							<field.TextField label='Số điện thoại mẹ' />
						)}
					</form.AppField>
				</div>
			</div>

			<div className='space-y-6'>
				<SiblingInfo form={form} />
			</div>
		</div>
	)
}
