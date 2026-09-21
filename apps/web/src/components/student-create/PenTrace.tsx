import { cn } from '@/lib/utils'

interface PenTraceProps {
	steps: ReadonlyArray<{ id: string; title: string }>
	currentStep: number
	completedSteps: readonly number[]
	onStepClick: (index: number) => void
}

// Mỗi bước là một cột 160×40, đường nền ở y=24 nên các cột nối liền nhau.
// Bước hoàn thành có một nhịp QRS ở giữa cột.
const BASELINE = 'M0 24 H160'
const BEAT =
	'M0 24 H35 l5 -4 l5 4 H62 l4 5 l7 -24 l7 32 l4 -13 H105 l5 -5 l5 5 H160'

/**
 * Các bước là một dải giấy điện tim: bước hoàn thành có một nhịp được vẽ,
 * bút vàng đứng ở bước đang mở. Chuyển bước = bút đi tiếp trên đường mạch.
 */
export function PenTrace({
	steps,
	currentStep,
	completedSteps,
	onStepClick
}: PenTraceProps) {
	return (
		<nav aria-label='Các bước'>
			<ol
				className='grid'
				style={{
					gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`
				}}
			>
				{steps.map((step, i) => {
					const done = completedSteps.includes(i)
					const current = i === currentStep
					const passed = done || i < currentStep
					return (
						<li key={step.id}>
							<button
								type='button'
								onClick={() => onStepClick(i)}
								aria-current={current ? 'step' : undefined}
								className='group relative block w-full cursor-pointer outline-none'
							>
								<svg
									viewBox='0 0 160 40'
									preserveAspectRatio='none'
									fill='none'
									strokeWidth={2}
									strokeLinecap='round'
									strokeLinejoin='round'
									aria-hidden
									className='h-10 w-full'
								>
									<path
										d={BASELINE}
										className='stroke-border'
									/>
									{done ? (
										<path
											key='beat'
											d={BEAT}
											pathLength={1}
											data-drawn='beat'
											className='pulse-draw pulse-draw-quick stroke-primary'
										/>
									) : passed ? (
										<path
											d={BASELINE}
											className='stroke-primary'
										/>
									) : (
										current && (
											<path
												d='M0 24 H80'
												className='stroke-primary'
											/>
										)
									)}
								</svg>
								{current && (
									<span
										aria-hidden
										className='blip-beat absolute top-[24px] left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold ring-4 ring-gold/25'
									/>
								)}
								<span
									className={cn(
										'mt-1 block truncate px-1 text-center font-display text-sm tracking-wide group-focus-visible:underline',
										current
											? 'font-semibold text-foreground'
											: 'text-muted-foreground'
									)}
								>
									{step.title}
								</span>
							</button>
						</li>
					)
				})}
			</ol>
		</nav>
	)
}
