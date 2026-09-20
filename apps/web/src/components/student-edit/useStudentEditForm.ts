import { useMemo } from 'react'
import { toast } from 'sonner'
import usePatchStudentInfo from '@/hooks/usePatchStudentInfo'
import useUploadFiles from '@/hooks/useUploadFiles'
import { useAppForm } from '@/hooks/demo.form'
import { isDisplayDate } from '@/lib/student-dates'
import {
	formValuesToStudentPatch,
	studentToFormValues,
	type StudentEditValues
} from '@/lib/student-form-values'
import type { Student } from '@/types'

/**
 * Trường ngày bắt buộc đúng dd/mm/yyyy khi để lại giá trị.
 * `enlistmentPeriod` không kiểm tra: dữ liệu cũ có thể là văn bản tự do
 * (vd. «T9/2024») và không nên chặn việc lưu các thay đổi khác.
 */
const STRICT_DATE_FIELDS = [
	'dob',
	'politicalOrgOfficialDate',
	'cpvOfficialAt',
	'fatherDob',
	'motherDob',
	'spouseDob'
] as const

const INVALID_DATE = 'Ngày không hợp lệ, hãy nhập dd/mm/yyyy'

const isBad = (v: string | undefined) => !!v?.trim() && !isDisplayDate(v)

/** Kiểm tra ngày ở cấp form; trả lỗi theo đường dẫn field, hoặc undefined nếu hợp lệ */
function validateDates(value: StudentEditValues) {
	const fields: Record<string, string> = {}

	for (const key of STRICT_DATE_FIELDS) {
		if (isBad(value[key])) fields[key] = INVALID_DATE
	}
	for (const list of ['childrenInfos', 'siblings'] as const) {
		value[list].forEach((person, i) => {
			if (isBad(person.dob)) fields[`${list}[${i}].dob`] = INVALID_DATE
		})
	}

	return Object.keys(fields).length > 0 ? { fields } : undefined
}

/** Khởi tạo form sửa học viên + xử lý lưu (upload ảnh → PATCH) */
export function useStudentEditForm(student: Student, onClose?: () => void) {
	const { handlePatchStudentInfo, isPending } = usePatchStudentInfo()
	const { mutateAsync: uploadFiles } = useUploadFiles()
	const defaultValues = useMemo(() => studentToFormValues(student), [student])

	const form = useAppForm({
		defaultValues,
		validators: {
			onSubmit: ({ value }) => validateDates(value)
		},
		onSubmitInvalid: () => {
			// Field lỗi có thể nằm ở tab đang ẩn
			toast.error(
				'Có ngày nhập chưa hợp lệ, vui lòng kiểm tra lại các tab'
			)
		},
		onSubmit: async ({ value }) => {
			try {
				const patch = formValuesToStudentPatch(value)

				if (value.avatarFile) {
					const formData = new FormData()
					formData.append('avatarImg', value.avatarFile)
					const resp = await uploadFiles(formData)
					patch.avatar = resp.uris[0]
				}

				if (await handlePatchStudentInfo(patch)) onClose?.()
			} catch (err) {
				console.error('UpdateStudentInfo err: ', err)
				toast.error('Chỉnh sửa thông tin học viên không thành công!')
			}
		}
	})

	return { form, isPending }
}
