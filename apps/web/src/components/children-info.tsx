import DynamicPersonList from '@/components/dynamic-person-list'

export interface ChildrenInfoProps {
	form: any
}

export default function ChildrenInfo({ form }: ChildrenInfoProps) {
	return (
		<DynamicPersonList
			form={form}
			fieldName='childrenInfos'
			config={{
				title: (index) => `Con thứ ${index + 1}`,
				addButtonText: 'Thêm thông tin con cái',
				fullNameLabel: 'Họ và tên con',
				fullNamePlaceholder: 'Họ và tên con...'
			}}
		/>
	)
}
