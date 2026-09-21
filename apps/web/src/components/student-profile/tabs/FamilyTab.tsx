import { Heart, Users } from 'lucide-react'
import { FormSection } from '@/components/student-fields'
import { PersonCards } from '../PersonCards'
import { ProfileFields } from '../ProfileFields'
import type { ProfileTabProps } from './types'

export function FamilyTab({ student }: ProfileTabProps) {
	return (
		<>
			<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
				<FormSection title='Cha' icon={Users} columns={1}>
					<ProfileFields
						items={[
							{ label: 'Họ tên', value: student.fatherName },
							{
								label: 'Ngày sinh',
								value: student.fatherDob,
								date: true
							},
							{ label: 'Nghề nghiệp', value: student.fatherJob },
							{
								label: 'Số điện thoại',
								value: student.fatherPhoneNumber
							}
						]}
					/>
				</FormSection>
				<FormSection title='Mẹ' icon={Users} columns={1}>
					<ProfileFields
						items={[
							{ label: 'Họ tên', value: student.motherName },
							{
								label: 'Ngày sinh',
								value: student.motherDob,
								date: true
							},
							{ label: 'Nghề nghiệp', value: student.motherJob },
							{
								label: 'Số điện thoại',
								value: student.motherPhoneNumber
							}
						]}
					/>
				</FormSection>
			</div>

			<FormSection title='Hôn nhân' icon={Heart}>
				<ProfileFields
					items={[
						{
							label: 'Tình trạng',
							value: student.isMarried ? 'Đã kết hôn' : 'Độc thân'
						},
						...(student.isMarried
							? [
									{
										label: 'Họ tên Vợ/Chồng',
										value: student.spouseName
									},
									{
										label: 'Ngày sinh',
										value: student.spouseDob,
										date: true
									},
									{
										label: 'Nghề nghiệp',
										value: student.spouseJob
									},
									{
										label: 'SĐT Vợ/Chồng',
										value: student.spousePhoneNumber
									}
								]
							: [])
					]}
				/>
			</FormSection>

			<FormSection
				title={`Con (${student.childrenInfos?.length ?? 0})`}
				icon={Users}
			>
				<PersonCards
					people={student.childrenInfos}
					noun='Con'
					emptyText='Chưa có thông tin con cái'
				/>
			</FormSection>

			<FormSection
				title={`Anh chị em ruột (${student.siblings?.length ?? 0})`}
				icon={Users}
			>
				<PersonCards
					people={student.siblings}
					noun='Người'
					emptyText='Chưa có thông tin anh chị em'
				/>
			</FormSection>

			<FormSection title='Hoàn cảnh gia đình' icon={Users}>
				<ProfileFields
					items={[
						{
							label: 'Hoàn cảnh gia đình',
							value: student.familyBackground
						},
						{
							label: 'Số lượng thành viên',
							value: student.familySize
						},
						{
							label: 'Con thứ mấy',
							value: student.familyBirthOrder
						}
					]}
				/>
			</FormSection>
		</>
	)
}
