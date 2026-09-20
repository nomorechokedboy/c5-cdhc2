export type FieldOption = { label: string; value: string; keywords?: string }

type BaseProps = {
	/** Form từ useAppForm */
	form: any
	/** Đường dẫn field, hỗ trợ lồng: `contactPerson.name`, `siblings[0].dob` */
	name: string
	label: string
	/** Nhãn nhỏ, gọn (form sửa). Mặc định: nhãn to (form tạo) */
	compact?: boolean
	className?: string
}

export type StudentFieldProps = BaseProps &
	(
		| { type?: 'text'; inputType?: string; placeholder?: string }
		| { type: 'textarea'; rows?: number }
		| { type: 'number'; min?: number; max?: number }
		| { type: 'date'; optional?: boolean; placeholder?: string }
		| { type: 'select'; options: FieldOption[]; placeholder?: string }
		| { type: 'unit'; level?: 'battalion' | 'company' | 'class' }
		| { type: 'checkbox' }
	)

/**
 * Một field của biểu mẫu học viên, chọn control theo `type`:
 * text · textarea · number · date (dd/mm/yyyy + lịch) · select (tìm kiếm) ·
 * unit (chọn lớp/đại đội nhóm theo đơn vị cha) · checkbox.
 *
 * Khai báo ở cấp module (không định nghĩa trong component cha) nên không bị
 * remount — mất focus — mỗi lần form render lại.
 */
export function StudentField(props: StudentFieldProps) {
	const { form, name, label, compact, className } = props

	return (
		<form.AppField name={name}>
			{(field: any) => {
				switch (props.type) {
					case 'textarea':
						return (
							<field.TextArea
								label={label}
								rows={props.rows}
								compact={compact}
								className={className}
							/>
						)
					case 'number':
						return (
							<field.NumberField
								label={label}
								min={props.min}
								max={props.max}
								compact={compact}
								className={className}
							/>
						)
					case 'date':
						return (
							<field.DatePicker
								label={label}
								placeholder={props.placeholder}
								optional={props.optional ?? true}
								compact={compact}
								className={className}
							/>
						)
					case 'select':
						return (
							<field.SelectField
								label={label}
								options={props.options}
								placeholder={props.placeholder}
								compact={compact}
								className={className}
							/>
						)
					case 'unit':
						return (
							<field.UnitField
								label={label}
								level={props.level}
								compact={compact}
								className={className}
							/>
						)
					case 'checkbox':
						return (
							<field.CheckboxField
								label={label}
								compact={compact}
								className={className}
							/>
						)
					default:
						return (
							<field.TextField
								label={label}
								type={props.inputType}
								placeholder={props.placeholder}
								compact={compact}
								className={className}
							/>
						)
				}
			}}
		</form.AppField>
	)
}
