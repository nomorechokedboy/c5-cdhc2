import { GetCities } from '@/api';
import { SidebarInset } from '@/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppForm } from '../hooks/demo.form';
import PersonalStep from '@/components/personal-step';
import FamilyStep from '@/components/family-step';
import MilitaryStep from '@/components/military-step';
import ReviewStep from '@/components/review-step';
import StepIndicator from '@/components/form-indicator';
import { STEPS } from '@/data';

export const Route = createFileRoute('/demo/form/address')({
        component: AddressForm,
});

function AddressForm() {
        const [currentStep, setCurrentStep] = useState(0);
        const [completedSteps, setCompletedSteps] = useState<number[]>([]);

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
                        politicalOrg: '',
                        cpvOfficialDate: '',
                        cpvId: '',
                        educationLevel: '',
                        schoolName: '',
                        major: '',
                        isGraduated: false,
                        talent: '',
                        shortcoming: '',
                        policyBeneficiaryGroup: '',
                        fatherName: '',
                        fatherPhoneNumber: '',
                        fatherJob: '',
                        fatherJobAdress: '',
                        motherName: '',
                        motherPhoneNumber: '',
                        motherJob: '',
                        motherJobAdress: '',
                        phone: '',
                },
                onSubmit: ({ value }: { value: any }) => {
                        console.log(value);
                        alert('Form submitted successfully!');
                },
        });

        const { data: cityData } = useQuery({
                queryKey: ['city'],
                queryFn: GetCities,
                initialData: [],
        });

        const validateCurrentStep = () => {
                const currentStepData = STEPS[currentStep];
                const formState = form.state;
                let isValid = true;

                // Force validation on all current step fields
                for (const fieldName of currentStepData.fields) {
                        // Get the current field value
                        const fieldValue = fieldName.includes('.')
                                ? fieldName
                                          .split('.')
                                          .reduce(
                                                  (obj, key) => obj?.[key],
                                                  formState.values
                                          )
                                : formState.values[fieldName];

                        // Check if required fields have values
                        if (
                                !fieldValue ||
                                (typeof fieldValue === 'string' &&
                                        fieldValue.trim().length === 0)
                        ) {
                                isValid = false;
                                break;
                        }

                        // Check for existing validation errors
                        const fieldState = formState.fieldMeta[fieldName];
                        if (fieldState?.errors?.length > 0) {
                                isValid = false;
                                break;
                        }
                }

                return isValid;
        };

        const handleNext = () => {
                if (validateCurrentStep()) {
                        setCompletedSteps((prev) => [
                                ...prev.filter((step) => step !== currentStep),
                                currentStep,
                        ]);
                        setCurrentStep((prev) =>
                                Math.min(prev + 1, STEPS.length - 1)
                        );
                }
        };

        const handlePrevious = () => {
                setCurrentStep((prev) => Math.max(prev - 1, 0));
        };

        const handleStepClick = (stepIndex: number) => {
                if (
                        stepIndex <= currentStep ||
                        completedSteps.includes(stepIndex - 1)
                ) {
                        setCurrentStep(stepIndex);
                }
        };

        const renderCurrentStep = () => {
                switch (currentStep) {
                        case 0:
                                return <PersonalStep form={form} />;
                        case 1:
                                return <MilitaryStep form={form} />;
                        case 2:
                                return <FamilyStep form={form} />;
                        case 3:
                                return (
                                        <ReviewStep
                                                values={form.state.values}
                                        />
                                );
                        default:
                                return null;
                }
        };

        return (
                <SidebarInset>
                        <div className="flex items-center justify-center min-h-screen bg-background p-4">
                                <div className="w-full max-w-4xl p-8 rounded-lg border bg-card shadow-lg">
                                        <form
                                                onSubmit={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (
                                                                currentStep ===
                                                                STEPS.length - 1
                                                        ) {
                                                                form.handleSubmit();
                                                        }
                                                }}
                                                className="space-y-6"
                                        >
                                                <StepIndicator
                                                        STEPS={STEPS}
                                                        completedSteps={
                                                                completedSteps
                                                        }
                                                        currentStep={
                                                                currentStep
                                                        }
                                                        handleStepClick={
                                                                handleStepClick
                                                        }
                                                />
                                                {renderCurrentStep()}
                                                <div className="flex justify-between items-center mt-8">
                                                        <button
                                                                type="button"
                                                                onClick={
                                                                        handlePrevious
                                                                }
                                                                disabled={
                                                                        currentStep ===
                                                                        0
                                                                }
                                                                className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                                <ChevronLeft className="w-4 h-4 mr-1" />
                                                                Previous
                                                        </button>
                                                        {currentStep <
                                                        STEPS.length - 1 ? (
                                                                <button
                                                                        type="button"
                                                                        onClick={
                                                                                handleNext
                                                                        }
                                                                        className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                                                                >
                                                                        Next
                                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                                </button>
                                                        ) : (
                                                                <form.AppForm>
                                                                        <form.SubscribeButton label="Submit" />
                                                                </form.AppForm>
                                                        )}
                                                </div>
                                        </form>
                                </div>
                        </div>
                </SidebarInset>
        );
}
