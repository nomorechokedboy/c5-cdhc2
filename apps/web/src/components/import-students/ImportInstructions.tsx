import { Info } from 'lucide-react'

const STEPS = [
	'Tải xuống file mẫu',
	'Điền thông tin học viên theo định dạng mẫu',
	'Tải file lên, kiểm tra bảng xem trước và sửa lớp nếu cần',
	'Nhấn Import — chỉ các dòng hợp lệ được thêm vào hệ thống'
]

export function ImportInstructions() {
	return (
		<div className='bg-info/10 border border-info/30 rounded-lg p-4'>
			<div className='flex items-start space-x-3'>
				<Info className='h-5 w-5 text-info mt-0.5 flex-shrink-0' />
				<div>
					<h3 className='font-medium text-foreground mb-2'>
						Hướng dẫn import
					</h3>
					<ol className='text-sm text-foreground/80 space-y-2'>
						{STEPS.map((step, i) => (
							<li
								key={step}
								className='flex items-center space-x-2'
							>
								<span className='bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium'>
									{i + 1}
								</span>
								<span>{step}</span>
							</li>
						))}
					</ol>
				</div>
			</div>
		</div>
	)
}
