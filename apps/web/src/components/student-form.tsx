import { STEPS } from '@/data'
import { useAppForm } from '@/hooks/demo.form'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import ParentInfoStep from '@/components/parent-info-step'
import FamilyStep from '@/components/family-step'
import PersonalStep from '@/components/personal-step'
import ReviewStep from '@/components/review-step'
import StepIndicator from '@/components/form-indicator'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { CreateStudent } from '@/api'
import type { Student, StudentBody } from '@/types'
import MilitaryStep from '@/components/military-step'
import { toast } from 'sonner'
import type { VariantProps } from 'class-variance-authority'
import { convertToIso } from '@/lib/utils'
import { StudentFormSchema } from './student-form-schema'
import { z } from 'zod'
import type { StudentFormSchemaType } from './student-form/schema'

export interface StudentFormProps {
	onSuccess: (
		data: Student[],
		variables: StudentBody,
		context: unknown
	) => unknown
	buttonProps?: React.ComponentProps<'button'> &
		VariantProps<typeof buttonVariants> & { asChild?: boolean }
}

export default function StudentForm({
	onSuccess,
	buttonProps
}: StudentFormProps) {
	const [currentStep, setCurrentStep] = useState(0)
	const [completedSteps, setCompletedSteps] = useState<number[]>([])
	const [open, setOpen] = useState(false)

	const { mutateAsync } = useMutation({
		mutationFn: CreateStudent,
		onSuccess,
		onError: (error) => {
			console.error('Failed to create student:', error)
		}
	})

	const handleResetStep = () => {
		setCurrentStep(0)
		setCompletedSteps([])
	}

	const form = useAppForm({
		defaultValues: {
			fullName: '',
			birthPlace: '',
			address: '',
			dob: '',
			rank: '',
			previousUnit: '',
			previousPosition: '',
			position: '',
			ethnic: '',
			religion: '',
			enlistmentPeriod: '',
			politicalOrg: 'hcyu',
			politicalOrgOfficialDate: '',
			cpvId: '',
			educationLevel: '',
			schoolName: '',
			major: '',
			isGraduated: false,
			talent: '',
			shortcoming: '',
			policyBeneficiaryGroup: '',
			fatherName: '',
			fatherDob: '',
			fatherJob: '',
			fatherPhoneNumber: '',
			motherName: '',
			motherDob: '',
			motherJob: '',
			motherPhoneNumber: '',
			isMarried: false,
			spouseName: '',
			spouseJob: '',
			spouseDob: '',
			spousePhoneNumber: '',
			childrenInfos: [],
			familySize: 0,
			familyBackground: '',
			familyBirthOrder: '',
			achievement: '',
			disciplinaryHistory: '',
			phone: '',
			classId: 0,
			cpvOfficialAt: null
		} as StudentFormSchemaType,
		onSubmit: async ({ value, formApi }) => {
			try {
				// Validate all fields before submission
				const currentStepValues: Record<string, any> = {}
				STEPS[currentStep].fields.forEach((fieldName: any) => {
					currentStepValues[fieldName] = form.getFieldValue(fieldName)
				})
				const validationResult =
					STEPS[currentStep].validationSchema.safeParse(
						currentStepValues
					)

				if (!validationResult.success) {
					validationResult.error.issues.forEach((err) => {
						const fieldPath = err.path[0] as any
						form.setFieldMeta(fieldPath, (prev) => ({
							...prev,
							errorMap: { onSubmit: { message: err.message } },
							isTouched: true
						}))
					})
					return
				}

				const classId = value.classId
				value.classId = Number(classId)

				const familySize = value.familySize
				value.familySize = Number(familySize)

				const dob = value.dob
				value.dob = convertToIso(dob)
				if (value.spouseName !== '') {
					value.isMarried = true
				}

				if (
					value.cpvOfficialAt !== null &&
					value.cpvOfficialAt !== undefined
				) {
					const cpvOfficialAt = value.cpvOfficialAt
					value.cpvOfficialAt = convertToIso(cpvOfficialAt)
				}

				await mutateAsync(value)
				toast.success('Thêm mới học viên thành công!', {})
				formApi.reset()
				handleResetStep()
				setOpen(false)
			} catch (err) {
				console.error(err)
				toast.error('Thêm mới học viên thất bại!')
			}
		},
		validators: { onSubmit: StudentFormSchema }
	})

	const handleNext = () => {
		const currentStepValues: Record<string, any> = {}
		STEPS[currentStep].fields.forEach((fieldName: any) => {
			currentStepValues[fieldName] = form.getFieldValue(fieldName)
		})
		const validationResult =
			STEPS[currentStep].validationSchema.safeParse(currentStepValues)
		if (!validationResult.success) {
			validationResult.error.issues.forEach((err) => {
				const fieldPath = err.path[0] as any
				form.setFieldMeta(fieldPath, (prev) => ({
					...prev,
					errorMap: { onSubmit: { message: err.message } },
					isTouched: true
				}))
			})
			return
		}

		// Clear errors for current step fields since validation passed
		STEPS[currentStep].fields.forEach((fieldName) => {
			form.setFieldMeta(
				fieldName as keyof StudentFormSchemaType,
				(prev) => ({
					...prev,
					errorMap: {}
				})
			)
		})

		setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
	}

	const handlePrevious = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 0))
	}

	const handleStepClick = (stepIndex: number) => {
		if (
			stepIndex <= currentStep ||
			completedSteps.includes(stepIndex - 1)
		) {
			setCurrentStep(stepIndex)
		}
	}

	const renderCurrentStep = () => {
		const stepProps = {
			form
		}

		switch (currentStep) {
			case 0:
				return <PersonalStep {...stepProps} />
			case 1:
				return <MilitaryStep {...stepProps} />
			case 2:
				return <ParentInfoStep {...stepProps} />
			case 3:
				return <FamilyStep {...stepProps} />
			/* case 4:
                return <ReviewStep values={form.state.values} /> */
			default:
				return null
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button {...buttonProps}>
					<Plus className='w-4 h-4 mr-2' />
					Thêm học viên
				</Button>
			</DialogTrigger>
			<DialogContent className='grid-rows-[auto_auto_1fr] lg:max-w-3xl lg:h-9/10'>
				<DialogHeader>
					<DialogTitle className='text-center'>
						Biểu mẫu thêm học viên
					</DialogTitle>
				</DialogHeader>
				<StepIndicator
					STEPS={STEPS}
					completedSteps={completedSteps}
					currentStep={currentStep}
					handleStepClick={handleStepClick}
				/>
				<form
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						if (currentStep === STEPS.length - 1) {
							form.handleSubmit()
						}
					}}
					className='flex flex-col flex-1 overflow-auto no-scrollbar'
					id='studentForm'
				>
					<div className='mb-auto'>{renderCurrentStep()}</div>
				</form>
				<div className='flex justify-between items-center'>
					<button
						type='button'
						onClick={handlePrevious}
						disabled={currentStep === 0}
						className='flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
					>
						<ChevronLeft className='w-4 h-4 mr-1' />
						Quay lại
					</button>
					{currentStep < STEPS.length - 1 ? (
						<button
							type='button'
							onClick={handleNext}
							className='flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors'
						>
							Tiếp theo
							<ChevronRight className='w-4 h-4 ml-1' />
						</button>
					) : (
						<form.Subscribe
							selector={(state) => [
								state.canSubmit,
								state.isSubmitting
							]}
							children={([canSubmit, isSubmitting]) => {
								return (
									<Button
										type='submit'
										form='studentForm'
										disabled={!canSubmit}
									>
										{isSubmitting
											? 'Đang thêm học viên...'
											: 'Thêm học viên'}
									</Button>
								)
							}}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
