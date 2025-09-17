import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { forwardRef, useState } from 'react'

interface PasswordInputProps extends React.ComponentProps<'input'> {
	className?: string
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
	({ className, ...props }, ref) => {
		const [showPassword, setShowPassword] = useState(false)

		const togglePasswordVisibility = () => {
			setShowPassword(!showPassword)
		}

		return (
			<div className='relative'>
				<Input
					{...props}
					type={showPassword ? 'text' : 'password'}
					className={cn('pr-10', className)}
					ref={ref}
				/>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
					onClick={togglePasswordVisibility}
					aria-label={
						showPassword ? 'Hide password' : 'Show password'
					}
				>
					{showPassword ? (
						<EyeOff className='h-4 w-4 text-muted-foreground' />
					) : (
						<Eye className='h-4 w-4 text-muted-foreground' />
					)}
				</Button>
			</div>
		)
	}
)

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput
