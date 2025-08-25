import DatePicker from '@/components/date-picker'
import { createFormHook } from '@tanstack/react-form'

import {
	Select,
	SubscribeButton,
	TextArea,
	TextField,
	Combobox,
	EditableInput
} from '@/components/demo.FormComponents'
import { fieldContext, formContext } from './demo.form-context'

export const { useAppForm } = createFormHook({
	fieldComponents: {
		TextField,
		Select,
		TextArea,
		DatePicker,
		Combobox,
		EditableInput
	},
	formComponents: {
		SubscribeButton
	},
	fieldContext,
	formContext
})
