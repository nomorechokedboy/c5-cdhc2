import { Check } from 'lucide-react';

export interface StepIndicatorProps {
        STEPS: { id: string; title: string; fields: string[] }[];
        currentStep: number;
        completedSteps: number[];
        handleStepClick: (stepIndex: number) => void;
}

export default function ({
        STEPS,
        currentStep,
        completedSteps,
        handleStepClick,
}: StepIndicatorProps) {
        return (
                <div className="flex justify-between items-center">
                        {STEPS.map((step, index) => (
                                <div
                                        key={step.id}
                                        className="flex flex-col items-center flex-1"
                                >
                                        <div className="flex items-center w-full">
                                                <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-colors ${
                                                                index ===
                                                                currentStep
                                                                        ? 'bg-primary text-primary-foreground'
                                                                        : completedSteps.includes(
                                                                                    index
                                                                            )
                                                                          ? 'bg-green-600 text-white'
                                                                          : 'bg-muted text-muted-foreground'
                                                        }`}
                                                        onClick={() =>
                                                                handleStepClick(
                                                                        index
                                                                )
                                                        }
                                                >
                                                        {completedSteps.includes(
                                                                index
                                                        ) ? (
                                                                <Check className="w-5 h-5" />
                                                        ) : (
                                                                index + 1
                                                        )}
                                                </div>
                                                {index < STEPS.length - 1 && (
                                                        <div
                                                                className={`flex-1 h-0.5 mx-2 ${completedSteps.includes(index) ? 'bg-green-600' : 'bg-muted'}`}
                                                        />
                                                )}
                                        </div>
                                        <span className="text-xs mt-2 text-center font-medium text-muted-foreground">
                                                {step.title}
                                        </span>
                                </div>
                        ))}
                </div>
        );
}
