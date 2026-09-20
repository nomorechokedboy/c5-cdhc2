import { useRef, useState, type DragEvent } from 'react'
import { CheckCircle, FileUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FileDropzone({
	file,
	onSelect,
	disabled
}: {
	file: File | null
	onSelect: (file: File) => void
	disabled?: boolean
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [dragActive, setDragActive] = useState(false)

	const handleDrag = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setDragActive(e.type === 'dragenter' || e.type === 'dragover')
	}

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setDragActive(false)
		const dropped = e.dataTransfer.files?.[0]
		if (dropped && !disabled) onSelect(dropped)
	}

	const browse = () => inputRef.current?.click()

	return (
		<div className='space-y-4'>
			<h3 className='font-medium text-gray-900'>Chọn file để import</h3>
			<div
				className={cn(
					'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
					dragActive
						? 'border-blue-400 bg-blue-50'
						: file
							? 'border-green-400 bg-green-50'
							: 'border-gray-300 hover:border-gray-400'
				)}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
			>
				<input
					ref={inputRef}
					type='file'
					accept='.csv,.xlsx,.xls'
					aria-label='Chọn file import'
					className='hidden'
					onChange={(e) => {
						const picked = e.target.files?.[0]
						if (picked) onSelect(picked)
						// Cho phép chọn lại đúng file đó sau khi sửa
						e.target.value = ''
					}}
				/>

				{file ? (
					<div className='space-y-3'>
						<CheckCircle className='h-12 w-12 text-green-500 mx-auto' />
						<div>
							<p className='font-medium text-green-700'>
								{file.name}
							</p>
							<p className='text-sm text-gray-500'>
								{(file.size / 1024 / 1024).toFixed(2)} MB
							</p>
						</div>
						<button
							type='button'
							onClick={browse}
							disabled={disabled}
							className='text-blue-500 hover:text-blue-600 text-sm font-medium'
						>
							Chọn file khác
						</button>
					</div>
				) : (
					<div className='space-y-3'>
						<FileUp className='h-12 w-12 text-gray-400 mx-auto' />
						<div>
							<p className='text-gray-600'>
								Kéo thả file vào đây hoặc{' '}
								<button
									type='button'
									onClick={browse}
									disabled={disabled}
									className='text-blue-500 hover:text-blue-600 font-medium'
								>
									chọn file
								</button>
							</p>
							<p className='text-sm text-gray-400 mt-1'>
								Hỗ trợ file CSV, Excel (.xlsx, .xls)
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
