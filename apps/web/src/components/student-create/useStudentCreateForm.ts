import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CreateStudent } from '@/api'
import { useAppForm } from '@/hooks/demo.form'
import useUploadFiles from '@/hooks/useUploadFiles'
import type { Student, StudentBody } from '@/types'
import { StudentCreateSchema, issuesToFieldErrors } from './schema'
import { STUDENT_STEPS } from './steps'
import {
	createValuesToStudentBody,
	studentCreateDefaults,
	type StudentCreateValues
} from './values'

const LAST_STEP = STUDENT_STEPS.length - 1

export interface UseStudentCreateFormOptions {
	onSuccess: (
		data: Student[],
		variables: StudentBody,
		context: unknown
	) => unknown
	/** Gọi sau khi tạo xong (đóng dialog…) */
	onCreated?: () => void
}

/** Form thêm học viên nhiều bước: dữ liệu, kiểm tra từng bước, điều hướng và gửi API */
export function useStudentCreateForm({
	onSuccess,
	onCreated
}: UseStudentCreateFormOptions) {
	const [currentStep, setCurrentStep] = useState(0)
	const [completedSteps, setCompletedSteps] = useState<number[]>([])
	// Các field đang bị ta gắn lỗi ở bước — để xoá khi bước hợp lệ trở lại
	const stepErrorPaths = useRef<Set<string>>(new Set())

	const { mutateAsync: createStudent } = useMutation({
		mutationFn: CreateStudent,
		onSuccess,
		onError: (error) => console.error('Failed to create student:', error)
	})
	const { mutateAsync: uploadFiles } = useUploadFiles()

	const form = useAppForm({
		defaultValues: studentCreateDefaults,
		validators: {
			onSubmit: ({ value }) => {
				const result = StudentCreateSchema.safeParse(value)
				return result.success
					? undefined
					: { fields: issuesToFieldErrors(result.error.issues) }
			}
		},
		onSubmitInvalid: ({ value }) => {
			// Lỗi có thể nằm ở bước đã qua — đưa người dùng về bước đầu tiên bị lỗi
			const failed = STUDENT_STEPS.findIndex(
				(step) => !step.schema.safeParse(value).success
			)
			if (failed >= 0) setCurrentStep(failed)
			toast.error('Vui lòng kiểm tra lại các trường chưa hợp lệ')
		},
		onSubmit: async ({ value, formApi }) => {
			try {
				const { avatar, ...rest } = value as StudentCreateValues
				const body = createValuesToStudentBody(rest)

				if (avatar) {
					const formData = new FormData()
					formData.append('avatarImg', avatar)
					const resp = await uploadFiles(formData)
					body.avatar = resp.uris[0]
				}

				await createStudent(body)
				toast.success('Thêm mới học viên thành công!')
				formApi.reset()
				reset()
				onCreated?.()
			} catch (err) {
				console.error(err)
				toast.error('Thêm mới học viên thất bại!')
			}
		}
	})

	const reset = () => {
		setCurrentStep(0)
		setCompletedSteps([])
		stepErrorPaths.current.clear()
	}

	/** Kiểm tra bước hiện tại, gắn lỗi lên field. Trả về true nếu hợp lệ. */
	const validateCurrentStep = () => {
		const result = STUDENT_STEPS[currentStep].schema.safeParse(
			form.state.values
		)
		const errors = result.success
			? {}
			: issuesToFieldErrors(result.error.issues)

		for (const path of stepErrorPaths.current) {
			if (!(path in errors)) {
				form.setFieldMeta(path as any, (prev: any) => ({
					...prev,
					errorMap: {}
				}))
			}
		}
		for (const [path, message] of Object.entries(errors)) {
			form.setFieldMeta(path as any, (prev: any) => ({
				...prev,
				errorMap: { onSubmit: message },
				isTouched: true
			}))
		}
		stepErrorPaths.current = new Set(Object.keys(errors))

		return result.success
	}

	const next = () => {
		if (!validateCurrentStep()) return
		setCompletedSteps((prev) =>
			prev.includes(currentStep) ? prev : [...prev, currentStep]
		)
		setCurrentStep((prev) => Math.min(prev + 1, LAST_STEP))
	}

	const previous = () => setCurrentStep((prev) => Math.max(prev - 1, 0))

	/** Chỉ cho quay lại bước đã qua, hoặc sang bước ngay sau bước đã hoàn thành */
	const goTo = (index: number) => {
		if (index <= currentStep || completedSteps.includes(index - 1)) {
			setCurrentStep(index)
		}
	}

	return {
		form,
		steps: STUDENT_STEPS,
		currentStep,
		completedSteps,
		isLastStep: currentStep === LAST_STEP,
		next,
		previous,
		goTo,
		reset
	}
}
