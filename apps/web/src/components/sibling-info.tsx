import DynamicPersonList from './dynamic-person-list'

export interface SiblingInfoProps {
	form: any
}

export default function SiblingInfo({ form }: SiblingInfoProps) {
	return (
		<DynamicPersonList
			form={form}
			fieldName='siblings'
			config={{
				title: (index) => `Anh/chị/em thứ ${index + 1}`,
				addButtonText: 'Thêm thông tin anh/chị/em',
				fullNameLabel: 'Họ và tên anh/chị/em',
				fullNamePlaceholder: 'Họ và tên anh/chị/em...'
			}}
		/>
	)
}
