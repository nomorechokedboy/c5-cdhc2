import { rankOptions } from '@/data/ethnics'
import { useState } from 'react'

export default function MilitaryStep({ form }: { form: any }) {
	const [isCpv, setIsCpv] = useState(false)

	return (
		<div className='space-y-6'>
			<div className='grid grid-cols-3 gap-6'>
				<form.AppField name='rank'>
					{(field: any) => (
						<field.Combobox
							values={rankOptions}
							label='Cấp bậc'
							placeholder='Chọn cấp bậc'
							defaultValue={rankOptions[0].value}
						/>
					)}
				</form.AppField>
				<form.AppField name='enlistmentPeriod'>
					{(field: any) => <field.TextField label='Ngày nhập ngũ' />}
				</form.AppField>
				<form.AppField name='policyBeneficiaryGroup'>
					{(field: any) => (
						<field.TextField label='Diện chính sách' />
					)}
				</form.AppField>
			</div>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				<form.AppField name='previousUnit'>
					{(field: any) => <field.TextField label='Đơn vị cũ' />}
				</form.AppField>
				<form.AppField name='previousPosition'>
					{(field: any) => (
						<field.TextField label='Chức vụ công tác tại đơn vị cũ' />
					)}
				</form.AppField>
			</div>
			<div className='grid grid-cols-2 gap-6'>
				<form.AppField name='politicalOrg'>
					{(field: any) => (
						<field.Select
							label='Đoàn/Đảng'
							values={[
								{
									label: 'Đoàn',
									value: 'hcyu'
								},
								{
									label: 'Đảng',
									value: 'cpv'
								}
							]}
							onChange={(val: string) => {
								if (val === 'cpv') {
									setIsCpv(true)
									return
								}

								setIsCpv(false)
							}}
						></field.Select>
					)}
				</form.AppField>
				<form.AppField name='politicalOrgOfficialDate'>
					{(field: any) => (
						<field.DatePicker
							className={`${!isCpv ? 'col-span-2' : ''}`}
							label='Ngày vào Đoàn/Đảng'
						/>
					)}
				</form.AppField>
			</div>

			<div className='grid grid-cols-2 gap-6'>
				<form.AppField name='cpvId'>
					{(field: any) => <field.TextField label='Số thẻ Đảng' />}
				</form.AppField>

				<form.AppField name='cpvOfficalAt'>
					{(field: any) => (
						<field.DatePicker
							className={`${!isCpv ? 'col-span-2' : ''}`}
							label='Ngày vào Đảng chính thức'
						/>
					)}
				</form.AppField>
			</div>

			<div className='grid grid-cols-1 gap-6'>
				<form.AppField name='talent'>
					{(field: any) => <field.TextArea label='Sở trường' />}
				</form.AppField>
			</div>
			<div className='grid grid-cols-1 gap-6'>
				<form.AppField name='shortcoming'>
					{(field: any) => <field.TextArea label='Sở đoản' />}
				</form.AppField>
			</div>
			<div className='grid grid-cols-1 gap-6'>
				<form.AppField name='achievement'>
					{(field: any) => <field.TextArea label='Thành tích' />}
				</form.AppField>
			</div>
			<div className='grid grid-cols-1 gap-6'>
				<form.AppField name='disciplinaryHistory'>
					{(field: any) => <field.TextArea label='Kỷ luật' />}
				</form.AppField>
			</div>
		</div>
	)
}
