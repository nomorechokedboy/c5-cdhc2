import ChildrenInfo from './children-info'

export interface FamilyStepProps {
	form: any
}

export default function FamilyStep({ form }: FamilyStepProps) {
	return (
		<div className='space-y-8 py-2'>
			<div className='space-y-6'>
				<h3 className='text-lg font-semibold border-b border-border pb-2'>
					Thông tin về vợ/chồng
				</h3>

				{/* Spouse Name and Phone - Two Columns */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					<form.AppField name='spouseName'>
						{(field: any) => (
							<field.TextField label='Tên vợ/chồng' />
						)}
					</form.AppField>
					<form.AppField name='spouseDob'>
						{(field: any) => (
							<field.DatePicker label='Ngày sinh của vợ/chồng' />
						)}
					</form.AppField>
				</div>

				{/* spouse Job - Full Width */}
				<div className='grid grid-cols-2 gap-6'>
					<form.AppField name='spousePhoneNumber'>
						{(field: any) => (
							<field.TextField label='Số điện thoại vợ/chồng' />
						)}
					</form.AppField>
					<form.AppField name='spouseJob'>
						{(field: any) => (
							<field.TextField label='Nghề nghiệp vợ/chồng' />
						)}
					</form.AppField>
				</div>
			</div>

			<div className='space-y-6'>
				<ChildrenInfo form={form} />
			</div>
		</div>
	)
}
