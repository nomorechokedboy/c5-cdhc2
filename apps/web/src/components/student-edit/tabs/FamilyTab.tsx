import { Heart, Users } from 'lucide-react'
import {
	FormSection,
	PersonListField,
	StudentField
} from '@/components/student-fields'
import type { StudentEditTabProps } from '../types'

export function FamilyTab({ form }: StudentEditTabProps) {
	const f = { form, compact: true } as const

	return (
		<div className='space-y-6'>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				<FormSection
					title='Cha'
					icon={Users}
					accent='purple'
					columns={1}
				>
					<StudentField {...f} name='fatherName' label='Họ tên' />
					<StudentField
						{...f}
						type='date'
						name='fatherDob'
						label='Ngày sinh'
					/>
					<StudentField {...f} name='fatherJob' label='Nghề nghiệp' />
					<StudentField
						{...f}
						name='fatherPhoneNumber'
						label='Số điện thoại'
					/>
				</FormSection>
				<FormSection title='Mẹ' icon={Users} accent='pink' columns={1}>
					<StudentField {...f} name='motherName' label='Họ tên' />
					<StudentField
						{...f}
						type='date'
						name='motherDob'
						label='Ngày sinh'
					/>
					<StudentField {...f} name='motherJob' label='Nghề nghiệp' />
					<StudentField
						{...f}
						name='motherPhoneNumber'
						label='Số điện thoại'
					/>
				</FormSection>
			</div>

			<FormSection title='Hôn nhân' icon={Heart} accent='orange'>
				<StudentField
					{...f}
					type='checkbox'
					name='isMarried'
					label='Đã kết hôn'
				/>
				{/* Subscribe để ẩn/hiện ngay khi tick, không phụ thuộc render của cha */}
				<form.Subscribe
					selector={(state: any) => !!state.values.isMarried}
				>
					{(isMarried: boolean) =>
						isMarried && (
							<>
								<StudentField
									{...f}
									name='spouseName'
									label='Họ tên Vợ/Chồng'
								/>
								<StudentField
									{...f}
									type='date'
									name='spouseDob'
									label='Ngày sinh'
								/>
								<StudentField
									{...f}
									name='spouseJob'
									label='Nghề nghiệp'
								/>
								<StudentField
									{...f}
									name='spousePhoneNumber'
									label='SĐT Vợ/Chồng'
								/>
							</>
						)
					}
				</form.Subscribe>
			</FormSection>

			<PersonListField
				form={form}
				name='childrenInfos'
				title='Con'
				addLabel='Thêm con'
				emptyText='Chưa có thông tin con cái'
				accent='cyan'
			/>
			<PersonListField
				form={form}
				name='siblings'
				title='Anh chị em ruột'
				addLabel='Thêm anh chị em'
				emptyText='Chưa có thông tin anh chị em'
				accent='teal'
			/>

			<FormSection
				title='Hoàn cảnh gia đình'
				icon={Users}
				accent='indigo'
			>
				<StudentField
					{...f}
					name='familyBackground'
					label='Hoàn cảnh gia đình'
				/>
				<StudentField
					{...f}
					type='number'
					name='familySize'
					label='Số lượng thành viên'
					min={0}
				/>
				<StudentField
					{...f}
					name='familyBirthOrder'
					label='Con thứ mấy'
				/>
			</FormSection>
		</div>
	)
}
