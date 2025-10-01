import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Upload, User } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type JSX } from 'react'
import { Input } from '@/components/ui/input'

export type AvatarUploadProps = Omit<JSX.IntrinsicElements['input'], 'size'> & {
	src?: string
	alt?: string
	fallback?: string
	size?: 'sm' | 'md' | 'lg' | 'xl'
	enableUpload?: boolean
	rounded?: boolean
}

const sizeClasses = {
	sm: 'size-8',
	md: 'size-12',
	lg: 'size-16',
	xl: 'size-24'
}

export function AvatarUpload({
	src,
	alt = 'Avatar',
	fallback,
	size = 'md',
	enableUpload = false,
	className,
	onChange,
	onBlur,
	rounded,
	...inputProps
}: AvatarUploadProps) {
	const [imageSrc, setImageSrc] = useState<string | undefined>(src)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleClick = () => {
		if (enableUpload) {
			fileInputRef.current?.click()
		}
	}

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null
		if (file) {
			if (imageSrc && imageSrc.startsWith('blob:')) {
				URL.revokeObjectURL(imageSrc)
			}

			const objectUrl = URL.createObjectURL(file)
			setImageSrc(objectUrl)
		}

		onChange?.(e)
	}

	useEffect(() => {
		return () => {
			if (imageSrc && imageSrc.startsWith('blob:')) {
				URL.revokeObjectURL(imageSrc)
			}
		}
	}, [imageSrc])

	return (
		<div className='relative inline-block'>
			<Avatar
				className={cn(
					sizeClasses[size],
					enableUpload &&
						'cursor-pointer transition-opacity hover:opacity-80',
					className
				)}
				onClick={handleClick}
			>
				<AvatarImage src={imageSrc || 'avt.jpg'} alt={alt} />
				<AvatarFallback>
					{fallback || <User className='size-1/2' />}
				</AvatarFallback>
			</Avatar>

			{enableUpload && (
				<>
					<Input
						{...inputProps}
						ref={fileInputRef}
						type='file'
						accept='image/*'
						className='hidden'
						onChange={handleFileChange}
						aria-label='Upload avatar'
						onBlur={onBlur}
					/>
					<div
						className={`absolute bottom-0 right-0 flex size-6 items-center justify-center bg-primary text-primary-foreground shadow-md ${rounded === true ? 'rounded-full' : ''}`}
						onClick={handleClick}
					>
						<Upload className='size-3' />
					</div>
				</>
			)}
		</div>
	)
}
